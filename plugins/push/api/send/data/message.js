'use strict';

const { State, Status, STATUSES, Jsonable } = require('./const'),
    { Filter } = require('./filter'),
    { Content } = require('./content'),
    { Trigger } = require('./trigger'),
    { Results } = require('./results'),
    { Info } = require('./info');

/**
 * Message class encapsulating all the message-related data
 */
class Message extends Jsonable {
    /**
     * Construct new Message
     * 
     * @param {object|null}         data            message data
     * @param {string|ObjectID}     data._id        message id
     * @param {ObjectID}            data.app        app id
     * @param {array}               data.platforms  array of platform keys
     * @param {BigInt}              data.state      internal message state
     * @param {string}              data.status     user-facing message status
     * @param {object|Filter}       data.filter     user selection filter
     * @param {object[]|Trigger[]}  data.triggers   triggers of this message
     * @param {object|Content[]}    data.contents   message contents array: {lang: 'default'} is required, any other overrides default one
     * @param {object|Results}      data.results    sending results
     * @param {object|Info}         data.info       info object
     */
    constructor(data) {
        super(data);

        this._data.state = this._data.state || State.Created; // status is not set until message is created
        if (!(this._data.filter instanceof Filter)) {
            this._data.filter = new Filter(this._data.filter);
        }
        if (!(this._data.results instanceof Results)) {
            this._data.results = new Results(this._data.results);
        }
        if (!(this._data.info instanceof Info)) {
            this._data.info = new Info(this._data.info);
        }
        this._data.triggers = (this._data.triggers || []).map(Trigger.from);
        this._data.contents = (this._data.contents || []).map(c => c instanceof Content ? c : new Content(c));
    }

    /**
     * Getter for id
     * 
     * @returns {ObjectID|string|undefined} message id
     */
    get id() {
        return this._data._id;
    }

    /**
     * Setter for id
     * 
     * @param {ObjectID|string|undefined} id message id
     */
    set id(id) {
        if (id !== null && id !== undefined) {
            this._data._id = id;
        }
        else {
            delete this._data._id;
        }
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
     * @param {string[]|undefined} platforms platforms array
     */
    set platforms(platforms) {
        if (Array.isArray(platforms)) {
            this._data.platforms = platforms;
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
        return this._data.triggers;
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
     * Get Content instance by p & l given. `content()` returns default content.
     * 
     * @param {string} p platform key
     * @param {string} l language key
     * @returns {Content|undefined} Content instance if one with given p & l exists or undefined
     */
    content(p, l) {
        return this._data.contents.filter(c => c.p === p && c.l === l)[0];
    }

    /**
     * Getter for results
     * 
     * @returns {Results} Results object
     */
    get results() {
        return this._data.results;
    }

    /**
     * Setter for results
     * 
     * @param {Results} results Results object
     */
    set results(results) {
        if (results instanceof Results) {
            this._data.results = results;
        }
        else {
            delete this._data.results;
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

        let status = Status.Stopped, state = State.Done, old = note.result.status;
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
                state = State.Queued;
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
            results: Results.fromNote(note),
            info: Info.fromNote(note)
        });
    }
}

module.exports = { Message };