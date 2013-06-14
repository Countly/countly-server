var simplesmtp = require("simplesmtp"),
    fs = require("fs");

var allowedRecipientDomains = ["node.ee", "neti.ee"];

var smtp = simplesmtp.createServer();
smtp.listen(25);

// Set up recipient validation function
smtp.on("validateRecipient", function(connection, email, done){
    var domain = ((email || "").split("@").pop() || "").toLowerCase().trim();
    
    if(allowedRecipientDomains.indexOf(domain) < 0){
        done(new Error("Invalid domain"));
    }else{
        done();
    }
});

smtp.on("startData", function(connection){
    connection.saveStream = fs.createWriteStream("/tmp/message.txt");
});

smtp.on("data", function(connection, chunk){
    connection.saveStream.write(chunk);
});

smtp.on("dataReady", function(connection, done){
    connection.saveStream.end();
    done();

    console.log("Delivered message by " + connection.from + 
    	" to " + connection.to.join(", ") + ", sent from " + connection.host + 
    	" (" + connection.remoteAddress + ")");
});