
try{
    // see http://github.com/bnoordhuis/node-iconv for more info
    var Iconv = require("iconv").Iconv;
}catch(E){
    // convert nothing
    Iconv = function(){}
    Iconv.prototype.convert = function(buf){return buf;};
}

/* mime related functions - encoding/decoding etc*/
/* TODO: Only UTF-8 and Latin1 are allowed with encodeQuotedPrintable */
/* TODO: Check if the input string even needs encoding                */

/**
 * mime.foldLine(str, maxLength, foldAnywhere) -> String
 * - str (String): mime string that might need folding
 * - maxLength (Number): max length for a line, defaults to 78
 * - foldAnywhere (Boolean): can fold at any location (ie. in base64)
 * - afterSpace (Boolean): If [true] fold after the space
 * 
 * Folds a long line according to the RFC 5322
 *   <http://tools.ietf.org/html/rfc5322#section-2.1.1>
 * 
 * For example:
 *     Content-Type: multipart/alternative; boundary="----bd_n3-lunchhour1283962663300----"
 * will become
 *     Content-Type: multipart/alternative;
 *          boundary="----bd_n3-lunchhour1283962663300----"
 * 
 **/
this.foldLine = function(str, maxLength, foldAnywhere, afterSpace){
    var line=false, curpos=0, response="", lf;
    maxLength = maxLength || 78;
    
    // return original if no need to fold
    if(str.length<=maxLength)
        return str;
    
    // read in <maxLength> bytes and try to fold it
    while(line = str.substr(curpos, maxLength)){
        if(!!foldAnywhere){
            response += line;
            if(curpos+maxLength<str.length){
                response+="\r\n";
            }
        }else{
            lf = line.lastIndexOf(" ");
            if(lf<=0)
                lf = line.lastIndexOf("\t");
            if(line.length>=maxLength && lf>0){
                if(!!afterSpace){
                    // move forward until line end or no more \s and \t
                    while(lf<line.length && (line.charAt(lf)==" " || line.charAt(lf)=="\t")){
                        lf++;
                    }
                }
                response += line.substr(0,lf)+"\r\n"+(!foldAnywhere && !afterSpace && "       " || "");
                curpos -= line.substr(lf).length;
            }else{
                response += line;
                //line = line.replace(/=[a-f0-9]?$/i, "");
                //response+=line + "\r\n";
            }
        }
        curpos += line.length;
    }
    
    // return folded string
    return response;
}


/**
 * mime.encodeMimeWord(str, encoding, charset) -> String
 * - str (String): String to be encoded
 * - encoding (String): Encoding Q for quoted printable or B (def.) for base64
 * - charset (String): Charset to be used
 * 
 * Encodes a string into mime encoded word format
 *   <http://en.wikipedia.org/wiki/MIME#Encoded-Word>
 *
 * For example:
 *     See on õhin test
 * Becomes with UTF-8 and Quoted-printable encoding
 *     =?UTF-8?q?See_on_=C3=B5hin_test?=
 * 
 **/
this.encodeMimeWord = function(str, encoding, charset){
    charset = charset || "UTF-8";
    encoding = encoding && encoding.toUpperCase() || "B";
    
    if(encoding=="Q"){
        str = this.encodeQuotedPrintable(str, true, charset);
    }
    
    if(encoding=="B"){
        str = this.encodeBase64(str);
    }
    
    return "=?"+charset+"?"+encoding+"?"+str+"?=";
}

/**
 * mime.decodeMimeWord(str, encoding, charset) -> String
 * - str (String): String to be encoded
 * - encoding (String): Encoding Q for quoted printable or B (def.) for base64
 * - charset (String): Charset to be used, defaults to UTF-8
 * 
 * Decodes a string from mime encoded word format, see [[encodeMimeWord]]
 * 
 **/

this.decodeMimeWord = function(str){
    var parts = str.split("?"),
        charset = parts && parts[1],
        encoding = parts && parts[2],
        text = parts && parts[3];
    if(!charset || !encoding || !text)
        return str;
    if(encoding.toUpperCase()=="Q"){
        return this.decodeQuotedPrintable(text, true, charset);
    }
    
    if(encoding.toUpperCase()=="B"){
        return this.decodeBase64(text);
    }
    
    return text;
}


/**
 * mime.encodeQuotedPrintable(str, mimeWord, charset) -> String
 * - str (String): String to be encoded into Quoted-printable
 * - mimeWord (Boolean): Use mime-word mode (defaults to false)
 * - charset (String): Destination charset, defaults to UTF-8
 *   TODO: Currently only allowed charsets: UTF-8, LATIN1
 * 
 * Encodes a string into Quoted-printable format. 
 **/
this.encodeQuotedPrintable = function(str, mimeWord, charset){
    charset = charset || "UTF-8";
    
    /*
     * Characters from 33-126 OK (except for =; and ?_ when in mime word mode)
     * Spaces + tabs OK (except for line beginnings and endings)  
     * \n + \r OK
     */
    
    str = str.replace(/[^\sa-zA-Z\d]/gm,function(c){
        if(!!mimeWord){
            if(c=="?")return "=3F";
            if(c=="_")return "=5F";
        }
        if(c!=="=" && c.charCodeAt(0)>=33 && c.charCodeAt(0)<=126)
            return c;
        return c=="="?"=3D":(charset=="UTF-8"?encodeURIComponent(c):escape(c)).replace(/%/g,'=');
    });
    
    str = lineEdges(str);

    if(!mimeWord){
        // lines might not be longer than 76 bytes, soft break: "=\r\n"
        var lines = str.split(/\r?\n/);
        str.replace(/(.{73}(?!\r?\n))/,"$&=\r\n")
        for(var i=0, len = lines.length; i<len; i++){
            if(lines[i].length>76){
                lines[i] = this.foldLine(lines[i],76, false, true).replace(/\r\n/g,"=\r\n");
            }
        }
        str = lines.join("\r\n");
    }else{
        str = str.replace(/\s/g, function(a){
            if(a==" ")return "_";
            if(a=="\t")return "=09";
            return a=="\r"?"=0D":"=0A";
        });
    }

    return str;
}

/**
 * mime.deccodeQuotedPrintable(str, mimeWord, charset) -> String
 * - str (String): String to be decoded
 * - mimeWord (Boolean): Use mime-word mode (defaults to false)
 * - charset (String): Charset to be used, defaults to UTF-8
 * 
 * Decodes a string from Quoted-printable format. 
 **/
this.decodeQuotedPrintable = function(str, mimeWord, charset){
    charset = charset && charset.toUpperCase() || "UTF-8";

    if(mimeWord){
        str = str.replace(/_/g," ");
    }else{
        str = str.replace(/=\r\n/gm,'');
        str = str.replace(/=$/,"");
    }
    if(charset == "UTF-8")
        str = decodeURIComponent(str.replace(/%/g,'%25').replace(/=/g,"%"));
    else{
        str = str.replace(/%/g,'%25').replace(/=/g,"%");
        if(charset=="ISO-8859-1" || charset=="LATIN1")
            str = unescape(str);
        else{
            str = decodeBytestreamUrlencoding(str);
            str = fromCharset(charset, str);
        }
    }
    return str;
}

/**
 * mime.encodeBase64(str) -> String
 * - str (String): String to be encoded into Base64
 * - charset (String): Destination charset, defaults to UTF-8
 * 
 * Encodes a string into Base64 format. Base64 is mime-word safe. 
 **/
this.encodeBase64 = function(str, charset){
    var buffer;
    if(charset && charset.toUpperCase()!="UTF-8")
        buffer = toCharset(charset, str);
    else
        buffer = new Buffer(str, "UTF-8");
    return buffer.toString("base64");
}

/**
 * mime.decodeBase64(str) -> String
 * - str (String): String to be decoded from Base64
 * - charset (String): Source charset, defaults to UTF-8
 * 
 * Decodes a string from Base64 format. Base64 is mime-word safe.
 * NB! Always returns UTF-8 
 **/
this.decodeBase64 = function(str, charset){
    var buffer = new Buffer(str, "base64");
    
    if(charset && charset.toUpperCase()!="UTF-8"){
        return fromCharset(charset, buffer);
    }
    
    // defaults to utf-8
    return buffer.toString("UTF-8");
}

/**
 * mime.parseHeaders(headers) -> Array
 * - headers (String): header section of the e-mail
 * 
 * Parses header lines into an array of objects (see [[parseHeaderLine]])
 * FIXME: This should probably not be here but in "envelope" instead
 **/
this.parseHeaders = function(headers){
    var text, lines, line, i, name, value, cmd, header_lines = {};
    // unfold
    headers = headers.replace(/\r?\n([ \t])/gm," ");

    // split lines
    lines = headers.split(/\r?\n/);
    for(i=0; i<lines.length;i++){
        if(!lines[i]) // no more header lines
            break;
        cmd = lines[i].match(/[^\:]+/);
        if(cmd && (cmd = cmd[0])){
            name = cmd;
            value = lines[i].substr(name.length+1);
            if(!header_lines[name.toLowerCase().trim()])header_lines[name.toLowerCase().trim()] = [];
            header_lines[name.toLowerCase()].push(value.trim());
        }
    }
    
    return header_lines;
}

/**
 * mime.parseAddresses(addresses) -> Array
 * - addresses (String): string with comma separated e-mail addresses
 * 
 * Parses names and addresses from a from, to, cc or bcc line
 **/
this.parseAddresses = function(addresses){
    if(!addresses)
        return [];

    addresses = addresses.replace(/\=\?[^?]+\?[QqBb]\?[^?]+\?=/g, (function(a){return this.decodeMimeWord(a);}).bind(this));
    
    // not sure if it's even needed - urlencode escaped \\ and \" and \'
    addresses = addresses.replace(/\\\\/g,function(a){return escape(a.charAt(1));});
    addresses = addresses.replace(/\\["']/g,function(a){return escape(a.charAt(1));});
    
    // find qutoed strings
    
    var parts = addresses.split(','), curStr,
        curQuote, lastPos, remainder="", str, list = [],
        curAddress, address, addressArr = [], name, email, i, len;
    var rightEnd;

    // separate quoted text from text parts
    for(i=0, len=parts.length; i<len; i++){
        str = "";
    
        curStr = (remainder+parts[i]).trim();
        
        curQuote = curStr.charAt(0);
        if(curQuote == "'" || curQuote == '"'){
            rightEnd= curStr.indexOf("<");
            if(rightEnd == -1)rightEnd= curStr.length-1;
            lastPos = curStr.lastIndexOf(curQuote,rightEnd);
            
            if(!lastPos){
                remainder = remainder+parts[i]+",";
                continue;
            }else{
                remainder = "";
                str = curStr.substring(1, lastPos).trim();
                address = curStr.substr(lastPos+1).trim();
            }
            
        }else{
            address = curStr;
        }
        
        list.push({name: str, address: address, original: curStr});
    }
  
    // find e-mail addresses and user names
    for(i=0, len=list.length; i<len; i++){
        curAddress = list[i];
        
        email = false;
        name = false;
        
        name = curAddress.name;
        
        address = curAddress.address.replace(/<([^>]+)>/, function(original, addr){
            email = addr.indexOf("@")>=0 && addr;
            return email ? "" : original;
        }).trim();
        
        if(!email){
            address = address.replace(/(\S+@\S+)/, function(original, m){
                email = m;
                return email ? "" : original;
            });
        }
        
        if(!name){
            if(email){
                email = email.replace(/\(([^)]+)\)/,function(original, n){
                    name = n;
                    return "";
                });
            }
            if(!name){
                name = address.replace(/"/g,"").trim();
            }
        }
        
        // just in case something got mixed up
        if(!email && name.indexOf("@")>=0){
            email = name;
            name = false;
        }
        
        if(name || email){
            addressArr.push({address:decodeURIComponent(email || ""), name: decodeURIComponent(name || "")});
        }
    }
    return addressArr;
};

/**
 * mime.parseMimeWords(str) -> String
 * - str (String): string to be parsed
 * 
 * Parses mime-words into UTF-8 strings
 **/
this.parseMimeWords = function(str){
    return str.replace(/=\?[^?]+\?[QqBb]\?[^?]+\?=/g, (function(a){
        return this.decodeMimeWord(a);
    }).bind(this));
}

/**
 * mime.parseHeaderLine(line) -> Object
 * - line (String): a line from a message headers
 * 
 * Parses a header line to search for additional parameters.
 * For example with "text/plain; charset=utf-8" the output would be
 *   - defaultValue = text/plain
 *   - charset = utf-8
 **/
this.parseHeaderLine = function(line){
    if(!line)
        return {};
    var result = {}, parts = line.split(";"), pos;
    for(var i=0, len = parts.length; i<len; i++){
        pos = parts[i].indexOf("=");
        if(pos<0){
            result[!i?"defaultValue":"i-"+i] = parts[i].trim();
        }else{
            result[parts[i].substr(0,pos).trim().toLowerCase()] = parts[i].substr(pos+1).trim();
        }
    }
    return result;
}


/* Helper functions */

/**
 * lineEdges(str) -> String
 * - str (String): String to be processed
 * 
 * Replaces all spaces and tabs in the beginning and end of the string
 * with quoted printable encoded chars. Needed by [[encodeQuotedPrintable]]
 **/
function lineEdges(str){
    str = str.replace(/^[ \t]+/gm, function(wsc){
        return wsc.replace(/ /g,"=20").replace(/\t/g,"=09"); 
    });
    
    str = str.replace(/[ \t]+$/gm, function(wsc){
        return wsc.replace(/ /g,"=20").replace(/\t/g,"=09"); 
    });
    return str;
}

/**
 * fromCharset(charset, buffer, keep_buffer) -> String | Buffer
 * - charset (String): Source charset
 * - buffer (Buffer): Buffer in <charset>
 * - keep_buffer (Boolean): If true, return buffer, otherwise UTF-8 string
 * 
 * Converts a buffer in <charset> codepage into UTF-8 string
 **/
function fromCharset(charset, buffer, keep_buffer){
    var iconv = new Iconv(charset,'UTF-8'),
        buffer = iconv.convert(buffer);
    return keep_buffer?buffer:buffer.toString("utf-8");
}

/**
 * toCharset(charset, buffer) -> Buffer
 * - charset (String): Source charset
 * - buffer (Buffer): Buffer in UTF-8 or string
 * 
 * Converts a string or buffer to <charset> codepage
 **/
function toCharset(charset, buffer){
    var iconv = new Iconv('UTF-8',charset);
    return iconv.convert(buffer);
}

/**
 * decodeBytestreamUrlencoding(encoded_string) -> Buffer
 * - encoded_string (String): String in urlencode coding
 * 
 * Converts an urlencoded string into a bytestream buffer. If the used
 * charset is known the resulting string can be converted to UTF-8 with
 * [[fromCharset]]. 
 * NB! For UTF-8 use decodeURIComponent and for Latin 1 decodeURL instead 
 **/
function decodeBytestreamUrlencoding(encoded_string){
    var c, i, j=0, prcnts = encoded_string.match(/%/g) || "",
            buffer_length = encoded_string.length - (prcnts.length*2),
        buffer = new Buffer(buffer_length);

    for(var i=0; i<encoded_string.length; i++){
        c = encoded_string.charCodeAt(i);
        if(c=="37"){ // %
            c = parseInt(encoded_string.substr(i+1,2), 16);
            i+=2;
        }
        buffer[j++] = c;
    }
    return buffer;
}

