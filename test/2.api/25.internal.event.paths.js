/**
 * Plugin events that core fires itself with its own data are not request paths.
 * A request to one of the internal events named under /i and /o (requestProcessor's
 * INTERNAL_EVENTS) answers 400 Invalid path without running the hooks, instead of
 * running them without that data and never answering. Plugin routes dispatched by
 * request path keep working.
 *
 * requestProcessor also refuses every name outside /i and /o, but these requests go
 * through the proxy, which sends only /i and /o to the API, so that part is not
 * reachable from here.
 */

require('should');
const supertest = require('supertest');

const testUtils = require('../testUtils');
const request = supertest(testUtils.url);

// A refused request answers within milliseconds; one that reaches the hooks never
// answers, so fail it well before the suite's 50s mocha timeout.
const answerTimeout = 5000 * testUtils.testScalingFactor;

const INTERNAL_EVENT_PATHS = [
    "/i/device_id",
    "/i/user_merge",
    "/o/method/total_users",
    "/i/event/delete",
    "/i/events",
    "/o/validate"
];

describe('Internal plugin events requested as URL paths', function() {
    INTERNAL_EVENT_PATHS.forEach(function(path) {
        it('answers 400 Invalid path for a bare ' + path + ' request', async function() {
            this.timeout(answerTimeout);
            const res = await request
                .get(path)
                .expect(400);
            JSON.parse(res.text).result.should.startWith('Invalid path');
        });

        it('answers 400 Invalid path for ' + path + ' with request parameters', async function() {
            this.timeout(answerTimeout);
            const res = await request
                .get(path + '?app_key=' + testUtils.get("APP_KEY") + '&app_id=' + testUtils.get("APP_ID")
                    + '&device_id=internal_event_new&old_device_id=internal_event_old')
                .expect(400);
            JSON.parse(res.text).result.should.startWith('Invalid path');
        });
    });

    it('still dispatches a plugin route by request path', async function() {
        this.timeout(answerTimeout);
        // /o/langmap is the locale plugin's route, reached through the same fall-through dispatch
        const res = await request
            .get('/o/langmap')
            .expect(200);
        JSON.parse(res.text).should.have.property('en');
    });
});
