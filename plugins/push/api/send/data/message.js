'use strict';
const { State, Status, STATUSES, Mongoable, DEFAULTS, S, S_REGEXP } = require('./const'),
    { Filter } = require('./filter'),
    { Content } = require('./content'),
    { Trigger, PlainTrigger, TriggerKind } = require('./trigger'),
    { Result } = require('./result'),
    { Info } = require('./info'),
    db = require('./db');


/**
 * Message class encapsulating all the message-related data
 */
class Message extends Mongoable {
    /**
     * Construct new Message
     * 
     * @param {object|udnefined}    data            message data
     * @param {string|ObjectID}     data._id        message id
     * @param {ObjectID}            data.app        app id
     * @param {array}               data.platforms  array of platform keys
     * @param {BigInt}              data.state      internal message state
     * @param {string}              data.status     user-facing message status
     * @param {object|Filter}       data.filter     user selection filter
     * @param {object[]|Trigger[]}  data.triggers   triggers of this message
     * @param {object|Content[]}    data.contents   message contents array: {la: undefined, p: undefined} is required, any other overrides default one in the order they specified in the array
     * @param {object|Result}       data.result     sending result
     * @param {object|Info}         data.info       info object
     */
    constructor(data) {
        super(data);
    }

    /**
     * Validation scheme of this class
     * 
     * @returns {object} validateArgs scheme
     */
    static get scheme() {
        return {
            _id: { required: false, type: 'ObjectID' },
            app: { required: true, type: 'ObjectID' },
            platforms: { required: true, type: 'String[]', in: () => require('../platforms').platforms },
            state: { type: 'Number' },
            status: { type: 'String', in: Object.values(Status) },
            filter: {
                type: Filter.scheme,
                required: false,
            },
            triggers: {
                type: Trigger.scheme,
                array: true,
                required: true,
                'min-length': 1
            },
            contents: {
                type: Content.scheme,
                array: true,
                required: true,
                nonempty: true,
                'min-length': 1,
            },
            result: {
                type: Result.scheme,
            },
            info: {
                type: Info.scheme,
            }
        };
    }

    /**
     * Set data doing any decoding / transformations along the way
     * 
     * @param {object} data data to set
     */
    setData(data) {
        super.setData(data);

        if (!db.isoid(this._data._id)) {
            this._data._id = db.oid(this._data._id);
        }
        if (this._data.app && !db.isoid(this._data.app)) {
            this._data.app = db.oid(this._data.app);
        }
        if (!(this._data.filter instanceof Filter)) {
            this._data.filter = new Filter(this._data.filter);
        }
        if (!(this._data.result instanceof Result)) {
            this._data.result = new Result(this._data.result);
        }
        if (!(this._data.info instanceof Info)) {
            this._data.info = new Info(this._data.info);
        }
        this._data.triggers = (this._data.triggers || []).map(Trigger.from);
        this._data.contents = (this._data.contents || []).map(Content.from);
    }

    /**
     * Get query of messages active at data
     * 
     * @param {Date} date date
     * @param {int} play period in ms to the left and right from the date
     * @param {State} state state, streamable by default
     * @returns {object} MongoDB filter object
     */
    static filter(date, play, state = State.Streamable) {
        let $lte = new Date(date.getTime() + play),
            $gte = new Date(date.getTime() - play);
        return {
            state: {$bitsAllSet: state},
            $or: [
                {triggers: {$elemMatch: {kind: TriggerKind.Plain, start: {$lte}}}},
                {triggers: {$elemMatch: {kind: TriggerKind.Cohort, start: {$lte}, $or: [{end: {$gte}}, {end: {$exists: false}}]}}},
                {triggers: {$elemMatch: {kind: TriggerKind.Event, start: {$lte}, $or: [{end: {$gte}}, {end: {$exists: false}}]}}},
                {triggers: {$elemMatch: {kind: TriggerKind.API, start: {$lte}, $or: [{end: {$gte}}, {end: {$exists: false}}]}}},
            ]
        };
    }

    /**
     * Collection name for Mongoable
     */
    static get collection() {
        return "messages";
    }

    /**
     * Getter for app
     * 
     * @returns {ObjectID|string|undefined} app id
     */
    get app() {
        return this._data.app;
    }

    /**
     * Setter for app
     * 
     * @param {ObjectID|string|undefined} app app id
     */
    set app(app) {
        if (app !== null && app !== undefined) {
            this._data.app = app;
        }
        else {
            delete this._data.app;
        }
    }

    /**
     * Getter for platforms
     * 
     * @returns {string[]|undefined} platforms array
     */
    get platforms() {
        return this._data.platforms;
    }

    /**
     * Setter for platforms
     * 
     * @param {string[]|undefined} arr platforms array
     */
    set platforms(arr) {
        if (Array.isArray(arr)) {
            this._data.platforms = arr;
        }
        else {
            delete this._data.platforms;
        }
    }

    /**
     * Getter for state
     * 
     * @returns {number|BigInt} internal message state
     */
    get state() {
        return this._data.state;
    }

    /**
     * Setter for state
     * 
     * @param {number|BigInt} state internal message state
     */
    set state(state) {
        if (state !== null && state !== undefined) {
            this._data.state = state;
        }
        else {
            delete this._data.state;
        }
    }

    /**
     * Handy method to check message state
     * 
     * @param {Number} inState state to check against
     * @returns {boolean} true if the message is in this state
     */
    is(inState) {
        return (this.state & inState) > 0;
    }

    /**
     * Getter for status
     * 
     * @returns {string} Message status (user-facing one)
     */
    get status() {
        return this._data.status;
    }

    /**
     * Setter for status
     * 
     * @param {string} status Message status (user-facing one)
     */
    set status(status) {
        if (STATUSES.indexOf(status) !== -1) {
            this._data.status = status;
        }
        else {
            delete this._data.status;
        }
    }

    /**
     * Getter for filter
     * 
     * @returns {Filter} Filter instance
     */
    get filter() {
        return this._data.filter;
    }

    /**
     * Setter for filter
     * 
     * @param {Filter} filter Filter instance
     */
    set filter(filter) {
        if (filter instanceof Filter) {
            this._data.filter = filter;
        }
        else {
            delete this._data.filter;
        }
    }

    /**
     * Getter for triggers
     * 
     * @returns {Trigger[]} trigger array
     */
    get triggers() {
        return this._data.triggers || [];
    }

    /**
     * Setter for triggers
     * 
     * @param {Trigger[]} triggers trigger array
     */
    set triggers(triggers) {
        if (Array.isArray(triggers)) {
            this._data.triggers = triggers;
        }
        else {
            delete this._data.triggers;
        }
    }

    /**
     * Get trigger by kind
     * 
     * @param {TriggerKind|function} kind trigger kind to search for or test function
     * @returns {Trigger} trigger if such trigger exists
     */
    triggerFind(kind) {
        return this.triggers.filter(t => typeof kind === 'function' ? kind(t) : t.kind === kind)[0];
    }

    /**
     * Search for auto/tx trigger
     * 
     * @returns {Trigger|undefined} auto/tx trigger if message has it
     */
    triggerAutoOrApi() {
        return this.triggerFind(t => t.kind === TriggerKind.Cohort || t.kind === TriggerKind.Event || t.kind === TriggerKind.API);
    }

    /**
     * Search for cohort or event trigger
     * 
     * @returns {Trigger|undefined} plain trigger if message has it
     */
    triggerAuto() {
        return this.triggerFind(t => t.kind === TriggerKind.Cohort || t.kind === TriggerKind.Event);
    }

    /**
     * Search for plain trigger
     * 
     * @returns {Trigger|undefined} plain trigger if message has it
     */
    triggerPlain() {
        return this.triggerFind(TriggerKind.Plain);
    }

    /**
     * Getter for contents
     * 
     * @returns {Content[]} array of Contents instances
     */
    get contents() {
        return this._data.contents;
    }

    /**
     * Setter for contents
     * 
     * @param {Content[]} contents array of Contents instances
     */
    set contents(contents) {
        if (Array.isArray(contents)) {
            this._data.contents = contents;
        }
        else {
            delete this._data.contents;
        }
    }

    /**
     * Push another Content into contents array
     * 
     * @param {Content[]} content Contents instance to push
     */
    pushContent(content) {
        if (!this._data.contents) {
            this._data.contents = [];
        }
        this._data.contents.push(content);
    }

    /**
     * Filter contents for given lang-platform combination
     * 
     * @param {string} p platform key
     * @param {string} la language key
     * @returns {Content[]} array of contents which are applicable for this p/l case
     */
    filterContents(p, la) {
        return (this._data.contents || []).filter(c => (!p || (!c.p || c.p === p)) && (!la || (!c.la || c.la === la)));
    }

    /**
     * Get Content instance by p & l given. `content()` returns default content.
     * 
     * @param {string} p platform key
     * @param {string} la language key
     * @returns {Content|undefined} Content instance if one with given p & l exists or undefined
     */
    content(p, la) {
        return this._data.contents.filter(c => c.p === p && c.la === la)[0];
    }

    /**
     * Get Content instance by p & l given, falling back to:
     * - if l is given, then p & undefined l;
     * - if p & l is given, then undefined p and given l;
     * - default content otherwise.
     * 
     * @param {string} p platform key
     * @param {string} la language key
     * @returns {Content|undefined} Content instance if one with given p & l exists or undefined
     */
    findContent(p, la) {
        return this.content(p, la) ||
            (la !== undefined && this.content(p)) ||
            (p !== undefined && la !== undefined && this.content(undefined, la)) ||
            this.content();
    }

    /**
     * Get array of app_user field names which might be needed for this message to be sent to a particular user
     * 
     * @returns {string[]} array of app user field names
     */
    get userFields() {
        return Message.userFieldsFor(this.contents);
    }

    /**
     * Get user fields used in a Content
     * 
     * @param {Content[]} contents array of Content instances
     * @param {boolean} deup remove leading 'up.'
     * @returns {string[]} array of app user field names
     */
    static userFieldsFor(contents, deup) {
        let keys = contents.map(content => Object.values(content.messagePers || {}).concat(Object.values(content.titlePers || {}))
            .map(obj => obj.k)
            .concat(content.extras || [])
            .map(Message.decodeFieldKey))
            .flat();
        if (deup) {
            keys = keys.map(f => {
                if (f.indexOf('up.') === 0) {
                    return f.substring(3);
                }
                else {
                    return f;
                }
            });
        }
        // if (contents.length > 1) { // commenting out for now because we always need locale now - for result subs
        if (keys.indexOf('la') === -1) {
            keys.push('la');
        }
        // }
        keys = keys.filter((k, i) => keys.indexOf(k) === i);
        return keys;
    }

    /**
     * Encode field key so it could be stored in mongo (replace dots with S - Separator)
     * 
     * @param {string} key field name
     * @returns {string} key with dots replaced by separator
     */
    static encodeFieldKey(key) {
        return key.replace(/\./g, S);
    }

    /**
     * Decode field key so it could be stored in mongo (replace dots with S - Separator)
     * 
     * @param {string} key with dots replaced by separator
     * @returns {string} original field name
     */
    static decodeFieldKey(key) {
        return key.replace(new RegExp(S_REGEXP, 'g'), '.');
    }

    /**
     * Getter for result
     * 
     * @returns {Result} Result object
     */
    get result() {
        return this._data.result;
    }

    /**
     * Setter for result
     * 
     * @param {Result} result Result object
     */
    set result(result) {
        if (result instanceof Result) {
            this._data.result = result;
        }
        else {
            delete this._data.result;
        }
    }

    /**
     * Getter for info
     * 
     * @returns {Info|undefined} info object
     */
    get info() {
        return this._data.info;
    }

    /**
     * Setter for info
     * 
     * @param {Info|undefined} info info object
     */
    set info(info) {
        if (info instanceof Info) {
            this._data.info = info;
        }
        else {
            delete this._data.info;
        }
    }

    /**
     * Whether this message needs to be scheduled
     */
    get needsScheduling() {
        return this.state === State.Created && this.triggers.filter(t => t.kind === TriggerKind.Plain &&
            (!t.delayed || (t.delayed && t.start.getTime() > Date.now() - 5 * 60000))).length > 0;
    }

    /**
     * Backwards-compatibility conversion of Note to Message
     * 
     * @deprecated
     * @param {object} note Note object
     * @returns {Message} Message instance
     */
    static fromNote(note) {
        const OldStatus = {
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

        let status, state, old = note.result.status;
        if (old & OldStatus.Done) {
            if (old & OldStatus.Error) {
                state = State.Done | State.Error;
                status = Status.Failed;
            }
            else if (old & OldStatus.Success) {
                state = State.Done;
                status = Status.Sent;
            }
        }
        else if (old & OldStatus.Sending) {
            state = State.Done;
            status = Status.Stopped;
        }
        else if (old & OldStatus.Scheduled) {
            if (note.tx || note.auto) {
                state = State.Streamable;
                status = Status.Scheduled;
            }
            else {
                state = State.Done;
                status = Status.Stopped;
            }
        }
        else if (old & OldStatus.Created) {
            if (note.tx || note.auto) {
                state = State.Done;
                status = Status.Inactive;
            }
            else {
                state = State.Done;
                status = Status.Stopped;
            }
        }
        else {
            state = State.Done;
            status = Status.Stopped;
        }

        if (old & OldStatus.Deleted) {
            state = State.Deleted;
            // keep status set above
        }

        return new Message({
            _id: note._id,
            app: note.apps[0],
            platforms: note.platforms,
            state,
            status,
            filter: Filter.fromNote(note),
            triggers: Trigger.fromNote(note),
            contents: Content.fromNote(note),
            result: Result.fromNote(note),
            info: Info.fromNote(note)
        });
    }

    /**
     * Generate test message with default content
     * 
     * @returns {Message} test message 
     */
    static test() {
        return new Message({
            _id: db.ObjectID(),
            app: db.ObjectID(),
            platforms: ['t'],
            state: State.Streamable,
            status: Status.Scheduled,
            filter: new Filter(),
            triggers: [new PlainTrigger({start: new Date()})],
            contents: [new Content({message: 'test'})],
            result: new Result(),
            info: new Info()
        });
    }

    /**
     * Create schedule job if needed for plain messages, put auto/api into streamable
     * 
     * @param {log} log logger
     */
    async schedule(log) {
        if (this.is(State.Streamable) || this.is(State.Streaming)) {
            await this.stop(log);
        }
        let plain = this.triggerPlain();
        if (plain && !this.is(State.Streamable)) {
            if (this.is(State.Stopped)) {
                await this.updateAtomically({_id: this._id, state: this.state}, {$set: {state: State.Created, status: Status.Created}});
            }
            let date = plain.delayed ? plain.start.getTime() - DEFAULTS.schedule_ahead : Date.now();
            await require('../../../../../api/parts/jobs').job('push:schedule', {mid: this._id, aid: this.app}).replace().once(date);
        }
        if (this.triggerAutoOrApi() && (this.is(State.Done) || this.state === State.Created)) {
            await this.updateAtomically({_id: this._id, state: this.state}, {$set: {state: State.Streamable | State.Created, status: Status.Scheduled}});
            await require('../../../../pluginManager').getPluginsApis().push.cache.write(this.id, this.json);
        }
    }

    /**
     * Remove job, clear queue and put message into inactive state
     * 
     * @param {log} log logger
     */
    async stop(log) {
        const { Audience } = require('../audience'),
            JOBS = require('../../../../../api/parts/jobs'),
            PLUGINS = require('../../../../pluginManager');

        let plain = this.triggerPlain(),
            auto = this.triggerAutoOrApi(),
            removed = 0,
            audience = new Audience(log, this);

        await audience.getApp();

        if (auto) {
            removed += await audience.pop(auto).clear();
        }
        else if (plain) {
            removed += await audience.pop(plain).clear();
        }

        await JOBS.cancel('push:schedule', {mid: this._id, aid: this.app});

        await this.updateAtomically({_id: this._id, state: this.state}, {$set: {state: State.Created | State.Done | State.Cleared, status: Status.Stopped}});

        if (auto) {
            await PLUGINS.getPluginsApis().push.cache.remove(this.id);
        }

        return removed;
    }
}

/**
 * A stub class to make use of Mongoable's batchInsert()
 */
class Push extends Mongoable {
    /**
     * Collection name for Mongoable
     */
    static get collection() {
        return 'push';
    }
}

module.exports = { Message, Push };