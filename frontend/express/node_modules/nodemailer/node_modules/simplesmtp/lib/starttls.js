// SOURCE: https://gist.github.com/848444

// Target API:
//
//  var s = require('net').createStream(25, 'smtp.example.com');
//  s.on('connect', function() {
//   require('starttls')(s, options, function() {
//      if (!s.authorized) {
//        s.destroy();
//        return;
//      }
//
//      s.end("hello world\n");
//    });
//  });
//
//

/**
 * @namespace Client STARTTLS module
 * @name starttls
 */
module.exports.starttls = starttls;

/**
 * <p>Upgrades a socket to a secure TLS connection</p>
 * 
 * @memberOf starttls
 * @param {Object} socket Plaintext socket to be upgraded
 * @param {Function} callback Callback function to be run after upgrade
 */
function starttls(socket, callback) {
    var sslcontext, pair, cleartext;
    
    socket.removeAllListeners("data");
    sslcontext = require('crypto').createCredentials();
    pair = require('tls').createSecurePair(sslcontext, false);
    cleartext = pipe(pair, socket);

    pair.on('secure', function() {
        var verifyError = (pair._ssl || pair.ssl).verifyError();

        if (verifyError) {
            cleartext.authorized = false;
            cleartext.authorizationError = verifyError;
        } else {
            cleartext.authorized = true;
        }

        callback(cleartext);
    });

    cleartext._controlReleased = true;
    return pair;
}

function forwardEvents(events, emitterSource, emitterDestination) {
    var map = [], name, handler;
    
    for(var i = 0, len = events.length; i < len; i++) {
        name = events[i];

        handler = forwardEvent.bind(emitterDestination, name);
        
        map.push(name);
        emitterSource.on(name, handler);
    }
    
    return map;
}

function forwardEvent() {
    this.emit.apply(this, arguments);
}

function removeEvents(map, emitterSource) {
    for(var i = 0, len = map.length; i < len; i++){
        emitterSource.removeAllListeners(map[i]);
    }
}

function pipe(pair, socket) {
    pair.encrypted.pipe(socket);
    socket.pipe(pair.encrypted);

    pair.fd = socket.fd;
    
    var cleartext = pair.cleartext;
  
    cleartext.socket = socket;
    cleartext.encrypted = pair.encrypted;
    cleartext.authorized = false;

    function onerror(e) {
        if (cleartext._controlReleased) {
            cleartext.emit('error', e);
        }
    }

    var map = forwardEvents(["timeout", "end", "close", "drain", "error"], socket, cleartext);
  
    function onclose() {
        socket.removeListener('error', onerror);
        socket.removeListener('close', onclose);
        removeEvents(map,socket);
    }

    socket.on('error', onerror);
    socket.on('close', onclose);

    return cleartext;
}