# MongoSkin Session Store

Simple Session Store for [Connect() Framework][1] session Middleware that leverages an existing connection from [MongoSkin][3]

### Motivation

We were using a `connect-mongodb` which was working great, however we want to keep our connection pool centralized, 
have the benefits that an abstraction layer like [mongoskin][3] provides and avoid going twice through the pain 
of getting our ReplSetCluster configuration in place.

## Installation

Use `git clone` to download the source and make it available in your project wirh `npm link`.

or 

```bash
npm install connect-mongoskin
```

## Usage

This session store is build to work with [Connect() Framework][1] / [ExpressJS() Framework][2] / [RailwayJS() Framework][3]
Use it like any other middleware.

### Abstract example

The lib reuses an existing client, so pass in the SkinDb and options if needed.

    var SkinStore = new SkinStore(`db`, `options`[, callback]);

### Connect() / ExpressJS() Example

    var express    = require('express'),
        db = require('mongoskin').db(`your_connection_here`),
        SkinStore = require('connect-mongoskin');

    var app = express.createServer();
    app.use(express.cookieParser());
    app.use(express.session({cookie: { secure: false, maxAge:86400000 }, store: new SkinStore(`db`)})); 

[1]: https://github.com/senchalabs/connect
[2]: https://github.com/visionmedia/express
[3]: https://github.com/kissjs/node-mongoskin


### Meta

Originally written by [@johnnyhalife](http://twitter.com/johnnyhalife) (johnny at mural.ly)