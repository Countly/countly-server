'use strict';
const addon = require('./build/Release/apns');
// const addon = require('./build/Debug/apns');

class ConnectionResource {
    constructor(cert, pass, topic, expiration, host) {
        this.connection = new addon.Connection(cert, pass, topic, expiration, host);
    }

    init(logger, proxyhost, proxyport, proxyuser, proxypass) {
        if (this._connected) {
            return Promise.resolve();
        }
        else {
            let proxyauth = '';
            if (proxyuser && proxypass) {
                proxyauth = 'Basic ' + Buffer.from(proxyuser + ':' + proxypass).toString('base64');
            }
            return this.connection.init(logger, proxyhost, proxyport, proxyauth);
        }
    }

    resolve() {
        if (this._connected) {
            return Promise.resolve();
        }
        else {
            return this.connection.resolve();
        }
    }

    init_connection() {
        if (this._connected) {
            return Promise.resolve();
        }
        else {
            return this.connection.init_connection().then(() => {
                this._connected = true;
            });
        }
    }

    send(msgs, token) {
        let length = msgs.length;

        this.statuses = [];
        return new Promise((resolve, reject) => {
            try {
                this.connection.send(['BAD'], () => {
                    // msgs.forEach(m => {
                    //  m._id = '' + m._id;
                    // });
                    msgs = msgs.map(m => [m._id + '', m.t, m.m]);
                    // console.log('======================= 1', msgs[0]);
                    this.connection.feed(msgs, token);
                    msgs = [];
                }, st => {
                    // console.log('======================= 2', st[0]);
                    this.statuses = this.statuses.concat(st);
                    if (this.statuses.length === length) {
                        this.statuses.forEach(s => {
                            s[0] = parseInt(s[0]);
                        });
                        resolve([this.statuses, undefined]);
                    }
                });
            }
            catch (e) {
                reject([this.statuses, e]);
            }
        });
        // return this.connection.send(msgs, feeder, status);
    }

    close_connection() {
        // let e = new Error();
        // console.log(e.stack);
        // console.log('%j', e.stack);
        return this.connection.close_connection().then(() => {
            this._connected = false;
        }, (error) => {
            this._connected = false;
            throw error;
        });
    }
}

module.exports = {
    ConnectionResource: ConnectionResource
};