# simplesmtp

This is a module to easily create custom SMTP servers and clients - use SMTP as a first class protocol in Node.JS!

[![Build Status](https://secure.travis-ci.org/andris9/simplesmtp.png)](http://travis-ci.org/andris9/simplesmtp)

## Support simplesmtp development

[![Donate to author](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=DB26KWR2BQX5W)

## SMTP Server

### Usage

Create a new SMTP server instance with

    var smtp = simplesmtp.createServer([options]);
    
And start listening on selected port

    smtp.listen(25, [function(err){}]);
    
SMTP options can include the following:

  * **name** - the hostname of the server, will be used for informational messages
  * **debug** - if set to true, print out messages about the connection
  * **timeout** - client timeout in milliseconds, defaults to 60 000 (60 sec.)
  * **secureConnection** - start a server on secure connection
  * **SMTPBanner** - greeting banner that is sent to the client on connection
  * **requireAuthentication** - if set to true, require that the client must authenticate itself
  * **enableAuthentication** - if set to true, client may authenticate itself but don't have to (as opposed to `requireAuthentication` that explicitly requires clients to authenticate themselves)
  * **validateSender** - if set to true, emit `'validateSender'` with `envelope`, `email` and `callback` when the client enters `MAIL FROM:<address>`
  * **validateRecipients** - if set to true, emit `'validateRecipient'` with `envelope`, `email` and `callback` when the client enters `RCPT TO:<address>`
  * **maxSize** - maximum size of an e-mail in bytes (currently informational only)
  * **credentials** - TLS credentials (`{key:'', cert:'', ca:['']}`) for the server
  * **authMethods** - allowed authentication methods, defaults to `["PLAIN", "LOGIN"]`
  * **disableEHLO** - if set to true, support HELO command only
  
### Example

    var simplesmtp = require("simplesmtp"),
        fs = require("fs");

    var smtp = simplesmtp.createServer();
    smtp.listen(25);

    smtp.on("startData", function(envelope){
        console.log("Message from:", envelope.from);
        console.log("Message to:", envelope.to);
        envelope.saveStream = fs.createWriteStream("/tmp/message.txt");
    });
    
    smtp.on("data", function(envelope, chunk){
        envelope.saveStream.write(chunk);
    });
    
    smtp.on("dataReady", function(envelope, callback){
        envelope.saveStream.end();
        console.log("Incoming message saved to /tmp/message.txt");
        callback(null, "ABC1"); // ABC1 is the queue id to be advertised to the client
        // callback(new Error("That was clearly a spam!"));
    });


### Events

  * **startData** *(envelope)* - DATA stream is opened by the client (`envelope` is an object with `from`, `to`, `host` and `remoteAddress` properties)
  * **data** *(envelope, chunk)* - e-mail data chunk is passed from the client 
  * **dataReady** *(envelope, callback)* - client is finished passing e-mail data, `callback` returns the queue id to the client
  * **authorizeUser** *(envelope, username, password, callback)* - will be emitted if `requireAuthentication` option is set to true. `callback` has two parameters *(err, success)* where `success` is Boolean and should be true, if user is authenticated successfully
  * **validateSender** *(envelope, email, callback)* - will be emitted if `validateSender` option is set to true
  * **validateRecipient** *(envelope, email, callback)* - will be emitted it `validataRecipients` option is set to true
  * **close** *(envelope)* - emitted when the connection to client is closed
  
## SMTP Client

### Usage

SMTP client can be created with `simplesmptp.connect(port[,host][, options])`
where

  * **port** is the port to connect to
  * **host** is the hostname to connect to (defaults to "localhost")
  * **options** is an optional options object (see below)
  
### Connection options

The following connection options can be used with `simplesmtp.connect`:

  * **secureConnection** - use SSL
  * **name** - the name of the client server
  * **auth** - authentication object `{user:"...", pass:"..."}` or `{XOAuthToken:"base64data"}`
  * **ignoreTLS** - ignore server support for STARTTLS
  * **debug** - output client and server messages to console
  * **instanceId** - unique instance id for debugging (will be output console with the messages)

### Connection events

Once a connection is set up the following events can be listened to:

  * **'idle'** - the connection to the SMTP server has been successfully set up and the client is waiting for an envelope
  * **'message'** - the envelope is passed successfully to the server and a message stream can be started
  * **'ready'** `(success)` - the message was sent
  * **'rcptFailed'** `(addresses)` - not all recipients were accepted (invalid addresses are included as an array)
  * **'error'** `(err)` - An error occurred. The connection is closed and an 'end' event is emitted shortly
  * **'end'** - connection to the client is closed

### Sending an envelope

When an `'idle'` event is emitted, an envelope object can be sent to the server.
This includes a string `from` and an array of strings `to` property.

Envelope can be sent with `client.useEnvelope(envelope)`

    // run only once as 'idle' is emitted again after message delivery
    client.once("idle", function(){
        client.useEnvelope({
            from: "me@example.com",
            to: ["receiver1@example.com", "receiver2@example.com"]
        });
    });

The `to` part of the envelope includes **all** recipients from `To:`, `Cc:` and `Bcc:` fields.

If setting the envelope up fails, an error is emitted. If only some (not all)
recipients are not accepted, the mail can still be sent but an `rcptFailed`
event is emitted.

    client.on("rcptFailed", function(addresses){
        console.log("The following addresses were rejected: ", addresses);
    });

If the envelope is set up correctly a `'message'` event is emitted.

### Sending a message

When `'message'` event is emitted, it is possible to send mail. To do this
you can pipe directly a message source (for example an .eml file) to the client
or alternatively you can send the message with `client.write` calls (you also
need to call `client.end()` once the message is completed.

If you are piping a stream to the client, do not leave the `'end'` event out,
this is needed to complete the message sequence by the client. 

    client.on("message", function(){
        fs.createReadStream("test.eml").pipe(client);
    });

Once the message is delivered a `'ready'` event is emitted. The event has an
parameter which indicates if the message was transmitted( (true) or not (false)
and another which includes the last received data from the server.

    client.on("ready", function(success, response){
        if(success){
            console.log("The message was transmitted successfully with "+response);
        }
    });

### XOAUTH

**simplesmtp** supports [XOAUTH](https://developers.google.com/google-apps/gmail/oauth_protocol) authentication.

To use this feature you can set `XOAuthToken` param as an `auth` option

    var mailOptions = {
        ...,
        auth:{
            XOAuthToken: "R0VUIGh0dHBzOi8vbWFpbC5nb29...."
        }
    }

Alternatively it is also possible to use XOAuthToken generators (supported by Nodemailer) - this
needs to be an object with a mandatory method `generate` that takes a callback function for
generating a XOAUTH token string. This is better for generating tokens only when needed - 
there is no need to calculate unique token for every e-mail request, since a lot of these
might share the same connection and thus the cleint needs not to re-authenticate itself
with another token.

    var XOGen = {
        token: "abc",
        generate: function(callback){
            if(1 != 1){
                return callback(new Error("Tokens can't be generated in strange environments"));
            }
            callback(null, new Buffer(this.token, "utf-8").toString("base64"));
        }
    }
    
    var mailOptions = {
        ...,
        auth:{
            XOAuthToken: XOGen
        }
    }

### Error types

Emitted errors include the reason for failing in the `name` property

  * **UnknowAuthError** - the client tried to authenticate but the method was not supported
  * **AuthError** - the username/password used were rejected
  * **TLSError** - STARTTLS failed
  * **SenderError** - the sender e-mail address was rejected
  * **RecipientError** - all recipients were rejected (if only some of the recipients are rejected, a `'rcptFailed'` event is raised instead

There's also an additional property in the error object called `data` that includes
the last response received from the server (if available for the current error type). 

### About reusing the connection

You can reuse the same connection several times but you can't send a mail
through the same connection concurrently. So if you catch and `'idle'` event
lock the connection to a message process and unlock after `'ready'`.

On `'error'` events you should reschedule the message and on `'end'` events
you should recreate the connection.

### Closing the client

By default the client tries to keep the connection up. If you want to close it,
run `client.quit()` - this sends a `QUIT` command to the server and closes the
connection

    client.quit();

## SMTP Client Connection pool

**simplesmtp** has the option for connection pooling if you want to reuse a bulk
of connections.

### Usage

Create a connection pool of SMTP clients with

    simplesmtp.createClientPool(port[,host][, options])

where

  * **port** is the port to connect to
  * **host** is the hostname to connect to (defaults to "localhost")
  * **options** is an optional options object (see below)

### Connection options

The following connection options can be used with `simplesmtp.connect`:

  * **secureConnection** - use SSL
  * **name** - the name of the client server
  * **auth** - authentication object `{user:"...", pass:"..."}` or  `{XOAuthToken:"base64data"}`
  * **ignoreTLS** - ignore server support for STARTTLS
  * **debug** - output client and server messages to console
  * **maxConnections** - how many connections to keep in the pool (defaults to 5)

### Send an e-mail

E-mails can be sent through the pool with

    pool.sendMail(mail[, callback])

where

  * **mail** is a [MailComposer](/andris9/mailcomposer) compatible object
  * **callback** `(error, responseObj)` - is the callback function to run after the message is delivered or an error occured. `responseObj` may include `failedRecipients` which is an array with e-mail addresses that were rejected and `message` which is the last response from the server.

### Errors

In addition to SMTP client errors another error name is used

  * **DeliveryError** - used if the message was not accepted by the SMTP server

## License

**MIT**