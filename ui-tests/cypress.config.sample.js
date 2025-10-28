const { defineConfig } = require("cypress");
const fs = require("fs");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const { PNG } = require("pngjs");
const sharp = require("sharp");
const extractText = require("pdf-text-extract");
const util = require("util");
const extractTextAsync = util.promisify(extractText);

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
            on("task", {
                async verifyPdf({ filePath, options = {} }) {
                    // DOMMatrix tanımı Node için
                    if (typeof global.DOMMatrix === "undefined") {
                        global.DOMMatrix = class DOMMatrix { };
                    }

                    const data = new Uint8Array(fs.readFileSync(filePath));
                    const pdfDoc = await pdfjsLib.getDocument({ data }).promise;

                    let hasImage = false;
                    let logoFound = false;
                    let extractedText = "";

                    // Pixelmatch lazy import
                    let pixelmatch;
                    if (options.referenceLogoPath) {
                        const pm = await import("pixelmatch");
                        pixelmatch = pm.default;
                    }

                    for (let p = 1; p <= pdfDoc.numPages; p++) {
                        const page = await pdfDoc.getPage(p);

                        // Text extraction
                        if (options.checkText) {
                            const pagesText = await extractTextAsync(filePath);
                            extractedText = pagesText.join("\n");
                        }

                        const ops = await page.getOperatorList();

                        for (let i = 0; i < ops.fnArray.length; i++) {
                            const fn = ops.fnArray[i];
                            const args = ops.argsArray[i];

                            if (
                                fn === pdfjsLib.OPS.paintImageXObject ||
                                fn === pdfjsLib.OPS.paintJpegXObject ||
                                fn === pdfjsLib.OPS.paintInlineImageXObject
                            ) {
                                hasImage = true;

                                if (options.referenceLogoPath && args[0]) {
                                    const objName = args[0];
                                    const imgData = await page.objs.get(objName);
                                    if (!imgData) continue;

                                    const pdfImg = new PNG({ width: imgData.width, height: imgData.height });
                                    pdfImg.data = imgData.data;
                                    const pdfBuffer = PNG.sync.write(pdfImg);

                                    const refLogo = PNG.sync.read(fs.readFileSync(options.referenceLogoPath));
                                    const resizedPdfBuffer = await sharp(pdfBuffer)
                                        .resize(refLogo.width, refLogo.height)
                                        .png()
                                        .toBuffer();

                                    const resizedPdfImg = PNG.sync.read(resizedPdfBuffer);
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

                        if ((options.referenceLogoPath && logoFound) || (!options.referenceLogoPath && hasImage)) {
                            break;
                        }
                    }

                    if (options.referenceLogoPath && !logoFound) {
                        throw new Error("Logo in PDF does not match reference image");
                    }

                    return {
                        hasImage,
                        logoFound,
                        text: extractedText,
                        numPages: pdfDoc.numPages,
                    };
                },
            });

            on("after:spec", (spec, results) => {
                if (results?.video) {
                    const hasFailures = results.tests.some((t) => t.attempts.some((a) => a.state === "failed"));
                    if (!hasFailures && fs.existsSync(results.video)) {
                        fs.unlinkSync(results.video);
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
