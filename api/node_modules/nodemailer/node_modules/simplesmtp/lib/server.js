/**
 * @fileOverview This is the main file for the simplesmtp library to create custom SMTP servers
 * @author <a href="mailto:andris@node.ee">Andris Reinman</a>
 */

var RAIServer = require("rai").RAIServer,
    EventEmitter = require('events').EventEmitter,
    oslib = require('os'),
    utillib = require("util"),
    dnslib = require("dns"),
    crypto = require("crypto");

// expose to the world
module.exports = function(options){
    return new SMTPServer(options);
};

/**
 * <p>Constructs a SMTP server</p>
 *
 * <p>Possible options are:</p>
 *
 * <ul>
 *     <li><b>name</b> - the hostname of the server, will be used for
 *         informational messages</li>
 *     <li><b>debug</b> - if set to true, print out messages about the connection</li>
 *     <li><b>timeout</b> - client timeout in milliseconds, defaults to 60 000</li>
 *     <li><b>secureConnection</b> - start a server on secure connection</li>
 *     <li><b>SMTPBanner</b> - greeting banner that is sent to the client on connection</li>
 *     <li><b>requireAuthentication</b> - if set to true, require that the client
 *         must authenticate itself</li>
 *     <li><b>enableAuthentication</b> - if set to true, client may authenticate itself but don't have to</li>
 *     <li><b>maxSize</b> - maximum size of an e-mail in bytes</li>
 *     <li><b>credentials</b> - TLS credentials</li>
 *     <li><b>authMethods</b> - allowed authentication methods, defaults to <code>["PLAIN", "LOGIN"]</code></li>
 *     <li><b>disableEHLO</b> - if set, support HELO only</li>
 *     <li><b>ignoreTLS</b> - if set, allow client do not use STARTTLS</li>
 *     <li><b>disableDNSValidation</b> - if set, do not validate sender domains</li>
 * </ul>
 *
 * @constructor
 * @namespace SMTP Server module
 * @param {Object} [options] Options object
 */
function SMTPServer(options){
    EventEmitter.call(this);

    this.options = options || {};
    this.options.name = this.options.name || (oslib.hostname && oslib.hostname()) ||
               (oslib.getHostname && oslib.getHostname()) ||
               "127.0.0.1";

    this.options.authMethods = (this.options.authMethods || ["PLAIN", "LOGIN"]).map(
        function(auth){
            return auth.toUpperCase().trim();
        });

    this.options.disableEHLO = !!this.options.disableEHLO;
    this.options.ignoreTLS = !!this.options.ignoreTLS;

    this.SMTPServer = new RAIServer({
        secureConnection: !!this.options.secureConnection,
        credentials: this.options.credentials,
        timeout: this.options.timeout || 60*1000,
        disconnectOnTimeout: false,
        debug: !!this.options.debug
    });

    this.SMTPServer.on("connect", this._createSMTPServerConnection.bind(this));
}
utillib.inherits(SMTPServer, EventEmitter);

/**
 * Server starts listening on defined port and hostname
 *
 * @param {Number} port The port number to listen
 * @param {String} [host] The hostname to listen
 * @param {Function} callback The callback function to run when the server is listening
 */
SMTPServer.prototype.listen = function(port, host, callback){
    this.SMTPServer.listen(port, host, callback);
};

/**
 * <p>Closes the server</p>
 *
 * @param {Function} callback The callback function to run when the server is closed
 */
SMTPServer.prototype.end = function(callback){
    this.SMTPServer.end(callback);
};

/**
 * <p>Creates a new {@link SMTPServerConnection} object and links the main server with
 * the client socket</p>
 *
 * @param {Object} client RAISocket object to a client
 */
SMTPServer.prototype._createSMTPServerConnection = function(client){
    new SMTPServerConnection(this, client);
};

/**
 * <p>Sets up a handler for the connected client</p>
 *
 * <p>Restarts the state and sets up event listeners for client actions</p>
 *
 * @constructor
 * @param {Object} server {@link SMTPServer} instance
 * @param {Object} client RAISocket instance for the client
 */
function SMTPServerConnection(server, client){
    this.server = server;
    this.client = client;

    this.init();

    if(this.server.options.debug){
        console.log("Connection from", this.client.remoteAddress);
    }

    this.client.on("timeout", this._onTimeout.bind(this));
    this.client.on("error", this._onError.bind(this));
    this.client.on("command", this._onCommand.bind(this));
    this.client.on("end", this._onEnd.bind(this));

    this.client.on("data", this._onData.bind(this));
    this.client.on("ready", this._onDataReady.bind(this));

    // Send the greeting banner. Force ESMTP notice
    this.client.send("220 "+this.server.options.name + " ESMTP " + (this.server.options.SMTPBanner || "node.js simplesmtp"));
}

/**
 * <p>Reset the envelope state</p>
 *
 * <p>If <code>keepAuthData</code> is set to true, then doesn't remove
 * authentication data</p>
 *
 * @param {Boolean} [keepAuthData=false] If set to true keep authentication data
 */
SMTPServerConnection.prototype.init = function(keepAuthData){
    this.envelope = {from: "", to:[], date: new Date()};

    if(this.hostNameAppearsAs){
        this.envelope.host = this.hostNameAppearsAs;
    }

    if(this.client.remoteAddress){
        this.envelope.remoteAddress = this.client.remoteAddress;
    }

    if(!keepAuthData){
        this.authentication = {
            username: false,
            authenticated: false,
            state: "NORMAL"
        };
    }

    this.envelope.authentication = this.authentication;
};

/**
 * <p>Sends a message to the client and closes the connection</p>
 *
 * @param {String} [message] if set, send it to the client before disconnecting
 */
SMTPServerConnection.prototype.end = function(message){
    if(message){
        this.client.send(message);
    }
    this.client.end();
};

/**
 * <p>Will be called when the connection to the client is closed</p>
 *
 * @event
 */
SMTPServerConnection.prototype._onEnd = function(){
    if(this.server.options.debug){
        console.log("Connection closed to", this.client.remoteAddress);
    }
    this.server.emit("close", this.envelope);
};

/**
 * <p>Will be called when timeout occurs</p>
 *
 * @event
 */
SMTPServerConnection.prototype._onTimeout = function(){
    this.end("421 4.4.2 "+this.server.options.name+" Error: timeout exceeded");
};

/**
 * <p>Will be called when an error occurs</p>
 *
 * @event
 */
SMTPServerConnection.prototype._onError = function(){
    this.end("421 4.4.2 "+this.server.options.name+" Error: client error");
};

/**
 * <p>Will be called when a command is received from the client</p>
 *
 * <p>If there's curently an authentication process going on, route
 * the data to <code>_handleAuthLogin</code>, otherwise act as
 * defined</p>
 *
 * @event
 * @param {String} command Command
 * @param {Buffer} command Payload related to the command
 */
SMTPServerConnection.prototype._onCommand = function(command, payload){

    if(this.authentication.state == "AUTHPLAINUSERDATA"){
        this._handleAuthPlain(command.toString("utf-8").trim().split(" "));
        return;
    }

    if(this.authentication.state == "AUTHENTICATING"){
        this._handleAuthLogin(command);
        return;
    }

    switch((command || "").toString().trim().toUpperCase()){

        // Should not occur too often
        case "HELO":
            this._onCommandHELO(payload.toString("utf-8").trim());
            break;

        // Lists server capabilities
        case "EHLO":
            if(!this.server.options.disableEHLO){
                this._onCommandEHLO(payload.toString("utf-8").trim());
            }else{
                this.client.send("502 5.5.2 Error: command not recognized");
            }
            break;

        // Closes the connection
        case "QUIT":
            this.end("221 2.0.0 Goodbye!");
            break;

        // Resets the current state
        case "RSET":
            this._onCommandRSET();
            break;

        // Doesn't work for spam related purposes
        case "VRFY":
            this.client.send("252 2.1.5 Send some mail, I'll try my best");
            break;

        // Initiate an e-mail by defining a sender
        case "MAIL":
            this._onCommandMAIL(payload.toString("utf-8").trim());
            break;

        // Add recipients to the e-mail envelope
        case "RCPT":
            this._onCommandRCPT(payload.toString("utf-8").trim());
            break;

        // Authenticate if needed
        case "AUTH":
            this._onCommandAUTH(payload);
            break;

        // Start accepting binary data stream
        case "DATA":
            this._onCommandDATA();
            break;

        // Upgrade connection to secure TLS
        case "STARTTLS":
            this._onCommandSTARTTLS();
            break;

        // Display an error on anything else
        default:
            this.client.send("502 5.5.2 Error: command not recognized");
    }
};

/**
 * <p>Initiate an e-mail by defining a sender.</p>
 *
 * <p>This doesn't work if authorization is required but the client is
 * not logged in yet.</p>
 *
 * <p>If <code>validateSender</code> option is set to true, then emits
 * <code>'validateSender'</code> and wait for the callback before moving
 * on</p>
 *
 * @param {String} mail Address payload in the form of "FROM:&lt;address&gt;"
 */
SMTPServerConnection.prototype._onCommandMAIL = function(mail){
    var self = this,
        match,
        email,
        domain;

    if(!this.hostNameAppearsAs){
        return this.client.send("503 5.5.1 Error: send HELO/EHLO first");
    }

    if(this.server.options.requireAuthentication && !this.authentication.authenticated){
        return this.client.send("530 5.5.1 Authentication Required");
    }

    if(this.envelope.from){
        return this.client.send("503 5.5.1 Error: nested MAIL command");
    }

    if(!(match = mail.match(/^from\:\s*<([^@>]+\@([^@>]+))>(\s|$)/i))){
        return this.client.send("501 5.1.7 Bad sender address syntax");
    }

    email = match[1] || "";
    domain = (match[2] || "").toLowerCase();

    this._validateAddress("sender", email, domain, function (err) {
        if (err) {
            return self.client.send(err.message);
        }
        email = email.substr(0, email.length - domain.length) + domain;
        self.envelope.from = email;
        self.client.send("250 2.1.0 Ok");
    });
};

/**
 * <p>Add recipients to the e-mail envelope</p>
 *
 * <p>This doesn't work if <code>MAIL</code> command is not yet executed</p>
 *
 * <p>If <code>validateRecipients</code> option is set to true, then emits
 * <code>'validateRecipient'</code> and wait for the callback before moving
 * on</p>
 *
 * @param {String} mail Address payload in the form of "TO:&lt;address&gt;"
 */
SMTPServerConnection.prototype._onCommandRCPT = function(mail){
    var self = this,
        match,
        email,
        domain;

    if(!this.envelope.from){
        return this.client.send("503 5.5.1 Error: need MAIL command");
    }

    if(!(match = mail.match(/^to\:\s*<([^@>]+\@([^@>]+))>$/i))){
        return this.client.send("501 5.1.7 Bad recipient address syntax");
    }

    email = match[1] || "";
    domain = (match[2] || "").toLowerCase();

    this._validateAddress("recipient", email, domain, function (err) {
        if (err) {
            return self.client.send(err.message);
        }

        // force domain part to be lowercase
        email = email.substr(0, email.length - domain.length) + domain;

        // add to recipients list
        if(self.envelope.to.indexOf(email)<0){
            self.envelope.to.push(email);
        }
        self.client.send("250 2.1.0 Ok");
    });

};

/**
 * <p>If <code>disableDNSValidation</code> option is set to false, then performs
 * validation via DNS lookup.
 *
 * <p>If <code>validate{type}</code> option is set to true, then emits
 * <code>'validate{type}'</code> and waits for the callback before moving
 * on</p>
 *
 * @param {String} addressType 'sender' or 'recipient'
 * @param {String} email
 * @param {String} domain
 * @param {Function} callback
 */
SMTPServerConnection.prototype._validateAddress = function (addressType, email, domain, callback) {

    var validateEvent,
        validationFailedEvent,
        dnsErrorMessage,
        localErrorMessage;

    if (addressType === "sender") {
        validateEvent = "validateSender";
        validationFailedEvent = "senderValidationFailed";
        dnsErrorMessage = "450 4.1.8 <"+email+">: Sender address rejected: Domain not found";
        localErrorMessage = "550 5.1.1 <"+email+">: Sender address rejected: User unknown in local sender table";
    } else if (addressType === "recipient") {
        validateEvent = "validateRecipient";
        validationFailedEvent = "recipientValidationFailed";
        dnsErrorMessage = "450 4.1.8 <"+email+">: Recipient address rejected: Domain not found";
        localErrorMessage = "550 5.1.1 <"+email+">: Recipient address rejected: User unknown in local recipient table";
    } else {
        // How are internal errors handled?
        throw new Error('Address type not supported');
    }

    var validateViaLocal = function () {
        if(this.server.listeners(validateEvent).length){
            this.server.emit(validateEvent, this.envelope, email, (function(err){
                if(err){
                    return callback(new Error(localErrorMessage));
                }
                return callback();
            }).bind(this));
        } else {
            return callback();
        }
    };

    var validateViaDNS = function () {
        dnslib.resolveMx(domain, (function(err, addresses){
            if(err || !addresses || !addresses.length){
                this.server.emit(validationFailedEvent, email);
                return callback(new Error(dnsErrorMessage));
            }
            validateViaLocal.call(this);
        }).bind(this));
    };

    if(!this.server.options.disableDNSValidation) {
        validateViaDNS.call(this);
    } else {
        return validateViaLocal.call(this);
    }
};

/**
 * <p>Switch to data mode and starts waiting for a binary data stream. Emits
 * <code>'startData'</code>.</p>
 *
 * <p>If <code>RCPT</code> is not yet run, stop</p>
 */
SMTPServerConnection.prototype._onCommandDATA = function(){

    if(!this.envelope.to.length){
        return this.client.send("503 5.5.1 Error: need RCPT command");
    }

    this.client.startDataMode();
    this.client.send("354 End data with <CR><LF>.<CR><LF>");
    this.server.emit("startData", this.envelope);
};

/**
 * <p>Resets the current state - e-mail data and authentication info</p>
 */
SMTPServerConnection.prototype._onCommandRSET = function(){
    this.init();
    this.client.send("250 2.0.0 Ok");
};

/**
 * <p>If the server is in secure connection mode, start the authentication
 * process. Param <code>payload</code> defines the authentication mechanism.</p>
 *
 * <p>Currently supported - PLAIN and LOGIN. There is no need for more
 * complicated mechanisms (different CRAM versions etc.) since authentication
 * is only done in secure connection mode</p>
 *
 * @param {Buffer} payload Defines the authentication mechanism
 */
SMTPServerConnection.prototype._onCommandAUTH = function(payload){
    var method;

    if(!this.server.options.requireAuthentication && !this.server.options.enableAuthentication){
        return this.client.send("503 5.5.1 Error: authentication not enabled");
    }

    if(!this.server.options.ignoreTLS && !this.client.secureConnection){
        return this.client.send("530 5.7.0 Must issue a STARTTLS command first");
    }

    if(this.authentication.authenticated){
        return this.client.send("503 5.7.0 No identity changes permitted");
    }

    payload = payload.toString("utf-8").trim().split(" ");
    method = payload.shift().trim().toUpperCase();

    if(this.server.options.authMethods.indexOf(method)<0){
        return this.client.send("535 5.7.8 Error: authentication failed: no mechanism available");
    }

    switch(method){
        case "PLAIN":
            this._handleAuthPlain(payload);
            break;
        case "LOGIN":
            this._handleAuthLogin();
            break;
    }
};

/**
 * <p>Upgrade the connection to a secure TLS connection</p>
 */
SMTPServerConnection.prototype._onCommandSTARTTLS = function(){
    if(this.client.secureConnection){
        return this.client.send("554 5.5.1 Error: TLS already active");
    }

    this.client.send("220 2.0.0 Ready to start TLS");

    this.client.startTLS(this.server.options.credentials, (function(){
        // Connection secured
        // nothing to do here, since it is the client that should
        // make the next move
    }).bind(this));
};

/**
 * <p>Retrieve hostname from the client. Not very important, since client
 * IP is already known and the client can send fake data</p>
 *
 * @param {String} host Hostname of the client
 */
SMTPServerConnection.prototype._onCommandHELO = function(host){
    if(!host){
        return this.client.send("501 Syntax: EHLO hostname");
    }else{
        this.hostNameAppearsAs = host;
        this.envelope.host = host;
    }
    this.client.send("250 "+this.server.options.name+" at your service, ["+
        this.client.remoteAddress+"]");
};

/**
 * <p>Retrieve hostname from the client. Not very important, since client
 * IP is already known and the client can send fake data</p>
 *
 * <p>Additionally displays server capability list to the client</p>
 *
 * @param {String} host Hostname of the client
 */
SMTPServerConnection.prototype._onCommandEHLO = function(host){
    var response = [this.server.options.name+" at your service, ["+
        this.client.remoteAddress+"]", "8BITMIME", "ENHANCEDSTATUSCODES"];

    if(this.server.options.maxSize){
        response.push("SIZE "+this.server.options.maxSize);
    }

    if((this.client.secureConnection || this.server.options.ignoreTLS) && (this.server.options.requireAuthentication || this.server.options.enableAuthentication)){
        response.push("AUTH "+this.server.options.authMethods.join(" "));
        response.push("AUTH="+this.server.options.authMethods.join(" "));
    }

    if(!this.client.secureConnection){
        response.push("STARTTLS");
    }

    if(!host){
        return this.client.send("501 Syntax: EHLO hostname");
    }else{
        this.hostNameAppearsAs = host;
        this.envelope.host = host;
    }

    this.client.send(response.map(function(feature, i, arr){
        return "250"+(i<arr.length-1?"-":" ")+feature;
    }).join("\r\n"));
};

/**
 * <p>Detect login information from the payload and initiate authentication
 * by emitting <code>'authorizeUser'</code> and waiting for its callback</p>
 *
 * @param {Buffer} payload AUTH PLAIN login information
 */
SMTPServerConnection.prototype._handleAuthPlain = function(payload){
    if (payload.length) {
        var userdata = new Buffer(payload.join(" "), "base64"), password;
        userdata = userdata.toString("utf-8").split("\u0000");

        if (userdata.length != 3) {
            return this.client.send("500 5.5.2 Error: invalid userdata to decode");
        }

        this.authentication.username = userdata[1] || userdata[0] || "";
        password = userdata[2] || "";

        this.server.emit("authorizeUser",
            this.envelope,
            this.authentication.username,
            password,
            (function(err, success){
                if(err || !success){
                    this.authentication.authenticated = false;
                    this.authentication.username = false;
                    this.authentication.state = "NORMAL";
                    return this.client.send("535 5.7.8 Error: authentication failed: generic failure");
                }
                this.client.send("235 2.7.0 Authentication successful");
                this.authentication.authenticated = true;
                this.authentication.state = "AUTHENTICATED";
            }).bind(this));
    } else {
        if(this.authentication.state == "NORMAL"){
            this.authentication.state = "AUTHPLAINUSERDATA";
            this.client.send("334");
        }
    }

};

/**
 * <p>Sets authorization state to "AUTHENTICATING" and reuqests for the
 * username and password from the client</p>
 *
 * <p>If username and password are set initiate authentication
 * by emitting <code>'authorizeUser'</code> and waiting for its callback</p>
 *
 * @param {Buffer} payload AUTH LOGIN login information
 */
SMTPServerConnection.prototype._handleAuthLogin = function(payload){
    if(this.authentication.state == "NORMAL"){
        this.authentication.state = "AUTHENTICATING";
        this.client.send("334 VXNlcm5hbWU6");
    }else if(this.authentication.state == "AUTHENTICATING"){
        if(this.authentication.username === false){
            this.authentication.username = new Buffer(payload, "base64").toString("utf-8");
            this.client.send("334 UGFzc3dvcmQ6");
        }else{
            this.authentication.state = "VERIFYING";
            this.server.emit("authorizeUser",
                this.envelope,
                this.authentication.username,
                new Buffer(payload, "base64").toString("utf-8"),
                (function(err, success){
                    if(err || !success){
                        this.authentication.authenticated = false;
                        this.authentication.username = false;
                        this.authentication.state = "NORMAL";
                        return this.client.send("535 5.7.8 Error: authentication failed: generic failure");
                    }
                    this.client.send("235 2.7.0 Authentication successful");
                    this.authentication.authenticated = true;
                    this.authentication.state = "AUTHENTICATED";
                }).bind(this));
        }

    }
};

/**
 * <p>Emits the data received from the client with <code>'data'</code>
 *
 * @event
 * @param {Buffer} chunk Binary data sent by the client on data mode
 */
SMTPServerConnection.prototype._onData = function(chunk){
    this.server.emit("data", this.envelope, chunk);
};

/**
 * <p>If the data stream ends, emit <code>'dataReady'</code>and wait for
 * the callback, only if server listened for it.</p>
 *
 * @event
 */
SMTPServerConnection.prototype._onDataReady = function(){
    if (this.server.listeners('dataReady').length) {
        this.server.emit("dataReady", this.envelope, (function(err, code){
            this.init(true); //reset state, keep auth data

            if(err){
                this.client.send("550 "+(err && err.message || "FAILED"));
            }else{
                this.client.send("250 2.0.0 Ok: queued as "+(code || crypto.randomBytes(10).toString("hex")));
            }

        }).bind(this));
    } else {
        this.init(true); //reset state, keep auth data
        this.client.send("250 2.0.0 Ok: queued as " + crypto.randomBytes(10).toString("hex"));
    }
};

