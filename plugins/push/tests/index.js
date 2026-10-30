// The plugin test runner (test/4.plugins/1.plugin.tests.js) requires plugins/push/tests,
// which resolves to this file.
require('./tests-compile.js');
require('./tests-platforms.js');
require('./tests-migrate.js');
require('./tests-api-credentials.js');
require('./tests-worker.js');
require('./tests-audience.js');
require('./tests-integration.js');
