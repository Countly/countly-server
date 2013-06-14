var convert = require("encoding").convert,
    addressparser = require("addressparser");

/**
 * Folds a long line according to the RFC 5322 http://tools.ietf.org/html/rfc5322#section-2.1.1
 *
 * @param {String} str Mime string that might need folding
 * @param {Number} [maxLength=76] max length for a line
 * @param {Boolean} [foldAnywhere] If true, can fold at any location (ie. in base64)
 * @param {Boolean} [afterSpace] If true fold after the space (default is before)
 * @return {String} Folded string
 */
this.foldLine = function(str, maxLength, foldAnywhere, afterSpace, lineMargin){
    if(foldAnywhere){
        return addBase64SoftLinebreaks(str, maxLength || 76);
    }
    return module.exports.mimeFunctions.foldLine(str, maxLength, !!afterSpace, lineMargin);
};

/**
 * Encodes a string into mime encoded word format http://en.wikipedia.org/wiki/MIME#Encoded-Word
 *
 * @param {String} str String to be encoded
 * @param {String} encoding Encoding Q for quoted printable or B for base64
 * @param {String} [charset="UTF-8"] Charset to be used
 * @param {Number} [maxLength] If set, split on maxLength
 * @return {String} Mime word encoded string
 */
module.exports.encodeMimeWord = function(str, encoding, charset, maxLength){
    return module.exports.mimeFunctions.encodeMimeWord(str, encoding, maxLength || 0, charset);
};

/**
 * Encodes need parts of a string to mime word format
 *
 * @param {String} str String to be encoded
 * @param {String} encoding Encoding Q for quoted printable or B for base64
 * @param {Number} [maxLength] If set, split on maxLength
 * @param {String} [charset="UTF-8"] Charset to be used
 * @return {String} String with possible mime word encoded parts
 */
module.exports.encodeMimeWords = function(str, encoding, maxLength, charset){
    return module.exports.mimeFunctions.encodeMimeWords(str, encoding, maxLength || 0, charset);
};

/**
 * Decodes a string from mime encoded word
 *
 * @param {String} str Mime word encoded string
 * @return {String} Decoded string
 */
module.exports.decodeMimeWord = function(str){
    return module.exports.mimeFunctions.decodeMimeWord(str).toString("utf-8");
};

/**
 * Decodes all mime words from a string to an unencoded string
 *
 * @param {String} str String that may include mime words
 * @return {String} Unencoded string
 */
module.exports.parseMimeWords = function(str){
    return module.exports.mimeFunctions.decodeMimeWords(str).toString("utf-8");
};

/**
 * Encodes a string into Quoted-printable format. Maximum line length for the
 * encoded string is always 76+2 bytes
 *
 * @param {String} str String to be encoded into Quoted-printable
 * @param {Boolean} [mimeWord] legacy parameter, not used
 * @param {String} [charset="UTF-8"] Destination charset
 * @return {String} Quoted printable encoded string
 */
module.exports.encodeQuotedPrintable = function(str, mimeWord, charset){
    if(typeof mimeWord == "string" && !charset){
        charset = mimeWord;
        mimeWord = undefined;
    }
    return module.exports.mimeFunctions.encodeQuotedPrintable(str, charset);
};

/**
 * Decodes a string from Quoted-printable format
 *
 * @param {String} str String to be decoded from Quoted-printable
 * @param {Boolean} [mimeWord] legacy parameter, not used
 * @param {String} [charset="UTF-8"] Source charset
 * @return {String} Decoded string
 */
module.exports.decodeQuotedPrintable = function(str, mimeWord, charset){
    if(typeof mimeWord == "string" && !charset){
        charset = mimeWord;
        mimeWord = undefined;
    }
    charset = (charset || "").toString().toUpperCase().trim();
    var decodedString = module.exports.mimeFunctions.decodeQuotedPrintable(str, "utf-8", charset);
    return charset == "BINARY" ? decodedString : decodedString.toString("utf-8");
};

/**
 * Encodes a string into Base64 format. Base64 is mime-word safe
 * 
 * @param {String} str String to be encoded into Base64
 * @param {String} [charset="UTF-8"] Destination charset
 * @return {String} Base64 encoded string
 */
module.exports.encodeBase64 = function(str, charset){
    return module.exports.mimeFunctions.encodeBase64(str, charset);
};

/**
 * Decodes a string from Base64 format
 * 
 * @param {String} str String to be decoded from Base64
 * @param {String} [charset="UTF-8"] Source charset
 * @return {String} Decoded string
 */
module.exports.decodeBase64 = function(str, charset){
    return module.exports.mimeFunctions.decodeBase64(str, "utf-8", charset).toString("utf-8");
};

/**
 * Parses names and addresses from a from, to, cc or bcc line
 * For example: 'Andris Reinman <andris@tr.ee>, someone@else.com'
 * will be parsed into: [{name:"Andris Reinman", address:"andris@tr.ee"}, {address: "someone@else.com"}]
 *
 * @param {String|Array} addresses Address line string or an array of strings
 * @return {Array} An array of parsed e-mails addresses in the form of [{name, address}]
 */
module.exports.parseAddresses = function(addresses){
    return [].concat.apply([], [].concat(addresses).map(addressparser)).map(function(address){
        address.name = module.exports.parseMimeWords(address.name);
        return address;
    });
};

/**
 * Parses header lines into an array of objects. Output: {'x-header': ['value']}
 * 
 * @param {String} headers Full header part to be parsed
 * @return {Object} Parsed headers
 */
module.exports.parseHeaders = function(headers){
    return module.exports.mimeFunctions.parseHeaderLines(headers);
};

/**
 * Parses a header line to search for additional parameters. For example
 *     parseHeaderLine('text/plain; charset=utf-8')
 * will be parsed into
 *     {defaultValue: 'text/plain', charset: 'utf-8'}
 * 
 * @param {String} line Single header value without key part to be parsed
 * @return {Object} Parsed value
 */
module.exports.parseHeaderLine = function(line){
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
};

module.exports.mimeFunctions = {

    mimeEncode: function(str, toCharset, fromCharset){
        toCharset = toCharset || "UTF-8";
        fromCharset = fromCharset || "UTF-8";

        var buffer = convert(str || "", toCharset, fromCharset),
            ranges = [[0x09],
                      [0x0A],
                      [0x0D],
                      [0x20],
                      [0x21],
                      [0x23, 0x3C],
                      [0x3E],
                      [0x40, 0x5E],
                      [0x60, 0x7E]],
            result = "";
        
        for(var i=0, len = buffer.length; i<len; i++){
            if(checkRanges(buffer.get(i), ranges)){
                result += String.fromCharCode(buffer.get(i));
                continue;
            }
            result += "="+(buffer.get(i)<0x10?"0":"")+buffer.get(i).toString(16).toUpperCase();
        }

        return result;
    },

    mimeDecode: function(str, toCharset, fromCharset){
        str = (str || "").toString();
        toCharset = toCharset || "UTF-8";
        fromCharset = fromCharset || "UTF-8";

        var encodedBytesCount = (str.match(/\=[\da-fA-F]{2}/g) || []).length,
            bufferLength = str.length - encodedBytesCount * 2,
            chr, hex,
            buffer = new Buffer(bufferLength),
            bufferPos = 0;

        for(var i=0, len = str.length; i<len; i++){
            chr = str.charAt(i);
            if(chr == "=" && (hex = str.substr(i+1, 2)) && /[\da-fA-F]{2}/.test(hex)){
                buffer.set(bufferPos++, parseInt(hex, 16));
                i+=2;
                continue;
            }
            buffer.set(bufferPos++, chr.charCodeAt(0));
        }

        if(fromCharset.toUpperCase().trim() == "BINARY"){
            return buffer;
        }
        return convert(buffer, toCharset, fromCharset);
    },

    encodeBase64: function(str, toCharset, fromCharset){
        var buffer = convert(str || "", toCharset, fromCharset);
        return addSoftLinebreaks(buffer.toString("base64"), "base64");
    },

    decodeBase64: function(str, toCharset, fromCharset){
        var buffer = new Buffer((str || "").toString(), "base64");
        return convert(buffer, toCharset, fromCharset);
    },

    decodeQuotedPrintable: function(str, toCharset, fromCharset){
        str = (str || "").toString();
        str = str.replace(/\=(?:\r?\n|$)/g, "");
        return this.mimeDecode(str, toCharset, fromCharset);
    },

    encodeQuotedPrintable: function(str, toCharset, fromCharset){
        var mimeEncodedStr = this.mimeEncode(str, toCharset, fromCharset);

        // fix line breaks
        mimeEncodedStr = mimeEncodedStr.replace(/\r?\n|\r/g, function(lineBreak, spaces){
            return "\r\n";
        }).replace(/[\t ]+$/gm, function(spaces){
            return spaces.replace(/ /g, "=20").replace(/\t/g, "=09");
        });

        return addSoftLinebreaks(mimeEncodedStr, "qp");
    },

    encodeMimeWord: function(str, encoding, maxLength, toCharset, fromCharset){
        toCharset = (toCharset || "utf-8").toString().toUpperCase().trim();
        encoding = (encoding || "Q").toString().toUpperCase().trim().charAt(0);
        var encodedStr;

        if(maxLength && maxLength > 7 + toCharset.length){
            maxLength -= (7 + toCharset.length);
        }

        if(encoding == "Q"){
            encodedStr = this.mimeEncode(str, toCharset, fromCharset);
            encodedStr = encodedStr.replace(/[\r\n\t_]/g, function(chr){
                var code = chr.charCodeAt(0);
                return "=" + (code<0x10?"0":"") + code.toString(16).toUpperCase();
            }).replace(/\s/g, "_");
        }else if(encoding == "B"){
            encodedStr = convert(str || "", toCharset, fromCharset).toString("base64").trim();
        }

        if(maxLength && encodedStr.length > maxLength){
            if(encoding == "Q"){
                encodedStr = this.splitEncodedString(encodedStr, maxLength).join("?= =?"+toCharset+"?"+encoding+"?");
            }else{
                encodedStr = encodedStr.replace(new RegExp(".{"+maxLength+"}","g"),"$&?= =?"+toCharset+"?"+encoding+"?");
                if(encodedStr.substr(-(" =?"+toCharset+"?"+encoding+"?=").length) == " =?"+toCharset+"?"+encoding+"?="){
                    encodedStr = encodedStr.substr(0, encodedStr.length -(" =?"+toCharset+"?"+encoding+"?=").length);
                }
                if(encodedStr.substr(-(" =?"+toCharset+"?"+encoding+"?").length) == " =?"+toCharset+"?"+encoding+"?"){
                    encodedStr = encodedStr.substr(0, encodedStr.length -(" =?"+toCharset+"?"+encoding+"?").length);
                }
            }
        }

        return "=?"+toCharset+"?"+encoding+"?"+encodedStr+ (encodedStr.substr(-2)=="?="?"":"?=");
    },

    decodeMimeWord: function(str, toCharset){
        str = (str || "").toString().trim();

        var fromCharset, encoding, match;

        match = str.match(/^\=\?([\w_\-]+)\?([QqBb])\?([^\?]+)\?\=$/i);
        if(!match){
            return convert(str, toCharset);
        }

        fromCharset = match[1];
        encoding = (match[2] || "Q").toString().toUpperCase();
        str = (match[3] || "").replace(/_/g, " ");

        if(encoding == "B"){
            return this.decodeBase64(str, toCharset, fromCharset);
        }else if(encoding == "Q"){
            return this.mimeDecode(str, toCharset, fromCharset);    
        }else{
            return str;
        }

        
    },

    decodeMimeWords: function(str, toCharset){
        var remainder = "", lastCharset, curCharset;
        str = (str || "").toString();

        str = str.
                replace(/(=\?[^?]+\?[QqBb]\?[^?]+\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]+\?=)/g, "$1").
                replace(/\=\?([\w_\-]+)\?([QqBb])\?[^\?]+\?\=/g, (function(mimeWord, charset, encoding){

                      curCharset = charset + encoding;

                      return this.decodeMimeWord(mimeWord);
                  }).bind(this));

        return convert(str, toCharset);
    },

    foldLine: function(str, lineLengthMax, afterSpace, lineMargin){
        lineLengthMax = lineLengthMax || 76;
        lineMargin = lineMargin || Math.floor(lineLengthMax/5);
        str = (str || "").toString().trim();

        var pos = 0, len = str.length, result = "", line, match;

        while(pos < len){
            line = str.substr(pos, lineLengthMax);
            if(line.length < lineLengthMax){
                result += line;
                break;
            }
            if((match = line.match(/^[^\n\r]*(\r?\n|\r)/))){
                line = match[0];
                result += line;
                pos += line.length;
                continue;
            }else if((match = line.substr(-lineMargin).match(/(\s+)[^\s]*$/))){
                line = line.substr(0, line.length - (match[0].length - (!!afterSpace ? (match[1] || "").length : 0)));
            }else if((match = str.substr(pos + line.length).match(/^[^\s]+(\s*)/))){
                line = line + match[0].substr(0, match[0].length - (!afterSpace ? (match[1] || "").length : 0));
            }
            result += line;
            pos += line.length;
            if(pos < len){
                result += "\r\n";
            }
        }

        return result;
    },

    encodeMimeWords: function(value, encoding, maxLength, toCharset, fromCharset){
        var decodedValue = convert((value || ""), "utf-8", fromCharset).toString("utf-8"),
            encodedValue;

        encodedValue = decodedValue.replace(/([^\s\u0080-\uFFFF]*[\u0080-\uFFFF]+[^\s\u0080-\uFFFF]*(?:\s+[^\s\u0080-\uFFFF]*[\u0080-\uFFFF]+[^\s\u0080-\uFFFF]*\s*)?)+/g, (function(str, o){
            return str.length?this.encodeMimeWord(str, encoding || "Q", maxLength, toCharset):"";
        }).bind(this));

        return encodedValue;
    },

    encodeHeaderLine: function(key, value, toCharset, fromCharset){
        var encodedValue = this.encodeMimeWords(value, 52, toCharset, fromCharset);
        return this.foldLine(key+": "+encodedValue, 76);
    },

    parseHeaderLines: function(headers, toCharset){
        var lines = headers.split(/\r?\n|\r/),
            headersObj = {},
            key, value,
            header,
            i, len;

        for(i=lines.length-1; i>=0; i--){
            if(i && lines[i].match(/^\s/)){
                lines[i-1] += "\r\n" + lines[i];
                lines.splice(i, 1);
            }
        }

        for(i=0, len = lines.length; i<len; i++){
            header = this.decodeHeaderLine(lines[i]);
            key = (header[0] || "").toString().toLowerCase().trim();
            value = header[1] || "";
            if(!toCharset || (toCharset || "").toString().trim().match(/^utf[\-_]?8$/i)){
                value = value.toString("utf-8");
            }
            if(!headersObj[key]){
                headersObj[key] = [value];
            }else{
                headersObj[key].push(value);
            }
        }

        return headersObj;
    },

    decodeHeaderLine: function(header, toCharset){
        var line = (header || "").toString().replace(/(?:\r?\n|\r)[ \t]*/g, " ").trim(),
            match = line.match(/^\s*([^:]+):(.*)$/),
            key = (match && match[1] || "").trim(),
            value = (match && match[2] || "").trim();

        value = this.decodeMimeWords(value, toCharset);
        return [key, value];
    },

    splitEncodedString: function(str, maxlen){
        var curLine, match, chr, done,
            lines = [];

        while(str.length){
            curLine = str.substr(0, maxlen);
            
            // move incomplete escaped char back to main
            if((match = curLine.match(/\=[0-9A-F]?$/i))){
                curLine = curLine.substr(0, match.index);
            }

            done = false;
            while(!done){
                done = true;
                // check if not middle of a unicode char sequence
                if((match = str.substr(curLine.length).match(/^\=([0-9A-F]{2})/i))){
                    chr = parseInt(match[1], 16);
                    // invalid sequence, move one char back anc recheck
                    if(chr < 0xC2 && chr > 0x7F){
                        curLine = curLine.substr(0, curLine.length-3);
                        done = false;
                    }
                }
            }

            if(curLine.length){
                lines.push(curLine);
            }
            str = str.substr(curLine.length);
        }

        return lines;
    },

    parseAddresses: addressparser

};

// Lines can't be longer that 76 + <CR><LF> = 78 bytes
// http://tools.ietf.org/html/rfc2045#section-6.7
function addSoftLinebreaks(str, encoding){
    var lineLengthMax = 76;

    encoding = (encoding || "base64").toString().toLowerCase().trim();
    
    if(encoding == "qp"){
        return addQPSoftLinebreaks(str, lineLengthMax);
    }else{
        return addBase64SoftLinebreaks(str, lineLengthMax);
    }
}

function addBase64SoftLinebreaks(base64EncodedStr, lineLengthMax){
    base64EncodedStr = (base64EncodedStr || "").toString().trim();
    return base64EncodedStr.replace(new RegExp(".{" +lineLengthMax+ "}", "g"),"$&\r\n").trim();
}

function addQPSoftLinebreaks(mimeEncodedStr, lineLengthMax){
    var pos = 0, len = mimeEncodedStr.length, 
        match, code, line, 
        lineMargin = Math.floor(lineLengthMax/3), 
        result = "";

    // insert soft linebreaks where needed
    while(pos < len){
        line = mimeEncodedStr.substr(pos, lineLengthMax);
        if((match = line.match(/\r\n/))){
            line = line.substr(0, match.index + match[0].length);
            result += line;
            pos += line.length;
            continue;
        }

        if(line.substr(-1)=="\n"){
            // nothing to change here
            result += line;
            pos += line.length;
            continue;
        }else if((match = line.substr(-lineMargin).match(/\n.*?$/))){
            // truncate to nearest line break
            line = line.substr(0, line.length - (match[0].length - 1));
            result += line;
            pos += line.length;
            continue;
        }else if(line.length > lineLengthMax - lineMargin && (match = line.substr(-lineMargin).match(/[ \t\.,!\?][^ \t\.,!\?]*$/))){
            // truncate to nearest space
            line = line.substr(0, line.length - (match[0].length - 1));
        }else if(line.substr(-1)=="\r"){
            line = line.substr(0, line.length-1);
        }else{
            if(line.match(/\=[\da-f]{0,2}$/i)){

                // push incomplete encoding sequences to the next line
                if((match = line.match(/\=[\da-f]{0,1}$/i))){
                    line = line.substr(0, line.length - match[0].length);
                }

                // ensure that utf-8 sequences are not split
                while(line.length>3 && line.length < len - pos && !line.match(/^(?:=[\da-f]{2}){1,4}$/i) && (match = line.match(/\=[\da-f]{2}$/ig))){
                    code = parseInt(match[0].substr(1,2), 16);
                    if(code<128){
                        break;
                    }

                    line = line.substr(0, line.length-3);

                    if(code >=0xC0){
                        break;
                    }
                }
                
            }
        }
        
        if(pos + line.length < len && line.substr(-1)!="\n"){
            if(line.length==76 && line.match(/\=[\da-f]{2}$/i)){
                line = line.substr(0, line.length-3);
            }
            else if(line.length==76){
                line = line.substr(0, line.length-1);
            }
            pos += line.length;
            line += "=\r\n";
        }else{
            pos += line.length;
        }
        
        result += line;
    }

    return result;
}

function checkRanges(nr, ranges){
    for(var i = ranges.length - 1; i >= 0; i--){
        if(!ranges[i].length){
            continue;
        }
        if(ranges[i].length == 1 && nr == ranges[i][0]){
            return true;
        }
        if(ranges[i].length == 2 && nr >= ranges[i][0] && nr <= ranges[i][1]){
            return true;
        }
    }
    return false;
}
