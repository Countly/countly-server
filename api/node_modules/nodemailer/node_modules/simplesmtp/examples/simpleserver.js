//console.log(process.stdout.writable);
var simplesmtp = require("../index");

simplesmtp.createSimpleServer({SMTPBanner:"My Server", debug: true}, function(req){
    process.stdout.write("\r\nNew Mail:\r\n");
    req.on("data", function(chunk){
        process.stdout.write(chunk);
    });
    req.accept();
}).listen(25, function(err){
    if(!err){
        console.log("SMTP server listening on port 25");
    }else{
        console.log("Could not start server on port 25. Ports under 1000 require root privileges.");
        console.log(err.message);
    }
});
