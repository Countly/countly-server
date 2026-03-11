# Test Suite Documentation

This document covers how to run and write tests for Countly Server.

## Table of Contents
- [Test Framework](#test-framework)
- [Running Tests](#running-tests)
- [Writing Plugin Tests](#writing-plugin-tests)
- [Test Utilities](#test-utilities)

---

## Test Framework

Tests are run using **Grunt** task runner with:
- **Mocha.js** — Test framework
- **should.js** — Assertion library
- **supertest** — HTTP request testing

---

## Running Tests

### Full Test Suite

Run the complete test suite (requires clean Countly instance without admin user or apps):

```bash
countly test
```

This runs ESLint validation followed by test suites in order:
1. **frontend** — Setup, login tests
2. **api** — User, app, token management tests
3. **api.write** — Write operations, bulk requests
4. **plugins** — All enabled plugin tests
5. **cleanup** — Delete test data, close connections
6. **unit-tests** — Unit tests for utility functions

### Specific Test Commands

```bash
# Unit tests only (no Docker required)
npm run test:unit

# Core API tests
npm run test:api-core

# CE plugin tests
npm run test:lite-plugins

# EE plugin tests
npm run test:enterprise-plugins

# Single plugin tests
npm run test:plugin -- <pluginname>
```

### Plugin-Specific Tests

```bash
# Run tests for a specific plugin
countly plugin test pluginname

# Run tests for multiple plugins
countly plugin test plugin1 plugin2 plugin3

# Run only the test file (skip app/user creation)
countly plugin test pluginname --only

# Debug mode (pause between test cases)
countly plugin test pluginname --debug

# Combine options
countly plugin test plugin1 plugin2 --only --debug
```

**Debug mode** pauses after each test case, allowing you to:
- Check the dashboard between tests
- Inspect database state
- Press Enter to continue to next test

---

## Writing Plugin Tests

### File Location

Place tests in one of these locations:
- `plugins/<name>/tests.js` — Single test file
- `plugins/<name>/tests/index.js` — Multiple test files

### Test Structure

Tests should follow this pattern:
1. **Empty state** — Verify correct behavior with no data
2. **Write data** — Use SDK or API to create data
3. **Verify data** — Confirm data was stored correctly
4. **Cleanup** — Reset app and verify cleanup

### Basic Test Template

```javascript
var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Testing My Plugin', function() {
    
    // 1. Test empty state
    describe('Empty state', function() {
        it('should have no data', function(done) {
            // Get test credentials
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");

            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=myplugin')
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    var ob = JSON.parse(res.text);
                    ob.should.be.empty;
                    setTimeout(done, 100);
                });
        });
    });

    // 2. Write data
    describe('Writing data', function() {
        it('should succeed', function(done) {
            var params = {"my_metric": "value1"};
            
            request
                .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + '&begin_session=1&metrics=' + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 100);
                });
        });
    });

    // 3. Verify data
    describe('Verify data', function() {
        it('should have written data', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=myplugin')
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('my_metric');
                    setTimeout(done, 100);
                });
        });
    });

    // 4. Cleanup
    describe('Reset app', function() {
        it('should reset data', function(done) {
            var params = {app_id: APP_ID};

            request
                .get('/i/apps/reset?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 100);
                });
        });
    });

    // 5. Verify cleanup
    describe('Verify cleanup', function() {
        it('should have no data after reset', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=myplugin')
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    var ob = JSON.parse(res.text);
                    ob.should.be.empty;
                    setTimeout(done, 100);
                });
        });
    });
});
```

---

## Test Utilities

### Available from testUtils

```javascript
var testUtils = require("../../test/testUtils");

// Get test credentials
testUtils.get("API_KEY_ADMIN");  // Admin API key
testUtils.get("APP_ID");         // Test app ID
testUtils.get("APP_KEY");        // Test app key

// Base URL for requests
testUtils.url;
```

### Validation Helpers

```javascript
// Validate metric responses
testUtils.validateMetrics(err, res, done, {
    meta: {"browser": ['Chrome']},
    "Chrome": {"n": 1, "t": 1, "u": 1}
});
```

### Test Order

The full test suite runs in this order:

| Suite | Tests |
|-------|-------|
| **frontend** | DB connection, setup page, login |
| **api** | Config, empty API, user CRUD, apps, tokens |
| **api.write** | Session writes, metrics, events, bulk, checksums |
| **plugins** | All enabled plugin tests |
| **cleanup** | Delete apps/users, close DB |
| **unit-tests** | Common utility unit tests |

---

## Best Practices

1. **Start clean, end clean** — Tests should leave the app in the same state they found it
2. **Test edge cases** — Include invalid inputs, missing parameters, unauthorized access
3. **Use timeouts** — Add `setTimeout(done, 100)` to allow async operations to complete
4. **Isolate tests** — Each test should be independent and not rely on side effects
5. **Test lifecycle handlers** — Verify `/i/apps/create`, `/i/apps/delete`, `/i/apps/reset` handlers

---

## Linting

All code must pass ESLint before tests run:

```bash
# Lint specific plugin
countly plugin lint <pluginname>
countly plugin lintfix <pluginname>

# Lint shell scripts
countly shellcheck
```

---

## CI/CD Integration

Tests run automatically on pull requests via GitHub Actions. Ensure:
- All tests pass locally before pushing
- No ESLint errors
- Shell scripts pass shellcheck validation
