var jsonlite;
(function (jsonlite) {
    function parse(source, jsonObjectFormat) {
        if (typeof jsonObjectFormat === "undefined") { jsonObjectFormat = true; }
        var object_start = jsonObjectFormat ? '{' : '(';
        var object_end = jsonObjectFormat ? '}' : ')';
        var pair_seperator = jsonObjectFormat ? ':' : '=';
        var at = 0;
        var ch = ' ';
        var escapee = {
            '"': '"',
            '\\': '\\',
            '/': '/',
            b: '\b',
            f: '\f',
            n: '\n',
            r: '\r',
            t: '\t'
        };
        var text = source;
        var result = readValue();
        skipWhitespace();
        if(ch) {
            raiseError("Syntax error");
        }
        return result;
        function raiseError(m) {
            throw {
                name: 'SyntaxError',
                message: m,
                at: at,
                text: text
            };
        }
        function next(c) {
            if(c && c !== ch) {
                raiseError("Expected '" + c + "' instead of '" + ch + "'");
            }
            ch = text.charAt(at);
            at += 1;
            return ch;
        }
        function readString() {
            var s = '';
            if(ch === '"') {
                while(next()) {
                    if(ch === '"') {
                        next();
                        return s;
                    }
                    if(ch === '\\') {
                        next();
                        if(ch === 'u') {
                            var uffff = 0;
                            for(var i = 0; i < 4; i += 1) {
                                var hex = parseInt(next(), 16);
                                if(!isFinite(hex)) {
                                    break;
                                }
                                uffff = uffff * 16 + hex;
                            }
                            s += String.fromCharCode(uffff);
                        } else if(typeof escapee[ch] === 'string') {
                            s += escapee[ch];
                        } else {
                            break;
                        }
                    } else {
                        s += ch;
                    }
                }
            }
            raiseError("Bad string");
        }
        function skipWhitespace() {
            while(ch && ch <= ' ') {
                next();
            }
        }
        function readWord() {
            var s = '';
            while(allowedInWord()) {
                s += ch;
                next();
            }
            if(s === "true") {
                return true;
            }
            if(s === "false") {
                return false;
            }
            if(s === "null") {
                return null;
            }
            if(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s)) {
                return parseFloat(s);
            }
            return s;
        }
        function readArray() {
            var array = [];
            if(ch === '[') {
                next('[');
                skipWhitespace();
                if(ch === ']') {
                    next(']');
                    return array;
                }
                while(ch) {
                    array.push(readValue());
                    skipWhitespace();
                    if(ch === ']') {
                        next(']');
                        return array;
                    }
                    next(',');
                    skipWhitespace();
                }
            }
            raiseError("Bad array");
        }
        function readObject() {
            var o = {
            };
            if(ch === object_start) {
                next(object_start);
                skipWhitespace();
                if(ch === object_end) {
                    next(object_end);
                    return o;
                }
                while(ch) {
                    var key = ch === '"' ? readString() : readWord();
                    if(typeof key !== 'string') {
                        raiseError('Bad object key: ' + key);
                    }
                    skipWhitespace();
                    next(pair_seperator);
                    if(Object.hasOwnProperty.call(o, key)) {
                        raiseError('Duplicate key: "' + key + '"');
                    }
                    o[key] = readValue();
                    skipWhitespace();
                    if(ch === object_end) {
                        next(object_end);
                        return o;
                    }
                    next(',');
                    skipWhitespace();
                }
            }
            raiseError("Bad object");
        }
        function readValue() {
            skipWhitespace();
            switch(ch) {
                case object_start:
                    return readObject();
                case '[':
                    return readArray();
                case '"':
                    return readString();
                default:
                    return readWord();
            }
        }
        function allowedInWord() {
            switch(ch) {
                case '"':
                case '\\':
                case '\t':
                case '\n':
                case '\r':
                case ',':
                case '[':
                case ']':
                case object_start:
                case object_end:
                case pair_seperator:
                    return false;
            }
            return ch > ' ';
        }
    }
    jsonlite.parse = parse;
})(jsonlite || (jsonlite = {}));