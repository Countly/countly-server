var RAIServer = require("../lib/rai").RAIServer;

var server = new RAIServer({debug: true, timeout:25*1000});

server.listen(1234, function(err){
    console.log(err || "listening on port 1234...")
});

server.on("connection", function(socket){
    
    socket.send("220 foo.bar"); // send banner greeting
    
    socket.on("command", function(command, payload){
        
        command = (command || "").toString().toUpperCase().trim();
        
        switch(command){
            case "EHLO":
                socket.send("250-foo.bar at your service\r\n"+
                            "250-PIPELINING\r\n" +
                            "250-8BITMIME\r\n"+
                            "250 STARTTLS");
                break;
            case "STARTTLS":
                socket.send("220 Ready to start TLS");
                socket.startTLS();
                break;
            case "MAIL":
                socket.send("250 Ok");
                break;
            case "RCPT":
                socket.send("250 Ok");
                break;
            case "DATA":
                socket.send("354 End with <CR><LF>.<CR><LF>");
                socket.startDataMode();
                break;
            case "QUIT":
                socket.send("221 Good bye");
                socket.end();
                break;
            default:
                socket.send("500 Unknown command");
        }
        
    });
    
    socket.on("tls", function(data){
        console.log("TLS STARTED");
    });
    
    socket.on("data", function(data){
        console.log("MAIL DATA", data);
    });
    
    socket.on("ready", function(data){
        console.log("DATA READY");
        socket.send("250 Ok: queued as FOOBAR");
    });
    
    socket.on("timeout", function(data){
        console.log("TIMEOUT");
    });
    
    socket.on("error", function(err){
        console.log("ERROR:", err.message || err);
    });
    
    socket.on("end", function(){
        console.log("Connection closed");
    });
    
});