# mimelib

*mimelib* is a collection of useful functions to deal with mime-encoded data.

## Installation

Install with *npm*

    npm install mimelib
    
## Usage

    var mimelib = require("mimelib");

## Reference

### foldLine

Folds a long line according to the RFC 5322 <http://tools.ietf.org/html/rfc5322#section-2.1.1>

    mimelib.foldLine(str [, maxLength][, foldAnywhere][, afterSpace]) -> String
    
  - `str` (String): mime string that might need folding
  - `maxLength` (Number): max length for a line, defaults to 78
  - `foldAnywhere` (Boolean): can fold at any location (ie. in base64)
  - `afterSpace` (Boolean): If `true` fold after the space
 

For example:

    Content-Type: multipart/alternative; boundary="----zzzz----"

will become

    Content-Type: multipart/alternative;
         boundary="----zzzz----"

### encodeMimeWord

Encodes a string into mime encoded word format <http://en.wikipedia.org/wiki/MIME#Encoded-Word>  (see also `decodeMimeWord`)

    mimelib.encodeMimeWord = function(str [, encoding][, charset])

  - `str` (String): String to be encoded
  - `encoding` (String): Encoding Q for quoted printable or B (def.) for base64
  - `charset` (String): Charset to be used
  
For example:

    See on õhin test

Becomes with UTF-8 and Quoted-printable encoding

    =?UTF-8?Q?See_on_=C3=B5hin_test?=
    
### decodeMimeWord

Decodes a string from mime encoded word format (see also `encodeMimeWord`)

    mimelib.decodeMimeWord(str) -> String
    
  - `str` (String): String to be decoded

For example

    mimelib.decodeMimeWord("=?UTF-8?Q?See_on_=C3=B5hin_test?=");

will become

    See on õhin test

### encodeQuotedPrintable

Encodes a string into Quoted-printable format (see also `decodeQuotedPrintable`)

    mimelib.encodeQuotedPrintable(str [, mimeWord][, charset]) -> String
    
  - `str` (String): String to be encoded into Quoted-printable
  - `mimeWord` (Boolean): Deprecated, has no effect, ignore it
  - `charset` (String): Destination charset, defaults to UTF-8

### decodeQuotedPrintable

Decodes a string from Quoted-printable format  (see also `encodeQuotedPrintable`)

    mimelib.decodeQuotedPrintable(str [, mimeWord][, charset]) -> String
    
  - `str` (String): String to be decoded
  - `mimeWord` (Boolean): Deprecated, has no effect, ignore it
  - `charset` (String): Charset to be used, defaults to UTF-8
  
### encodeBase64

Encodes a string into Base64 format. Base64 is mime-word safe (see also `decodeBase64`)

    mimelib.encodeBase64(str [, charset]) -> String
    
  - `str` (String): String to be encoded into Base64
  - `charset` (String): Destination charset, defaults to UTF-8

### decodeBase64

Decodes a string from Base64 format. Base64 is mime-word safe (see also `encodeBase64`)

NB! Always returns UTF-8

    mimelib.decodeBase64(str) -> String

  - `str` (String): String to be decoded from Base64
  - `charset` (String): Source charset, defaults to UTF-8
  
### parseHeaders

Parses header lines into an array of objects (see `parseHeaderLine`)

    mimelib.parseHeaders(headers) -> Array
    
  - `headers` (String): header section of the e-mail

Example:

    var headers = [
        "From: andris@node.ee",
        "To: juulius@node.ee",
        "To: juulius2@node.ee",
        "Content-type: text/html;",
        "    charset=utf-8"
        ].join("\r\n");
    mimelib.parseHeaders(headers);

Results in 

    {"from": [ 'andris@node.ee' ],
     "to": [ 'juulius@node.ee', 'juulius2@node.ee' ],
     "content-type": [ 'text/html;    charset=utf-8' ] }

### parseAddresses

Parses names and addresses from a from, to, cc or bcc line

    mimelib.parseAddresses(addresses) -> Array
    
  - `addresses` (String): string with comma separated e-mail addresses  
  
Example:

    var to = '"Andris Reinman" <andris@node.ee>, juulius@node.ee'
    mimelib.parseAddresses(to);
  
Results in

    [{ address: 'andris@node.ee', name: 'Andris Reinman' },
     { address: 'juulius@node.ee', name: false }]

### parseMimeWords

Parses mime-words into UTF-8 strings

    mimelib.parseMimeWords(str) -> String

  - `str` (String): string to be parsed, if includes any mime words, then these are converted to UTF-8 strings
  
  
For example:

    mimelib.parseMimeWords("Hello: =?UTF-8?Q?See_on_=C3=B5hin_test?=");

Results in

    "Hello: See on õhin test"
    
### parseHeaderLine

Parses a header line to search for additional parameters.

    mimelib.parseHeaderLine(line) -> Object
    
  - `line` (String): a line from a message headers
  
For example:

    mimelib.parseHeaderLine("text/plain; charset=utf-8")imelib

Results in

    {"defaultValue": 'text/plain',
     "charset": 'utf-8' }

### contentTypes

**NB! this feature is deprecated**, use [mime](https://github.com/broofa/node-mime) module instead to detect content types and extensions

`mimelib.contentTypes` is an object to provide content type strings for common
file extensions

    mimelib.contentTypes["xls"]; // "application/vnd.ms-excel"

## iconv support

By default only iconv-lite support is bundled. If you need node-iconv support, you need to add it
as an additional dependency for your project:

    ...,
    "dependencies":{
        "mimelib": "*",
        "iconv": "*"
    },
    ...

## License

mimelib license is