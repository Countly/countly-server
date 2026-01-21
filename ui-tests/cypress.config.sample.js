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

// UTILS
// ================================
function safeUnlink(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

function safeRmdir(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
}

function isOnlyCompressed(files) {
    return files.length > 0 && files.every((f) => f.endsWith("-compressed.mp4"));
}

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
            // Clean up videos and screenshots after each spec
            on("after:spec", (spec, results) => {
                if (!results) {
                    return;
                }

                const failures = results.stats?.failures || 0;
                const hasRealFailures = failures > 0;

                // Remove videos if no real failures
                if (!hasRealFailures && results.video) {
                    const videoPath = results.video;
                    const compressedPath = videoPath.replace(".mp4", "-compressed.mp4");

                    safeUnlink(videoPath);
                    safeUnlink(compressedPath);
                }
            });

            // Clean up empty screenshot and video folders after run
            on("after:run", () => {
                const folders = [config.videosFolder, config.screenshotsFolder];

                folders.forEach((baseFolder) => {
                    if (!fs.existsSync(baseFolder)) {
                        return;
                    }

                    fs.readdirSync(baseFolder).forEach((entry) => {
                        const fullPath = path.join(baseFolder, entry);
                        if (!fs.existsSync(fullPath)) {
                            return;
                        }

                        if (!fs.statSync(fullPath).isDirectory()) {
                            return;
                        }

                        const files = fs.readdirSync(fullPath);

                        if (files.length === 0) {
                            safeRmdir(fullPath);
                            return;
                        }

                        if (isOnlyCompressed(files)) {
                            safeRmdir(fullPath);
                            return;
                        }

                        const hasMp4 = files.some((f) => f.endsWith(".mp4"));
                        const hasScreenshots = files.some((f) => f.endsWith(".png"));

                        if (!hasMp4 && !hasScreenshots) {
                            safeRmdir(fullPath);
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
            return config;
        },
    },
});
