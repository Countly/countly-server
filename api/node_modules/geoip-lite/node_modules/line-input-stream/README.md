node-line-input-stream
======================

Convert a Node.JS Readable Stream into a Line Buffered Input Stream

Install
---

```
npm install line-input-stream
```

Usage
---

Like [Readable Stream](http://nodejs.org/api/stream.html#stream_readable_stream) with a `line` event.

```javascript
var LineInputStream = require('line-input-stream'),
    fs = require('fs');

var stream = LineInputStream(fs.createReadStream("foo.txt", { flags: "r" }));
stream.setEncoding("utf8");
stream.setDelimiter("\n");	// optional string, defaults to "\n"

stream.on("error", function(err) {
		console.log(err);
	});

stream.on("data", function(chunk) {
		// You don't need to use this event
	});

stream.on("line", function(line) {
		// Sends you lines from the stream delimited by delimiter
	});

stream.on("end", function() {
		// No more data, all line events emitted before this event
	});

stream.on("close", function() {
		// Same as ReadableStream's close event
	});

if(stream.readable) {
	console.log("stream is readable");
}

// Also available: pause(), resume(), destroy(), pipe()
```

You can also attach listeners to any event specific to the underlying stream, ie,
you can listen to the `open` event for streams created by [`fs.createReadStream()`](http://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options)
or the `connect` event for [Net](http://nodejs.org/api/net.html) streams.

A side effect of this is that you can add a listener for any junk string and `LineInputStream` will
pretend that it worked.  The event listener may never be called though.

Caveats & Notes
---
- Calling `pause()` might not stop `line` events from firing immediately.  It will stop reading of data
  from the underlying stream, but any data that has already been read will still be split into lines and
  a `line` event will be fired for each of them.
- The delimiter is not included in the line passed to the `line` handler
- Even though this is called `line-input-stream`, you can delimit by anything, so for example,
  setting delimiter to `"\n\n"` will read by paragraph (sort of).
- You can set the delimiter to a regular expression, which let's you do cool things like drop multiple blank lines: `/[\r\n]+/`
- All methods return `this`, so can be chained


Copyright
---
Philip Tellis [@bluesmoon](https://twitter.com/bluesmoon) <philip@lognormal.com> 

License
---
(Apache License)[LICENSE.md]
