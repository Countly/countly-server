var createSMTPServer = require("./server"),
    Stream = require("stream").Stream,
    utillib = require("util"),
    oslib = require("os");

module.exports = function(options, connectionCallback){
    return new SimpleServer(options, connectionCallback);
}

function SimpleServer(options, connectionCallback){
    if(!connectionCallback && typeof options == "function"){
        connectionCallback = options;
        options = undefined;
    }

    this.connectionCallback = connectionCallback;

    this.options = options || {};
    this.initialChunk = true;

    if(!("ignoreTLS" in this.options)){
        this.options.ignoreTLS = true;
    }

    if(!("disableDNSValidation" in this.options)){
        this.options.disableDNSValidation = true;
    }

    this.server = createSMTPServer(options);
    this.listen = this.server.listen.bind(this.server);

    this.server.on("startData", this._onStartData.bind(this));
    this.server.on("data", this._onData.bind(this));
    this.server.on("dataReady", this._onDataReady.bind(this));
}

SimpleServer.prototype._onStartData = function(connection){
    connection._session = new SimpleServerConnection(connection);
    this.connectionCallback(connection._session);
}

SimpleServer.prototype._onData = function(connection, chunk){
    if(this.initialChunk){
        chunk = Buffer.concat([new Buffer(this._generateReceivedHeader(connection) + "\r\n", "utf-8"), chunk])
        this.initialChunk = false;
    }
    connection._session.emit("data", chunk);
}

SimpleServer.prototype._onDataReady = function(connection, callback){
    connection._session._setCallback(callback);
    connection._session.emit("end");
}

SimpleServer.prototype._generateReceivedHeader = function(connection){
    var parts = [];

    if(connection.host && !connection.host.match(/^\[?\d+\.\d+\.\d+\.\d+\]?$/)){
        parts.push("from " + connection.host);
        parts.push("("+connection.remoteAddress+")");
    }else{
        parts.push("from " + connection.remoteAddress);
    }

    parts.push("by " + getHostName());

    parts.push("with SMTP;");

    parts.push(Date());

    return "Received: " + parts.join(" ");
}

function SimpleServerConnection(connection){
    Stream.call(this);

    this.accepted = false;
    this.rejected = false;

    this._callback = (function(err, code){
        if(err){
            this.rejected = err;
        }else{
            this.accepted = code || true;
        }
    });

    ["from", "to", "host", "remodeAddress"].forEach((function(key){
        if(connection[key]){
            this[key] = connection[key];
        }
    }).bind(this));
}
utillib.inherits(SimpleServerConnection, Stream);

SimpleServerConnection.prototype._setCallback = function(callback){

    if(this.rejected){
        return callback(this.rejected);
    }else if(this.accepted){
        return callback(null, this.accepted !== true ? this.accepted : undefined);
    }else{
        this._callback = callback;
    }

}

SimpleServerConnection.prototype.pause = function(){}

SimpleServerConnection.prototype.resume = function(){}

SimpleServerConnection.prototype.accept = function(code){
    this._callback(null, code);
}

SimpleServerConnection.prototype.reject = function(reason){
    this._callback(new Error(reason || "Rejected"));
}

function getHostName(){
    return (oslib.hostname && oslib.hostname()) ||
          (oslib.getHostname && oslib.getHostname()) ||
          "127.0.0.1";
}
