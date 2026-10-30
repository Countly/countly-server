'use strict';

/**
* countly-request is a factory: `require('countly-request')(config)` returns the
* request function. Calling the module itself with (options, callback) returns
* a function and never calls the callback, so the caller's promise waits
* forever with nothing logged.
*
* GitHub's connect endpoint and history import, and Jira's history import and
* synthetic checks, all shipped like that: their unit tests inject a stand-in
* for the HTTP call, so none of them ever ran the real one. This reads every
* server-side file and fails on a binding of the module that is never turned
* into the request function.
*/

const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SKIP = new Set(['node_modules', '.git', 'ui', 'frontend', 'public', 'dist', 'min']);

/**
* Every .js/.ts file under a directory, skipping dependencies and client code.
* @param {string} dir - directory
* @param {string[]} out - collected paths
* @returns {string[]} paths
*/
function sources(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP.has(entry.name)) {
                sources(path.join(dir, entry.name), out);
            }
        }
        else if (/\.(js|ts|cjs|mjs)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
            out.push(path.join(dir, entry.name));
        }
    }
    return out;
}

describe('countly-request is used as the factory it is', function() {
    it('is never called as the request function itself', function() {
        const files = sources(path.join(ROOT, 'api'), []).concat(sources(path.join(ROOT, 'plugins'), []));
        const binding = /(?:var|let|const)\s+(\w+)\s*=\s*require\(\s*['"]countly-request['"]\s*\)\s*;/g;
        const offenders = [];

        for (const file of files) {
            const text = fs.readFileSync(file, 'utf8');
            let match;
            binding.lastIndex = 0;
            while ((match = binding.exec(text))) {
                const name = match[1];
                //the factory has to be called somewhere to produce the request
                //function: `const request = countlyRequest(config)`
                const produced = new RegExp('=\\s*' + name + '\\s*\\(').test(text);
                if (!produced) {
                    offenders.push(path.relative(ROOT, file) + ' (' + name + ')');
                }
            }
        }

        assert.deepStrictEqual(offenders, [], 'require("countly-request") must be called with a config: ' + offenders.join(', '));
    });
});
