var http = require('http');
var url  = require('url');
var fs   = require('fs');

var Mongolian = require('mongolian');

var monlog = { log: {
                debug : function(message) {},
                info  : function(message) {},
                warn  : function(message) {},
                error : function(message) {}
             }};

var server = new Mongolian(monlog);

var mongo_db = server.db("cloudformation");

http.createServer(function (req, res) {

    var get_data = url.parse(req.url, true).query;

    console.log(get_data);

    res.writeHead(200, { 'Content-Type': 'text/html' });

    mongo_db.collection('input').find({ }).toArray(function (err, data) {

        for(var i = 0; i < data.length; i++)
        {

            for(var key in data[i])
            {
                if (key != "_id")
                {
                    var html = "<div>" + key  +  " - " +  data[i][key] + "</div>";
                    res.write(html);
                }
            }
        }

        res.end("ok");

    });

    mongo_db.collection('input').insert(get_data, function(err, result) {

        if(err)
        {
            return console.error(err);
        }

        console.log(result);
    });

}).listen(80);
