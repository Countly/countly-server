var net = require("net"),
    crypto = require("crypto"),
    tlslib = require("tls");

// monkey patch net and tls to support nodejs 0.4
if(!net.connect && net.createConnection){
    net.connect = net.createConnection;
}

if(!tlslib.connect && tlslib.createConnection){
    tlslib.connect = tlslib.createConnection;
}

/**
 * @namespace Mockup module
 * @name mockup
 */
module.exports = runClientMockup;

/**
 * <p>Runs a batch of commands against a server</p>
 * 
 * <pre>
 * var cmds = ["EHLO FOOBAR", "STARTTLS", "QUIT"];
 * runClientMockup(25, "mail.hot.ee", cmds, function(resp){
 *     console.log("Final:", resp.toString("utf-8").trim());
 * });
 * </pre>
 * 
 * @memberOf mockup
 * @param {Number} port Port number
 * @param {String} host Hostname to connect to
 * @param {Array} commands Command list to be sent to server
 * @param {Function} callback Callback function to run on completion,
 *        has the last response from the server as a param
 * @param {Boolean} [debug] if set to true log all input/output
 */
function runClientMockup(port, host, commands, callback, debug){
    host = host || "localhost";
    port = port || 25;
    commands = Array.isArray(commands) ? commands : [];

    var command, ignore_data = false, sslcontext, pair;

    var socket = net.connect(port, host);
    socket.on("connect", function(){
        socket.on("data", function(chunk){
            if(ignore_data)return;
            
            if(debug){
                console.log("S: "+chunk.toString("utf-8").trim());
            }
            
            if(!commands.length){
                socket.end();
                if(typeof callback == "function"){
                    callback(chunk);
                }
                return;
            }
            
            if(["STARTTLS", "STLS"].indexOf((command || "").trim().toUpperCase())>=0){
                ignore_data = true;
                if(debug){
                    console.log("Initiated TLS connection");
                }
                sslcontext = crypto.createCredentials();
                pair = tlslib.createSecurePair(sslcontext, false);
                
                pair.encrypted.pipe(socket);
                socket.pipe(pair.encrypted);
                pair.fd = socket.fd;
                
                pair.on("secure", function(){
                    if(debug){
                        console.log("TLS connection secured");
                    }
                    command = commands.shift();
                    if(debug){
                        console.log("C: "+command);
                    }
                    pair.cleartext.write(command+"\r\n");

                    pair.cleartext.on("data", function(chunk){
                        if(debug){
                            console.log("S: "+chunk.toString("utf-8").trim());
                        }
                        
                        if(!commands.length){
                            pair.cleartext.end();
                            if(typeof callback == "function"){
                                callback(chunk);
                            }
                            return;
                        }
                        command = commands.shift();
                        pair.cleartext.write(command+"\r\n");
                        if(debug){
                            console.log("C: "+command);
                        }
                    });
                });
            }else{
                command = commands.shift();
                socket.write(command+"\r\n");
                if(debug){
                    console.log("C: "+command);
                }
            }
        });
    });
    
}