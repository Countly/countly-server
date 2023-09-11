const { defineConfig } = require("cypress");

module.exports = defineConfig({
    e2e: {
        baseUrl: "http://localhost",
        defaultCommandTimeout: 30000,
        viewportWidth: 2000,
        viewportHeight: 1100,
        numTestsKeptInMemory: 0,
        projectId: "000000",
        chromeWebSecurity: false,
        watchForFileChanges: true,
        retries: {
            runMode: 0,
            openMode: 0,
        },
    },
});