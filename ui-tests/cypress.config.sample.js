const { defineConfig } = require("cypress");
const fs = require('fs');

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
                        launchOptions.args.push('--enable-precise-memory-info');
                        launchOptions.args.push('--js-flags="--expose-gc"');
                    }
                    launchOptions.args.push('--js-flags="--max_old_space_size=3500 --max_semi_space_size=1024"');
                }
                return launchOptions;
            });
            on('task', {
                logMemory() {
                    if (global.gc) {
                        global.gc();
                    } else {
                        console.warn('Garbage collection is not exposed. Run node with --expose-gc');
                    }

                    const used = process.memoryUsage();
                    console.log(`MEMORY USAGE: RSS: ${Math.round(used.rss / 1024 / 1024)} MB | Heap Used: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
                    return null;
                }
            });
        },
    },
});


