var should = require('should');
var log = require('../../api/utils/log.js');

describe('Log utility tests', function() {
    describe('Default log levels', function() {
        it('should return warn as default level', function() {
            log.getLevel().should.equal('warn');
        });

        it('should return warn for mail module initially', function() {
            log.getLevel('mail').should.equal('warn');
        });
    });

    describe('Update log configuration', function() {
        before(function() {
            // Update configuration
            var msg = {
                cmd: 'log',
                config: {
                    debug: 'mail',
                    default: 'error',
                    error: '',
                    info: '',
                    warn: ''
                }
            };
            log.updateConfig(msg);
        });

        it('should update default level to error', function() {
            log.getLevel().should.equal('error');
        });

        it('should update mail module level to debug', function() {
            log.getLevel('mail').should.equal('debug');
        });
    });
});
