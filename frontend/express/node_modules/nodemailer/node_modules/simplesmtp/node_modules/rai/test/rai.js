var RAIServer = require("../lib/rai").RAIServer,
    testCase = require('nodeunit').testCase,
    utillib = require("util"),
    netlib = require("net"),
    crypto = require("crypto"),
    tlslib = require("tls");

var PORT_NUMBER = 8397;

// monkey patch net and tls to support nodejs 0.4
if(!netlib.connect && netlib.createConnection){
    netlib.connect = netlib.createConnection;
}

if(!tlslib.connect && tlslib.createConnection){
    tlslib.connect = tlslib.createConnection;
}

exports["General tests"] = {
    "Create and close a server": function(test){
        var server = new RAIServer();
        server.listen(PORT_NUMBER, function(err){
            test.ifError(err);
            server.end(function(){
                test.ok(1, "Server closed");
                test.done();
            });
        });
    },
    "Create a secure server": function(test){
        var server = new RAIServer({secureConnection: true});
        server.listen(PORT_NUMBER, function(err){
            test.ifError(err);
            server.end(function(){
                test.ok(1, "Server closed");
                test.done();
            });
        });
    },
    "Duplicate server fails": function(test){
        var server = new RAIServer();
        server.listen(PORT_NUMBER, function(err){
            test.ifError(err);
            
            var duplicate = new RAIServer();
            duplicate.listen(PORT_NUMBER, function(err){
                test.ok(err, "Responds with error");
                server.end(function(){
                    test.ok(1, "Server closed");
                    test.done();
                });
            });
            
        });
    },
    "Connection event": function(test){
        var server = new RAIServer();
        test.expect(3);
        server.listen(PORT_NUMBER, function(err){
            
            server.on("connect", function(socket){
                test.ok(socket, "Client connected");
                
                socket.on("end", function(){
                    test.ok(1, "Connection closed");
                    
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                test.ok(1, "Connected to server");
                client.end();
            });

        });
    },
    "Close client socket":  function(test){
        var server = new RAIServer();
        test.expect(4);
        server.listen(PORT_NUMBER, function(err){
            
            server.on("connect", function(socket){
                test.ok(socket, "Client connected");
                
                socket.on("end", function(){
                    test.ok(1, "Connection closed");
                    
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
                
                socket.end();
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                test.ok(1, "Connected to server");
            });
            client.on("end", function(){
                test.ok(1, "Connection closed by host");
            });

        });
    },
    "Send data to client":  function(test){
        var server = new RAIServer();
        server.listen(PORT_NUMBER, function(err){
            
            server.on("connect", function(socket){
                
                socket.send("HELLO");

                socket.on("end", function(){
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                client.on("data", function(chunk){
                    test.equal(chunk.toString(), "HELLO\r\n");
                    client.end();
                });
            });

        });
    }
};

exports["Secure connection"] = {
    "STARTTLS with event":  function(test){
        var server = new RAIServer();
        server.listen(PORT_NUMBER, function(err){
            
            test.expect(2);
            
            server.on("connect", function(socket){
                
                socket.startTLS();
                socket.on("tls", function(){
                    test.ok(1, "Secure connection opened");
                    socket.send("TEST");
                });
                
                socket.on("end", function(){
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                var sslcontext = crypto.createCredentials();
                var pair = tlslib.createSecurePair(sslcontext, false);
                
                pair.encrypted.pipe(client);
                client.pipe(pair.encrypted);
                pair.fd = client.fd;
                
                pair.on("secure", function(){
                    pair.cleartext.on("data", function(chunk){
                        test.equal(chunk.toString(), "TEST\r\n");
                        pair.cleartext.end();
                    });
                });
            });

        });
    },
    "STARTTLS Callback":  function(test){
        var server = new RAIServer();
        server.listen(PORT_NUMBER, function(err){
            
            test.expect(2);
            
            server.on("connect", function(socket){
                
                socket.startTLS(function(){
                    test.ok(1, "Secure connection opened");
                    socket.send("TEST");
                });
                
                socket.on("tls", function(){
                    test.ok(0, "Should not occur");
                });
                
                socket.on("end", function(){
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                var sslcontext = crypto.createCredentials();
                var pair = tlslib.createSecurePair(sslcontext, false);
                
                pair.encrypted.pipe(client);
                client.pipe(pair.encrypted);
                pair.fd = client.fd;
                
                pair.on("secure", function(){
                    pair.cleartext.on("data", function(chunk){
                        test.equal(chunk.toString(), "TEST\r\n");
                        pair.cleartext.end();
                    });
                });
            });

        });
    },
    "STARTTLS clears command buffer":  function(test){
        var server = new RAIServer();
        server.listen(PORT_NUMBER, function(err){
            
            test.expect(2);
            
            server.on("connect", function(socket){
                
                socket.on("command", function(command){
                    if(command == "STARTTLS"){
                        socket.startTLS();
                        socket.send("OK");
                    }else if(command == "KILL"){
                        test.ok(0, "Should not occur");
                    }else if(command == "OK"){
                        test.ok(1, "OK");
                    }
                    
                });
                
                socket.on("tls", function(){
                    test.ok(1, "Secure connection opened");
                    socket.send("TEST");
                });
                
                socket.on("end", function(){
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                
                client.write("STARTTLS\r\nKILL\r\n");
                
                client.on("data", function(chunk){
                    if(chunk.toString("utf-8").trim() == "OK"){
                        var sslcontext = crypto.createCredentials();
                        var pair = tlslib.createSecurePair(sslcontext, false);
                        
                        pair.encrypted.pipe(client);
                        client.pipe(pair.encrypted);
                        pair.fd = client.fd;
                        
                        pair.on("secure", function(){
                            pair.cleartext.write("OK\r\n");
                            pair.cleartext.end();
                        });
                    }
                });
                
            });

        });
    },
    "STARTTLS on secure server fails":  function(test){
        var server = new RAIServer({secureConnection: true});
        server.listen(PORT_NUMBER, function(err){
            
            test.expect(2);
            server.on("connect", function(socket){
                
                socket.on("error", function(err){
                    test.ok(err);
                    socket.end();
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("command", (function(command){
                    process.nextTick(socket.startTLS.bind(socket, function(){
                        test.ok(false, "Secure connection opened"); // should not occur
                        server.end(function(){
                            test.done();
                        });
                    }));
                    
                }).bind(this));
                
                socket.on("tls", function(){
                    test.ok(0, "Should not occur");
                });
                
            });
            
            var client = tlslib.connect(PORT_NUMBER, function(){
                test.ok(true);
                client.write("HELLO!\r\n");
            });

        });
    }
};

exports["Client commands"] = {
    "Receive Simple Command":  function(test){
        var server = new RAIServer();
        server.listen(PORT_NUMBER, function(err){
            
            server.on("connect", function(socket){
                
                socket.on("command", function(command, payload){
                    test.equal(command, "STATUS");
                    test.equal(payload.toString(), "");
                    socket.end();
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                client.write("STATUS\r\n");
            });

        });
    },
    "Receive Command with payload":  function(test){
        var server = new RAIServer();
        server.listen(PORT_NUMBER, function(err){
            
            server.on("connect", function(socket){
                
                socket.on("command", function(command, payload){
                    test.equal(command, "MAIL");
                    test.equal(payload.toString(), "TO:");
                    socket.end();
                    
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                client.write("MAIL TO:\r\n");
            });

        });
    }
};

exports["Data mode"] = {
    "DATA mode": function(test){
        var server = new RAIServer(),
            datapayload = "tere\r\nvana kere";
        server.listen(PORT_NUMBER, function(err){
            
            server.on("connect", function(socket){
                
                socket.startDataMode();

                test.expect(2);

                socket.on("data", function(chunk){
                    test.equal(datapayload, chunk.toString());
                });
                
                socket.on("ready", function(){
                    test.ok(1,"Data ready");
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                client.write(datapayload+"\r\n.\r\n");
                client.end();
            });

        });
    },
    "Small chunks DATA mode": function(test){
        var server = new RAIServer(),
            datapayload = "tere\r\nvana kere õäöü\r\n.\r",
            databytes = [],
            fullpayload = datapayload+"\r\n.\r\n";
        server.listen(PORT_NUMBER, function(err){
            
            server.on("connect", function(socket){
                
                socket.startDataMode();

                test.expect(1);

                socket.on("data", function(chunk){
                    databytes = databytes.concat(Array.prototype.slice.call(chunk));
                });
                
                socket.on("ready", function(){
                    test.equal(new Buffer(databytes).toString("utf-8"), datapayload);
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
                
                for(var i=0, len = fullpayload.length; i<len; i++){
                    socket._onReceiveData(new Buffer(fullpayload.charAt(i), "utf-8").toString("binary"));
                }
                
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                client.end();
            });

        });
    }
};

exports["Pipelining support"] = {
    "Pipelining": function(test){
        var server = new RAIServer();
        server.listen(PORT_NUMBER, function(err){
            
            test.expect(8);
            
            server.on("connect", function(socket){
                
                socket.on("command", function(command, payload){
                    if(command == "STATUS"){
                        test.ok(1, "Status received");
                    }else if(command=="DATA"){
                        test.ok(1, "data command received");
                        socket.startDataMode();
                    }else if(command=="END"){
                        test.ok(1, "all received");
                    }else{
                        test.ok(0, "Unexpected command: "+command);
                    }
                });
                
                socket.on("data", function(chunk){
                    test.equal(chunk.toString(), "TE\r\nST");
                });
                
                socket.on("ready", function(){
                    test.ok(1, "Data mode ended");
                });
                
                socket.on("end", function(){
                    test.ok(1, "All ready");
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                client.write("STATUS\r\nSTATUS\r\nSTATUS\r\nDATA\r\nTE\r\nST\r\n.\r\nEND\r\n");
                client.end();
            });

        });
    }
};

exports["Timeout tests"] = {
    "Timeout": function(test){
        var server = new RAIServer({timeout: 300, disconnectOnTimeout: true});
        test.expect(3);
        server.listen(PORT_NUMBER, function(err){
            
            server.on("connect", function(socket){
                test.ok(socket, "Client connected");
                
                socket.on("timeout", function(){
                    test.ok(1, "Connection closed");
                    
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                test.ok(1, "Connected to server");
            });

        });
    },
    "Timeout with TLS":  function(test){
        var server = new RAIServer({timeout: 300, disconnectOnTimeout: true});
        server.listen(PORT_NUMBER, function(err){
            
            test.expect(3);
            
            server.on("connect", function(socket){
                
                socket.startTLS();
                socket.on("tls", function(){
                    test.ok(1, "Secure connection opened");
                    socket.send("TEST");
                });
                
                socket.on("timeout", function(){
                    test.ok(1, "Timeout occurred");
                    server.end(function(){
                        test.done();
                    });
                });
                
                socket.on("error", function(err){
                    test.isError(err);
                });
            });
            
            var client = netlib.connect(PORT_NUMBER, function(){
                var sslcontext = crypto.createCredentials();
                var pair = tlslib.createSecurePair(sslcontext, false);
                
                pair.encrypted.pipe(client);
                client.pipe(pair.encrypted);
                pair.fd = client.fd;
                
                pair.on("secure", function(){
                    test.ok(1, "secure connection");
                });
            });

        });
    } 
};