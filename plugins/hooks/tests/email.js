var should = require('should');
var utils = require('../api/utils');

// Regression tests for HTML escaping of trigger values substituted into the
// hook email effect template (prevents HTML/script injection into the email
// body via attacker-controlled trigger data).

describe('Testing hook email template escaping', function() {
    it('escapes substituted values when escapeHtml is set', function(done) {
        var out = utils.parseStringTemplate("Hello {{name}}", {name: '<script>alert(1)</script>'}, null, true);
        out.should.containEql('&lt;script&gt;');
        out.indexOf('<script>').should.eql(-1);
        done();
    });

    it('escapes quotes and ampersands too', function(done) {
        var out = utils.parseStringTemplate("{{v}}", {v: '"a" & <b>'}, null, true);
        out.should.eql('&quot;a&quot; &amp; &lt;b&gt;');
        done();
    });

    it('does not HTML-escape when escapeHtml is not set (non-HTML contexts)', function(done) {
        var out = utils.parseStringTemplate("{{v}}", {v: '<b>'}, null, false);
        out.should.eql('<b>');
        done();
    });
});
