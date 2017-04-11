var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
var request = request(testUtils.url);
const assert = require('assert');
const assistant = require("./assistant.js");

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Testing Assistant functionality', function(){
    describe('verify basic function correctness', function(){
        it('correct_time should work correct', function(done){
            const halfInterval = assistant.JOB_SCHEDULE_INTERVAL / 2;
            const miniStep = 1;//a small step that is used to step over limits

            for(var i = 0 ; i <= 24 ; i++) {
                const targetHour = i;
                const lowerLimitMinute = 60 - halfInterval;
                const justUnderLowerLimitMinute = lowerLimitMinute - miniStep;
                const justUnderUpperLimit = halfInterval - miniStep;

                try {
                    //right on time
                    assert.equal(true, assistant.correct_time(targetHour, targetHour, 0));

                    //just on lower limit
                    assert.equal(true, assistant.correct_time(targetHour, targetHour - 1, lowerLimitMinute));
                    //just under lower limit
                    assert.equal(false, assistant.correct_time(targetHour, targetHour - 1, justUnderLowerLimitMinute));

                    //just over upper limit
                    assert.equal(false, assistant.correct_time(targetHour, targetHour, halfInterval));
                    //just under upper limit
                    assert.equal(true, assistant.correct_time(targetHour, targetHour, halfInterval - 1));

                    //a lot under limit
                    assert.equal(false, assistant.correct_time(targetHour, targetHour - 10, 0));

                    //a lot over limit
                    assert.equal(false, assistant.correct_time(targetHour, targetHour + 10, 0));
                } catch (ex) {
                    log.e('Assistant test [%j] FAILED!!!!! [%j]', assistant.correct_time, { message: ex.message, stack: ex.stack });
                    log.e('Used values| targetHour:[%j], lowerLimit:[%j], justUnderLowerLimit:[%j], justUnderUpperLimit:[%j]', targetHour, lowerLimitMinute, justUnderLowerLimitMinute, justUnderUpperLimit);
                    throw ex;
                }
            }

            done();
        });
    });
});