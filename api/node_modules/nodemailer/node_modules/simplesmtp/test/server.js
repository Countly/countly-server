var testCase = require('nodeunit').testCase,
    runClientMockup = require("rai").runClientMockup,
    simplesmtp = require("../index"),
    netlib = require("net");

var PORT_NUMBER = 8397;

// monkey patch net and tls to support nodejs 0.4
if(!netlib.connect && netlib.createConnection){
    netlib.connect = netlib.createConnection;
}

exports["General tests"] = {
    setUp: function (callback) {
        
        this.smtp = new simplesmtp.createServer({
            SMTPBanner: "SCORPIO",
            name: "MYRDO",
            maxSize: 1234
        });
        this.smtp.listen(PORT_NUMBER, function(err){
            if(err){
                throw err;
            }else{
                callback();
            }
        });
        
    },
    tearDown: function (callback) {
        this.smtp.end(callback);
    },
    "QUIT": function(test){
        var cmds = ["QUIT"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("221",resp.toString("utf-8").trim().substr(0,3));
            test.done();
        });
        
    },
    "HELO": function(test){
        var cmds = ["HELO FOO"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("250",resp.toString("utf-8").trim().substr(0,3));
            test.done();
        });
        
    },
    "HELO fails": function(test){
        var cmds = ["HELO"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "EHLO": function(test){
        var cmds = ["EHLO FOO"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            resp = resp.toString("utf-8").trim();
            var lines = resp.split("\r\n");
            for(var i=0; i<lines.length-1; i++){
                test.equal("250-", lines[i].substr(0,4));
            }
            test.equal("250 ", lines[i].substr(0,4));
            test.done();
        });
    },
    "EHLO fails": function(test){
        var cmds = ["EHLO"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "HELO after STARTTLS": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "HELO FOO"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("250",resp.toString("utf-8").trim().substr(0,3));
            test.done();
        });
    },
    "HELO fails after STARTTLS": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "HELO"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "EHLO after STARTTLS": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "HELO FOO"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            resp = resp.toString("utf-8").trim();
            var lines = resp.split("\r\n");
            for(var i=0; i<lines.length-1; i++){
                test.equal("250-", lines[i].substr(0,4));
            }
            test.equal("250 ", lines[i].substr(0,4));
            test.done();
        });
    },
    "EHLO fails after STARTTLS": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH fails if not required": function(test){
        var cmds = ["EHLO FOO", "AUTH LOGIN"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH fails if not required TLS": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "AUTH LOGIN"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "Custom Greeting banner": function(test){        
        var client = netlib.connect(PORT_NUMBER, function(){
            client.on("data", function(chunk){
                test.equal("SCORPIO", (chunk || "").toString().trim().split(" ").pop());
                client.end();
            });
            client.on('end', function() {
                test.done();
            });
        });
    },
    "HELO name": function(test){
        var cmds = ["HELO FOO"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("MYRDO",resp.toString("utf-8").trim().substr(4).split(" ").shift());
            test.done();
        });
    },
    "EHLO name": function(test){
        var cmds = ["EHLO FOO"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("MYRDO",resp.toString("utf-8").trim().substr(4).split(" ").shift());
            test.done();
        });
    },
    "MAIL FROM options": function(test){
        var cmds = ["HELO FOO", "MAIL FROM:<test@gmail.com> BODY=8BITMIME"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.ok(resp.toString("utf-8").match(/^250/));
            test.done();
        });
    },
    "MAXSIZE": function(test){
        var cmds = ["EHLO FOO"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.ok(resp.toString("utf-8").trim().match(/^250[\- ]SIZE 1234$/mi));
            test.done();
        });
    }
};

exports["EHLO setting"] = {
    setUp: function (callback) {
        
        this.smtp = new simplesmtp.createServer({
            disableEHLO: true
        });
        this.smtp.listen(PORT_NUMBER, function(err){
            if(err){
                throw err;
            }else{
                callback();
            }
        });
        
    },
    tearDown: function (callback) {
        this.smtp.end(callback);
    },
    "Disable EHLO": function(test){
        runClientMockup(PORT_NUMBER, "localhost", ["EHLO foo"], function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            runClientMockup(PORT_NUMBER, "localhost", ["HELO foo"], function(resp){
                test.equal("2",resp.toString("utf-8").trim().substr(0,1));
                test.done();
            });
        });
        
    }
};

exports["Client disconnect"] = {

    "Client disconnect": function(test){
        
        var smtp = new simplesmtp.createServer(),
            clientEnvelope;
        smtp.listen(PORT_NUMBER, function(err){
            if(err){
                throw err;
            }
            
            runClientMockup(PORT_NUMBER, "localhost", ["EHLO foo", "MAIL FROM:<andris@pangalink.net>", "RCPT TO:<andris@pangalink.net>", "DATA"], function(resp){
                test.equal("3",resp.toString("utf-8").trim().substr(0,1));
            });
            
        });
        smtp.on("startData", function(envelope){
            clientEnvelope = envelope;
        });
        smtp.on("close", function(envelope){
            test.equal(envelope, clientEnvelope);
            smtp.end(function(){});
            test.done();
        });

    }
};

exports["Require AUTH"] = {
    setUp: function (callback) {
        
        this.smtp = new simplesmtp.createServer({requireAuthentication: true});
        this.smtp.listen(PORT_NUMBER, function(err){
            if(err){
                throw err;
            }else{
                callback();
            }
        });
        
        this.smtp.on("authorizeUser", function(envelope, username, password, callback){
            callback(null, username=="andris" && password=="test");
        });
        
    },
    tearDown: function (callback) {
        this.smtp.end(callback);
    },
    "Fail without AUTH": function(test){
        var cmds = ["EHLO FOO", "MAIL FROM:<andris@pangalink.net>"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "Unknown AUTH": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH CRAM"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH fails before STARTTLS": function(test){
        var cmds = ["EHLO FOO", "AUTH LOGIN"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH LOGIN": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH LOGIN"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("3",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH LOGIN Invalid login": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH LOGIN", 
                    new Buffer("inv").toString("base64"),
                    new Buffer("alid").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH LOGIN Invalid username": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH LOGIN", 
                    new Buffer("inv").toString("base64"),
                    new Buffer("test").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH LOGIN Invalid password": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH LOGIN", 
                    new Buffer("andris").toString("base64"),
                    new Buffer("alid").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH LOGIN Login success": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH LOGIN", 
                    new Buffer("andris").toString("base64"),
                    new Buffer("test").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("2",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("3",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN Invalid login": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN "+
                    new Buffer("inv\u0000inv\u0000alid").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN Invalid user": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN "+
                    new Buffer("inv\u0000inv\u0000test").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN Invalid password": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN "+
                    new Buffer("andris\u0000andris\u0000alid").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN Login success": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN "+
                    new Buffer("andris\u0000andris\u0000test").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("2",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN Yet another login success": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN",
                    new Buffer("andris\u0000andris\u0000test").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("2",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    }
};

exports["Enable AUTH"] = {
    setUp: function (callback) {
        
        this.smtp = new simplesmtp.createServer({enableAuthentication: true});
        this.smtp.listen(PORT_NUMBER, function(err){
            if(err){
                throw err;
            }else{
                callback();
            }
        });
        
        this.smtp.on("authorizeUser", function(envelope, username, password, callback){
            callback(null, username=="andris" && password=="test");
        });
        
    },
    tearDown: function (callback) {
        this.smtp.end(callback);
    },
    "Pass without AUTH": function(test){
        var cmds = ["EHLO FOO", "MAIL FROM:<andris@pangalink.net>"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("2",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "Unknown AUTH": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH CRAM"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH fails before STARTTLS": function(test){
        var cmds = ["EHLO FOO", "AUTH LOGIN"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH LOGIN": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH LOGIN"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("3",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH LOGIN Invalid login": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH LOGIN", 
                    new Buffer("inv").toString("base64"),
                    new Buffer("alid").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH LOGIN Invalid username": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH LOGIN", 
                    new Buffer("inv").toString("base64"),
                    new Buffer("test").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH LOGIN Invalid password": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH LOGIN", 
                    new Buffer("andris").toString("base64"),
                    new Buffer("alid").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH LOGIN Login success": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH LOGIN", 
                    new Buffer("andris").toString("base64"),
                    new Buffer("test").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("2",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("3",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN Invalid login": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN "+
                    new Buffer("inv\u0000inv\u0000alid").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN Invalid user": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN "+
                    new Buffer("inv\u0000inv\u0000test").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN Invalid password": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN "+
                    new Buffer("andris\u0000andris\u0000alid").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN Login success": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN "+
                    new Buffer("andris\u0000andris\u0000test").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("2",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "AUTH PLAIN Yet another login success": function(test){
        var cmds = ["EHLO FOO", "STARTTLS", "EHLO FOO", "AUTH PLAIN",
                    new Buffer("andris\u0000andris\u0000test").toString("base64")];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("2",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    }
};

exports["ignoreTLS"] = {
    setUp: function (callback) {

        this.smtp = new simplesmtp.createServer({requireAuthentication: true, ignoreTLS: true});
        this.smtp.listen(PORT_NUMBER, function(err){
            if(err){
                throw err;
            }else{
                callback();
            }
        });

        this.smtp.on("authorizeUser", function(envelope, username, password, callback){
            callback(null, username=="d3ph" && password=="test");
        });
    },
    tearDown: function (callback) {
        this.smtp.end(callback);
    },
    "Fail without AUTH": function(test){
        var cmds = ["EHLO FOO", "MAIL FROM:<d3ph.ru@gmail.com>"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "Fail MAIL FROM without HELO": function(test){
        var cmds = ["MAIL FROM:<d3ph.ru@gmail.com>"];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("5",resp.toString("utf-8").trim().substr(0,1));
            test.done();
        });
    },
    "Success AUTH & SEND MAIL with <CR><LF>.<CR><LF>": function(test){
        var cmds = ["EHLO FOO",
                    "AUTH PLAIN",
                    new Buffer("\u0000d3ph\u0000test").toString("base64"),
                    "MAIL FROM:<d3ph@github.com>",
                    "RCPT TO:<andris@pangalink.net>",
                    "DATA",
                    "Test mail\015\012.\015\012",
                    ];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            var resp = resp.toString("utf-8").trim();
            test.equal("2",resp.substr(0,1));
            test.ok(resp.match('queued as'));
            test.done();
        });
    }
};

exports["Sending mail listen for dataReady"] = {
    setUp: function (callback) {
        var data = "";

        this.smtp = new simplesmtp.createServer({ignoreTLS: true});
        this.smtp.listen(PORT_NUMBER, function(err){
            if(err){
                throw err;
            }else{
                callback();
            }
        });

        this.smtp.on("authorizeUser", function(envelope, username, password, callback){
            callback(null, username=="d3ph" && password=="test");
        });

        this.smtp.on("data", function(envelope, chunk){
            data += chunk;
        });

        this.smtp.on("dataReady", function(envelope, callback){
            setTimeout(function(){
                if (data.match('spam')) {
                    callback(new Error("FAILED"));
                } else {
                    callback(null, '#ID');
                }
            }, 2000);
        });
    },
    tearDown: function (callback) {
        this.smtp.end(callback);
    },
    "Fail send mail if body contains 'spam'": function(test){
        var cmds = ["EHLO FOO",
                    "MAIL FROM:<d3ph@github.com>",
                    "RCPT TO:<andris@pangalink.net>",
                    "DATA",
                    "Test mail with spam!\015\012.\015\012",
                    ];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            test.equal("550 FAILED",resp.toString("utf-8").trim());
            test.done();
        });
    },
    "Create #ID for mail": function(test){
        var cmds = ["EHLO FOO",
                    "MAIL FROM:<d3ph@github.com>",
                    "RCPT TO:<andris@pangalink.net>",
                    "DATA",
                    "Clear mail body\015\012.\015\012",
                    ];
        runClientMockup(PORT_NUMBER, "localhost", cmds, function(resp){
            var resp = resp.toString("utf-8").trim();
            test.equal("2",resp.substr(0,1));
            test.ok(resp.match('#ID'));
            test.done();
        });
    }
}

