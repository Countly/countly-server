var fs = require('fs');

describe('Outputing logs', function(){
	describe('countly-dashboard.log', function(){
		it('should output', function(done){
			fs.readFile('log/countly-dashboard.log', 'utf8', function (err,data) {
				if (err) {
					console.log(err);
				}
				console.log(data);
				done();
			});
		});
	});
	describe('countly-api.log', function(){
		it('should output', function(done){
			fs.readFile('log/countly-api.log', 'utf8', function (err,data) {
				if (err) {
					console.log(err);
				}
				console.log(data);
				done();
			});
		});
	});
});