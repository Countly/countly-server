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
        chromeWebSecurity: true,
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
            // before:browser:launch event for custom Chrome options
            on("before:browser:launch", (browser = {}, launchOptions) => {
                if (browser.family === "chromium") {
                    launchOptions.args.push('--js-flags="--max_old_space_size=1024 --max_semi_space_size=1024"');
                }
                return launchOptions;
            });
        },
    },
});


