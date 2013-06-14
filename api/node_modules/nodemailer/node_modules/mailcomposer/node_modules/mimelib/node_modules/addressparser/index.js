
// expose to the world
module.exports = parser;

/**
 * Parses structured e-mail addresses from an address field
 * 
 * Example:
 *
 *    "Name <address@domain>"
 *
 * will be converted to
 *
 *     [{name: "Name", address: "address@domain"}]
 *
 * @param {String} str Address field
 * @return {Array} An array of address objects
 */
function parser(str){
    var tokenizer = new Tokenizer(str),
        tokens = tokenizer.tokenize();


    var addresses = [],
        address = [],
        parsedAddresses = [];

    tokens.forEach(function(token){
        if(token.type == "operator" && (token.value =="," || token.value ==";")){
            addresses.push(address);
            address = [];
        }else{
            address.push(token);
        }
    });

    if(address.length){
        addresses.push(address);
    }

    addresses.forEach(function(address){
        address = handleAddress(address);
        if(address.length){
            parsedAddresses = parsedAddresses.concat(address);
        }
    });

    return parsedAddresses;
}

/**
 * Converts tokens for a single address into an address object
 *
 * @param {Array} tokens Tokens object
 * @return {Object} Address object
 */
function handleAddress(tokens){
    var token,
        isGroup = false,
        state = "text",
        address,
        addresses = [],
        data = {
            address: [],
            comment: [],
            group: [],
            text: []
        },
        i, len;

    // Filter out <addresses>, (comments) and regular text
    for(i=0, len = tokens.length; i<len; i++){
        token = tokens[i];
        
        if(token.type == "operator"){
            switch(token.value){
                case "<":
                    state = "address";
                    break;
                case "(":
                    state = "comment";
                    break;
                case ":":
                    state = "group";
                    isGroup = true;
                    break;
                default:
                    state = "text";
            }
        }else{
            if(token.value){
                data[state].push(token.value);
            }
        }
    }

    // If there is no text but a comment, replace the two
    if(!data.text.length && data.comment.length){
        data.text = data.comment;
        data.comment = [];
    }

    if(data.group.length){
        
        if(data.text.length){
            data.text = data.text.join(" ");
        }

        addresses = addresses.concat(parser(data.group.join(",")).map(function(address){
            address.name = data.text || address.name;
            return address;
        }));

    }else{
        // If no address was found, try to detect one from regular text
        if(!data.address.length && data.text.length){
            for(i = data.text.length - 1; i>=0; i--){
                if(data.text[i].match(/^[^@\s]+@[^@\s]+$/)){
                    data.address = data.text.splice(i,1);
                    break;
                }
            }

            // still no address
            if(!data.address.length){
                for(i = data.text.length - 1; i>=0; i--){
                    data.text[i] = data.text[i].replace(/\s*\b[^@\s]+@[^@\s]+\b\s*/, function(address){
                        if(!data.address.length){
                            data.address = [address.trim()];
                            return " ";
                        }else{
                            return address;
                        }
                    }).trim();
                    if(data.address.length){
                        break;
                    }
                }                
            }
        }

        // If there's still is no text but a comment exixts, replace the two
        if(!data.text.length && data.comment.length){
            data.text = data.comment;
            data.comment = [];
        }  

        // Keep only the first address occurence, push others to regular text
        if(data.address.length > 1){
            data.text = data.text.concat(data.address.splice(1));
        }

        // Join values with spaces
        data.text = data.text.join(" ");
        data.address = data.address.join(" ");

        if(!data.address && isGroup){
            return [];
        }else{
            address = {
                address: data.address || data.text || "",
                name: data.text || data.address || ""
            };

            if(address.address == address.name){
                if((address.address || "").match(/@/)){
                    address.name = "";
                }else{
                    address.address = "";
                }
                
            }

            addresses.push(address);
        }
    }

    return addresses;
}


/**
 * Creates a TOkenizer object for tokenizing address field strings
 *
 * @constructor
 * @param {String} str Address field string
 */
function Tokenizer(str){

    this.str = (str || "").toString();
    this.operatorCurrent = "";
    this.operatorExpecting = "";
    this.node = null;
    this.escaped = false;

    this.list = [];

}

/**
 * Operator tokens and which tokens are expected to end the sequence
 */
Tokenizer.prototype.operators = {
    "\"": "\"",
    "(": ")",
    "<": ">",
    ",": "",
    ":": ";"
};

/**
 * Tokenizes the original input string
 *
 * @return {Array} An array of operator|text tokens
 */
Tokenizer.prototype.tokenize = function(){
    var chr, list = [];
    for(var i=0, len = this.str.length; i<len; i++){
        chr = this.str.charAt(i);
        this.checkChar(chr);
    }

    this.list.forEach(function(node){
        node.value = (node.value || "").toString().trim();
        if(node.value){
            list.push(node);
        }
    });

    return list;
};

/**
 * Checks if a character is an operator or text and acts accordingly
 *
 * @param {String} chr Character from the address field
 */
Tokenizer.prototype.checkChar = function(chr){
    if((chr in this.operators || chr == "\\") && this.escaped){
        this.escaped = false;
    }else if(this.operatorExpecting && chr == this.operatorExpecting){
        this.node = {
            type: "operator",
            value: chr
        };
        this.list.push(this.node);
        this.node = null;
        this.operatorExpecting = "";
        this.escaped = false;
        return;
    }else if(!this.operatorExpecting && chr in this.operators){
        this.node = {
            type: "operator",
            value: chr
        };
        this.list.push(this.node);
        this.node = null;
        this.operatorExpecting = this.operators[chr];
        this.escaped = false;
        return;
    }

    if(!this.escaped && chr == "\\"){
        this.escaped = true;
        return;
    }

    if(!this.node){
        this.node = {
            type: "text",
            value: ""
        };
        this.list.push(this.node);
    }

    if(this.escaped && chr != "\\"){
        this.node.value += "\\";
    }

    this.node.value += chr;
    this.escaped = false;
};
