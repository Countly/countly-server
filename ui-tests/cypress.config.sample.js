// Define missing DOMMatrix in Node context (for pdfjs)
if (typeof global.DOMMatrix === "undefined") {
    global.DOMMatrix = class DOMMatrix { };
}

const { defineConfig } = require("cypress");
const fs = require("fs");
const path = require("path");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");
const { PNG } = require("pngjs");
const sharp = require("sharp");



module.exports = defineConfig({
    e2e: {
        baseUrl: "http://localhost",
        defaultCommandTimeout: 30000,
        retries: 2,
        viewportWidth: 2000,
        viewportHeight: 1100,
        numTestsKeptInMemory: 0,
        experimentalMemoryManagement: true,
        projectId: "000000",
        chromeWebSecurity: false,
        watchForFileChanges: true,
        video: true,
        setupNodeEvents(on, config) {
            // Task: verify PDF images, logo, and text content
            on("task", {
                async verifyPdf({ filePath, options = {} }) {
                    // options: { referenceLogoPath: string }

                    // Load PDF file
                    const data = new Uint8Array(fs.readFileSync(filePath));
                    const pdfDoc = await pdfjsLib.getDocument({ data }).promise;

                    // Import pixelmatch only if logo check is needed
                    let pixelmatch;
                    const doLogoCheck = !!options.referenceLogoPath;
                    if (doLogoCheck) {
                        const pm = await import("pixelmatch");
                        pixelmatch = pm.default;
                    }

                    let hasImage = false;
                    let logoFound = false;
                    let extractedText = ""; //store text here

                    // Loop through all pages
                    for (let p = 1; p <= pdfDoc.numPages; p++) {
                        const page = await pdfDoc.getPage(p);

                        //Extract text content from page
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map((item) => item.str).join(" ");
                        extractedText += pageText + "\n";

                        //Check for image operators
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

                                if (doLogoCheck && args[0]) {
                                    const objName = args[0];
                                    const imgData = await new Promise((resolve) => {
                                        try {
                                            page.objs.get(objName, (data) => resolve(data));
                                        }
                                        catch (e) {
                                            resolve(null);
                                        }
                                    });

                                    if (!imgData) {
                                        continue;
                                    }

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

                        if ((doLogoCheck && logoFound) || (!doLogoCheck && hasImage)) {
                            break;
                        }
                    }

                    if (doLogoCheck && !logoFound) {
                        throw new Error("Logo in PDF does not match reference image");
                    }

                    //Return with extracted text
                    return {
                        hasImage,
                        logoFound,
                        text: extractedText,
                        numPages: pdfDoc.numPages
                    };
                },
            });

            // Clean up unneeded videos after each spec
            on("after:spec", (spec, results) => {
                if (!results) {
                    return;
                }

                const isFinalFail = results.stats?.failures > 0;

                if (!isFinalFail && results?.video) {
                    const videoPath = results.video;
                    const compressedPath = videoPath.replace(".mp4", "-compressed.mp4");

                    if (fs.existsSync(videoPath)) {
                        fs.unlinkSync(videoPath);
                    }
                    if (fs.existsSync(compressedPath)) {
                        fs.unlinkSync(compressedPath);
                    }
                }
            });

            // Clean up empty folders and folders with only compressed videos after the run
            on("after:run", () => {
                const folders = [config.videosFolder, config.screenshotsFolder];

                folders.forEach((folder) => {
                    if (!fs.existsSync(folder)) {
                        return;
                    }

                    fs.readdirSync(folder).forEach((entry) => {
                        const fullPath = path.join(folder, entry);
                        if (!fs.existsSync(fullPath)) {
                            return;
                        }

                        if (!fs.statSync(fullPath).isDirectory()) {
                            return;
                        }

                        const files = fs.readdirSync(fullPath);

                        // Remove empty folders
                        if (files.length === 0) {
                            fs.rmSync(fullPath, { recursive: true, force: true });
                            return;
                        }

                        // Remove folders that only contain compressed videos
                        const onlyCompressed = files.every((f) =>
                            f.endsWith("-compressed.mp4")
                        );

                        if (onlyCompressed) {
                            fs.rmSync(fullPath, { recursive: true, force: true });
                        }
                    });
                });
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
