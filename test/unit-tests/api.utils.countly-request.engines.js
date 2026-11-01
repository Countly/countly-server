'use strict';

/**
* countly-request loads undici when it is required, and requestProcessor and the
* dashboard's app.js load countly-request at startup, so an undici release that
* does not run on the installed Node.js stops the API and the dashboard.
*
* undici 8 needs Node.js >= 22.19 and throws on require on Node.js 20 and early
* 22.x, which 25.03 installs still run (bin/upgrade/25.03/upgrade.nodejs.20.sh).
* This fails when the undici in the lockfile no longer supports that Node.js line,
* so a later undici bump has to raise the supported Node.js version on purpose.
*/

const assert = require('node:assert');
const path = require('path');
const semver = require('semver');

const ROOT = path.join(__dirname, '..', '..');
const OLDEST_SUPPORTED_NODE = '20.18.1';

describe('countly-request undici runs on the oldest supported Node.js', function() {
    it('the locked undici supports Node.js ' + OLDEST_SUPPORTED_NODE, function() {
        const lock = require(path.join(ROOT, 'package-lock.json'));
        const entry = lock.packages['api/utils/countly-request/node_modules/undici'] || lock.packages['node_modules/undici'];
        assert.ok(entry, 'undici is not in package-lock.json');
        assert.ok(entry.engines && entry.engines.node, 'undici ' + entry.version + ' declares no Node.js engine range');
        assert.ok(semver.satisfies(OLDEST_SUPPORTED_NODE, entry.engines.node),
            'undici ' + entry.version + ' requires Node.js ' + entry.engines.node + ', which excludes ' + OLDEST_SUPPORTED_NODE);
    });

    it('countly-request declares an undici range whose releases support it', function() {
        const pkg = require(path.join(ROOT, 'api', 'utils', 'countly-request', 'package.json'));
        const range = pkg.dependencies.undici;
        assert.ok(range, 'countly-request does not depend on undici');
        assert.ok(semver.minVersion(range).major <= 7,
            'countly-request allows undici ' + range + '; undici 8 and later need Node.js >= 22.19');
    });
});
