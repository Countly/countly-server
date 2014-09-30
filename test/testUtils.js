if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

if (typeof String.prototype.endsWith != 'function') {
  String.prototype.endsWith = function (str){
    return this.slice(-str.length) == str;
  };
}

var testUtils = function testUtils(){
	var csrf;
	var apiKey;
	var isLoggedIn = false;
	var that = this;
	var props = {};
	
	this.url = "http://localhost";
	this.name = "Test Test";
	this.username = "test";
	this.password = "test";
	this.email = "test@domain.com";
 
    this.setCSRF = function(token){
        csrf = token;
    };
	
	this.CSRFfromBody = function(body){
        var rePattern = new RegExp(/value="([^"]*)" name="_csrf"/);
		var arrMatches = body.match(rePattern);
		csrf = arrMatches[1];
		return csrf;
    };
	
	this.getCSRF = function(){
		return csrf;
	};
 
    this.waitCSRF = function(done){
        if (csrf) done();
		else setTimeout( function(){ that.waitCSRF(done) }, 1000 );
    };
	
	this.getApiKey = function(agent){
		agent
		.get('/api-key')
		.auth(this.username, this.password)
		.end(function(err, res){
			apiKey = res.text;
		});
	};
	
	this.waitApiKey = function(done){
        if (apiKey) done();
		else setTimeout( function(){ that.waitApiKey(done) }, 1000 );
    };
	
	this.login = function(agent){
		agent
		.get('/login')
		.expect('Content-Type', "text/html; charset=utf-8")
		.expect(200)
		.end(function(err, res){
			that.CSRFfromBody(res.text);
			//bug in superagent not saving cookies before callback
			process.nextTick(function () {
				agent
				.post('/login')
				.send({username:that.username, password:that.password, _csrf:that.getCSRF()})
				.end(function(err, res){
					isLoggedIn = true;
				});
			}); 
		});
	};
	
	this.waitLogin = function(done){
        if (isLoggedIn) done();
		else setTimeout( function(){ that.waitLogin(done) }, 1000 );
    };
	
	this.waitParsing = function(done){
        if (isParsed) done();
		else setTimeout( function(){ that.waitParsing(done) }, 1000 );
    };
	
	this.getLinkType = function(link){
		if(link.endsWith(".js"))
			return "application/javascript";
		else if(link.endsWith(".css"))
			return "text/css; charset=UTF-8";
		else if(link.endsWith(".png"))
			return "image/png";
		return "text/html; charset=utf-8";
	};
	
	this.processLink = function(rePattern, body){
		var matches = [], found, link;
		while (found = rePattern.exec(body)) {
			link = found[1];
			//remove query string
			link = link.split("?")[0];
			if(link.startsWith(this.url) || (!link.startsWith("http") && !link.startsWith("//") && !link.startsWith("mailto:") && !link.startsWith("#") && !link.startsWith("/logout")))
				matches.push(link);
		}
		return matches;
	}
	
	this.parseLinks = function(body){
		var matches = [];
		matches = matches.concat(this.processLink(new RegExp(/href="([^"]*)"/g), body));
		matches = matches.concat(this.processLink(new RegExp(/href='([^']*)'/g), body));
		matches = matches.concat(this.processLink(new RegExp(/src="([^"]*)"/g), body));
		matches = matches.concat(this.processLink(new RegExp(/src='([^']*)'/g), body));
		return matches
	};
	
	this.get = function(key){
		return props[key];
	};
	
	this.set = function(key, val){
		props[key] = val;
	};
}

module.exports = new testUtils();