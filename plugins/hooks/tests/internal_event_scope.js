var should = require('should');
var InternalEventTrigger = require('../api/parts/triggers/internal_event.js');
var utils = require('../api/utils.js');

// Regression tests for app scoping of hooks internal events.
//
// InternalEventTrigger.process() matches a dispatched event against every
// enabled hook subscribed to that event type. Each case must either be listed in
// GLOBAL_EVENT_TYPES (delivered only to global-admin-owned hooks) or check the
// event's app id against the hook's own apps list. Several cases previously did
// neither, so a hook scoped to one app received other apps' data:
//
//   /i/apps/create              the new app document, including its SDK key,
//                               id_key, accepted keys[] and checksum salt
//   /i/remote-config/*          another app's parameter keys, default values and
//                               serialized condition queries
//   /cohort/enter|exit          matched on an unvalidated cohortID from the
//                               hook's own config, then read
//                               app_users<cohort.app_id>
//   /hooks/trigger              matched on an unvalidated hookID, forwarding the
//                               source hook's entire document (every effect
//                               configuration, including HTTP headers and custom
//                               code) plus the data that fired it
//   /alerts/trigger             fired every hook on the instance on any app's
//                               alert
//
// These exercise process() directly rather than over HTTP, because delivery is
// driven by plugins.dispatch from other plugins and "the hook did not fire" is
// not observable through the API.

describe('Testing Hooks internal event app scoping', function() {
    var trigger;
    var delivered;
    var originalUpdateRuleTriggerTime;

    // A well-formed object id that is not a real member, so the global-event
    // owner lookup resolves to nothing and fails closed. Deliberately not
    // stubbing common.db: that is shared state for the whole test process, and
    // replacing it even briefly can break unrelated suites with in-flight work.
    var UNKNOWN_OWNER_ID = '0123456789abcdef01234567';

    before(function() {
        // updateRuleTriggerTime writes through a db batcher that is not available
        // in the test process; the scoping decision is what is under test
        originalUpdateRuleTriggerTime = utils.updateRuleTriggerTime;
        utils.updateRuleTriggerTime = function() {};
    });

    after(function() {
        utils.updateRuleTriggerTime = originalUpdateRuleTriggerTime;
    });

    beforeEach(function() {
        delivered = [];
        trigger = new InternalEventTrigger({
            pipeline: function(data) {
                delivered.push(data);
            }
        });
    });

    /**
     * Build a single hook rule scoped to the given apps
     * @param {string} eventType - internal event type to subscribe to
     * @param {Array} apps - app ids the hook is scoped to
     * @param {object} extraConfig - extra trigger configuration fields
     * @returns {object} hook rule
     */
    function ruleFor(eventType, apps, extraConfig) {
        return {
            _id: 'hook-under-test',
            createdBy: UNKNOWN_OWNER_ID,
            apps: apps,
            trigger: {
                type: 'InternalEventTrigger',
                configuration: Object.assign({eventType: eventType}, extraConfig || {})
            }
        };
    }

    describe('/i/apps/create', function() {
        it('should be a global event type', function() {
            InternalEventTrigger.GLOBAL_EVENT_TYPES.should.have.property('/i/apps/create', true);
        });

        it('should not deliver to a hook whose owner is not a global admin', async function() {
            trigger._rules = [ruleFor('/i/apps/create', ['appA'])];
            await trigger.process({
                appId: 'appB',
                data: {_id: 'appB', name: 'Victim App', key: 'victim-sdk-key', id_key: 'victim-sdk-key'}
            }, '/i/apps/create');
            delivered.length.should.eql(0);
        });

    });

    describe('/i/remote-config/*', function() {
        it('should not deliver a parameter change from another app', async function() {
            trigger._rules = [ruleFor('/i/remote-config/add-parameter', ['appA'])];
            await trigger.process({
                params: {appId: 'appB', parameter_key: 'paywall_variant', default_value: 'premium'}
            }, '/i/remote-config/add-parameter');
            delivered.length.should.eql(0);
        });

        it('should deliver a parameter change from an app the hook is scoped to', async function() {
            trigger._rules = [ruleFor('/i/remote-config/add-parameter', ['appA'])];
            await trigger.process({
                params: {appId: 'appA', parameter_key: 'paywall_variant', default_value: 'premium'}
            }, '/i/remote-config/add-parameter');
            delivered.length.should.eql(1);
        });

        it('should not deliver when the dispatch carries no app id', async function() {
            trigger._rules = [ruleFor('/i/remote-config/update-condition', ['appA'])];
            await trigger.process({
                params: {condition_name: 'segment', condition: '{}'}
            }, '/i/remote-config/update-condition');
            delivered.length.should.eql(0);
        });
    });

    describe('/cohort/enter', function() {
        it('should not deliver a cohort from an app the hook is not scoped to', async function() {
            trigger._rules = [ruleFor('/cohort/enter', ['appA'], {cohortID: 'cohort-1'})];
            await trigger.process({
                cohort: {_id: 'cohort-1', app_id: 'appB', name: 'Victim cohort'},
                uids: ['1']
            }, '/cohort/enter');
            delivered.length.should.eql(0);
        });
    });

    describe('/hooks/trigger', function() {
        it('should not deliver another app hook payload even when hookID matches', async function() {
            trigger._rules = [ruleFor('/hooks/trigger', ['appA'], {hookID: 'victim-hook'})];
            await trigger.process({
                rule: {
                    _id: 'victim-hook',
                    apps: ['appB'],
                    effects: [{type: 'HTTPEffect', configuration: {url: 'https://victim.example', headers: {Authorization: 'Bearer secret'}}}]
                },
                params: {some: 'data'},
                eventType: '/hooks/trigger'
            }, '/hooks/trigger');
            delivered.length.should.eql(0);
        });

        it('should deliver when the source hook is within the same apps', async function() {
            trigger._rules = [ruleFor('/hooks/trigger', ['appA'], {hookID: 'sibling-hook'})];
            await trigger.process({
                rule: {_id: 'sibling-hook', apps: ['appA'], effects: []},
                params: {some: 'data'},
                eventType: '/hooks/trigger'
            }, '/hooks/trigger');
            delivered.length.should.eql(1);
        });
    });

    describe('/alerts/trigger', function() {
        it('should not fire for an alert belonging to another app', async function() {
            trigger._rules = [ruleFor('/alerts/trigger', ['appA'])];
            await trigger.process({appId: 'appB', alertID: 'alert-1'}, '/alerts/trigger');
            delivered.length.should.eql(0);
        });

        it('should fire for an alert belonging to a scoped app', async function() {
            trigger._rules = [ruleFor('/alerts/trigger', ['appA'])];
            await trigger.process({appId: 'appA', alertID: 'alert-1'}, '/alerts/trigger');
            delivered.length.should.eql(1);
        });

        it('should not forward the scoping fields to the effect payload', async function() {
            trigger._rules = [ruleFor('/alerts/trigger', ['appA'])];
            await trigger.process({appId: 'appA', alertID: 'alert-1'}, '/alerts/trigger');
            delivered.length.should.eql(1);
            Object.keys(delivered[0].params).length.should.eql(0);
        });
    });

    describe('already scoped events', function() {
        it('should still deliver /crashes/new for a scoped app', async function() {
            trigger._rules = [ruleFor('/crashes/new', ['appA'])];
            await trigger.process({data: {app: {_id: 'appA'}, crash: {}}}, '/crashes/new');
            delivered.length.should.eql(1);
        });

        it('should not deliver /crashes/new for another app', async function() {
            trigger._rules = [ruleFor('/crashes/new', ['appA'])];
            await trigger.process({data: {app: {_id: 'appB'}, crash: {}}}, '/crashes/new');
            delivered.length.should.eql(0);
        });
    });
});
