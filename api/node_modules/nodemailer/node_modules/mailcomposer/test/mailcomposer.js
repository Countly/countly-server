var testCase = require('nodeunit').testCase,
    MailComposer = require("../lib/mailcomposer").MailComposer,
    toPunycode = require("../lib/punycode"),
    MailParser = require("mailparser").MailParser,
    fs = require("fs"),
    mime = require("mime"),
    http = require("http");


var HTTP_PORT = 9437;

exports["General tests"] = {

    "Create a new MailComposer object": function(test){
        var mailcomposer = new MailComposer();
        test.equal(typeof mailcomposer.on, "function");
        test.equal(typeof mailcomposer.emit, "function");
        test.done();
    },

    "Normalize key names": function(test){
        var normalizer = MailComposer.prototype._normalizeKey;

        test.equal(normalizer("abc"), "Abc");
        test.equal(normalizer("aBC"), "Abc");
        test.equal(normalizer("ABC"), "Abc");
        test.equal(normalizer("a-b-c"), "A-B-C");
        test.equal(normalizer("ab-bc"), "Ab-Bc");
        test.equal(normalizer("ab-bc-cd"), "Ab-Bc-Cd");
        test.equal(normalizer("AB-BC-CD"), "Ab-Bc-Cd");
        test.equal(normalizer("mime-version"), "MIME-Version"); // special case

        test.done();
    },

    "Add header": function(test){
        var mc = new MailComposer();
        test.equal(typeof mc._headers["Test-Key"], "undefined");
        mc.addHeader("test-key", "first");
        test.equal(mc._headers["Test-Key"], "first");
        mc.addHeader("test-key", "second");
        test.deepEqual(mc._headers["Test-Key"], ["first","second"]);
        mc.addHeader("test-key", "third");
        test.deepEqual(mc._headers["Test-Key"], ["first","second","third"]);
        test.done();
    },

    "Get header": function(test){
        var mc = new MailComposer();
        test.equal(mc._getHeader("MIME-Version"), "1.0");
        test.equal(mc._getHeader("test-key"), "");
        mc.addHeader("test-key", "first");
        test.equal(mc._getHeader("test-key"), "first");
        mc.addHeader("test-key", "second");
        test.deepEqual(mc._getHeader("test-key"), ["first", "second"]);
        test.done();
    },

    "Uppercase header keys": function(test){
        var mc = new MailComposer();

        mc.addHeader("X-TEST", "first");
        test.equal(mc._headers["X-TEST"], "first");

        mc.addHeader("TEST", "second");
        test.equal(mc._headers["Test"], "second");

        test.done();
    },

    "Set object header": function(test){
        var mc = new MailComposer();

        var testObj = {
                stringValue: "String with unicode symbols: ÕÄÖÜŽŠ",
                arrayValue: ["hello ÕÄÖÜ", 12345],
                objectValue: {
                    customerId: "12345"
                }
            };

        mc.addHeader("x-mytest-string", "first");
        mc.addHeader("x-mytest-json", testObj);

        mc.streamMessage();

        //mc.on("data", function(c){console.log(c.toString("utf-8"))})

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.headers['x-mytest-string'], "first");
            test.deepEqual(JSON.parse(mail.headers['x-mytest-json']), testObj);
            //console.log(mail)
            test.done();
        });
    },

    "Add message option": function(test){
        var mc = new MailComposer();
        test.equal(typeof mc._message.subject, "undefined");

        mc.setMessageOption({
            subject: "Test1",
            body: "Test2",
            nonexistent: "Test3"
        });

        test.equal(mc._message.subject, "Test1");
        test.equal(mc._message.body, "Test2");
        test.equal(typeof mc._message.nonexistent, "undefined");

        mc.setMessageOption({
            subject: "Test4"
        });

        test.equal(mc._message.subject, "Test4");
        test.equal(mc._message.body, "Test2");

        test.done();
    },

    "Detect mime type": function(test){
        var mc = new MailComposer();

        test.equal(mime.lookup("test.txt"), "text/plain");
        test.equal(mime.lookup("test.unknown"), "application/octet-stream");

        test.done();
    },

    "keepBcc off": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({bcc: "andris@node.ee"});
        mc._buildMessageHeaders();
        test.ok(!mc._getHeader("Bcc"));
        test.done();
    },

    "keepBcc on": function(test){
        var mc = new MailComposer({keepBcc: true});
        mc.setMessageOption({bcc: "andris@node.ee"});
        mc._buildMessageHeaders();
        test.equal(mc._getHeader("Bcc"), "andris@node.ee");
        test.done();
    },

    "zero length cc": function(test){
        var mc = new MailComposer({keepBcc: true});
        mc.setMessageOption({cc: ""});
        mc._buildMessageHeaders();
        test.equal(mc._getHeader("cc"), "");
        test.done();
    }
};


exports["Text encodings"] = {
    "Punycode": function(test){
        test.equal(toPunycode("andris@age.ee"), "andris@age.ee");
        test.equal(toPunycode("andris@äge.ee"), "andris@xn--ge-uia.ee");
        test.done();
    },

    "Mime words": function(test){
        var mc = new MailComposer();
        test.equal(mc._encodeMimeWord("Tere"), "Tere");
        test.equal(mc._encodeMimeWord("Tere","Q"), "Tere");
        test.equal(mc._encodeMimeWord("Tere","B"), "Tere");

        // simple
        test.equal(mc._encodeMimeWord("äss"), "=?UTF-8?Q?=C3=A4ss?=");
        test.equal(mc._encodeMimeWord("äss","B"), "=?UTF-8?B?"+(new Buffer("äss","utf-8").toString("base64"))+"?=");

        //multiliple
        test.equal(mc._encodeMimeWord("äss tekst on see siin või kuidas?","Q", 20), "=?UTF-8?Q?=C3=A4ss?= tekst on see siin =?UTF-8?Q?v=C3=B5i?= kuidas?");

        test.done();
    },

    "Addresses": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            sender: '"Jaanuar Veebruar, Märts" <märts@märts.eu>'
        });

        test.equal(mc._message.from, "\"Jaanuar Veebruar, =?UTF-8?Q?M=C3=A4rts?=\" <=?UTF-8?Q?m=C3=A4rts?=@xn--mrts-loa.eu>");

        mc.setMessageOption({
            sender: 'aavik <aavik@node.ee>'
        });

        test.equal(mc._message.from, '"aavik" <aavik@node.ee>');

        mc.setMessageOption({
            sender: '<aavik@node.ee>'
        });

        test.equal(mc._message.from, 'aavik@node.ee');

        mc.setMessageOption({
            sender: '<aavik@märts.eu>'
        });

        test.equal(mc._message.from, 'aavik@xn--mrts-loa.eu');

        // multiple

        mc.setMessageOption({
            sender: '<aavik@märts.eu>, juulius@node.ee, "Node, Master" <node@node.ee>'
        });

        test.equal(mc._message.from, 'aavik@xn--mrts-loa.eu, juulius@node.ee, "Node, Master" <node@node.ee>');

        mc.setMessageOption({
            sender: ['<aavik@märts.eu>', 'juulius@node.ee, "Node, Master" <node@node.ee>', 'andris@node.ee']
        });

        mc.setMessageOption({
            to: ['<aavik@märts.eu>', 'juulius@node.ee, "Node, Master" <node@node.ee>', 'andris@node.ee']
        });

        test.equal(mc._message.from, 'aavik@xn--mrts-loa.eu, juulius@node.ee, "Node, Master" <node@node.ee>, andris@node.ee');
        test.equal(mc._message.to, 'aavik@xn--mrts-loa.eu, juulius@node.ee, "Node, Master" <node@node.ee>, andris@node.ee');

        test.done();
    },

    "Invalid subject": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            subject: "tere\ntere!"
        });

        test.equal(mc._message.subject, "tere tere!");
        test.done();
    },

    "Long header line": function(test){
        var mc = new MailComposer();

        mc._headers = {
            From: "a very log line, \"=?UTF-8?Q?Jaanuar_Veebruar,_M=C3=A4rts?=\" <=?UTF-8?Q?m=C3=A4rts?=@xn--mrts-loa.eu>"
        };

        mc.on("data", function(chunk){
            test.ok(chunk.toString().trim().match(/From\:\s[^\r\n]+\r\n\s+[^\r\n]+/));
            test.done();
        });
        mc._composeHeader();

    }

};

exports["Mail related"] = {
    "Envelope": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            sender: '"Jaanuar Veebruar, Märts" <märts@märts.eu>',
            to: '<aavik@märts.eu>, juulius@node.ee',
            cc: '"Node, Master" <node@node.ee>'
        });

        test.deepEqual(mc._envelope, {from:[ 'märts@xn--mrts-loa.eu' ],to:[ 'aavik@xn--mrts-loa.eu', 'juulius@node.ee'], cc:['node@node.ee' ]});
        test.done();
    },

    "User defined envelope": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            sender: '"Jaanuar Veebruar, Märts" <märts@märts.eu>',
            envelope: {
                from: "Andris <andris@tr.ee>",
                to: ["Andris <andris@tr.ee>, Node <andris@node.ee>", "aavik@märts.eu", "juulius@gmail.com"],
                cc: "trips@node.ee"
            },
            to: '<aavik@märts.eu>, juulius@node.ee',
            cc: '"Node, Master" <node@node.ee>'
        });

        test.deepEqual(mc._envelope, {userDefined: true, from:[ 'andris@tr.ee' ],to:[ 'andris@tr.ee', 'andris@node.ee', 'aavik@xn--mrts-loa.eu', 'juulius@gmail.com'], "cc":['trips@node.ee']});
        test.done();
    },

    "Add alternative": function(test){
        var mc = new MailComposer();
        mc.addAlternative();
        test.equal(mc._alternatives.length, 0);

        mc.addAlternative({contents:"tere tere"});
        test.equal(mc._alternatives.length, 1);

        test.equal(mc._alternatives[0].contentType, "application/octet-stream");
        test.equal(mc._alternatives[0].contentEncoding, "base64");
        test.equal(mc._alternatives[0].contents, "tere tere");

        mc.addAlternative({contents:"tere tere", contentType:"text/plain", contentEncoding:"7bit"});
        test.equal(mc._alternatives[1].contentType, "text/plain");
        test.equal(mc._alternatives[1].contentEncoding, "7bit");

        test.done();
    },

    "Add attachment": function(test){
        var mc = new MailComposer();
        mc.addAttachment();
        test.equal(mc._attachments.length, 0);

        mc.addAttachment({filePath:"/tmp/var.txt"});
        test.equal(mc._attachments[0].contentType, "text/plain");
        test.equal(mc._attachments[0].fileName, "var.txt");

        mc.addAttachment({contents:"/tmp/var.txt"});
        test.equal(mc._attachments[1].contentType, "application/octet-stream");
        test.equal(mc._attachments[1].fileName, undefined);

        mc.addAttachment({filePath:"/tmp/var.txt", fileName:"test.txt"});
        test.equal(mc._attachments[2].fileName, "test.txt");

        test.done();
    },

    "Default attachment disposition": function(test){
        var mc = new MailComposer();
        mc.addAttachment();
        test.equal(mc._attachments.length, 0);

        mc.addAttachment({filePath:"/tmp/var.txt"});
        test.equal(mc._attachments[0].contentDisposition, undefined);

        test.done();
    },

    "Set attachment disposition": function(test){
        var mc = new MailComposer();
        mc.addAttachment();
        test.equal(mc._attachments.length, 0);

        mc.addAttachment({filePath:"/tmp/var.txt", contentDisposition: "inline"});
        test.equal(mc._attachments[0].contentDisposition, "inline");

        test.done();
    },

    "Generate envelope": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            sender: '"Jaanuar Veebruar, Märts" <märts@märts.eu>, karu@ahven.ee',
            to: '<aavik@märts.eu>, juulius@node.ee',
            cc: '"Node, Master" <node@node.ee>'
        });

        test.deepEqual(mc.getEnvelope(), {from: 'märts@xn--mrts-loa.eu',to:[ 'aavik@xn--mrts-loa.eu', 'juulius@node.ee', 'node@node.ee' ], stamp: 'Postage paid, Par Avion'});
        test.done();
    },

    "Generate user defined envelope": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            sender: '"Jaanuar Veebruar, Märts" <märts@märts.eu>, karu@ahven.ee',
            to: '<aavik@märts.eu>, juulius@node.ee',
            envelope: {
                from: "Andris <andris@tr.ee>",
                to: ["Andris <andris@tr.ee>, Node <andris@node.ee>", "aavik@märts.eu", "juulius@gmail.com"],
                cc: "trips@node.ee"
            },
            cc: '"Node, Master" <node@node.ee>'
        });

        test.deepEqual(mc.getEnvelope(), {from: 'andris@tr.ee', to:[ 'andris@tr.ee', 'andris@node.ee', 'aavik@xn--mrts-loa.eu', 'juulius@gmail.com', 'trips@node.ee'], stamp: 'Postage paid, Par Avion'});
        test.done();
    },

    "Generate Headers": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            sender: '"Jaanuar Veebruar, Märts" <märts@märts.eu>, karu@ahven.ee',
            to: '<aavik@märts.eu>, juulius@node.ee',
            cc: '"Node, Master" <node@node.ee>',
            replyTo: 'julla@pulla.ee',
            subject: "Tere õkva!"
        });

        mc.on("data", function(chunk){
            chunk = (chunk || "").toString("utf-8");
            test.ok(chunk.match(/^(?:(?:[\s]+|[a-zA-Z0-0\-]+\:)[^\r\n]+\r\n)+\r\n$/));
            test.done();
        });

        mc._composeHeader();
    }
};

exports["Mime tree"] = {
    "No contents": function(test){
        test.expect(4);

        var mc = new MailComposer();
        mc._composeMessage();

        test.ok(!mc._message.tree.boundary);
        test.equal(mc._getHeader("Content-Type").split(";").shift().trim(), "text/plain");
        test.equal(mc._message.tree.childNodes.length, 0);

        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "\r\n");
            }
        }

        test.done();
    },
    "Text contents": function(test){
        test.expect(4);

        var mc = new MailComposer();
        mc.setMessageOption({
            body: "test"
        });
        mc._composeMessage();

        test.ok(!mc._message.tree.boundary);
        test.equal(mc._getHeader("Content-Type").split(";").shift().trim(), "text/plain");
        test.equal(mc._message.tree.childNodes.length, 0);

        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "test");
            }
        }

        test.done();
    },
    "HTML contents": function(test){
        test.expect(4);

        var mc = new MailComposer();
        mc.setMessageOption({
            html: "<b>test</b>"
        });
        mc._composeMessage();

        test.ok(!mc._message.tree.boundary);
        test.equal(mc._getHeader("Content-Type").split(";").shift().trim(), "text/html");
        test.equal(mc._message.tree.childNodes.length, 0);

        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "<b>test</b>");
            }
        }

        test.done();
    },
    "HTML and text contents": function(test){
        test.expect(5);

        var mc = new MailComposer();
        mc.setMessageOption({
            body: "test",
            html: "test"
        });
        mc._composeMessage();

        test.equal(mc._message.tree.childNodes.length, 2);
        test.equal(mc._getHeader("Content-Type").split(";").shift().trim(), "multipart/alternative");
        test.ok(mc._message.tree.boundary);

        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "test");
            }
        }

        test.done();
    },
    "Attachment": function(test){
        test.expect(5);

        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({contents:"\r\n"});
        mc._composeMessage();

        test.equal(mc._message.tree.childNodes.length, 2);
        test.equal(mc._getHeader("Content-Type").split(";").shift().trim(), "multipart/mixed");
        test.ok(mc._message.tree.boundary);

        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "\r\n");
            }
        }

        test.done();
    },
    "Several attachments": function(test){
        test.expect(6);

        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({contents:"\r\n"});
        mc.addAttachment({contents:"\r\n"});

        mc._composeMessage();

        test.equal(mc._message.tree.childNodes.length, 3);
        test.equal(mc._getHeader("Content-Type").split(";").shift().trim(), "multipart/mixed");
        test.ok(mc._message.tree.boundary);

        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "\r\n");
            }
        }

        test.done();
    },
    "Attachment and text": function(test){
        test.expect(7);

        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({contents:"test"});
        mc.setMessageOption({
            body: "test"
        });
        mc._composeMessage();

        test.equal(mc._message.tree.childNodes.length, 2);
        test.equal(mc._getHeader("Content-Type").split(";").shift().trim(), "multipart/mixed");
        test.ok(mc._message.tree.boundary);

        mc._message.tree.childNodes[0].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "text/plain");
            }
        });

        mc._message.tree.childNodes[1].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "application/octet-stream");
            }
        });

        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "test");
            }
        }

        test.done();
    },
    "Attachment and html": function(test){
        test.expect(7);

        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({contents:"test"});
        mc.setMessageOption({
            html: "test"
        });
        mc._composeMessage();

        test.equal(mc._message.tree.childNodes.length, 2);
        test.equal(mc._getHeader("Content-Type").split(";").shift().trim(), "multipart/mixed");
        test.ok(mc._message.tree.boundary);

        mc._message.tree.childNodes[0].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "text/html");
            }
        });

        mc._message.tree.childNodes[1].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "application/octet-stream");
            }
        });

        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "test");
            }
        }

        test.done();
    },
    "Attachment, html and text": function(test){
        test.expect(11);

        var mc = new MailComposer();
        mc.addAttachment({contents:"test"});
        mc.setMessageOption({
            body: "test",
            html: "test"
        });
        mc._composeMessage();

        test.equal(mc._message.tree.childNodes.length, 2);
        test.equal(mc._getHeader("Content-Type").split(";").shift().trim(), "multipart/mixed");
        test.ok(mc._message.tree.boundary);

        mc._message.tree.childNodes[0].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "multipart/alternative");
            }
        });

        test.ok(mc._message.tree.childNodes[0].boundary);

        mc._message.tree.childNodes[0].childNodes[0].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "text/plain");
            }
        });

        mc._message.tree.childNodes[0].childNodes[1].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "text/html");
            }
        });

        mc._message.tree.childNodes[1].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "application/octet-stream");
            }
        });

        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "test");
            }
        }

        test.done();
    }

};

exports["Stream parser"] = {
    "Text": function(test){
        var mc = new MailComposer(),
            file = fs.readFileSync(__dirname+"/textfile.txt").toString("utf-8");
        mc.setMessageOption({
            from: "andris@node.ee",
            to:"andris@tr.ee, andris@kreata.ee",
            subject: "õäöü",
            body: file
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.from[0].address, "andris@node.ee");
            test.equal(mail.to[0].address, "andris@tr.ee");
            test.equal(mail.to[1].address, "andris@kreata.ee");
            test.equal(mail.subject, "õäöü");
            test.equal(mail.text.trim(), file.trim());
            test.done();
        });
    },
    "HTML": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            html: "<b>test</b>"
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.html.trim(), "<b>test</b>");
            test.done();
        });
    },
    "HTML and text": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            html: "<b>test</b>",
            body: "test"
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.text.trim(), "test");
            test.equal(mail.html.trim(), "<b>test</b>");
            test.done();
        });
    },
    "Flowed text": function(test){
        var mc = new MailComposer({encoding:"8bit"}),
            file = fs.readFileSync(__dirname+"/textfile.txt").toString("utf-8");

        mc.setMessageOption({
            body: file
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.text.trim(), file.trim());
            test.done();
        });
    },
    "Attachment as string": function(test){
        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({
            fileName: "file.txt",
            contents: fs.readFileSync(__dirname+"/textfile.txt").toString("utf-8")
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.attachments[0].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            test.done();
        });
    },
    "Attachment as buffer": function(test){
        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({
            fileName: "file.txt",
            contents: fs.readFileSync(__dirname+"/textfile.txt")
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.attachments[0].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            test.done();
        });
    },
    "Attachment file stream": function(test){
        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({
            fileName: "file.txt",
            filePath: __dirname+"/textfile.txt"
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.attachments[0].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            test.done();
        });
    },
    "Attachment source stream": function(test){
        var mc = new MailComposer();

        var fileStream = fs.createReadStream(__dirname+"/textfile.txt");

        mc.setMessageOption();
        mc.addAttachment({
            fileName: "file.txt",
            streamSource: fileStream
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.attachments[0].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            test.done();
        });
    },
    "Attachment source url": function(test){

        var server = http.createServer(function (req, res) {
            if(req.url=="/textfile.txt"){
                fs.createReadStream(__dirname+"/textfile.txt").pipe(res);
            }else{
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('Not found!\n');
            }
        });
        server.listen(HTTP_PORT, '127.0.0.1');

        var mc = new MailComposer();

        mc.setMessageOption();
        mc.addAttachment({
            fileName: "file.txt",
            filePath: "http://localhost:"+HTTP_PORT+"/textfile.txt"
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.attachments[0].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            server.close();
            test.done();
        });
    },
    "Attachment source invalid url": function(test){

        var server = http.createServer(function (req, res) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Not found!\n');
        });
        server.listen(HTTP_PORT, '127.0.0.1');

        var mc = new MailComposer();

        mc.setMessageOption();
        mc.addAttachment({
            fileName: "file.txt",
            filePath: "http://localhost:"+HTTP_PORT+"/textfile.txt"
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.attachments[0].checksum, "3995d423c7453e472ce0d54e475bae3e");
            server.close();
            test.done();
        });
    },
    "Custom User-Agent": function(test){

        var server = http.createServer(function (req, res) {
            test.equal(req.headers['user-agent'], "test");

            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('OK!\n');
        })
        server.listen(HTTP_PORT, '127.0.0.1');

        var mc = new MailComposer();

        mc.setMessageOption();
        mc.addAttachment({
            fileName: "file.txt",
            filePath: "http://localhost:"+HTTP_PORT+"/textfile.txt",
            userAgent: "test"
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            server.close();
            test.done();
        });
    },
    "escape SMTP": function(test){
        var mc = new MailComposer({escapeSMTP: true});
        mc.setMessageOption({
            body: ".\r\n."
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.text.trim(), "..\n..");
            test.done();
        });
    },
    "don't escape SMTP": function(test){
        var mc = new MailComposer({escapeSMTP: false});
        mc.setMessageOption({
            body: ".\r\n."
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.text.trim(), ".\n.");
            test.done();
        });
    },
    "HTML and text and attachment": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            html: "<b>test</b>",
            body: "test"
        });
        mc.addAttachment({
            fileName: "file.txt",
            contents: fs.readFileSync(__dirname+"/textfile.txt").toString("utf-8")
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.text.trim(), "test");
            test.equal(mail.html.trim(), "<b>test</b>");
            test.equal(mail.attachments[0].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            test.done();
        });
    },
    "HTML and related attachment": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            html: "<b><img src=\"cid:test@node\"/></b>"
        });
        mc.addAttachment({
            fileName: "file.txt",
            cid: "test@node",
            contents: fs.readFileSync(__dirname+"/textfile.txt").toString("utf-8")
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);
        /*
        var d = "";
        mc.on("data", function(data){
            d += data.toString();
        })

        mc.on("end", function(){
            console.log(d);
        });
        */

        mp.on("end", function(mail){
            test.equal(mc._attachments.length, 0);
            test.equal(mc._relatedAttachments.length, 1);
            test.equal(mail.html.trim(), "<b><img src=\"cid:test@node\"/></b>");
            test.equal(mail.attachments[0].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            test.done();
        });
    },
    "HTML and related plus regular attachment": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            html: "<b><img src=\"cid:test@node\"/></b>"
        });
        mc.addAttachment({
            fileName: "file.txt",
            cid: "test@node",
            contents: fs.readFileSync(__dirname+"/textfile.txt").toString("utf-8")
        });
        mc.addAttachment({
            fileName: "file.txt",
            contents: fs.readFileSync(__dirname+"/textfile.txt").toString("utf-8")
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mc._attachments.length, 1);
            test.equal(mc._relatedAttachments.length, 1);
            test.equal(mail.html.trim(), "<b><img src=\"cid:test@node\"/></b>");
            test.equal(mail.attachments[0].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            test.equal(mail.attachments[1].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            test.done();
        });
    },
    "HTML and text related attachment": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            html: "<b><img src=\"cid:test@node\"/></b>",
            text:"test"
        });
        mc.addAttachment({
            fileName: "file.txt",
            cid: "test@node",
            contents: fs.readFileSync(__dirname+"/textfile.txt").toString("utf-8")
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mc._attachments.length, 0);
            test.equal(mc._relatedAttachments.length, 1);
            test.equal(mail.text.trim(), "test");
            test.equal(mail.html.trim(), "<b><img src=\"cid:test@node\"/></b>");
            test.equal(mail.attachments[0].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            test.done();
        });
    },
    "HTML, text, related+regular attachment": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            html: "<b><img src=\"cid:test@node\"/></b>",
            text:"test"
        });
        mc.addAttachment({
            fileName: "file.txt",
            cid: "test@node",
            contents: fs.readFileSync(__dirname+"/textfile.txt").toString("utf-8")
        });
        mc.addAttachment({
            fileName: "file.txt",
            contents: fs.readFileSync(__dirname+"/textfile.txt").toString("utf-8")
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mc._attachments.length, 1);
            test.equal(mc._relatedAttachments.length, 1);
            test.equal(mail.text.trim(), "test");
            test.equal(mail.html.trim(), "<b><img src=\"cid:test@node\"/></b>");
            test.equal(mail.attachments[0].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            test.equal(mail.attachments[1].checksum, "59fbcbcaf18cb9232f7da6663f374eb9");
            test.done();
        });
    },
    "Only alternative": function(test){
        var mc = new MailComposer();
        mc.addAlternative({
            contents: "tere tere"
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.attachments.length, 1)
            test.equal(mail.attachments[0].content.toString(), "tere tere")
            test.equal(mail.attachments[0].contentType, "application/octet-stream")
            test.done();
        });
    },
    "References Header": function(test){

        var mc = new MailComposer();
        mc.setMessageOption({
            references: ["myrdo", "vyrdo"]
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.deepEqual(mail.references, ["myrdo", "vyrdo"]);
            test.done();
        });
    },
    "InReplyTo Header": function(test){

        var mc = new MailComposer();
        mc.setMessageOption({
            inReplyTo: "test"
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.inReplyTo, "test");
            test.done();
        });
    },
    "Non UTF-8 charset": function(test){
        var mc = new MailComposer({charset: "iso-8859-1"}),
            message = "",
            mp = new MailParser(),
            subject = "Jõgeva maakond, Ärni küla",
            text = "Lõäöpõld Jääger Sußi",
            fromName = "Mäger Mõksi",
            from = fromName+" <mager.moksi@hot.ee>"

        mc.setMessageOption({
            subject: subject,
            text: text,
            from: from
        });

        mp.on("end", function(mail){
            //console.log(mail);
            test.equal(mail.subject, subject);
            test.equal((mail.text || "").trim(), text);
            test.equal(fromName, mail.from && mail.from[0] && mail.from[0].name);
            test.done();
        });

        mc.on("data", function(chunk){
            message += chunk.toString("utf-8");
        });

        mc.on("end", function(){
            //console.log(message)
            test.ok(message.match(/J=F5geva/));
            test.ok(message.match(/=C4rni_k=FCla/));
            test.ok(message.match(/L=F5=E4=F6p=F5ld J=E4=E4ger Su=DFi/));
            test.ok(message.match(/M=E4ger_M=F5ksi/));

            mp.end(message);
        });
        mc.streamMessage();
    },
    "Convert image URL to embedded attachment": function(test){

        var image1 = new Buffer("iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==", "base64"),
            image2 = new Buffer("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAABlBMVEUAAAD///+l2Z/dAAAAM0lEQVR4nGP4/5/h/1+G/58ZDrAz3D/McH8yw83NDDeNGe4Ug9C9zwz3gVLMDA/A6P9/AFGGFyjOXZtQAAAAAElFTkSuQmCC", "base64");

        var server = http.createServer(function (req, res) {
            if(req.url=="/image1.png"){
                res.writeHead(200, {'Content-Type': 'image/png'});
                res.end(image1);
            }else if(req.url=="/image2.png"){
                res.writeHead(200, {'Content-Type': 'image/png'});
                res.end(image2);
            }else{
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('Not found!\n');
            }
        });
        server.listen(HTTP_PORT, '127.0.0.1');

        var mc = new MailComposer({
            forceEmbeddedImages: true
        });

        mc.setMessageOption({
            from: "andris@kreata.ee",
            to: "andris@node.ee",
            subject: "embedded images",
            html: '<p>Embedded images:</p>\n'+
                  '<ul>\n'+
                  '    <li>Embedded image1 <img title="test" src="http://localhost:'+HTTP_PORT+'/image1.png"/></li>\n'+
                  '    <li>Embedded image2 <img title="test" src="http://localhost:'+HTTP_PORT+'/image2.png"/></li>\n'+
                  '    <li>Embedded image1 <img title="test" src="'+__dirname+'/image3.png"/></li>\n'+
                  '</ul>'
        });
        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        var str = "";
        mc.on("data", function(chunk){str += chunk.toString()})

        mp.on("end", function(mail){
            test.equal(mail.attachments[0].content.toString("base64"), image1.toString("base64"));
            test.equal(mail.attachments[1].content.toString("base64"), image2.toString("base64"));
            test.equal(mail.attachments[2].checksum, "29445222b4f912167463b8c65e9a6420");
            server.close();
            test.done();
        });
    }
};

exports["Output buffering"] = {
    "Use DKIM": function(test){
        var mc = new MailComposer();

        mc.setMessageOption({
            from: "Andris Reinman <andris@node.ee>",
            to: "Andris <andris.reinman@gmail.com>",
            html: "<b>Hello world!</b>",
            subject: "Hello world!"
        });

        mc.useDKIM({
            domainName: "do-not-trust.node.ee",
            keySelector: "dkim",
            privateKey: fs.readFileSync(__dirname+"/test_private.pem")
        });

        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.headers['dkim-signature'].replace(/\s/g, ""), 'v=1;a=rsa-sha256;c=relaxed/relaxed;d=do-not-trust.node.ee;q=dns/txt;s=dkim;bh=88i0PUP3tj3X/n0QT6Baw8ZPSeHZPqT7J0EmE26pjng=;h=from:subject:to:mime-version:content-type:content-transfer-encoding;b=dtxxQLotrcarEA5nbgBJLBJQxSAHcfrNxxpItcXSj68ntRvxmjXt9aPZTbVrzfRYe+xRzP2FTGpS7js8iYpAZZ2N3DBRLVp4gyyKHB1oWMkg/EV92uPtnjQ3MlHMbxC0');
            test.done();
        });
    },

    "Use DKIM with escapeSMTP": function(test){
        var mc = new MailComposer({escapeSMTP: true});

        mc.setMessageOption({
            from: "Andris Reinman <andris@node.ee>",
            to: "Andris <andris.reinman@gmail.com>",
            text: ".Hello World",
            subject: "Hello world!"
        });

        mc.useDKIM({
            domainName: "do-not-trust.node.ee",
            keySelector: "dkim",
            privateKey: fs.readFileSync(__dirname+"/test_private.pem")
        });

        mc.streamMessage();

        var mp = new MailParser();

        mc.pipe(mp);

        mp.on("end", function(mail){
            test.equal(mail.headers['dkim-signature'].replace(/\s/g, ""), 'v=1;a=rsa-sha256;c=relaxed/relaxed;d=do-not-trust.node.ee;q=dns/txt;s=dkim;bh=G6F+AsXwSI9QevjP2K03mJc6ftXnKHR5egjeWd29Muo=;h=from:subject:to:mime-version:content-type:content-transfer-encoding;b=GY96OWF1PPjzRDpw/QSEz7OfbW/MWb4PO0nA6PJNtdpAPSUJMomz4klv99rrqW8z8xW1ha9LM+39EPUN7c29OTNPoRJ9ybb9F1lttfD0l7AETFboBEknrdMaouc+HYWA');
            test.done();
        });
    },

    "Build message": function(test){
        var mc = new MailComposer();

        mc.setMessageOption({
            from: "Andris Reinman <andris@node.ee>",
            to: "Andris <andris.reinman@gmail.com>",
            html: "<b>Hello world!</b>",
            subject: "Hello world!"
        });

        mc.useDKIM({
            domainName: "do-not-trust.node.ee",
            keySelector: "dkim",
            privateKey: fs.readFileSync(__dirname+"/test_private.pem")
        });

        mc.buildMessage(function(err, body){
            test.ifError(err);
            var mp = new MailParser();

            mp.on("end", function(mail){
                test.equal(mail.headers['dkim-signature'].replace(/\s/g, ""), 'v=1;a=rsa-sha256;c=relaxed/relaxed;d=do-not-trust.node.ee;q=dns/txt;s=dkim;bh=88i0PUP3tj3X/n0QT6Baw8ZPSeHZPqT7J0EmE26pjng=;h=from:subject:to:mime-version:content-type:content-transfer-encoding;b=dtxxQLotrcarEA5nbgBJLBJQxSAHcfrNxxpItcXSj68ntRvxmjXt9aPZTbVrzfRYe+xRzP2FTGpS7js8iYpAZZ2N3DBRLVp4gyyKHB1oWMkg/EV92uPtnjQ3MlHMbxC0');
                test.done();
            });

            mp.end(body);
        });


    }
}

