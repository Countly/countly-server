# mailcomposer

**mailcomposer** is a Node.JS module for generating e-mail messages that can be
streamed to SMTP or file. 

This is a standalone module that only generates raw e-mail source, you need to 
write your own or use an existing transport mechanism (SMTP client, Amazon SES, 
SendGrid etc). **mailcomposer** frees you from the tedious task of generating 
[rfc2822](http://tools.ietf.org/html/rfc2822) compatible messages.

[![Build Status](https://secure.travis-ci.org/andris9/mailcomposer.png)](http://travis-ci.org/andris9/mailcomposer)

**mailcomposer** supports:

  * **Unicode** to use any characters ✔
  * **HTML** content as well as **plain text** alternative
  * **Attachments** and streaming for larger files (use strings, buffers, files or binary streams as attachments)
  * **Embedded images** in HTML
  * **DKIM** signing
  * usage of **your own** transport mechanism

## Support mailcomposer development

[![Donate to author](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=DB26KWR2BQX5W)

## Installation

Install through NPM

    npm install mailcomposer

## Usage

### Include mailcomposer module

    var MailComposer = require("mailcomposer").MailComposer;

### Create a new `MailComposer` instance

    var mailcomposer = new MailComposer([options]);

Where `options` is an optional options object with the following possible properties:

  * **escapeSMTP** - if set replaces dots in the beginning of a line with double dots
  * **encoding** - sets transfer encoding for the textual parts (defaults to `"quoted-printable"`)
  * **charset** - sets output character set for strings (defaults to `"utf-8"`)
  * **keepBcc** - if set to true, includes `Bcc:` field in the message headers. Useful for *sendmail* command.
  * **forceEmbeddedImages** - convert image urls and absolute paths in HTML to embedded attachments.

### Simple example

The following example generates a simple e-mail message with plaintext and html
body.

    var MailComposer = require("mailcomposer").MailComposer;
        mailcomposer = new MailComposer(),
        fs = require("fs");
    
    // add additional header field
    mailcomposer.addHeader("x-mailer", "Nodemailer 1.0");
    
    // setup message data
    mailcomposer.setMessageOption({
        from: "andris@tr.ee",
        to: "andris@node.ee",
        body: "Hello world!",
        html: "<b>Hello world!</b>"
    }); 
    
    mailcomposer.streamMessage();
    
    // pipe the output to a file
    mailcomposer.pipe(fs.createWriteStream("test.eml"));

The output for such a script (the contents for "test.eml") would look like:

    MIME-Version: 1.0
    X-Mailer: Nodemailer 1.0
    From: andris@tr.ee
    To: andris@node.ee
    Content-Type: multipart/alternative;
            boundary="----mailcomposer-?=_1-1328088797399"
    
    ------mailcomposer-?=_1-1328088797399
    Content-Type: text/plain; charset=utf-8
    Content-Transfer-Encoding: quoted-printable
    
    Hello world!
    ------mailcomposer-?=_1-1328088797399
    Content-Type: text/html; charset=utf-8
    Content-Transfer-Encoding: quoted-printable
    
    <b>Hello world!</b>
    ------mailcomposer-?=_1-1328088797399--

## API

### Add custom headers

Headers can be added with `mailcomposer.addHeader(key, value)`

    var mailcomposer = new MailComposer();
    mailcomposer.addHeader("x-mailer", "Nodemailer 1.0");

If you add an header value with the same key several times, all of the values will be used
in the generated header. For example:

    mailcomposer.addHeader("x-mailer", "Nodemailer 1.0");
    mailcomposer.addHeader("x-mailer", "Nodemailer 2.0");
    
Will be generated into

    ...
    X-Mailer: Nodemailer 1.0
    X-Mailer: Nodemailer 2.0
    ...

The contents of the field value is not edited in any way (except for the folding),
so if you want to use unicode symbols you need to escape these to mime words
by yourself. Exception being object values - in this case the object
is automatically JSONized and mime encoded.

    // using objects as header values is allowed (will be converted to JSON)
    var apiOptions = {};
    apiOptions.category = "newuser";
    apiOptions.tags = ["user", "web"];
    mailcomposer.addHeader("X-SMTPAPI", apiOptions)

### Add message parts

You can set message sender, receiver, subject line, message body etc. with
`mailcomposer.setMessageOption(options)` where options is an object with the
data to be set. This function overwrites any previously set values with the
same key

The following example creates a simple e-mail with sender being `andris@tr.ee`, 
receiver `andris@node.ee` and plaintext part of the message as `Hello world!`:

    mailcomposer.setMessageOption({
        from: "andris@tr.ee",
        to: "andris@node.ee",
        body: "Hello world!"
    }); 

Possible options that can be used are (all fields accept unicode):

  * **from** (alias `sender`) - the sender of the message. If several addresses are given, only the first one will be used
  * **to** - receivers for the `To:` field
  * **cc** - receivers for the `Cc:` field
  * **bcc** - receivers for the `Bcc:` field
  * **replyTo** (alias `reply_to`) - e-mail address for the `Reply-To:` field
  * **inReplyTo** - The message-id this message is replying
  * **references** - Message-id list
  * **subject** - the subject line of the message
  * **body** (alias `text`) - the plaintext part of the message
  * **html** - the HTML part of the message
  * **envelope** - optional SMTP envelope, if auto generated envelope is not suitable

This method can be called several times

    mailcomposer.setMessageOption({from: "andris@tr.ee"});
    mailcomposer.setMessageOption({to: "andris@node.ee"});
    mailcomposer.setMessageOption({body: "Hello world!"});

Trying to set the same key several times will yield in overwrite

    mailcomposer.setMessageOption({body: "Hello world!"});
    mailcomposer.setMessageOption({body: "Hello world?"});
    // body contents will be "Hello world?"

### Address format

All e-mail address fields take structured e-mail lists (comma separated)
as the input. Unicode is allowed for all the parts (receiver name, e-mail username
and domain) of the address. If the domain part contains unicode symbols, it is
automatically converted into punycode, user part will be converted into UTF-8
mime word.

E-mail addresses can be a plain e-mail addresses

    username@example.com

or with a formatted name

    'Ноде Майлер' <username@example.com>

Or in case of comma separated lists, the formatting can be mixed

    username@example.com, 'Ноде Майлер' <username@example.com>, "Name, User" <username@example.com>

### SMTP envelope

SMTP envelope is usually auto generated from `from`, `to`, `cc` and `bcc` fields but
if for some reason you want to specify it yourself, you can do it with `envelope` property.

`envelope` is an object with the following params: `from`, `to`, `cc` and `bcc` just like
with regular mail options. You can also use the regular address format.

    mailOptions = {
        ...,
        from: "mailer@node.ee",
        to: "daemon@node.ee",
        envelope: {
            from: "Daemon <deamon@node.ee>",
            to: "mailer@node.ee, Mailer <mailer2@node.ee>"
        }
    }

### Add attachments

Attachments can be added with `mailcomposer.addAttachment(attachment)` where
`attachment` is an object with attachment (meta)data with the following possible
properties:

  * **fileName** (alias `filename`) - filename to be reported as the name of the attached file, use of unicode is allowed
  * **cid** - content id for using inline images in HTML message source
  * **contents** - String or a Buffer contents for the attachment
  * **filePath** - path to a file or an URL if you want to stream the file instead of including it (better for larger attachments)
  * **streamSource** - Stream object for arbitrary binary streams if you want to stream the contents (needs to support *pause*/*resume*)
  * **contentType** - content type for the attachment, if not set will be derived from the `fileName` property
  * **contentDisposition** - content disposition type for the attachment, defaults to "attachment" 
  * **userAgent** - User-Agent string to be used if the fileName points to an URL

One of `contents`, `filePath` or `streamSource` must be specified, if none is 
present, the attachment will be discarded. Other fields are optional.

Attachments can be added as many as you want.

**Using embedded images in HTML**

Attachments can be used as embedded images in the HTML body. To use this 
feature, you need to set additional property of the attachment - `cid` 
(unique identifier of the file) which is a reference to the attachment file. 
The same `cid` value must be used as the image URL in HTML (using `cid:` as 
the URL protocol, see example below).

NB! the cid value should be as unique as possible!

    var cid_value = Date.now() + '.image.jpg';
    
    var html = 'Embedded image: <img src="cid:' + cid_value + '" />';
    
    var attachment = {
        fileName: "image.png",
        filePath: "/static/images/image.png",
        cid: cid_value
    };

**Automatic embedding images**

If you want to convert images in the HTML to embedded images automatically, you can
set mailcomposer option `forceEmbeddedImages` to true. In this case all images in
the HTML that are either using an absolute URL (http://...) or absolute file path
(/path/to/file) are replaced with embedded attachments.

For example when using this code

    var mailcomposer = new MailComposer({forceEmbeddedImages: true});
    mailcomposer.setMessageOption({
        html: 'Embedded image: <img src="http://example.com/image.png">'
    });

The image linked is fetched and added automatically as an attachment and the url 
in the HTML is replaced automatically with a proper `cid:` string.

### Add alternatives to HTML and text

In addition to text and HTML, any kind of data can be inserted as an alternative content of the main body - for example a word processing document with the same text as in the HTML field. It is the job of the e-mail client to select and show the best fitting alternative to the reader. 

Alternatives to text and HTML can be added with `mailcomposer.addAlternative(alternative)` where
`alternative` is an object with alternative (meta)data with the following possible
properties:

  * **contents** - String or a Buffer contents for the attachment
  * **contentType** - optional content type for the attachment, if not set will be set to "application/octet-stream"
  * **contentEncoding** - optional value of how the data is encoded, defaults to "base64" 

If `contents` is empty, the alternative will be discarded. Other fields are optional.

**Usage example:**

    // add HTML "alternative"
    mailcomposer.setMessageOption({
        html: "<b>Hello world!</b>"
    });

    // add Markdown alternative
    mailcomposer.addAlternative({
        contentType: "text/x-web-markdown",
        contents: "**Hello world!**"
    });

If the receiving e-mail client can render messages in Markdown syntax as well, it could prefer
to display this alternative as the main content of the message.

Alternatives can be added as many as you want.

### DKIM Signing

**mailcomposer** supports DKIM signing with very simple setup. Use this with caution 
though since the generated message needs to be buffered entirely before it can be
signed - in this case the streaming capability offered by mailcomposer is illusionary,
there will only be one `'data'` event with the entire message. Not a big deal with
small messages but might consume a lot of RAM when using larger attachments.

Set up the DKIM signing with `useDKIM` method:

    mailcomposer.useDKIM(dkimOptions)

Where `dkimOptions` includes necessary options for signing

  * **domainName** - the domainname that is being used for signing
  * **keySelector** - key selector. If you have set up a TXT record with DKIM public key at *zzz._domainkey.example.com* then `zzz` is the selector
  * **privateKey** - DKIM private key that is used for signing as a string
  * **headerFieldNames** - optional colon separated list of header fields to sign, by default all fields suggested by RFC4871 #5.5 are used

**NB!** Currently if several header fields with the same name exists, only the last one (the one in the bottom) is signed.

Example:

    mailcomposer.setMessageOption({from: "andris@tr.ee"});
    mailcomposer.setMessageOption({to: "andris@node.ee"});
    mailcomposer.setMessageOption({body: "Hello world!"});
    mailcomposer.useDKIM({
        domainName: "node.ee",
        keySelector: "dkim",
        privateKey: fs.readFileSync("private_key.pem")
    });

### Start streaming

When the message data is setup, streaming can be started. After this it is not
possible to add headers, attachments or change body contents.

    mailcomposer.streamMessage();

This generates `'data'` events for the message headers and body and final `'end'` event.
As `MailComposer` objects are Stream instances, these can be piped

    // save the output to a file
    mailcomposer.streamMessage();
    mailcomposer.pipe(fs.createWriteStream("out.txt"));

### Compile the message in one go

If you do not want to use the streaming possibilities, you can compile the entire
message into a string in one go with `buildMessage`.

    mailcomposer.buildMessage(function(err, messageSource){
        console.log(err || messageSource);
    });

The function is actually just a wrapper around `streamMessage` and emitted events.

## Envelope

Envelope can be generated with an `getEnvelope()` which returns an object
that includes a `from` address (string) and a list of `to` addresses (array of
strings) suitable for forwarding to a SMTP server as `MAIL FROM:` and `RCPT TO:`.

    console.log(mailcomposer.getEnvelope());
    // {from:"sender@example.com", to:["receiver@example.com"]}

**NB!** both `from` and `to` properties might be missing from the envelope object
if corresponding addresses were not detected from the e-mail.

## Running tests

Tests are run with [nodeunit](https://github.com/caolan/nodeunit)

Run

    npm test

## License

**MIT**
