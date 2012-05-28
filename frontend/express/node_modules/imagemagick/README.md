# node-imagemagick

[Imagemagick](http://www.imagemagick.org/) module for [Node](http://nodejs.org/).

You can install this module using [npm](http://github.com/isaacs/npm):

    npm install imagemagick

## Example

    var im = require('imagemagick');
    im.readMetadata('kittens.jpg', function(err, metadata){
      if (err) throw err;
      sys.puts('Shot at '+metadata.exif.dateTimeOriginal);
    })
    // -> Shot at Tue, 06 Feb 2007 21:13:54 GMT

## API

### convert.path

Path to the `convert` program. Defaults to `"convert"`.

### identify.path

Path to the `identify` program. Defaults to `"identify"`.

### identify(path, callback(err, features))

Identify file at `path` and return an object `features`.

Example:

    im.identify('kittens.jpg', function(err, features){
      if (err) throw err
      sys.p(features)
      // { format: 'JPEG', width: 3904, height: 2622, depth: 8 }
    })

### identify(args, callback(err, output))

Custom identification where `args` is an array of arguments. The result is returned as a raw string to `output`.

Example:

    im.identify(['-format', '%wx%h', 'kittens.jpg'], function(err, output){
      if (err) throw err
      sys.puts('dimension: '+output)
      // dimension: 3904x2622
    })

### readMetadata(path, callback(err, metadata))

Read metadata (i.e. exif) in `path` and return an object `metadata`. Modelled on top of `identify`.

Example:

    im.readMetadata('kittens.jpg', function(err, metadata){
      if (err) throw err
      sys.puts('Shot at '+metadata.exif.dateTimeOriginal)
    })
    // -> Shot at Tue, 06 Feb 2007 21:13:54 GMT


### convert(args, callback(err, stdout, stderr))

Raw interface to `convert` passing arguments in the array `args`.

Example:

    im.convert(['kittens.jpg', '-resize', '25x120', 'kittens-small.jpg'], 
    function(err, metadata){
      if (err) throw err
      sys.puts('stdout: '+sys.inspect(stdout));
    })

### resize(options, callback(err, stdout, stderr))

Convenience function for resizing an image, modelled on top of `convert`.

The `options` argument have the following default values:

    {
      srcPath: undefined,
      srcData: null,
      srcFormat: null,
      dstPath: undefined,
      quality: 0.8,
      format: 'jpg',
      progressive: false,
      width: 0,
      height: 0,
      strip: true,
      filter: 'Lagrange',
      sharpening: 0.2,
      customArgs: []
    }

srcPath, dstPath and (at least one of) width and height are required. The rest is optional.

Example:

    im.resize({
      srcPath: 'kittens.jpg',
      dstPath: 'kittens-small.jpg',
      width:   256
    }, function(err, stdout, stderr){
      if (err) throw err
      sys.puts('resized kittens.jpg to fit within 256x256px')
    });

Example with stdin/stdout:

    var fs = require('fs');
    im.resize({
      srcData: fs.readFileSync('kittens.jpg', 'binary'),
      width:   256
    }, function(err, stdout, stderr){
      if (err) throw err
      fs.writeFileSync('kittens-resized.jpg', stdout, 'binary');
      sys.puts('resized kittens.jpg to fit within 256x256px')
    });

### crop(options, callback) ###
Convenience function for resizing and cropping an image. _crop_ uses the resize method, so _options_ and _callback_ are the same. _crop_ uses _options.srcPath_, so make sure you set it :) Using only _options.width_ or _options.height_ will create a square dimensioned image.

Example:

    im.crop({
      srcPath: path,
      dstPath: 'cropped.jpg',
      width: 800,
      height: 600,
      quality: 1
    }, function(err, stdout, stderr){
      // foo
    })

## License (MIT)

Copyright (c) 2010-2011 Rasmus Andersson <http://hunch.se/>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
