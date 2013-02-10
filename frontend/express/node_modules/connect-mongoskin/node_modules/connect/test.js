var connect = require('./')
  , http = require('http');

var app = connect()
.use(connect.staticCache())
.use(connect.static(__dirname));

http.createServer(app).listen(3000);