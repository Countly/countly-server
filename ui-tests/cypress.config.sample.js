const { defineConfig } = require("cypress");
const fs = require('fs');
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const PNG = require("pngjs").PNG;
const sharp = require("sharp");
const extract = require("pdf-text-extract");

module.exports = defineConfig({
    e2e: {
        baseUrl: "http://localhost",
        defaultCommandTimeout: 30000,
        viewportWidth: 2000,
        viewportHeight: 1100,
        numTestsKeptInMemory: 0,
        experimentalMemoryManagement: true,
        projectId: "000000",
        chromeWebSecurity: false,
        watchForFileChanges: true,
        video: true,
        setupNodeEvents(on, config) {
            //Task: checks if the PDF contains embedded images and verifies logo existence and text content
            on("task", {
                // --- Check if PDF contains any image ---
                async verifyPdf({ filePath, options = {} }) {
                    // options: { referenceLogoPath: string, checkText: true/false }
                    try {
                        if (typeof global.DOMMatrix === "undefined") {
                            global.DOMMatrix = class DOMMatrix { };
                        }

                        // PDF loading
                        const data = new Uint8Array(fs.readFileSync(filePath));
                        const pdfDoc = await pdfjsLib.getDocument({ data }).promise;

                        // Dynamic import pixelmatch if logo check is needed
                        let pixelmatch;
                        const doLogoCheck = !!options.referenceLogoPath;
                        if (doLogoCheck) {
                            const pm = await import("pixelmatch");
                            pixelmatch = pm.default;
                        }

                        let hasImage = false;
                        let logoFound = false;
                        let extractedText = "";

                        for (let p = 1; p <= pdfDoc.numPages; p++) {
                            const page = await pdfDoc.getPage(p);

                            // --- Text extraction ---
                            if (options.checkText) {
                                extractedText += await new Promise((resolve, reject) => {
                                    extract(filePath, (err, pages) => {
                                        if (err) return reject(err);
                                        resolve(pages.join("\n"));
                                    });
                                });
                            }

                            const ops = await page.getOperatorList();

                            for (let i = 0; i < ops.fnArray.length; i++) {
                                const fn = ops.fnArray[i];
                                const args = ops.argsArray[i];

                                // --- Image check ---
                                if (
                                    fn === pdfjsLib.OPS.paintImageXObject ||
                                    fn === pdfjsLib.OPS.paintJpegXObject ||
                                    fn === pdfjsLib.OPS.paintInlineImageXObject
                                ) {
                                    hasImage = true;

                                    if (doLogoCheck && args[0]) {
                                        const objName = args[0];
                                        const imgData = await page.objs.get(objName);
                                        if (!imgData) continue;

                                        const pdfImg = new PNG({ width: imgData.width, height: imgData.height });
                                        pdfImg.data = imgData.data;

                                        // resize PDF image to reference logo size
                                        const pdfBuffer = PNG.sync.write(pdfImg);
                                        const refLogo = PNG.sync.read(fs.readFileSync(options.referenceLogoPath));
                                        const resizedPdfBuffer = await sharp(pdfBuffer)
                                            .resize(refLogo.width, refLogo.height)
                                            .png()
                                            .toBuffer();

                                        const resizedPdfImg = PNG.sync.read(resizedPdfBuffer);

                                        // pixelmatch
                                        const diff = new PNG({ width: refLogo.width, height: refLogo.height });
                                        const mismatched = pixelmatch(
                                            refLogo.data,
                                            resizedPdfImg.data,
                                            diff.data,
                                            refLogo.width,
                                            refLogo.height,
                                            { threshold: 0.1 }
                                        );

                                        if (mismatched === 0) {
                                            logoFound = true;
                                            break;
                                        }
                                    }
                                }
                            }

                            if ((doLogoCheck && logoFound) || (!doLogoCheck && hasImage)) {
                                break;
                            }
                        }

                        if (doLogoCheck && !logoFound) {
                            throw new Error("Logo in PDF does not match reference image");
                        }

                        return {
                            hasImage,
                            logoFound,
                            text: extractedText,
                            numPages: pdfDoc.numPages
                        };
                    } catch (err) {
                        throw err;
                    }
                }
            });
            on('after:spec', (spec, results) => {
                if (results && results.video) {
                    const failures = results.tests.some((test) =>
                        test.attempts.some((attempt) => attempt.state === 'failed')
                    );
                    if (!failures) {
                        // delete the video if the spec passed and no tests retried
                        const videoPath = results.video;
                        if (fs.existsSync(videoPath)) {
                            fs.unlinkSync(videoPath);
                        }
                    }
                }
            });
            on("before:browser:launch", (browser, launchOptions) => {
                if (["chrome", "edge", "electron"].includes(browser.name)) {
                    if (browser.isHeadless) {
                        launchOptions.args.push("--no-sandbox");
                        launchOptions.args.push("--disable-gl-drawing-for-tests");
                        launchOptions.args.push("--disable-gpu");
                        launchOptions.args.push("--disable-dev-shm-usage");
                    }
                    launchOptions.args.push('--js-flags="--max_old_space_size=3500 --max_semi_space_size=1024"');
                }
                return launchOptions;
            });
        },
    },
});


