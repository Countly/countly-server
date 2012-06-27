/**
 * @fileOverview This is the main file for the RAI library to create text based servers
 * @author <a href="mailto:andris@node.ee">Andris Reinman</a>
 * @version 0.1.3
 */

var netlib = require("net"),
    utillib = require("util"),
    EventEmitter = require('events').EventEmitter,
    starttls = require("./starttls").starttls,
    tlslib = require("tls"),
    crypto = require("crypto"),
    fs = require("fs");

// Default credentials for starting TLS server
var defaultCredentials = {
    key: fs.readFileSync(__dirname+"/../cert/key.pem"),
    cert: fs.readFileSync(__dirname+"/../cert/cert.pem")
};

// Expose to the world
module.exports.RAIServer = RAIServer;
module.exports.runClientMockup = require("./mockup");

/**
 * <p>Creates instance of RAIServer</p>
 * 
 * <p>Options object has the following properties:</p>
 * 
 * <ul>
 *   <li><b>debug</b> - if set to true print traffic to console</li>
 *   <li><b>disconnectOnTimeout</b> - if set to true close the connection on disconnect</li>
 *   <li><b>secureConnection</b> - if set to true close the connection on disconnect</li>
 *   <li><b>credentials</b> - credentials for secureConnection and STARTTLS</li>
 *   <li><b>timeout</b> - timeout in milliseconds for disconnecting the client,
 *       defaults to 0 (no timeout)</li>
 * </ul>
 * 
 * <p><b>Events</b></p>
 * 
 * <ul>
 *     <li><b>'connect'</b> - emitted if a client connects to the server, param
 *         is a client ({@link RAISocket}) object</li>
 *     <li><b>'error'</b> - emitted on error, has an error object as a param</li>
 * </ul> 
 * 
 * @constructor
 * @param {Object} [options] Optional options object
 */
function RAIServer(options){
    EventEmitter.call(this);
    
    this.options = options || {};
    
    this._createServer();
}
utillib.inherits(RAIServer, EventEmitter);

/**
 * <p>Starts listening on selected port</p>
 * 
 * @param {Number} port The port to listen
 * @param {String} [host] The IP address to listen
 * @param {Function} callback The callback function to be run after the server
 * is listening, the only param is an error message if the operation failed 
 */
RAIServer.prototype.listen = function(port, host, callback){
    if(!callback && typeof host=="function"){
        callback = host;
        host = undefined;
    }
    this._port = port;
    this._host = host;
    
    this._connected = false;
    if(callback){    
        this._server.on("listening", (function(){
            this._connected = true;
            callback(null);
        }).bind(this));
        
        this._server.on("error", (function(err){
            if(!this._connected){
                callback(err);
            }
        }).bind(this));
    }
    
    this._server.listen(this._port, this._host);
};

/**
 * <p>Stops the server</p>
 * 
 * @param {Function} callback Is run when the server is closed 
 */
RAIServer.prototype.end = function(callback){
    this._server.on("close", callback);
    this._server.close();
};

/**
 * <p>Creates a server with listener callback</p> 
 */
RAIServer.prototype._createServer = function(){
    if(this.options.secureConnection){
        this._server = tlslib.createServer(
            this.options.credentials || defaultCredentials,
            this._serverListener.bind(this));
    }else{
        this._server = netlib.createServer(this._serverListener.bind(this));
    }
    this._server.on("error", this._onError.bind(this));
};

/**
 * <p>Listens for errors</p>
 * 
 * @event
 * @param {Object} err Error object
 */
RAIServer.prototype._onError = function(err){
    if(this._connected){
        this.emit("error", err);
    }
};

/**
 * <p>Server listener that is run on client connection</p>
 * 
 * <p>{@link RAISocket} object instance is created based on the client socket
 *    and a <code>'connection'</code> event is emitted</p>
 * 
 * @param {Object} socket The socket to the client 
 */
RAIServer.prototype._serverListener = function(socket){
    if(this.options.debug){
        console.log("CONNECTION FROM "+socket.remoteAddress);
    }
    
    var handler = new RAISocket(socket, this.options);
    
    socket.on("data", handler._onReceiveData.bind(handler));
    socket.on("end", handler._onEnd.bind(handler));
    socket.on("error", handler._onError.bind(handler));
    socket.on("timeout", handler._onTimeout.bind(handler));
    socket.on("close", handler._onClose.bind(handler));

    if("setKeepAlive" in socket){
        socket.setKeepAlive(true); // plaintext server
    }else if(socket.encrypted && "setKeepAlive" in socket.encrypted){
        socket.encrypted.setKeepAlive(true); // secure server
    }
    
    this.emit("connect", handler);
};

/**
 * <p>Creates a instance for interacting with a client (socket)</p>
 * 
 * <p>Optional options object is the same that is passed to the parent
 * {@link RAIServer} object</p>
 * 
 * <p><b>Events</b></p>
 * 
 * <ul>
 *     <li><b>'command'</b> - emitted if a client sends a command. Gets two
 *         params - command (String) and payload (Buffer)</li>
 *     <li><b>'data'</b> - emitted when a chunk is received in data mode, the
 *         param being the payload (Buffer)</li>
 *     <li><b>'ready'</b> - emitted when data stream ends and normal command
 *         flow is recovered</li>
 *     <li><b>'tls'</b> - emitted when the connection is secured by TLS</li>
 *     <li><b>'error'</b> - emitted when an error occurs. Connection to the
 *         client is disconnected automatically. Param is an error object.</l>
 *     <li><b>'timeout'</b> - emitted when a timeout occurs. Connection to the
 *         client is disconnected automatically if disconnectOnTimeout option 
 *         is set to true.</l>
 *     <li><b>'end'</b> - emitted when the client disconnects</l>
 * </ul>
 * 
 * @constructor
 * @param {Object} socket Socket for the client
 * @param {Object} [options] Optional options object
 */
function RAISocket(socket, options){
    EventEmitter.call(this);
    
    this.socket = socket;
    this.options = options || {};
    
    this.remoteAddress = socket.remoteAddress;
    
    this._dataMode = false;
    this._endDataModeSequence = "\r\n.\r\n";
    this._endDataModeSequenceRegEx = /\r\n\.\r\n|^\.\r\n/;
    
    this.secureConnection = !!this.options.secureConnection;
    this._destroyed = false;
    this._remainder = "";
    
    this._ignore_data = false;
    
    if(this.options.timeout){
        socket.setTimeout(this.options.timeout);
    }
}
utillib.inherits(RAISocket, EventEmitter);

/**
 * <p>Sends some data to the client. <code>&lt;CR&gt;&lt;LF&gt;</code> is automatically appended to
 *    the data</p>
 * 
 * @param {String|Buffer} data Data to be sent to the client
 */
RAISocket.prototype.send = function(data){
    var buffer;
    if(data instanceof Buffer || (typeof SlowBuffer != "undefined" && data instanceof SlowBuffer)){
        buffer = new Buffer(data.length+2);
        buffer[buffer.length-2] = 0xD;
        buffer[buffer.length-1] = 0xA;
        data.copy(buffer);
    }else{
        buffer = new Buffer((data || "").toString()+"\r\n", "binary");
    }
    
    if(this.options.debug){
        console.log("OUT: \"" +buffer.toString("utf-8").trim()+"\"");
    }
    
    if(this.socket && this.socket.writable){
        this.socket.write(buffer);
    }else{
        this.socket.end();
    }
};

/**
 * <p>Instructs the server to be listening for mixed data instead of line based
 *    commands</p>
 * 
 * @param {String} [sequence="."] - optional sequence on separate line for
 *        matching the data end
 */
RAISocket.prototype.startDataMode = function(sequence){
    this._dataMode = true;
    if(sequence){
        sequence = sequence.replace(/\.\=\(\)\-\?\*\\\[\]\^\+\:\|\,/g, "\\$1");
        this._endDataModeSequence = "\r\n"+sequence+"\r\n";
        this._endDataModeSequenceRegEx = new RegExp("/\r\n"+sequence+"\r\n|^"+sequence+"\r\n/");
    }
};

/**
 * <p>Instructs the server to upgrade the connection to secure TLS connection</p>
 * 
 * <p>Fires <code>callback</code> on successful connection upgrade if set, 
 * otherwise emits <code>'tls'</code></p>
 * 
 * @param {Object} [credentials] An object with PEM encoded key and 
 *        certificate <code>{key:"---BEGIN...", cert:"---BEGIN..."}</code>,
 *        if not set autogenerated values will be used.
 * @param {Function} [callback] If calback is set fire it after successful connection
 *        upgrade, otherwise <code>'tls'</code> is emitted
 */
RAISocket.prototype.startTLS = function(credentials, callback){

    if(this.secureConnection){
        return this._onError(new Error("Secure connection already established"));
    }
    
    if(!callback && typeof credentials == "function"){
        callback = credentials;
        credentials = undefined;
    }
    
    credentials = credentials || this.options.credentials || defaultCredentials;
    
    this._ignore_data = true;
    
    var secure_connector = starttls(this.socket, credentials, (function(ssl_socket){

        if(this.options.debug && !ssl_socket.authorized){
            console.log("WARNING: TLS ERROR ("+ssl_socket.authorizationError+")");
        }
        
        this._remainder = "";
        this._ignore_data = false;
        
        this.secureConnection = true;
    
        this.socket = ssl_socket;
        this.socket.on("data", this._onReceiveData.bind(this));
        
        if(this.options.debug){
            console.log("TLS CONNECTION STARTED");
        }
        
        if(callback){
            callback();
        }else{
            this.emit("tls");
        }
        
    }).bind(this));
    
    secure_connector.on("error", (function(err){
        this._onError(err);
    }).bind(this));
};

/**
 * <p>Closes the connection to the client</p>
 */
RAISocket.prototype.end = function(){
    this.socket.end();
};

/**
 * <p>Called when a chunk of data arrives from the client. If currently in data
 * mode, transmit the data otherwise send it to <code>_processData</code></p>
 * 
 * @event
 * @param {Buffer|String} chunk Data sent by the client
 */
RAISocket.prototype._onReceiveData = function(chunk){

    if(this._ignore_data){ // if currently setting up TLS connection
        return;
    }
    
    var str = typeof chunk=="string"?chunk:chunk.toString("binary"),
        dataEndMatch, dataRemainderMatch, data, match;
    
    if(this._dataMode){
        
        str = this._remainder + str;
        if((dataEndMatch = str.match(/\r\n.*?$/))){
            // if ther's a line that is not ended, keep it for later
            this._remainder = str.substr(dataEndMatch.index);
            str = str.substr(0, dataEndMatch.index);
        }else{
            this._remainder = "";
        }

        // check if a data end sequence is found from the data
        if((dataRemainderMatch = (str+this._remainder).match(this._endDataModeSequenceRegEx))){
            str = str + this._remainder;
            // if the sequence is not on byte 0 emit remaining data
            if(dataRemainderMatch.index){
                data = new Buffer(str.substr(0, dataRemainderMatch.index), "binary");
                if(this.options.debug){
                    console.log("DATA:", data.toString("utf-8"));
                }
                this.emit("data", data);
            }
            // emit data ready
            this._remainder = "";
            this.emit("ready");
            this._dataMode = false;
            // send the remaining data for processing
            this._processData(str.substr(dataRemainderMatch.index + dataRemainderMatch[0].length)+"\r\n");
        }else{
            // check if there's not something in the end of the data that resembles
            // end sequence - if so, cut it off and save it to the remainder
            str = str + this._remainder;
            this._remainder=  "";
            for(var i = Math.min(this._endDataModeSequence.length-1, str.length); i>0; i--){
                match = this._endDataModeSequence.substr(0, i);
                if(str.substr(-match.length) == match){
                    this._remainder = str.substr(-match.length);
                    str = str.substr(0, str.length - match.length);
                }
            }

            // if there's some data leht, emit it
            if(str.length){
                data = new Buffer(str, "binary");
                if(this.options.debug){
                    console.log("DATA:", data.toString("utf-8"));
                }
                this.emit("data", data);
            }
        }
    }else{
        // Not in data mode, process as command
        this._processData(str);
    }
};

/**
 * <p>Processed incoming command lines and emits found data as 
 * <code>'command'</code> with the command name as the first param and the rest
 * of the data as second (Buffer)</p>
 * 
 * @param {String} str Binary string to be processed
 */
RAISocket.prototype._processData = function(str){
    if(!str.length){
        return;
    }
    var lines = (this._remainder+str).split("\r\n"),
        match, command;
        
    this._remainder = lines.pop();
    
    for(var i=0, len = lines.length; i<len; i++){
        if(this._ignore_data){
            // If TLS upgrade is initiated do not process current buffer
            this._remainder = "";
            break;
        }
        if(!this._dataMode){
            if((match = lines[i].match(/\s*[\S]+\s?/))){
                command = (match[0] || "").trim();
                if(this.options.debug){
                    console.log("COMMAND:", lines[i]);
                }
                this.emit("command", command, new Buffer(lines[i].substr(match.index + match[0].length), "binary"));
            }
        }else{
            if(this._remainder){
                this._remainder += "\r\n";
            }
            this._onReceiveData(lines.slice(i).join("\r\n"));
            break;
        }
    }  
};

/**
 * <p>Called when the connection is or is going to be ended</p> 
 */
RAISocket.prototype._destroy = function(){
    if(this._destroyed)return;
    this._destroyed = true;
    
    this.removeAllListeners();
};

/**
 * <p>Called when the connection is ended. Emits <code>'end'</code></p>
 * 
 * @event
 */
RAISocket.prototype._onEnd = function(){
    this.emit("end");
    this._destroy();
};

/**
 * <p>Called when an error has appeared. Emits <code>'error'</code> with
 * the error object as a parameter.</p>
 * 
 * @event
 * @param {Object} err Error object
 */
RAISocket.prototype._onError = function(err){
    this.emit("error", err);
    this._destroy();
};

/**
 * <p>Called when a timeout has occured. Connection will be closed and
 * <code>'timeout'</code> is emitted.</p>
 * 
 * @event
 */
RAISocket.prototype._onTimeout = function(){
    if(this.options.disconnectOnTimeout){
        if(this.socket && !this.socket.destroyed){
            this.socket.end();
        }
        this.emit("timeout");
        this._destroy();
    }else{
        this.emit("timeout");
    }
};

/**
 * <p>Called when the connection is closed</p>
 * 
 * @event
 * @param {Boolean} hadError did the connection end because of an error?
 */
RAISocket.prototype._onClose = function(hadError){
    this._destroy();
};