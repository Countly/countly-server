'use strict';

var pushly = require('pushly')();

var _ = require('underscore'),
    flatten = require('flat');

var MessageStatus = _.extend({}, pushly.MessageStatus, {Deleted: 1 << 10});

MessageStatus._deleted = [
    MessageStatus.Deleted,
    MessageStatus.InQueue | MessageStatus.Deleted,
    MessageStatus.InProcessing | MessageStatus.Deleted,
    MessageStatus.Done | MessageStatus.Deleted,
    MessageStatus.Error | MessageStatus.Deleted,
    MessageStatus.Aborted | MessageStatus.Deleted,
    MessageStatus.Aborted | MessageStatus.Deleted | MessageStatus.Done,
    MessageStatus.Aborted | MessageStatus.Deleted | MessageStatus.Error,
    MessageStatus.Aborted | MessageStatus.Deleted
];

var MessageExpiryTime = 1000 * 60 * 60 * 24 * 7,     // one week by default
    MessagePlatform = pushly.Platform,
    cleanObj = function(msg) {
        Object.keys(msg).forEach(function(key) {
            if (typeof msg[key] === 'object') {
                Object.keys(msg[key]).forEach(function(key2) {
                    if (msg[key][key2] === undefined) {
                        delete msg[key][key2];
                    }
                });
            } else {
                if (msg[key] === undefined) {
                    delete msg[key];
                }
            }
        });

        if (msg.conditions && typeof msg.conditions !== 'string') {
            msg.conditions = JSON.stringify(msg.conditions);
        }

        return msg;
    };

module.exports.MessageStatus = MessageStatus;
module.exports.MessagePlatform = MessagePlatform;
module.exports.cleanObj = cleanObj;

module.exports.Message = function (apps, names) {
    if (_.isObject(apps) && !_.isArray(apps)) {
        _.extend(this, apps);
        if (this.conditions && typeof this.conditions === 'string') {
            this.conditions = JSON.parse(this.conditions);
        }
    } else {
        this.type = undefined;
        this.apps = apps;
        this.appNames = names;
        this.status = MessageStatus.Initial;
        this.platforms = [];
        this.conditions = {};
        this.geo = undefined;                   // ID of geo object
        this.message = undefined;               // Simple message for all clients
        this.messagePerLocale = undefined;      // Map of localized messages
        this.collapseKey = undefined;           // Collapse key for Android
        this.contentAvailable = undefined;      // content-available for iOS
        this.newsstandAvailable = undefined;    // newsstand-available for iOS
        this.delayWhileIdle = undefined;        // delay_while_idle for Android
        this.url = undefined;                   // url to open
        this.category = undefined;              // message category (iOS 8+)
        this.review = undefined;                // call-to-review app (app ID should be here)
        this.update = undefined;                // call-to-review app (app ID should be here)
        this.data = undefined;                  // Custom data
        this.sound = undefined;                 // Sound
        this.badge = undefined;                 // Badge

        this.result = {
            status: MessageStatus.Initial,
            total: 0,
            processed: 0,
            sent: 0,
            error: undefined,
        };

        this.expiryDate = new Date(Date.now() + MessageExpiryTime);     // one week by default
        this.created = new Date();
    }

    Object.defineProperties(this, {
        setId: {
            value: function (id) {
                this._id = id;
                return this;
            }
        },
        setType: {
            value: function (typ) {
                this.type = typ;
                return this;
            }
        },
        setLocales: {
            value: function (locs) {
                this.locales = locs;
                return this;
            }
        },
        setMessage: {
            value: function (msg) {
                this.message = msg;
                return this;
            }
        },
        setMessagePerLocale: {
            value: function (localized) {
                this.messagePerLocale = localized;
                return this;
            }
        },
        setCollapseKey: {
            value: function (key) {
                this.collapseKey = key;
                return this;
            }
        },
        setDelayWhileIdle: {
            value: function (delay) {
                this.delayWhileIdle = delay;
                return this;
            }
        },
        setURL: {
            value: function (url) {
                this.url = url;
                return this;
            }
        },
        setCategory: {
            value: function (category) {
                this.category = category;
                return this;
            }
        },
        setReview: {
            value: function (appId) {
                this.review = appId;
                return this;
            }
        },
        setUpdate: {
            value: function (appId) {
                this.update = appId;
                return this;
            }
        },
        setConditions: {
            value: function (conds) {
                this.conditions = conds || {};
                return this;
            }
        },
        setGeo: {
            value: function (geo) {
                this.geo = geo || '';
                return this;
            }
        },
        getUserCollectionConditions: {
            value: function () {
                return _.extend({}, this.conditions || {});
            }
        },
        addPlatform: {
            value: function (p) {
                var plats = typeof p == 'string' ? p.split('') : p,
                    msg = this;

                plats.forEach(function (p) {
                    if (msg.platforms.indexOf(p) == -1) {
                        msg.platforms.push(p);
                    }
                });

                return this;
            }
        },
        hasPlatform: {
            value: function (p) {
                return this.platforms && this.platforms.indexOf(p) !== -1;
            }
        },
        setSound: {
            value: function (sound) {
                this.sound = sound;
                return this;
            }
        },
        setBadge: {
            value: function (badge) {
                this.badge = badge;
                return this;
            }
        },
        setExpirationDate: {
            value: function (date) {
                this.expiryDate = date;
                return this;
            }
        },
        setContentAvailable: {
            value: function (ca) {
                this.contentAvailable = ca;
                return this;
            }
        },
        setNewsstandAvailable: {
            value: function (na) {
                this.newsstandAvailable = na;
                return this;
            }
        },
        setData: {
            value: function (obj) {
                this.data = flatten.unflatten(obj);
                return this;
            }
        },
        setStatus: {
            value: function (s) {
                this.status = s;
                return this;
            }
        },
        setTest: {
            value: function (t) {
                this.test = t || false;
                return this;
            }
        },
        schedule: {
            value: function (date) {
                this.date = date || new Date();
                this.expiryDate = new Date(this.date.getTime() + MessageExpiryTime);     // one week by default
                this.status = MessageStatus.Initial;
                return this;
            }
        },
        toPushly: {
            value: function(credentials, devices, index) {
                var content = {
                    data: {
                        c: {
                        }
                    }
                };

                if (this.message) {
                    content.message = this.message;
                }

                if (this.messagePerLocale) {
                    content.messagePerLocale = this.messagePerLocale;
                }

                if (!this.message && !this.messagePerLocale) {
                    content.contentAvailable = true;
                }

                if (this.collapseKey) {
                    content.collapseKey = this.collapseKey;
                }

                if (this.delayWhileIdle) {
                    content.delayWhileIdle = this.delayWhileIdle;
                }

                if (this.contentAvailable) {
                    content.contentAvailable = this.contentAvailable;
                }

                if (this.newsstandAvailable) {
                    content.newsstandAvailable = this.newsstandAvailable;
                }

                if (this.delayWhileIdle) {
                    content.delayWhileIdle = this.delayWhileIdle;
                }

                if (typeof this.sound !== 'undefined') {
                    content.sound = this.sound;
                }

                if (typeof this.badge !== 'undefined') {
                    content.badge = this.badge;
                }

                if (this.url) {
                    content.data.c.l = this.url;
                    content.category = '[CLY]_url';
                }

                if (this.category) {
                    content.category = this.category;
                }

                if (typeof this.update != 'undefined') {
                    content.data.c.u = this.update;
                    content.category = '[CLY]_update';
                }

                if (typeof this.review != 'undefined') {
                    content.data.c.r = this.review;
                    content.category = '[CLY]_review';
                }

                if (this.data) {
                     _.extend(content.data, this.data);
                }

                var idComponents = [this._id + ''];

                if (index) {
                    idComponents = idComponents.concat(index);
                } else {
                    idComponents.push(credentials.platform);
                }

                content.data.c.i = this._id + '';

                var m = {
                    id: idComponents.join('|'),
                    content: content,
                    credentials: credentials,
                    test: this.test
                };

                if (_.isArray(devices)) {
                    m.devices = devices;
                } else {
                    m.devicesQuery = devices;
                }

                return new pushly.Message(m);
            }
        }
    });
};
