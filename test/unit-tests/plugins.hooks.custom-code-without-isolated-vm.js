var should = require('should');
var Module = require('module');
var path = require('path');

// isolated-vm is a native module that needs Node.js 22 or later. A package install still
// on an older Node.js has no working isolated-vm, and that must not stop the hooks plugin
// from loading: only custom code effects may fail, with an error that says why.

var EFFECTS_DIR = path.join(__dirname, '../../plugins/hooks/api/parts/effects');
var CUSTOM_CODE = require.resolve(path.join(EFFECTS_DIR, 'custom_code.js'));
var EFFECTS_INDEX = require.resolve(path.join(EFFECTS_DIR, 'index.js'));
var hooksUtils = require('../../plugins/hooks/api/utils');

describe('Hooks custom code effect without isolated-vm', function() {
    var originalLoad;
    var originalAddErrorRecord;
    var errorRecords;

    before(function() {
        originalLoad = Module._load;
        Module._load = function(request) {
            if (request === 'isolated-vm') {
                throw new Error("Cannot find module 'isolated-vm'");
            }
            return originalLoad.apply(this, arguments);
        };
        originalAddErrorRecord = hooksUtils.addErrorRecord;
        hooksUtils.addErrorRecord = function(hookId, error) {
            errorRecords.push({hookId: hookId, message: error.message});
        };
        delete require.cache[CUSTOM_CODE];
        delete require.cache[EFFECTS_INDEX];
    });

    beforeEach(function() {
        errorRecords = [];
    });

    after(function() {
        Module._load = originalLoad;
        hooksUtils.addErrorRecord = originalAddErrorRecord;
        delete require.cache[CUSTOM_CODE];
        delete require.cache[EFFECTS_INDEX];
    });

    it('loads the effects module', function() {
        var effects = require(EFFECTS_INDEX);
        should(effects.HTTPEffect).be.a.Function();
        should(effects.EmailEffect).be.a.Function();
        should(effects.CustomCodeEffect).be.a.Function();
    });

    it('fails a custom code run with an error naming Node.js 22', async function() {
        var CustomCodeEffect = require(CUSTOM_CODE);
        var effect = new CustomCodeEffect();
        var result = await effect.run({
            effect: {configuration: {code: 'params.a = 2;'}},
            params: {a: 1},
            rule: {_id: 'hook-1'},
            effectStep: 0,
            _originalInput: {}
        });
        should(result.params).be.undefined();
        result.logs.should.have.length(1);
        result.logs[0].should.startWith('Error: Custom code effects need Node.js 22 or later (isolated-vm could not be loaded:');
        errorRecords.should.have.length(1);
        errorRecords[0].hookId.should.equal('hook-1');
        errorRecords[0].message.should.startWith('Custom code effects need Node.js 22 or later');
    });

    it('fails every later run the same way', async function() {
        var CustomCodeEffect = require(CUSTOM_CODE);
        var effect = new CustomCodeEffect();
        var result = await effect.run({
            effect: {configuration: {code: 'params.a = 3;'}},
            params: {a: 1},
            rule: {_id: 'hook-2'},
            effectStep: 0,
            _originalInput: {}
        });
        result.logs[0].should.startWith('Error: Custom code effects need Node.js 22 or later');
        errorRecords.should.have.length(1);
        errorRecords[0].hookId.should.equal('hook-2');
    });
});
