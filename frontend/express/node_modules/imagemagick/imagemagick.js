var sys = require('sys'),
    childproc = require('child_process');


function exec2(file, args /*, options, callback */) {
  var options = { encoding: 'utf8'
                , timeout: 0
                , maxBuffer: 500*1024
                , killSignal: 'SIGKILL'
                };

  var callback = arguments[arguments.length-1];

  if (typeof arguments[2] == 'object') {
    var keys = Object.keys(options);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (arguments[2][k] !== undefined) options[k] = arguments[2][k];
    }
  }

  var child = childproc.spawn(file, args);
  var stdout = "";
  var stderr = "";
  var killed = false;
  var timedOut = false;

  var timeoutId;
  if (options.timeout > 0) {
    timeoutId = setTimeout(function () {
      if (!killed) {
        child.kill(options.killSignal);
        timedOut = true;
        killed = true;
        timeoutId = null;
      }
    }, options.timeout);
  }

  child.stdout.setEncoding(options.encoding);
  child.stderr.setEncoding(options.encoding);

  child.stdout.addListener("data", function (chunk) {
    stdout += chunk;
    if (!killed && stdout.length > options.maxBuffer) {
      child.kill(options.killSignal);
      killed = true;
    }
  });

  child.stderr.addListener("data", function (chunk) {
    stderr += chunk;
    if (!killed && stderr.length > options.maxBuffer) {
      child.kill(options.killSignal);
      killed = true
    }
  });

  child.addListener("exit", function (code, signal) {
    if (timeoutId) clearTimeout(timeoutId);
    if (code === 0 && signal === null) {
      if (callback) callback(null, stdout, stderr);
    } else {
      var e = new Error("Command "+(timedOut ? "timed out" : "failed")+": " + stderr);
      e.timedOut = timedOut;
      e.killed = killed;
      e.code = code;
      e.signal = signal;
      if (callback) callback(e, stdout, stderr);
    }
  });
  
  return child;
};


exports.identify = function(pathOrArgs, callback) {
  var isCustom = Array.isArray(pathOrArgs),
      isData,
      args = isCustom ? ([]).concat(pathOrArgs) : [pathOrArgs];

  if (typeof args[args.length-1] === 'object') {
    isData = true;
    pathOrArgs = args[args.length-1];
    args[args.length-1] = '-';
    if (!pathOrArgs.data)
      throw new Error('first argument is missing the "data" member');
  }
  var proc = exec2(exports.identify.path, args, {timeout:120000}, function(err, stdout, stderr) {
    var result;
    if (!err) {
      if (isCustom) {
        result = stdout;
      } else {
        var v = stdout.split(/ +/),
            x = v[2].split(/x/);
        result = {
          format: v[1],
          width: parseInt(x[0]),
          height: parseInt(x[1]),
          depth: parseInt(v[4]),
        };
      }
    }
    callback(err, result);
  });
  if (isData) {
    proc.stdin.setEncoding('binary');
    proc.stdin.write(pathOrArgs.data, 'binary');
    proc.stdin.end();
  }
  return proc;
}
exports.identify.path = 'identify';

function ExifDate(value) {
  // YYYY:MM:DD HH:MM:SS -> Date(YYYY-MM-DD HH:MM:SS +0000)
  value = value.split(/ /);
  return new Date(value[0].replace(/:/g, '-')+' '+
    value[1]+' +0000');
}

function exifKeyName(k) {
  return k.replace(exifKeyName.RE, function(x){
    if (x.length === 1) return x.toLowerCase();
    else return x.substr(0,x.length-1).toLowerCase()+x.substr(x.length-1);
  });
}
exifKeyName.RE = /^[A-Z]+/;

var exifFieldConverters = {
  // Numbers
  bitsPerSample:Number, compression:Number, exifImageLength:Number,
  exifImageWidth:Number, exifOffset:Number, exposureProgram:Number,
  flash:Number, imageLength:Number, imageWidth:Number, isoSpeedRatings:Number,
  jpegInterchangeFormat:Number, jpegInterchangeFormatLength:Number,
  lightSource:Number, meteringMode:Number, orientation:Number,
  photometricInterpretation:Number, planarConfiguration:Number,
  resolutionUnit:Number, rowsPerStrip:Number, samplesPerPixel:Number,
  sensingMethod:Number, stripByteCounts:Number, subSecTime:Number,
  subSecTimeDigitized:Number, subSecTimeOriginal:Number, customRendered:Number,
  exposureMode:Number, focalLengthIn35mmFilm:Number, gainControl:Number,
  saturation:Number, sharpness:Number, subjectDistanceRange:Number,
  subSecTime:Number, subSecTimeDigitized:Number, subSecTimeOriginal:Number,
  whiteBalance:Number, sceneCaptureType:Number,
  
  // Dates
  dateTime:ExifDate, dateTimeDigitized:ExifDate, dateTimeOriginal:ExifDate
};

exports.readMetadata = function(path, callback) {
  return exports.identify(['-format', '%[EXIF:*]', path], function(err, stdout) {
    var meta = {};
    if (!err) {
      stdout.split(/\n/).forEach(function(line){
        var eq_p = line.indexOf('=');
        if (eq_p === -1) return;
        var key = line.substr(0, eq_p).replace('/','-'),
            value = line.substr(eq_p+1).trim(),
            typekey = 'default';
        var p = key.indexOf(':');
        if (p !== -1) {
          typekey = key.substr(0, p);
          key = key.substr(p+1);
          if (typekey === 'exif') {
            key = exifKeyName(key);
            var converter = exifFieldConverters[key];
            if (converter) value = converter(value);
          }
        }
        if (!(typekey in meta)) meta[typekey] = {key:value};
        else meta[typekey][key] = value;
      })
    }
    callback(err, meta);
  });
}

exports.convert = function(args, timeout, callback) {
  var procopt = {encoding: 'binary'};
  if (typeof timeout === 'function') {
    callback = timeout;
    timeout = 0;
  } else if (typeof timeout !== 'number') {
    timeout = 0;
  }
  if (timeout && (timeout = parseInt(timeout)) > 0 && !isNaN(timeout))
    procopt.timeout = timeout;
  return exec2(exports.convert.path, args, procopt, callback);
}
exports.convert.path = 'convert';

var resizeCall = function(t, callback) {
  var proc = exports.convert(t.args, t.opt.timeout, function(err, stdout, stderr) {
    callback(err, stdout, stderr);
  });
  if (t.opt.srcPath.match(/-$/)) {
    proc.stdin.setEncoding('binary');
    proc.stdin.write(t.opt.srcData, 'binary');
    proc.stdin.end();
  }
  return proc;
}

exports.resize = function(options, callback) {
  var t = exports.resizeArgs(options);
  return resizeCall(t, callback)
}

exports.crop = function (options, callback) {
  if (typeof options !== 'object')
    throw new TypeError('First argument must be an object');
  if (!options.srcPath)
    throw new TypeError("No srcPath defined");
  if (!options.dstPath)
    throw new TypeError("No dstPath defined");
  if (!options.height && !options.width)
    throw new TypeError("No width or height defined");

  exports.identify(options.srcPath, function(err, meta) {
    if (err) return callback && callback(err);
    var t         = exports.resizeArgs(options),
        ignoreArg = false,
        args      = [];
    t.args.forEach(function (arg) {
      // ignoreArg is set when resize flag was found
      if (!ignoreArg && (arg != '-resize'))
        args.push(arg);
      // found resize flag! ignore the next argument
      if (arg == '-resize')
        ignoreArg = true;
      // found the argument after the resize flag; ignore it and set crop options
      if ((arg != "-resize") && ignoreArg) {
        var dSrc      = meta.width / meta.height,
            dDst      = t.opt.width / t.opt.height,
            resizeTo  = (dSrc < dDst) ? ''+t.opt.width+'x' : 'x'+t.opt.height;
        args = args.concat([
          '-resize', resizeTo,
          '-gravity', 'Center',
          '-crop', ''+t.opt.width + 'x' + t.opt.height + '+0+0',
          '+repage'
        ]);
        ignoreArg = false;
      }
    })

    t.args = args;
    resizeCall(t, callback);
  })
}

exports.resizeArgs = function(options) {
  var opt = {
    srcPath: null,
    srcData: null,
    srcFormat: null,
    dstPath: null,
    quality: 0.8,
    format: 'jpg',
    progressive: false,
    colorspace: null,
    width: 0,
    height: 0,
    strip: true,
    filter: 'Lagrange',
    sharpening: 0.2,
    customArgs: [],
    timeout: 0
  }

  // check options
  if (typeof options !== 'object')
    throw new Error('first argument must be an object');
  for (var k in opt) if (k in options) opt[k] = options[k];
  if (!opt.srcPath && !opt.srcData)
    throw new Error('both srcPath and srcData are empty');

  // normalize options
  if (!opt.format) opt.format = 'jpg';
  if (!opt.srcPath) {
    opt.srcPath = (opt.srcFormat ? opt.srcFormat +':-' : '-');
  }
  if (!opt.dstPath)
    opt.dstPath = (opt.format ? opt.format+':-' : '-'); // stdout
  if (opt.width === 0 && opt.height === 0)
    throw new Error('both width and height can not be 0 (zero)');

  // build args
  var args = [opt.srcPath];
  if (opt.sharpening > 0) {
    args = args.concat([
      '-set', 'option:filter:blur', String(1.0-opt.sharpening)]);
  }
  if (opt.filter) {
    args.push('-filter');
    args.push(opt.filter);
  }
  if (opt.strip) {
    args.push('-strip');
  }
  if (opt.width || opt.height) {
    if (opt.height === 0) opt.height = opt.width;
    else if (opt.width === 0) opt.width = opt.height;
    args.push('-resize');
    args.push(String(opt.width)+'x'+String(opt.height));
  }
  opt.format = opt.format.toLowerCase();
  var isJPEG = (opt.format === 'jpg' || opt.format === 'jpeg');
  if (isJPEG && opt.progressive) {
    args.push('-interlace');
    args.push('plane');
  }
  if (isJPEG || opt.format === 'png') {
    args.push('-quality');
    args.push(Math.round(opt.quality * 100.0).toString());
  }
  else if (opt.format === 'miff' || opt.format === 'mif') {
    args.push('-quality');
    args.push(Math.round(opt.quality * 9.0).toString());
  }
  if (opt.colorspace) {
    args.push('-colorspace');
    args.push(opt.colorspace);
  }
  if (Array.isArray(opt.customArgs) && opt.customArgs.length)
    args = args.concat(opt.customArgs);
  args.push(opt.dstPath);

  return {opt:opt, args:args};
}
