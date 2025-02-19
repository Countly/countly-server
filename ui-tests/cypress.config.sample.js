const { defineConfig } = require("cypress");
const fs = require('fs');
const path = require('path');
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
                    }
                    launchOptions.args.push('--js-flags="--max_old_space_size=3500 --max_semi_space_size=1024"');
                }
                return launchOptions;
            });

            try {
                const logsDir = path.resolve(__dirname, 'logs');

                on('task', {
                    saveNetworkLog({ specName, testName, data }) {
                        try {
                            const logDir = path.join(logsDir, specName);
                            if (!fs.existsSync(logDir)) {
                                fs.mkdirSync(logDir, { recursive: true });
                            }
                            const logFile = path.join(logDir, 'network-logs.json');

                            fs.writeFileSync(logFile, JSON.stringify({ testName, logs: data }, null, 2));
                        } catch (error) {
                            console.error("❌ [ERROR]: ", error);
                        }
                        return null;
                    },

                    saveConsoleLog({ specName, testName, data }) {
                        try {
                            const logDir = path.join(logsDir, specName);
                            if (!fs.existsSync(logDir)) {
                                fs.mkdirSync(logDir, { recursive: true });
                            }
                            const logFile = path.join(logDir, 'console-logs.json');

                            fs.writeFileSync(logFile, JSON.stringify({ testName, logs: data }, null, 2));
                        } catch (error) {
                            console.error("❌ [ERROR]: ", error);
                        }
                        return null;
                    },

                    deleteLogs({ specName }) {
                        try {
                            const logDir = path.join(logsDir, specName);
                            if (fs.existsSync(logDir)) {
                                fs.rmSync(logDir, { recursive: true, force: true });
                            }
                        } catch (error) {
                            console.error("❌ [ERROR] : ", error);
                        }
                        return null;
                    }
                });
                return config;

            } catch (error) {
                throw error; 
            }
        },
    },
});


