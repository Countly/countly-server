var sys = require('sys'),
    fs = require('fs'),
    im = require('./imagemagick');

var path = 'img.jpg';
var timeStarted = new Date;

im.crop({
  srcPath: path,
  dstPath: 'cropped.jpg',
  width: 2000,
  height: 900,
  quality: 1
}, function(err, stdout, stderr){
  if (err) return sys.error(err.stack || err);
  
  sys.puts('real time taken for convert: ' + (new Date() - timeStarted) + ' ms')
  
  im.identify(['-format', '%b', path + '.cropped.jpg'], function(err, r){
    if (err) throw err;
    sys.puts('size: ' + r.substr(0, r.length-2) + ' Bytes');
  })
})
