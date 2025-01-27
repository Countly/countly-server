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
          const logsDir = path.join(__dirname, 'logs', specName);
          const logFilePath = path.join(logsDir, 'network-logs.json');
      
          if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
          }
      
          let existingLogs = [];
          if (fs.existsSync(logFilePath)) {
            const fileContent = fs.readFileSync(logFilePath, 'utf-8');
            try {
              existingLogs = JSON.parse(fileContent);
            } catch {
              existingLogs = [];
            }
          }
      
          existingLogs.push(logData);
          fs.writeFileSync(logFilePath, JSON.stringify(existingLogs, null, 2));
      
          return null;
        },
      
        saveConsoleLogs({ specName, logData }) {
          const logsDir = path.join(__dirname, 'logs', specName);
          const logFilePath = path.join(logsDir, 'console-logs.json');
      
          if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
          }
      
          let existingLogs = [];
          if (fs.existsSync(logFilePath)) {
            const fileContent = fs.readFileSync(logFilePath, 'utf-8');
            try {
              existingLogs = JSON.parse(fileContent);
            } catch {
              existingLogs = [];
            }
          }

          existingLogs.push(logData);
          fs.writeFileSync(logFilePath, JSON.stringify(existingLogs, null, 2));
      
          return null;
        },
      });

        },
    },
});


