var simplesmtp = require("../index"),
    EventEmitter = require('events').EventEmitter,
    utillib = require("util"),
    xoauth2 = require("xoauth2");

// expose to the world
module.exports = function(port, host, options){
    var pool = new SMTPConnectionPool(port, host, options);
    return pool;
};

/**
 * <p>Creates a SMTP connection pool</p>
 *
 * <p>Optional options object takes the following possible properties:</p>
 * <ul>
 *     <li><b>secureConnection</b> - use SSL</li>
 *     <li><b>name</b> - the name of the client server</li>
 *     <li><b>auth</b> - authentication object <code>{user:"...", pass:"..."}</code>
 *     <li><b>ignoreTLS</b> - ignore server support for STARTTLS</li>
 *     <li><b>tls</b> - options for createCredentials</li>
 *     <li><b>debug</b> - output client and server messages to console</li>
 *     <li><b>maxConnections</b> - how many connections to keep in the pool</li>
 * </ul>
 *
 * @constructor
 * @namespace SMTP Client Pool module
 * @param {Number} [port=25] The port number to connecto to
 * @param {String} [host="localhost"] THe hostname to connect to
 * @param {Object} [options] optional options object
 */
function SMTPConnectionPool(port, host, options){
    EventEmitter.call(this);

    /**
     * Port number to connect to
     * @public
     */
    this.port = port || 25;

    /**
     * Hostname to connect to
     * @public
     */
    this.host = host || "localhost";

    /**
     * Options object
     * @public
     */
    this.options = options || {};
    this.options.maxConnections = this.options.maxConnections || 5;

    /**
     * An array of connections that are currently idle
     * @private
     */
    this._connectionsAvailable = [];

    /**
     * An array of connections that are currently in use
     * @private
     */
    this._connectionsInUse = [];

    /**
     * Message queue (FIFO)
     * @private
     */
    this._messageQueue = [];

    /**
     * Counter for generating ID values for debugging
     * @private
     */
    this._idgen = 0;

    // Initialize XOAUTH2 if needed
    if(this.options.auth && typeof this.options.auth.XOAuth2 == "object"){
        if(!this.options.auth.XOAuth2.user && this.options.auth.user){
            this.options.auth.XOAuth2.user = this.options.auth.user;
        }
        this.options.auth.XOAuth2 = xoauth2.createXOAuth2Generator(this.options.auth.XOAuth2);
    }
}
utillib.inherits(SMTPConnectionPool, EventEmitter);

/**
 * <p>Sends a message. If there's any idling connections available
 * use one to send the message immediatelly, otherwise add to queue.</p>
 *
 * @param {Object} message MailComposer object
 * @param {Function} callback Callback function to run on finish, gets an
 *        <code>error</code> object as a parameter if the sending failed
 *        and on success an object with <code>failedRecipients</code> array as
 *        a list of addresses that were rejected (if any) and
 *        <code>message</code> which indicates the last message received from
 *        the server
 */
SMTPConnectionPool.prototype.sendMail = function(message, callback){
    var connection;

    message.returnCallback = callback;

    if(this._connectionsAvailable.length){
        // if available connections pick one
        connection = this._connectionsAvailable.pop();
        this._connectionsInUse.push(connection);
        this._processMessage(message, connection);
    }else{
        this._messageQueue.push(message);

        if(this._connectionsAvailable.length + this._connectionsInUse.length < this.options.maxConnections){
            this._createConnection();
        }
    }

};

/**
 * <p>Closes all connections</p>
 */
SMTPConnectionPool.prototype.close = function(callback){
    var connection;

    // for some reason destroying the connections seem to be the only way :S
    while(this._connectionsAvailable.length){
        connection = this._connectionsAvailable.pop();
        if(connection.socket){
            connection.socket.destroy();
        }
    }

    while(this._connectionsInUse.length){
        connection = this._connectionsInUse.pop();
        if(connection.socket){
            connection.socket.destroy();
        }
    }

    if(callback){
        process.nextTick(callback);
    }
};

/**
 * <p>Initiates a connection to the SMTP server and adds it to the pool</p>
 */
SMTPConnectionPool.prototype._createConnection = function(){
    var connectionOptions = {
            instanceId: ++this._idgen,
            debug: !!this.options.debug,
            ignoreTLS: !!this.options.ignoreTLS,
            tls: this.options.tls || false,
            auth: this.options.auth || false,
            authMethod: this.options.authMethod,
            name: this.options.name || false,
            secureConnection: !!this.options.secureConnection
        },
        connection = simplesmtp.connect(this.port, this.host, connectionOptions);

    connection.on("idle", this._onConnectionIdle.bind(this, connection));
    connection.on("message", this._onConnectionMessage.bind(this, connection));
    connection.on("ready", this._onConnectionReady.bind(this, connection));
    connection.on("error", this._onConnectionError.bind(this, connection));
    connection.on("end", this._onConnectionEnd.bind(this, connection));
    connection.on("rcptFailed", this._onConnectionRCPTFailed.bind(this, connection));

    this.emit('connectionCreated', connection);

    // as the connection is not ready yet, add to "in use" queue
    this._connectionsInUse.push(connection);
};

/**
 * <p>Processes a message by assigning it to a connection object and initiating
 * the sending process by setting the envelope</p>
 *
 * @param {Object} message MailComposer message object
 * @param {Object} connection <code>simplesmtp.connect</code> connection
 */
SMTPConnectionPool.prototype._processMessage = function(message, connection){
    connection.currentMessage = message;
    message.currentConnection = connection;

    // send envelope
    connection.useEnvelope(message.getEnvelope());
};

/**
 * <p>Will be fired on <code>'idle'</code> events by the connection, if
 * there's a message currently in queue</p>
 *
 * @event
 * @param {Object} connection Connection object that fired the event
 */
SMTPConnectionPool.prototype._onConnectionIdle = function(connection){

    var message = this._messageQueue.shift();

    if(message){
        this._processMessage(message, connection);
    }else{
        for(var i=0, len = this._connectionsInUse.length; i<len; i++){
            if(this._connectionsInUse[i] == connection){
                this._connectionsInUse.splice(i,1); // remove from list
                break;
            }
        }
        this._connectionsAvailable.push(connection);
    }
};

/**
 * <p>Will be called when not all recipients were accepted</p>
 *
 * @event
 * @param {Object} connection Connection object that fired the event
 * @param {Array} addresses Failed addresses as an array of strings
 */
SMTPConnectionPool.prototype._onConnectionRCPTFailed = function(connection, addresses){
    if(connection.currentMessage){
        connection.currentMessage.failedRecipients = addresses;
    }
};

/**
 * <p>Will be called when the client is waiting for a message to deliver</p>
 *
 * @event
 * @param {Object} connection Connection object that fired the event
 */
SMTPConnectionPool.prototype._onConnectionMessage = function(connection){
    if(connection.currentMessage){
        connection.currentMessage.streamMessage();
        connection.currentMessage.pipe(connection);
    }
};

/**
 * <p>Will be called when a message has been delivered</p>
 *
 * @event
 * @param {Object} connection Connection object that fired the event
 * @param {Boolean} success True if the message was queued by the SMTP server
 * @param {String} message Last message received from the server
 */
SMTPConnectionPool.prototype._onConnectionReady = function(connection, success, message){
    var error, responseObj = {};
    if(connection.currentMessage && connection.currentMessage.returnCallback){
        if(success){

            if(connection.currentMessage.failedRecipients){
                responseObj.failedRecipients = connection.currentMessage.failedRecipients;
            }

            if(message){
                responseObj.message = message;
            }

            if(connection.currentMessage._messageId){
                responseObj.messageId = connection.currentMessage._messageId;
            }

            connection.currentMessage.returnCallback(null, responseObj);

        }else{
            error = new Error("Message delivery failed" + (message?": "+message:""));
            error.name = "DeliveryError";
            connection.currentMessage.returnCallback(error);
        }
    }
    connection.currentMessage = false;
};

/**
 * <p>Will be called when an error occurs</p>
 *
 * @event
 * @param {Object} connection Connection object that fired the event
 * @param {Object} error Error object
 */
SMTPConnectionPool.prototype._onConnectionError = function(connection, error){
    var message = connection.currentMessage;
    connection.currentMessage = false;

    // clear a first message from the list, otherwise an infinite loop will emerge
    if(!message){
        message = this._messageQueue.shift();
    }

    if(message && message.returnCallback){
        message.returnCallback(error);
    }
};

/**
 * <p>Will be called when a connection to the client is closed</p>
 *
 * @event
 * @param {Object} connection Connection object that fired the event
 */
SMTPConnectionPool.prototype._onConnectionEnd = function(connection){
    var removed = false, i, len;

    // if in "available" list, remove
    for(i=0, len = this._connectionsAvailable.length; i<len; i++){
        if(this._connectionsAvailable[i] == connection){
            this._connectionsAvailable.splice(i,1); // remove from list
            removed = true;
            break;
        }
    }

    if(!removed){
        // if in "in use" list, remove
        for(i=0, len = this._connectionsInUse.length; i<len; i++){
            if(this._connectionsInUse[i] == connection){
                this._connectionsInUse.splice(i,1); // remove from list
                removed = true;
                break;
            }
        }
    }

    // if there's still unprocessed mail and available connection slots, create
    // a new connection
    if(this._messageQueue.length &&
      this._connectionsInUse.length + this._connectionsAvailable.length < this.options.maxConnections){
        this._createConnection();
    }
};
