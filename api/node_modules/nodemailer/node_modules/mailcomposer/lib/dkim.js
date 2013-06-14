var crypto = require("crypto"),
    mimelib = require("mimelib"),
    toPunycode = require("./punycode");

/**
 * @namespace DKIM Signer module
 * @name dkimsign
 */
module.exports.DKIMSign = DKIMSign;
module.exports.generateDKIMHeader = generateDKIMHeader;
module.exports.sha256 = sha256;


/**
 * <p>Sign an email with provided DKIM key, uses RSA-SHA256.</p>
 *
 * @memberOf dkimsign
 * @param {String} email Full e-mail source complete with headers and body to sign
 * @param {Object} options DKIM options
 * @param {String} [options.headerFieldNames="from:to:cc:subject"] Header fields to sign
 * @param {String} options.privateKey DKMI private key
 * @param {String} options.domainName Domain name to use for signing (ie: "domain.com")
 * @param {String} options.keySelector Selector for the DKMI public key (ie. "dkim" if you have set up a TXT record for "dkim._domainkey.domain.com")
 *
 * @return {String} Signed DKIM-Signature header field for prepending
 */
function DKIMSign(email, options){
    options = options || {};
    email = (email || "").toString("utf-8");

    var match = email.match(/^\r?\n|(?:\r?\n){2}/),
        headers = match && email.substr(0, match.index) || "",
        body = match && email.substr(match.index + match[0].length) || email;

    // all listed fields from RFC4871 #5.5
    // Some prociders do not like Message-Id, Date, Bounces-To and Return-Path
    // fields in DKIM signed data so these are not automatcially included
    var defaultFieldNames = "From:Sender:Reply-To:Subject:To:" +
            "Cc:MIME-Version:Content-Type:Content-Transfer-Encoding:Content-ID:" +
            "Content-Description:Resent-Date:Resent-From:Resent-Sender:" +
            "Resent-To:Resent-Cc:Resent-Message-ID:In-Reply-To:References:" +
            "List-Id:List-Help:List-Unsubscribe:List-Subscribe:List-Post:" +
            "List-Owner:List-Archive";

    var dkim = generateDKIMHeader(options.domainName, options.keySelector, options.headerFieldNames || defaultFieldNames, headers, body),
        canonicalizedHeaderData = DKIMCanonicalizer.relaxedHeaders(headers, options.headerFieldNames || defaultFieldNames),
        canonicalizedDKIMHeader = DKIMCanonicalizer.relaxedHeaderLine(dkim),
        signer, signature;

    canonicalizedHeaderData.headers +=  canonicalizedDKIMHeader.key+":"+canonicalizedDKIMHeader.value;

    signer = crypto.createSign("RSA-SHA256");
    signer.update(canonicalizedHeaderData.headers);
    signature = signer.sign(options.privateKey, 'base64');

    return dkim + signature.replace(/(.{76}(?!\r?\n|\r))/g,"$&\r\n        ");
}

/**
 * <p>Generates a DKIM-Signature header field without the signature part ("b=" is empty)</p>
 *
 * @memberOf dkimsign
 * @private
 * @param {String} domainName Domain name to use for signing
 * @param {String} keySelector Selector for the DKMI public key
 * @param {String} headerFieldNames Header fields to sign
 * @param {String} headers E-mail headers
 * @param {String} body E-mail body
 *
 * @return {String} Mime folded DKIM-Signature string
 */
function generateDKIMHeader(domainName, keySelector, headerFieldNames, headers, body){
    var canonicalizedBody = DKIMCanonicalizer.relaxedBody(body),
        canonicalizedBodyHash = sha256(canonicalizedBody, "base64"),
        canonicalizedHeaderData = DKIMCanonicalizer.relaxedHeaders(headers, headerFieldNames),
        dkim;

    if(hasUTFChars(domainName)){
        domainName = toPunycode(domainName);
    }

    dkim = [
        "v=1",
        "a=rsa-sha256",
        "c=relaxed/relaxed",
        "d="+domainName,
        "q=dns/txt",
        "s="+keySelector,
        "bh="+canonicalizedBodyHash,
        "h="+canonicalizedHeaderData.fieldNames
    ].join("; ");

    return mimelib.foldLine("DKIM-Signature: " + dkim, 76)+";\r\n        b=";
}

/**
 * <p>DKIM canonicalization functions</p>
 *
 * @memberOf dkimsign
 * @private
 */
var DKIMCanonicalizer = {

    /**
     * <p>Simple body canonicalization by rfc4871 #3.4.3</p>
     *
     * @param {String} body E-mail body part
     * @return {String} Canonicalized body
     */
    simpleBody: function(body){
        return (body || "").toString().replace(/(?:\r?\n|\r)*$/, "\r\n");
    },

    /**
     * <p>Relaxed body canonicalization by rfc4871 #3.4.4</p>
     *
     * @param {String} body E-mail body part
     * @return {String} Canonicalized body
     */
    relaxedBody: function(body){
        return (body || "").toString().
                replace(/\r?\n|\r/g, "\n").
                split("\n").
                map(function(line){
                    return line.replace(/\s*$/, ""). //rtrim
                                replace(/\s+/g, " "); // only single spaces
                }).
                join("\n").
                replace(/\n*$/, "\n").
                replace(/\n/g, "\r\n");
    },

    /**
     * <p>Relaxed headers canonicalization by rfc4871 #3.4.2 with filtering</p>
     *
     * @param {String} body E-mail headers part
     * @return {String} Canonicalized headers
     */
    relaxedHeaders: function(headers, fieldNames){
        var includedFields = (fieldNames || "").toLowerCase().
                                split(":").
                                map(function(field){
                                    return field.trim();
                                }),
            headerFields = {},
            headerLines = headers.split(/\r?\n|\r/),
            line, i;

        // join lines
        for(i = headerLines.length-1; i>=0; i--){
            if(i && headerLines[i].match(/^\s/)){
                headerLines[i-1] += headerLines.splice(i,1);
            }else{
                line = DKIMCanonicalizer.relaxedHeaderLine(headerLines[i]);

                // on multiple values, include only the first one (the one in the bottom of the list)
                if(includedFields.indexOf(line.key) >= 0 && !(line.key in headerFields)){
                    headerFields[line.key] = line.value;
                }
            }
        }

        headers = [];
        for(i = includedFields.length-1; i>=0; i--){
            if(!headerFields[includedFields[i]]){
                includedFields.splice(i,1);
            }else{
                headers.unshift(includedFields[i]+":"+headerFields[includedFields[i]]);
            }
        }

        return {
            headers: headers.join("\r\n")+"\r\n",
            fieldNames: includedFields.join(":")
        };
    },

    /**
     * <p>Relaxed header canonicalization for single header line</p>
     *
     * @param {String} line Single header line
     * @return {String} Canonicalized header line
     */
    relaxedHeaderLine: function(line){
        var value = line.split(":"),
            key = (value.shift() || "").toLowerCase().trim();

        value = value.join(":").replace(/\s+/g, " ").trim();

        return {key: key, value: value};
    }
};
module.exports.DKIMCanonicalizer = DKIMCanonicalizer;

/**
 * <p>Generates a SHA-256 hash</p>
 *
 * @param {String} str String to be hashed
 * @param {String} [encoding="hex"] Output encoding
 * @return {String} SHA-256 hash in the selected output encoding
 */
function sha256(str, encoding){
    var shasum = crypto.createHash('sha256');
    shasum.update(str);
    return shasum.digest(encoding || "hex");
}



/**
 * <p>Detects if a string includes unicode symbols</p>
 *
 * @param {String} str String to be checked
 * @return {String} true, if string contains non-ascii symbols
 */
function hasUTFChars(str){
    var rforeign = /[^\u0000-\u007f]/;
    return !!rforeign.test(str);
}
