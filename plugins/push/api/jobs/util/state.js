const EventEmitter = require("events"),
    { Message } = require('../../send');

/**
 * Data object shared across streams to hold state
 */
class State extends EventEmitter {
    /**
     * Constructor
     * 
     * @param {object} opts general push plugin config options
     */
    constructor(opts) {
        super();

        // objects here have form of {_id: object}
        this._apps = {};
        this._messages = {};
        // this._credentials = {};
        this._pushes = {};
        this._sending = {};
        this._cfg = Object.assign({
            pool: {
                bytes: 100000,
                workers: 10
            }
        }, opts || {});
    }

    /**
     * Plugin configuration
     */
    get cfg() {
        return this._cfg;
    }

    /**
     * Getter for pushes
     */
    get pushes() {
        return this._pushes;
    }

    /**
     * Get app by id
     * 
     * @param {string|ObjectID} id app id
     * @returns {object|undefined} app object
     */
    app(id) {
        return this._apps[id];
    }

    /**
     * Set app
     * 
     * @param {object} app app object
     */
    setApp(app) {
        if (!this._apps[app._id]) {
            this.emit('app', app);
        }
        this._apps[app._id] = app;
    }

    /**
     * Discard app
     * 
     * @param {string|ObjectID} id app id
     */
    discardApp(id) {
        this._apps[id] = false;
    }

    /**
     * Check if app is discarded
     * 
     * @param {string|ObjectID} id app id
     * @returns {boolean} true if discarded
     */
    isAppDiscarded(id) {
        return this._apps[id] === false;
    }

    /**
     * Get message by id
     * 
     * @param {string|ObjectID} id message id
     * @returns {object|undefined} message object
     */
    message(id) {
        return this._messages[id];
    }

    /**
     * Get array of stored messages
     * 
     * @returns {Message[]} array of messages
     */
    messages() {
        return Object.values(this._messages).filter(m => !!m);
    }

    /**
     * Set message
     * 
     * @param {object} message message object
     */
    setMessage(message) {
        if (!(message instanceof Message)) {
            message = new Message(message);
        }
        if (!(message._id in this._messages)) {
            this.emit('message', message);
        }
        this._messages[message._id] = message;
    }

    /**
     * Discard message
     * 
     * @param {string|ObjectID} id message id
     */
    discardMessage(id) {
        this._messages[id] = false;
    }

    /**
     * Check if message is discarded
     * 
     * @param {string|ObjectID} id message id
     * @returns {boolean} true if discarded
     */
    isMessageDiscarded(id) {
        return this._messages[id] === false;
    }

    /**
     * Increment sending counter for given message id
     * 
     * @param {string|ObjectID} id message id
     */
    incSending(id) {
        this._sending[id] = (this._sending[id] || 0) + 1;
    }

    /**
     * Decrement sending counter for given message id
     * 
     * @param {string|ObjectID} id message id
     * @param {int} count decrement
     */
    decSending(id, count = 1) {
        this._sending[id] = (this._sending[id] || 0) - count;
    }

    /**
     * Check if some pushes are still in processing
     * 
     * @param {string|ObjectID} id message id
     * @returns {boolean} true if there're pushes in processing
     */
    isSending(id) {
        return this._sending[id] > 0;
    }

    // /**
    //  * Get credentials by id
    //  * 
    //  * @param {string|ObjectID} id credentials id
    //  * @returns {object|undefined} credentials object
    //  */
    // credentials(id) {
    //     return this._credentials[id];
    // }

    // /**
    //  * Add credentials
    //  * 
    //  * @param {object} credentials credentials object
    //  */
    // addCredentials(credentials) {
    //     this._credentials[credentials._id] = credentials;
    //     this.emit('credentials', credentials);
    // }

    // /**
    //  * Discard credentials
    //  * 
    //  * @param {string|ObjectID} id credentials id
    //  */
    // discardCredentials(id) {
    //     this._credentials[id] = false;
    // }

    // /**
    //  * Check if credentials is discarded
    //  * 
    //  * @param {string|ObjectID} id credentials id
    //  * @returns {boolean} true if discarded
    //  */
    // isCredentialsDiscarded(id) {
    //     return this._credentials[id] === false;
    // }
}

module.exports = { State };