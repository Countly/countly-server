'use strict';

/**
 * ENUM for message statuses.
 */
const Status = {
    // Initial:        0,          // 0  Nothing happened yet
    // Preparing:      1,          // 1  Preparing
    // InQueue:        1 << 1,     // 2  Master level
    // InProcessing:   1 << 2,     // 4  Worker level
    // Done:           1 << 3,     // 8  Done on worker level
    // Error:          1 << 4,     // 16 Some error occurred during processing
    // Aborted:        1 << 5,     // 32 Unrecoverable (credentials or message format) error occurred, or you just send message abort request

    NotCreated: 0, // 0
    Created: 1 << 0, // 1
    Scheduled: 1 << 1, // 2
    Sending: 1 << 2, // 4
    Done: 1 << 3, // 8
    Error: 1 << 4, // 16
    Success: 1 << 5, // 32
    Aborted: 1 << 10, // 1024
    Deleted: 1 << 11, // 2048
};

Status.READY = Status.Created | Status.Scheduled; // 3   Ready to send
Status.SENDING = Status.READY | Status.Sending; // 7   Sending right now
Status.DONE = Status.Created | Status.Done; // 9   Done sending, no notifications in collections, won't start again
Status.DONE_FAILURE = Status.DONE | Status.Error; // 25  Done with error
Status.DONE_ABORTED = Status.DONE | Status.Error | Status.Aborted; // 1049Done with error & aborted
Status.DONE_SUCCESS = Status.DONE | Status.Success; // 41  Done with success
Status.DONE_MIXED = Status.DONE_SUCCESS | Status.DONE_FAILURE; // 57  Done with mixed results: some success, some failure
Status.PAUSED_FAILURE = Status.READY | Status.Error; // 19  Waiting for next batch, but some error happened
Status.PAUSED_SUCCESS = Status.READY | Status.Success; // 35  Waiting for next batch, all good so far
Status.PAUSED_MIXED = Status.PAUSED_SUCCESS | Status.PAUSED_FAILURE;// 51  Waiting for next batch, mixed results

/**
 * ENUM for supported platforms.
 */
const Platform = {
    IOS: 'i',
    ANDROID: 'a'
};

const DEFAULT_EXPIRY = 1000 * 60 * 60 * 24 * 7;

const S = '|';

/** 
 * Main notification class, stored in messages
 */
class Note {

    constructor(data) {
        this._id = data._id;
        this.type = data.type;
        this.apps = data.apps;
        this.appNames = data.appNames;
        this.platforms = data.platforms;
        this.userConditions = typeof data.userConditions === 'string' ? JSON.parse(data.userConditions) : data.userConditions;
        this.drillConditions = typeof data.drillConditions === 'string' ? JSON.parse(data.drillConditions) : data.drillConditions;
        this.source = data.source; // api or dash
        this.geo = data.geo; // ID of geo object
        this.messagePerLocale = data.messagePerLocale; // Map of localized messages
        this.locales = data.locales; // Map locale-percentage
        this.collapseKey = data.collapseKey; // Collapse key for Android
        this.contentAvailable = data.contentAvailable; // content-available for iOS
        this.delayWhileIdle = data.delayWhileIdle; // delay_while_idle for Android
        this.url = data.url; // url to open
        this.data = typeof data.data === 'string' ? JSON.parse(data.data) : data.data; // Custom data
        this.sound = data.sound; // Sound
        this.badge = data.badge; // Badge
        this.buttons = data.buttons; // Number of buttons
        this.media = data.media; // Media URL
        this.mediaMime = data.mediaMime; // Media MIME-type
        this.test = data.test; // Test
        this.date = data.date; // Date to be sent on
        this.tz = data.tz; // Send in user timezones
        this.tx = data.tx; // Send in user timezones

        this.auto = data.auto; // Automated message
        this.autoOnEntry = data.autoOnEntry; // Automated message: on cohort entry or exit
        this.autoCohorts = data.autoCohorts; // Automated message: cohorts array
        this.autoEnd = data.autoEnd; // Automated message: end date
        this.autoDelay = data.autoDelay; // Automated message: delay sending on this much time after trigger
        this.autoTime = data.autoTime; // Automated message: send in user's tz at this time
        this.autoCapMessages = data.autoCapMessages; // Automated message: limit number of messages per user
        this.autoCapSleep = data.autoCapSleep; // Automated message: how much ms to wait before sending a message

        this.result = {
            status: data.result && data.result.status || Status.NotCreated,
            total: data.result && data.result.total || 0,
            processed: data.result && data.result.processed || 0,
            sent: data.result && data.result.sent || 0,
            errors: data.result && data.result.errors || 0,
            error: data.result && data.result.error || null,
            errorCodes: data.result && data.result.errorCodes || {},
            resourceErrors: data.result && data.result.resourceErrors || [],
            aborts: data.result && data.result.aborts || [],
            nextbatch: data.result && data.result.nextbatch || null,
        };

        this.expiryDate = data.expiryDate ? parseDate(data.expiryDate) : data.date ? new Date(data.date.getTime() + DEFAULT_EXPIRY) : new Date(Date.now() + DEFAULT_EXPIRY); // one week by default
        this.created = parseDate(data.created) || new Date();
        this.build = data.build;
    }

    get id() {
        return '' + this._id;
    }

    toJSON() {
        var json = {
            _id: this._id,
            type: this.type,
            apps: this.apps,
            appNames: this.appNames,
            platforms: this.platforms,
            userConditions: this.userConditions ? JSON.stringify(this.userConditions) : undefined,
            drillConditions: this.drillConditions ? JSON.stringify(this.drillConditions) : undefined,
            source: this.source,
            geo: this.geo,
            messagePerLocale: this.messagePerLocale,
            collapseKey: this.collapseKey,
            contentAvailable: this.contentAvailable,
            delayWhileIdle: this.delayWhileIdle,
            url: this.url,
            data: this.data ? JSON.stringify(this.data) : undefined,
            sound: this.sound,
            badge: this.badge,
            buttons: this.buttons,
            media: this.media,
            mediaMime: this.mediaMime,
            result: this.result,
            expiryDate: this.expiryDate,
            date: this.date,
            tz: this.tz,
            tx: this.tx,
            auto: this.auto,
            autoOnEntry: this.autoOnEntry,
            autoCohorts: this.autoCohorts,
            autoEnd: this.autoEnd,
            autoDelay: this.autoDelay,
            autoTime: this.autoTime,
            autoCapMessages: this.autoCapMessages,
            autoCapSleep: this.autoCapSleep,
            created: this.created,
            test: this.test,
            build: this.build
        };

        Object.keys(json).forEach(k => {
            if (json[k] === null || json[k] === undefined) {
                delete json[k];
            }
        });

        return json;
    }

    diff(note) {
        // overridable:
        // this.userConditions = typeof data.userConditions === 'string' ? JSON.parse(data.userConditions) : data.userConditions;
        // this.drillConditions = typeof data.drillConditions === 'string' ? JSON.parse(data.drillConditions) : data.drillConditions;
        // this.geo = data.geo;                                     // ID of geo object
        // this.messagePerLocale = data.messagePerLocale;           // Map of localized messages
        // this.collapseKey = data.collapseKey;                         // Collapse key for Android
        // this.contentAvailable = data.contentAvailable;           // content-available for iOS
        // this.delayWhileIdle = data.delayWhileIdle;                   // delay_while_idle for Android
        // this.url = data.url;                                         // url to open
        // this.data = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;  // Custom data
        // this.sound = data.sound;                                     // Sound
        // this.badge = data.badge;                                 // Badge
        // this.buttons = data.buttons;                             // Number of buttons
        // this.media = data.media;                                 // Media URL
        // this.mediaMime = data.mediaMime;                             // Media MIME-type
        // this.date = data.date;                                       // Date to be sent on
        // this.tz = data.tz;                                           // Send in user timezones

        let diff = {};
        ['messagePerLocale', 'data'].forEach(k => {
            if (note[k] !== null && note[k] !== undefined) {
                diff[k] = note[k];
            }
        });
        ['geo', 'collapseKey', 'contentAvailable', 'delayWhileIdle', 'url', 'sound', 'badge', 'buttons', 'media', 'mediaMime', 'date', 'tz'].forEach(k => {
            if (note[k] !== null && note[k] !== undefined && this[k] !== note[k]) {
                diff[k] = note[k];
            }
        });

        return Object.keys(diff).length ? diff : undefined;
    }

    static load(db, _id) {
        // console.log((new Error('asd')).stack);
        return new Promise((resolve, reject) => {
            db.collection('messages').findOne({_id: typeof _id === 'string' ? db.ObjectID(_id) : _id}, (err, message) => {
                if (err || !message) {
                    reject(err || 'Not found');
                }
                else {
                    resolve(new Note(message));
                }
            });
        });
    }

    insert(db) {
        return new Promise((resolve, reject) => {
            db.collection('messages').insertOne(this.toJSON(), (err, res) => {
                if (err || !res || !res.insertedCount) {
                    reject(err || 'WTF');
                }
                else {
                    resolve();
                }
            });
        });
    }

    update(db, update) {
        return new Promise((resolve, reject) => {
            db.collection('messages').updateOne({_id: typeof this._id === 'string' ? db.ObjectID(this._id) : this._id}, update, (err, res) => {
                if (err || !res) {
                    reject(err || 'WTF');
                }
                else if (!res.matchedCount) {
                    reject('Not found');
                }
                else {
                    resolve(!!res.modifiedCount);
                }
            });
        });
    }

    updateAtomically(db, match, update) {
        return new Promise((resolve, reject) => {
            match._id = typeof this._id === 'string' ? db.ObjectID(this._id) : this._id;
            db.collection('messages').findAndModify(match, {}, update, {new: true}, (err, doc) => {
                if (err) {
                    reject(err);
                }
                else if (!doc || !doc.ok || !doc.value) {
                    reject('Not found');
                }
                else {
                    resolve(doc.value);
                }
            });
        });
    }

    schedule(db, jobs) {
        if (this.auto || this.tx) {
            return Promise.resolve();
        }
        else if (this.tz && this.tz !== false) {
            return jobs.job('push:schedule', {mid: this._id}).once((this.date || new Date()).getTime() - 24 * 3600 * 1000);
        }
        else {
            return jobs.job('push:schedule', {mid: this._id}).once(this.date || new Date());
        }
        // build already finished, lets schedule the job
        // if (this.date && this.tz !== false && this.build.tzs && this.build.tzs.length) {
        //  var batch = new Date(this.date.getTime() + (this.tz - this.build.tzs[0]) * 60000);
        //  log.d('Scheduling message with date %j to be sent in user timezones (tz %j, tzs %j): %j', this.date, this.tz, this.build.tzs, batch);
        //  jobs.job('push:send', {mid: this._id}).once(batch);
        //  db.collection('messages').updateOne({_id: this._id}, {$set: {'result.status': Status.InQueue, 'result.nextbatch': batch}}, log.logdb('when updating message status with inqueue'));
        // } else if (this.date && this.tz !== false && this.build.nextbatch) {
        //  log.d('Scheduling message with date %j to be sent in user timezones (nextbatch %j)', this.date, this.tz, this.build.nextbatch);
        //  jobs.job('push:send', {mid: this._id}).once(new Date(this.build.nextbatch));
        //  db.collection('messages').updateOne({_id: this._id}, {$set: {'result.status': Status.InQueue, 'result.nextbatch': this.build.batch}}, log.logdb('when updating message status with inqueue'));
        // } else if (this.date && this.skipPreparation && this.tz !== false) {
        //  // scheduling build at date - 24 * 3600 000 - 10 * 60 000  * Math.random() time to make sure it'll build it at correct time
        //  var date = new Date(parseDate(this.date).getTime() - 24 * 3600 * 1000 - 10 * 60000 * Math.random());
        //  log.d('Scheduling message with date %j to be built at %j in user timezones (tz %j, tzs %j): %j', this.date, date, this.tz, this.build.tzs, batch);
        //  jobs.job('push:send', {mid: this._id}).once(date);
        //  db.collection('messages').updateOne({_id: this._id}, {$set: {'result.status': Status.InQueue}}, log.logdb('when updating message status with inqueue'));
        // } else if (this.date) {
        //  log.d('Scheduling message %j to be sent on date %j',this._id, this.date);
        //  jobs.job('push:send', {mid: this._id}).once(this.date);
        //  db.collection('messages').updateOne({_id: this._id}, {$set: {'result.status': Status.InQueue}}, log.logdb('when updating message status with inqueue'));
        // } else {
        //  log.d('Scheduling message %j to be sent immediately', this._id);
        //  jobs.job('push:send', {mid: this._id}).now();
        // }
    }

    save(db) {
        return new Promise((resolve, reject) => {
            if (!this._id) {
                this._id = new db.ObjectID();
            }

            db.collection('messages').save(this.toJSON(), (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this);
                }
            });
        });
    }

    personalize(str, pers, user) {
        // console.log('personalizing %s with %j for %j', str, pers, user);
        if (!pers) {
            return str;
        }
        var ret = str;
        Object.keys(pers).sort(function(a, b) {
            return parseInt(b) - parseInt(a);
        }).forEach(function(k) {
            var p = pers[k],
                v = user && user[p.k] && user[p.k].toString();
            k = parseInt(k);
            ret = ret.substr(0, k) + (p.c && v ? v.substr(0, 1).toUpperCase() + v.substr(1) : (v || p.f)) + ret.substr(k);
        });
        return ret;
    }

    compile(platform, msg) {
        if (this.platforms.indexOf(platform) === -1) {
            return null;
        }

        let o = msg.o || {},
            p = msg.p || {},
            buttons = o.buttons || this.buttons || 0,
            mpl = o.messagePerLocale || this.messagePerLocale || null,
            data = o.data || this.data || null,
            lang = p.la || 'default',
            alert = null,
            title = null,
            // alert = (mpl && mpl[lang]) || (mpl && mpl['default']) || null,
            // title = (mpl && mpl[`${lang}${S}t`]) || (mpl && mpl[`default${S}t`]) || null,
            isset = v => v !== undefined && v !== null,
            sound = isset(o.sound) ? o.sound : isset(this.sound) ? this.sound : null,
            badge = isset(o.badge) ? o.badge : isset(this.badge) ? this.badge : null,
            media = isset(o.media) ? o.media : isset(this.media) ? this.media : null,
            mediaMime = isset(o.media) ? o.mediaMime : isset(this.media) ? this.mediaMime : null,
            url = isset(o.url) ? o.url : isset(this.url) ? this.url : null,
            contentAvailable = isset(o.contentAvailable) ? o.contentAvailable : isset(this.contentAvailable) ? this.contentAvailable : null,
            delayWhileIdle = isset(o.delayWhileIdle) ? o.delayWhileIdle : isset(this.delayWhileIdle) ? this.delayWhileIdle : null,
            collapseKey = o.collapseKey || this.collapseKey || null,
            expiryDate = o.expiryDate || this.expiryDate || null,
            buttonsJSON = buttons > 0 ? new Array(buttons).map((_, i) => {
                return {t: mpl[`default${S}${i}${S}t`], l: mpl[`default${S}${i}${S}l`]};
            }) : null,
            compiled;

        if (mpl) {
            if (mpl && mpl[lang]) {
                alert = this.personalize(mpl[lang], mpl[`${lang}${S}p`], p);
            }
            else if (mpl && mpl.default) {
                alert = this.personalize(mpl.default, mpl[`default${S}p`], p);
            }
            if (mpl && mpl[`${lang}${S}t`]) {
                title = this.personalize(mpl[`${lang}${S}t`], mpl[`${lang}${S}tp`], p);
            }
            else if (mpl && mpl[`default${S}t`]) {
                title = this.personalize(mpl[`default${S}t`], mpl[`default${S}tp`], p);
            }
        }

        if (platform === Platform.IOS) {
            compiled = {
                aps: {},
            };
            if (title) {
                compiled.aps.alert = {
                    body: alert,
                    title: title
                };
            }
            else if (alert) {
                compiled.aps.alert = alert;
            }
            if (sound !== null) {
                compiled.aps.sound = sound;
            }
            if (badge !== null) {
                compiled.aps.badge = badge;
            }
            if (contentAvailable || (!compiled.aps.alert && !compiled.aps.sound)) {
                compiled.aps['content-available'] = 1;
            }
            if (data) {
                for (let k in data) {
                    compiled[k] = data[k];
                }
            }

            if (Object.keys(compiled.aps).length === 0) {
                delete compiled.aps;
            }

            if (!compiled.c) {
                compiled.c = {};
            }
            compiled.c.i = this._id.toString();

            if (url) {
                compiled.c.l = url;
            }

            if (media) {
                compiled.c.a = media;
            }

            if (buttonsJSON) {
                compiled.c.b = buttonsJSON;
            }

            if (buttonsJSON || media) {
                compiled.aps['mutable-content'] = 1;
            }

            return JSON.stringify(compiled);
        }
        else {
            compiled = {};
            if (collapseKey) {
                compiled.collapse_key = collapseKey;
            }

            compiled.time_to_live = Math.round((expiryDate.getTime() - Date.now()) / 1000);
            if (delayWhileIdle !== null) {
                compiled.delay_while_idle = delayWhileIdle;
            }

            compiled.data = {};
            if (alert) {
                compiled.data.message = alert;
            }
            if (title) {
                compiled.data.title = title;
            }

            if (sound !== null) {
                compiled.data.sound = sound;
            }
            if (badge !== null) {
                compiled.data.badge = badge;
            }

            if (!alert && sound === null) {
                compiled.data['c.s'] = 'true';
            }

            if (data) {
                var flattened = flattenObject(data);
                for (let k in flattened) {
                    compiled.data[k] = flattened[k];
                }
            }
            compiled.data['c.i'] = this._id.toString();

            if (url) {
                compiled.data['c.l'] = url;
            }

            if (media && mediaMime && ['image/jpeg', 'image/png'].indexOf(mediaMime) !== -1) {
                compiled.data['c.m'] = media;
            }

            if (buttonsJSON) {
                compiled.data['c.b'] = buttonsJSON;
            }

            return JSON.stringify(compiled);
        }
    }

    compilationDataFields() {
        if (this._compilationDataFields) {
            return this._compilationDataFields;
        }

        let ret = {};
        Object.values(this.messagePerLocale || {}).filter(v => typeof v === 'object').forEach(v => {
            Object.values(v).forEach(v => {
                ret[v.k] = 1;
            });
        });
        this._compilationDataFields = JSON.parse(JSON.stringify(ret));

        return ret;
    }

    compilationData(user) {
        let ret = {
            la: user.la || 'default'
        };

        Object.keys(this.compilationDataFields()).forEach(k => {
            if (k.indexOf('.') === -1 && typeof user[k] !== 'undefined') {
                ret[k] = user[k];
            }
            else if (k.indexOf('custom.') !== -1 && user.custom && typeof user.custom[k.substr(7)] !== 'undefined') {
                ret[k] = user.custom[k.substr(7)];
            }
        });
        return ret;
    }

    get queryDrill() {
        return this.drillConditions ? typeof this.drillConditions === 'string' ? JSON.parse(this.drillConditions) : JSON.parse(JSON.stringify(this.drillConditions)) : undefined;
    }

    get queryUser() {
        return this.userConditions ? typeof this.userConditions === 'string' ? JSON.parse(this.userConditions) : JSON.parse(JSON.stringify(this.userConditions)) : undefined;
    }
}

var flattenObject = function(ob) {
    var toReturn = {};

    for (var i in ob) {
        if (!ob.hasOwnProperty(i)) {
            continue;
        }

        if ((typeof ob[i]) === 'object' && ob[i] !== null) {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) {
                    continue;
                }

                toReturn[i + '.' + x] = flatObject[x];
            }
        }
        else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
};

var parseDate = function(d) {
    if (d instanceof Date) {
        return d;
    }
    if (typeof d === 'string' && d) {
        return new Date(d);
    }
    if (typeof d === 'number' && d) {
        return new Date(d);
    }
    return d;
};

module.exports = {
    Platform: Platform,
    Status: Status,
    Note: Note,
    DEFAULT_EXPIRY: DEFAULT_EXPIRY
};