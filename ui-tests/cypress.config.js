const { defineConfig } = require('cypress')

module.exports = defineConfig({
	e2e: {
		baseUrl: 'https://canangun.count.ly',
		defaultCommandTimeout: 30000,
		viewportWidth: 2000,
		viewportHeight: 1100,
		numTestsKeptInMemory: 0,
		retries: {
			runMode: 2,
			openMode: 0,
		},
		chromeWebSecurity: false,
		watchForFileChanges: true,
	},
})
