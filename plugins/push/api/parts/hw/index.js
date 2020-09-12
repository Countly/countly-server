const log = require('../../../../../api/utils/log.js')('push:hw/' + process.pid),
    https = require('https'),
    qs = require('querystring'),
    FcmResource = require('../gcm/index.js').ConnectionResource;

/** ConnectionResource class */
class ConnectionResource extends FcmResource {

    /**
     * Connection constructor
     * @param  {String} id     Huawei app id
     * @param  {String} secret app secret
     */
    constructor(id, secret) {
        super(id, secret);
        this._id = id;
        this._secret = secret;
    }

    /** init() 
     * @param {function} e - logger function 
     * @param {string} proxyhost - proxy hostname or empty string
     * @param {string} proxyport - proxy port or empty string
     * @param {string} proxyuser - proxy usernname or empty string
     * @param {string} proxypass - proxy password or empty string
     * @returns {Promise} resolved(always);
    */
    init(e, proxyhost, proxyport, proxyuser, proxypass) {
        return super.init(e, proxyhost, proxyport, proxyuser, proxypass).then(() => {
            this.options = {
                hostname: 'push-api.cloud.huawei.com',
                port: 443,
                path: '/v1/' + this._id + '/messages:send',
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': null,
                },
            };
        });
    }

    /**
     * Get new token and return
     * @return {[type]} [description]
     */
    init_connection() {
        return this.getToken().then(token => {
            this.token = token;
            this._key = this.options.headers.Authorization = 'Bearer ' + token.token;
        });
    }

    /**
     * Get new access token from Huawei
     * @return {Promise} resolves to {token: "token string", until: expiration timestamp} or error
     */
    getToken() {
        return new Promise((resolve, reject) => {
            let data = qs.stringify({
                grant_type: 'client_credentials',
                client_id: this._id,
                client_secret: this._secret
            });

            let req = https.request({
                hostname: 'oauth-login.cloud.huawei.com',
                port: 443,
                path: '/oauth2/v2/token',
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': data.length
                }
            }, res => {
                let text = '', json;
                res.on('data', chunk => {
                    text = text + chunk;
                });
                res.on('end', () => {
                    log.d('Done updating access token: %s', text);
                    try {
                        json = JSON.parse(text);
                    }
                    catch (e) {
                        log.d('Not json received during token acquisition: %j', e);
                    }
                    if (res.statusCode === 200 && json && json.access_token) {
                        resolve({token: json.access_token, expires: Date.now() + json.expires_in * 1000 - 10000});
                    }
                    else if (!json) {
                        reject('Authorization error: bad response');
                    }
                    else if (json.error_description) {
                        reject('Huawei authorization error: ' + json.error_description);
                    }
                    else {
                        reject('Authorization error: unknown (' + text + ')');
                    }
                });
            });

            req.on('error', err => {
                log.e('Error during token acquisition: %j', err);
                reject('Authorization error' + (err.message && ': ' + err.message || ''));
            });

            req.end(data);
        });
    }

    /**
     * Add tokens to the message string
     * @param  {String} message compiled message json string
     * @param  {[String]} tokens array of tokens to send to
     * @return {String}   message string ready to send
     */
    content(message, tokens) {
        if (message === '{"test":true}') {
            return JSON.stringify({message: {data: JSON.stringify({a: 1}), token: tokens}});
        }
        message = JSON.parse(message);
        message.message.token = tokens;
        return JSON.stringify(message);
    }

    /**
     * Check for token validity / renew it & fallback to FCM logic
     */
    service() {
        if (!this.token || this.token.expires > Date.now()) {
            this.init_connection().then(() => {
                super.service();
            });
        }
        else {
            super.service();
        }
    }

    /** handle
     * @param {object} req - req obj
     * @param {object} res - res
     * @param {array} ids - id
     */
    handle(req, res, ids) {
        if (req.handled || this._closed) {
            return;
        }
        req.handled = true;

        let code = res.statusCode,
            data = res.reply;

        ids = ids.map(id => [id]);
        this.inFlight -= ids.length;
        this.requestCount--;

        log.d('Huawei handling %d with %d tokens while %d is in flight in %d requests', code, ids.length, this.inFlight, this.requestCount);

        if (code >= 500) {
            log.d('Huawei response %j', data);
            this.rejectAndCloseOnce(code + ': Huawei Unavailable');
        }
        else if (code === 401) {
            log.d('Huawei response %j', data);
            this.rejectAndCloseOnce(code + ': Huawei Unauthorized');
        }
        else if (code === 400) {
            log.d('Huawei response %j', data);
            this.rejectAndCloseOnce(code + ': Huawei Bad message');
        }
        else if (code !== 200) {
            log.d('Huawei response %j', data);
            this.rejectAndCloseOnce(code + ': Bad response code');
        }
        else {
            try {
                if (data && data[0] === '"' && data[data.length - 1] === '"') {
                    data = data.substr(1, data.length - 2);
                    log.d('Huawei replaced quotes: %j', data);
                }
                var obj = JSON.parse(data);

                log.d('Huawei response: %j', obj);

                if (obj.code === '80000000') {
                    ids.forEach(id => id[1] = 200);
                }
                else if (obj.code === '80100000') {
                    // Some tokens are successfully sent. Tokens identified by illegal_token are those failed to be sent.
                    // @todo
                    ids.forEach(id => id[1] = 200);
                }
                else if (obj.code === '80100001') {
                    // Some token parameters are incorrect.
                    // @todo
                    ids.forEach(id => id[1] = 200);
                }
                else if (obj.code === '80100003') {
                    // Incorrect message structure.
                    this.resouceError = new Error('Huawei: incorrect message structure (80100003)');
                    log.w('Huawei returned error: %j', this.resouceError);
                }
                else if (obj.code === '80100004') {
                    // The message expiration time is earlier than the current time.
                    this.resouceError = new Error('Huawei: message expiration time is earlier than the current time (80100004)');
                    log.w('Huawei returned error: %j', this.resouceError);
                }
                else if (obj.code === '80100013') {
                    // the collapse_key message field is invalid
                    this.resouceError = new Error('Huawei: the collapse_key message field is invalid (80100013)');
                    log.w('Huawei returned error: %j', this.resouceError);
                }
                else if (obj.code === '80100016') {
                    // The message contains sensitive information.
                    this.resouceError = new Error('Huawei: the message contains sensitive information (80100016)');
                    log.w('Huawei returned error: %j', this.resouceError);
                }
                else if (obj.code === '80200001') {
                    // OAuth authentication error.
                    this.resouceError = new Error('Huawei: OAuth authentication error (80200001)');
                    log.w('Huawei returned error: %j', this.resouceError);
                }
                else if (obj.code === '80200003') {
                    // OAuth token expired.
                    this.resouceError = new Error('Huawei: OAuth token expired (80200003)');
                    log.w('Huawei returned error: %j', this.resouceError);
                }
                else if (obj.code === '80300002') {
                    // The current app does not have the permission to send push messages
                    this.resouceError = new Error('Huawei: the current app does not have the permission to send push messages (80300002)');
                    log.w('Huawei returned error: %j', this.resouceError);
                }
                else if (obj.code === '80300007') {
                    // All tokens are invalid
                    ids.forEach(id => id[1] = -200);
                }
                else if (obj.code === '80300008') {
                    // The message body size exceeds the default value
                    this.resouceError = new Error('Huawei: the message body size exceeds the default value (80300008)');
                    log.w('Huawei returned error: %j', this.resouceError);
                }
                else if (obj.code === '80300010') {
                    // The number of tokens in the message body exceeds the default value
                    this.resouceError = new Error('Huawei: the number of tokens in the message body exceeds the default value (80300010)');
                    log.w('Huawei returned error: %j', this.resouceError);
                }
                else if (obj.code === '80300011') {
                    // You are not authorized to send high-priority notification messages
                    this.resouceError = new Error('Huawei: you are not authorized to send high-priority notification messages (80300011)');
                    log.w('Huawei returned error: %j', this.resouceError);
                }
                else if (obj.code === '81000001') {
                    // System internal error.
                    this.resouceError = new Error('Huawei: system internal error. (81000001)');
                    log.w('Huawei returned error: %j', this.resouceError);
                }
                else {
                    // Unknown error.
                    this.resouceError = new Error(`Huawei: unknown error (${obj.code})`);
                    log.w('Huawei returned error: %j', this.resouceError);
                }

                this.statuses = this.statuses.concat(ids);
                // log.d('statuses %j', this.statuses);

                this.serviceImmediate();
            }
            catch (e) {
                ids.forEach(i => i[1] = -1);
                this.statuses = this.statuses.concat(ids);
                log.e('Bad response from Huawei: %j / %j / %j', code, data, e, (e || {}).stack);
                this._servicing = false;
                this.serviceImmediate();
            }
        }

        this._servicing = false;
    }
}

module.exports = {
    ConnectionResource: ConnectionResource
};