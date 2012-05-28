exports.error = function(err, args, name) {
  var cb = args.pop();
  if(cb && typeof cb === 'function') {
    cb(err)
  } else {
    console.error("Error occured with no callback to handle it while calling " + name,  err);
  }
}
