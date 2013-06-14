var Stream = require("stream").Stream,
    utillib = require("util"),
    querystring = require("querystring"),
    http = require("http"),
    https = require("https"),
    urllib = require("url");

/**
 * Wrapper for new XOAuth2Generator.
 *
 * Usage:
 *
 *     var xoauthgen = createXOAuth2Generator({});
 *     xoauthgen.getToken(function(err, xoauthtoken){
 *         socket.send("AUTH XOAUTH2 " + xoauthtoken);
 *     });
 *
 * @param {Object} options See XOAuth2Generator for details
 * @return {Object}
 */
module.exports.createXOAuth2Generator = function(options){
    return new XOAuth2Generator(options);
};

/**
 * XOAUTH2 access_token generator for Gmail.
 * Create client ID for web applications in Google API console to use it.
 * See Offline Access for receiving the needed refreshToken for an user
 * https://developers.google.com/accounts/docs/OAuth2WebServer#offline
 *
 * @constructor
 * @param {Object} options Client information for token generation
 * @param {String} options.user         (Required) User e-mail address
 * @param {String} options.clientId     (Required) Client ID value
 * @param {String} options.clientSecret (Required) Client secret value
 * @param {String} options.refreshToken (Required) Refresh token for an user
 * @param {String} options.accessUrl    (Optional) Endpoint for token generation, defaults to "https://accounts.google.com/o/oauth2/token"
 * @param {String} options.accessToken  (Optional) An existing valid accessToken
 * @param {int}    options.timeout      (Optional) A timestamp in milliseconds after 1.1.1970 when the given accessToken expires
 */
function XOAuth2Generator(options){
    Stream.call(this);
    this.options = options || {};

    this.options.accessUrl = this.options.accessUrl || "https://accounts.google.com/o/oauth2/token";

    this.token = this.options.accessToken && this.buildXOAuth2Token(this.options.accessToken) || false;
    this.accessToken = this.token && this.options.accessToken || false;

    this.timeout = this.options.timeout && Date.now() + ((Number(this.options.timeout) || 0) - 1) * 1000 || 0;
}
utillib.inherits(XOAuth2Generator, Stream);

/**
 * Returns or generates (if previous has expired) a XOAuth2 token
 *
 * @param {Function} callback Callback function with error object and token string
 */
XOAuth2Generator.prototype.getToken = function(callback){
    if(this.token && (!this.timeout || this.timeout > Date.now())){
        return callback(null, this.token, this.accessToken);
    }
    this.generateToken(callback);
};

/**
 * Updates token values
 *
 * @param {String} accessToken New access token
 * @param {Number} timeout Access token lifetime in seconds
 *
 * Emits 'token': { user: User email-address, accessToken: the new accessToken, timeout: Timestamp in seconds after 1.1.1970 }
 */
XOAuth2Generator.prototype.updateToken = function(accessToken, timeout){
    this.token = this.buildXOAuth2Token(accessToken);
    this.accessToken = accessToken;
    this.timeout = timeout && Date.now() + ((Number(timeout) || 0) - 1) * 1000 || 0;

    this.emit("token", {
        user: this.options.user,
        accessToken: accessToken || "",
        timeout: Math.floor(this.timeout/1000)
    });
};

/**
 * Generates a new XOAuth2 token with the credentials provided at initialization
 *
 * @param {Function} callback Callback function with error object and token string
 */
XOAuth2Generator.prototype.generateToken = function(callback){
    var urlOptions = {
            client_id: this.options.clientId || "",
            client_secret: this.options.clientSecret || "",
            refresh_token: this.options.refreshToken,
            grant_type: "refresh_token"
        },
        payload = querystring.stringify(urlOptions);

        postRequest(this.options.accessUrl, payload, (function(error, response, body){
            var data;

            if(error){
                return callback(error);
            }
            try{
                data = JSON.parse(body.toString());
            }catch(E){
                return callback(E);
            }

            if(!data || typeof data != "object"){
                return callback(new Error("Invalid authentication response"));
            }

            if(data.error){
                return callback(new Error(data.error));
            }

            if(data.access_token){
                this.updateToken(data.access_token, data.expires_in);
                return callback(null, this.token, this.accessToken);
            }

            return callback(new Error("No access token"));
        }).bind(this));
};

/**
 * Converts an access_token and user id into a base64 encoded XOAuth2 token
 *
 * @param {String} accessToken Access token string
 * @return {String} Base64 encoded token for IMAP or SMTP login
 */
XOAuth2Generator.prototype.buildXOAuth2Token = function(accessToken){
    var authData = [
        "user=" + (this.options.user || ""),
        "auth=Bearer " + accessToken,
        "",
        ""];
    return new Buffer(authData.join("\x01"), "utf-8").toString("base64");
};


function postRequest(url, payload, callback){
    var options = urllib.parse(url),
        finished = false;

    options.method = "POST";

    var req = (options.protocol=="https:"?https:http).request(options, function(res) {
        var data = [];

        res.on('data', function (chunk) {
            data.push(chunk);
        });

        res.on("end", function(){
            if(finished){return;}
            finished = true
            return callback(null, res, Buffer.concat(data));
        });

        res.on("error", function(err) {
            if(finished){return;}
            finished = true
            callback(err);
        });
    });

    req.on("error", function(err) {
        if(finished){return;}
        finished = true
        callback(err);
    });

    if(payload){
        req.setHeader("Content-Type", "application/x-www-form-urlencoded");
        req.setHeader("Content-Length", typeof payload == "string" ? Buffer.byteLength(payload) : payload.length);
    }

    req.write(payload);
    req.end();

}
