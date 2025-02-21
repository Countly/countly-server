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

            on('task', {
                saveLogsBySpecName({ specName, logData }) {
                    console.log(`[DEBUG] Writing network log for spec: ${specName}`);
                    
                    const logsDir = path.join(__dirname, 'logs', specName);
                    const logFilePath = path.join(logsDir, 'network-logs.json');

                    if (!fs.existsSync(logsDir)) {
                        console.log(`[DEBUG] Creating logs directory: ${logsDir}`);
                        fs.mkdirSync(logsDir, { recursive: true });
                    }

                    let existingLogs = [];
                    if (fs.existsSync(logFilePath)) {
                        try {
                            existingLogs = JSON.parse(fs.readFileSync(logFilePath, 'utf-8')) || [];
                        } catch (error) {
                            console.log("[DEBUG] Corrupted network log file detected. Resetting file.");
                            existingLogs = [];
                        }
                    }

                    existingLogs.push(logData);
                    fs.writeFileSync(logFilePath, JSON.stringify(existingLogs, null, 2));

                    console.log("[DEBUG] Network log saved successfully.");
                    return null;
                },

                saveConsoleLogs({ specName, logData }) {
                    console.log(`[DEBUG] Writing console log for spec: ${specName}`);

                    const logsDir = path.join(__dirname, 'logs', specName);
                    const logFilePath = path.join(logsDir, 'console-logs.json');

                    if (!fs.existsSync(logsDir)) {
                        console.log(`[DEBUG] Creating logs directory: ${logsDir}`);
                        fs.mkdirSync(logsDir, { recursive: true });
                    }

                    fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2));

                    console.log("[DEBUG] Console log saved successfully.");
                    return null;
                }
            });

            console.log("[DEBUG] Cypress setupNodeEvents initialized.");
            return config;
		}
	}
});
