
# express-expose

  Expose helpers and local variables to the client-side.

## Installation

    $ npm install express-expose

## Usage

    var express = require('express')
      , expose = require('express-expose');

    app.expose(...);

## Versions

  Versions `0.3.0` and above are designed for Express 3.x, below for 2.x.

## Examples

### Exposing Objects

 A common use-case for exposing objects to the client-side would be exposing some properties, perhaps the express configuration. The call to `app.expose(obj)` below defaults to exposing the properties to `app.*`, so for example `app.views`, `app.title`, etc.

      app.set('views', __dirname + '/views');
      app.set('view engine', 'jade');
      app.set('title', 'Example');
      app.set('default language', 'en');

      app.expose(app.settings);

  Another use-case would be exposing helper methods, perhaps the same ones as you are currently exposing to templates. Below we expose the `math` object as utilities to our templates, as well as the client-side. Within a template we would call `add(1,2)`, and on the CS we would call `utils.add(1,2)`, since we have passed the namespace "utils".

      var math = { add: function(a,b){ return a + b; } };
      app.expose(math, 'utils').helpers(math);
      
  Sometimes you might want to output to a different area, so for this we can pass an additional param "languages" which tells express which buffer to write to, which ends up providing us with the local variable "languages" in our template, where the default is "javascript". The "app" string here is the namespace.

      app.expose({ en: 'English', fr: 'French' }, 'app', 'languages');

  You'll then want to output the default buffer (or others) to your template, in Jade this would look something like:
  
      script!= javascript

  And in EJS:
  
      <script><%- javascript %></script>

### Raw JavaScript

  It is also possible to expose "raw" javascript strings.

      app.expose('var some = "variable";');

  Optionally passing the destination buffer, providing us with the "head" local variable, instead of the default of "javascript".
  
      app.expose('var some = "variable";', 'head');

### Exposing Functions

  Exposing a named function is easy too, simply pass it in with an optional buffer name for placement within a template much like above.

      app.expose(function someFunction(){
        return 'yay';
      }, 'foot');

### Self-Calling Functions

   Another alternative is passing an anonymous function, which executes itself, creating a "wrapper" function.

      app.expose(function(){
        function notify() {
          alert('this will execute right away :D');
        }
        notify();
      });

### Request-Level Exposure

 Finally we can apply all of the above at the request-level as well, below we expose "app.current.user" as `{ name: 'tj' }`, for the specific request only.

      app.get('/', function(req, res){
        var user = { name: 'tj' };
        res.expose(user, 'app.current.user');
        res.render('index', { layout: false });
      });

## License 

(The MIT License)

Copyright (c) 2012 TJ Holowaychuk &lt;tj@vision-media.ca&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.