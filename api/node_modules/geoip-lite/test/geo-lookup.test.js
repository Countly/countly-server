describe('Global leak test', function() {

	it('no global leaks should exist', function() {

		var geoip = require('../lib/geoip');

		geoip.lookup('127.0.0.1');

	});
});