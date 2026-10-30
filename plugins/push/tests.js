// The plugin test runner (test/4.plugins/1.plugin.tests.js) requires plugins/push/tests,
// which resolves to this file. CI copies the branch over an existing install without
// deleting files, so the entry point has to stay at this path.
require('./tests/tests-compile.js');
require('./tests/tests-platforms.js');
require('./tests/tests-migrate.js');
require('./tests/tests-api-credentials.js');
require('./tests/tests-worker.js');
require('./tests/tests-audience.js');
require('./tests/tests-integration.js');
