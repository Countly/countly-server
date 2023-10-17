const { defineConfig } = require("cypress");
const fs = require('fs')

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
		video: true,		
		setupNodeEvents(on, config) {
			on('after:spec', (spec, results) => {
			  if (results && results.video) {
				const failures = results.tests.some((test) =>
				  test.attempts.some((attempt) => attempt.state === 'failed')
				)
				if (!failures) {
				  // delete the video if the spec passed and no tests retried
				  fs.unlinkSync(results.video)
				}
			  }
			})
		  },
	},
})