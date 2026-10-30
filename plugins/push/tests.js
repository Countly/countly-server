// The plugin test runner (test/4.plugins/1.plugin.tests.js) requires plugins/push/tests,
// which resolves to this file. CI copies the branch over an existing install without
// deleting files, so the entry point has to stay at this path.
require('./tests/tests-compile.js');
require('./tests/tests-platforms.js');
require('./tests/tests-migrate.js');
require('./tests/tests-api-credentials.js');
require('./tests/tests-audience.js');

// Not run yet: tests-worker.js and tests-integration.js were written for the 2022 push and
// simulate its whole sending pipeline (timed waits for scheduled jobs, notifications queued
// ahead, token cleanup flushed before the stream closes). Push was replaced with an older
// implementation in 2024 (SER-2015), and they still fail against it in ways that need each
// assertion adapted. Countly/countly-server#8206 lists the failures.
