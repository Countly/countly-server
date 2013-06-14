var testCase = require('nodeunit').testCase,
    runClientMockup = require("rai").runClientMockup,
    simplesmtp = require("../index"),
    MailComposer = require("mailcomposer").MailComposer,
    fs = require("fs");

var PORT_NUMBER = 8397;

exports["General tests"] = {
    setUp: function (callback) {
        this.server = new simplesmtp.createServer({});
        this.server.listen(PORT_NUMBER, function(err){
            if(err){
                throw err;
            }else{
                callback();
            }
        });
        
    },
    
    tearDown: function (callback) {
        this.server.end(callback);
    },
    
    "Send single message": function(test){
        
        var pool = simplesmtp.createClientPool(PORT_NUMBER),
            mc = new MailComposer({escapeSMTP: true});
            
        mc.setMessageOption({
            from: "andmekala@hot.ee",
            to: "andris@node.ee",
            subject:"Hello!",
            body: "Hello world!",
            html: "<b>Hello world!</b>"
        });
        
        this.server.on("dataReady", function(envelope, callback){
            test.ok(true);
            callback();
        });
        
        pool.sendMail(mc, function(error){
            test.ifError(error);
            pool.close(function(){
                test.ok(true);
                test.done();
            });
        });
    },
    
    "Send several messages": function(test){
        var total = 10;
        
        test.expect(total*2);
        
        var pool = simplesmtp.createClientPool(PORT_NUMBER),
            mc;
        
        this.server.on("dataReady", function(envelope, callback){
            process.nextTick(callback);
        });
        
        var completed = 0;
        for(var i=0; i<total; i++){
            mc = new MailComposer({escapeSMTP: true});
            mc.setMessageOption({
                from: "andmekala@hot.ee",
                to: "andris@node.ee",
                subject:"Hello!",
                body: "Hello world!",
                html: "<b>Hello world!</b>"
            });
            pool.sendMail(mc, function(error){
                test.ifError(error);
                test.ok(true);
                completed++;
                if(completed >= total){
                    pool.close(function(){
                        test.done();
                    });
                }
            });
        }
    },
    
    "Delivery error once": function(test){
        
        var pool = simplesmtp.createClientPool(PORT_NUMBER),
            mc = new MailComposer({escapeSMTP: true});
            
        mc.setMessageOption({
            from: "andmekala@hot.ee",
            to: "andris@node.ee",
            subject:"Hello!",
            body: "Hello world!",
            html: "<b>Hello world!</b>"
        });
        
        this.server.on("dataReady", function(envelope, callback){
            test.ok(true);
            callback(new Error("Spam!"));
        });
        
        pool.sendMail(mc, function(error){
            test.equal(error && error.name, "DeliveryError");
            pool.close(function(){
                test.ok(true);
                test.done();
            });
        });
    },
    
    "Delivery error several times": function(test){
        var total = 10;
        
        test.expect(total);
        
        var pool = simplesmtp.createClientPool(PORT_NUMBER),
            mc;
        
        this.server.on("dataReady", function(envelope, callback){
            process.nextTick(function(){callback(new Error("Spam!"));});
        });
        
        var completed = 0;
        for(var i=0; i<total; i++){
            mc = new MailComposer({escapeSMTP: true});
            mc.setMessageOption({
                from: "andmekala@hot.ee",
                to: "andris@node.ee",
                subject:"Hello!",
                body: "Hello world!",
                html: "<b>Hello world!</b>"
            });
            
            pool.sendMail(mc, function(error){
                test.equal(error && error.name, "DeliveryError");
                completed++;
                if(completed >= total){
                    pool.close(function(){
                        test.done();
                    });
                }
            });
        }
    }
};

exports["Auth fail tests"] = {
    setUp: function (callback) {
        this.server = new simplesmtp.createServer({
            requireAuthentication: true
        });
        
        this.server.listen(PORT_NUMBER, function(err){
            if(err){
                throw err;
            }else{
                callback();
            }
        });
        
        this.server.on("authorizeUser", function(envelope, username, password, callback){
            callback(null, username == password);
        });
    },
    
    tearDown: function (callback) {
        this.server.end(callback);
    },
    
    "Authentication passes once": function(test){
        var pool = simplesmtp.createClientPool(PORT_NUMBER, false, {
                auth: {
                    "user": "test",
                    "pass": "test"
                }
            }),
            mc = new MailComposer({escapeSMTP: true});
            
        mc.setMessageOption({
            from: "andmekala2@hot.ee",
            to: "andris2@node.ee",
            subject:"Hello2!",
            body: "Hello2 world!",
            html: "<b>Hello2 world!</b>"
        });
        
        this.server.on("dataReady", function(envelope, callback){
            test.ok(true);
            callback();
        });
        
        pool.sendMail(mc, function(error){
            test.ifError(error);
            pool.close(function(){
                test.ok(true);
                test.done();
            });
        });
        
    },
    
    "Authentication error once": function(test){
        var pool = simplesmtp.createClientPool(PORT_NUMBER, false, {
                auth: {
                    "user": "test1",
                    "pass": "test2"
                }
            }),
            mc = new MailComposer({escapeSMTP: true});
            
        mc.setMessageOption({
            from: "andmekala2@hot.ee",
            to: "andris2@node.ee",
            subject:"Hello2!",
            body: "Hello2 world!",
            html: "<b>Hello2 world!</b>"
        });
        
        this.server.on("dataReady", function(envelope, callback){
            test.ok(true);
            callback();
        });
        
        pool.sendMail(mc, function(error){
            test.equal(error && error.name, "AuthError");
            pool.close(function(){
                test.ok(true);
                test.done();
            });
        });
        
    },
    
    "Authentication error several times": function(test){
        var total = 10;
        test.expect(total);
        
        var pool = simplesmtp.createClientPool(PORT_NUMBER, false, {
                auth: {
                    "user": "test1",
                    "pass": "test2"
                }
            }),
            mc;
        this.server.on("dataReady", function(envelope, callback){
            process.nextTick(function(){callback(new Error("Spam!"));});
        });
        
        var completed = 0;
        for(var i=0; i<total; i++){
            mc = new MailComposer({escapeSMTP: true});
            mc.setMessageOption({
                from: "andmekala@hot.ee",
                to: "andris@node.ee",
                subject:"Hello!",
                body: "Hello world!",
                html: "<b>Hello world!</b>"
            });
            
            pool.sendMail(mc, function(error){
                test.equal(error && error.name, "AuthError");
                completed++;
                if(completed >= total){
                    pool.close(function(){
                        test.done();
                    });
                }
            });
        }
    }
};