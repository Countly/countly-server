# Countly Test Suite

# Test Framework

Tests are run using **Grunt** task runner with:
- **Mocha.js** — Test framework
- **should.js** — Assertion library
- **supertest** — HTTP request testing

## Quick Start

```bash
# Run all tests (via Grunt)
npm test

# Run specific test suites
npm run test:api-core           # Core API tests (no plugins)
npm run test:lite-plugins       # CE plugin tests (30 plugins)
npm run test:enterprise-plugins # EE-only plugin tests (26 plugins)
npm run test:plugin -- <name>   # Single plugin tests
```

## Test Suites

| Command | Description | Plugins |
|---------|-------------|---------|
| `npm run test:api-core` | Core API functionality | CE (default) |
| `npm run test:lite-plugins` | Community Edition plugins | 30 CE plugins |
| `npm run test:enterprise-plugins` | Enterprise-only plugins | 26 EE-exclusive |
| `npm run test:plugin -- drill` | Single named plugin | All (EE) |

## Single Plugin Testing

```bash
# Test a specific plugin
npm run test:plugin -- drill
npm run test:plugin -- funnels
npm run test:plugin -- clickhouse
```

## Parallel Execution

Each test suite uses isolated ports and Docker containers, allowing parallel execution:

```bash
# Run in separate terminals
npm run test:api-core &
npm run test:lite-plugins &
npm run test:enterprise-plugins &
```

### Port Configuration

| Suite | MongoDB | ClickHouse | Kafka | Nginx | API | Frontend |
|-------|---------|------------|-------|-------|-----|----------|
| core | 37017 | 18123 | 19092 | 10080 | 13001 | 16001 |
| lite | 37117 | 18223 | 19192 | 10180 | 13101 | 16101 |
| enterprise | 37217 | 18323 | 19292 | 10280 | 13201 | 16201 |
| plugin | 37317 | 18423 | 19392 | 10380 | 13301 | 16301 |

## Unit Tests

```bash
# Run unit tests only (no Docker/services required)
npm run test:unit
```

## Environment Variables

Tests automatically configure these, but can be overridden:

```bash
COUNTLY_TEST_APP_ID=58bf06bd6cba850047ac9f19
COUNTLY_TEST_APP_KEY=b41e02136be60a58b9b7459ad89030537a58e099
COUNTLY_TEST_API_KEY_ADMIN=e6bfab40a224d55a2f5d40c83abc7ed4
```

## Test Directory Structure

```
test/
├── configs/                    # Test configurations
│   ├── api-core.js            # Core API mocha config
│   ├── lite-plugins.js        # CE plugins mocha config
│   ├── enterprise-plugins.js  # EE plugins mocha config
│   ├── single-plugin.js       # Single plugin mocha config
│   ├── integration-hooks.js   # Docker/service orchestration
│   ├── docker-compose.test-*.yml  # Docker configs per suite
│   └── test-*.env             # Environment files per suite
├── 1.frontend/                # Frontend/DB setup tests
├── 2.api/                     # API read tests
├── 3.api.write/               # API write tests
├── 4.plugins/                 # Plugin test loader
├── 5.cleanup/                 # Cleanup tests
└── unit/                      # Unit tests (no services)
```

## Troubleshooting

### Services not starting
```bash
# Check Docker containers
docker ps -a | grep test-

# View logs
docker logs test-core-mongodb
docker logs test-core-clickhouse
```

### Port conflicts
```bash
# Check if ports are in use
lsof -i :37017  # MongoDB
lsof -i :18123  # ClickHouse
```

### Clean up stale containers
```bash
# Remove all test containers
docker rm -f $(docker ps -aq --filter "name=test-")
docker network prune -f
```
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


