var sys = require('sys'),
    fs = require('fs'),
    im = require('./imagemagick');

var path = 'sample-images/jpeg5.jpg';
var imdata = fs.readFileSync(path, 'binary');

im.identify(path, function(err, features){
  if (err) return sys.error(err.stack || err);
  sys.puts('features: '+sys.inspect(features));
})

im.identify({data:imdata}, function(err, features){
  if (err) return sys.error(err.stack || err);
  sys.puts('features: '+sys.inspect(features));
})

im.readMetadata(path, function(err, metadata){
  if (err) return sys.error(err.stack || err);
  sys.puts('metadata: '+sys.inspect(metadata));
})

im.readMetadata({data:imdata}, function(err, metadata){
  if (err) return sys.error(err.stack || err);
  sys.puts('metadata: '+sys.inspect(metadata));
})

var timeStarted = new Date;
im.resize({
  srcPath: path,
  dstPath: path+'.resized.jpg',
  width: 256
}, function(err, stdout, stderr){
  if (err) return sys.error(err.stack || err);
  sys.puts('real time taken for convert: '+((new Date)-timeStarted)+' ms')
  im.identify(['-format', '%b', path+'.resized.jpg'], function(err, r){
    if (err) throw err;
    sys.puts('size: '+r.substr(0,r.length-2)+' Bytes');
  })
})

timeStarted = new Date;
im.resize({
  srcData: imdata,
  width: 256
}, function(err, stdout, stderr){
  if (err) return sys.error(err.stack || err);
  sys.puts('real time taken for convert (with buffers): '+((new Date)-timeStarted)+' ms');
  fs.writeFileSync(path+'.resized-io.jpg', stdout, 'binary');
  sys.puts('size: '+stdout.length+' Bytes');
})
