var net = require('net');

function checkConnection(host, port, timeout) {
    return new Promise(function(resolve) {
        timeout = timeout || 10000;
        var timer = setTimeout(function() {
            resolve(false);
            socket.end();
        }, timeout);
        var socket = net.createConnection(port, host, function() {
            clearTimeout(timer);
            resolve(true);
            socket.end();
        });
        socket.on('error', function() {
            clearTimeout(timer);
            resolve(false);
        });
    });
}

async function sleep(seconds) {
    return new Promise(function(resolve) {
        setTimeout(resolve, seconds * 1000);
    });
}

async function testConnection() {
    var connected = false;

    while (!connected) {
        connected = await checkConnection("localhost", 3001);
        console.log("connection status", connected);
        await sleep(1);
    }
}

testConnection();