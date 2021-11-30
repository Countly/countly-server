const { toDate, Jsonable } = require('./const');

/**
 * Message information (non-important stuff)
 */
class Info extends Jsonable {
    /**
     * 
     * @param {object}      data                message info data
     * @param {string}      data.title          message title if any
     * @param {string}      data.appName        app name
     * @param {boolean}     data.silent         silent message switch, UI-only
     * @param {boolean}     data.scheduled      whether message was scheduled for future date, UI-only
     * @param {object}      data.locales        locales object ({en: .3, de: 0.01, fr: 0.5})
     * @param {Date}        data.created        date of creation
     * @param {string}      data.createdBy      user who created
     * @param {Date}        data.updated        date of last modification
     * @param {string}      data.updatedBy      user who modified last
     * @param {Date}        data.approved       date of approval (push_approver plugin)
     * @param {string}      data.approvedBy     user who approved (push_approver plugin)
     * @param {Date}        data.started        date of first sending start
     * @param {Date}        data.startedLast    date of last sending start
     * @param {Date}        data.finished       date of state being set to Done
     */
    constructor(data) {
        super(data);
    }

    /**
     * Validation scheme for common.validateArgs
     */
    static get scheme() {
        return {
            title: {type: 'String', required: false},
            appName: {type: 'String', required: false},
            silent: {type: 'Boolean', required: false},
            scheduled: {type: 'Boolean', required: false},
            locales: {type: 'Object', required: false},
            created: {type: 'Date', required: false},
            createdBy: {type: 'String', required: false},
            createdByName: {type: 'String', required: false},
            updated: {type: 'Date', required: false},
            updatedBy: {type: 'String', required: false},
            updatedByName: {type: 'String', required: false},
            approved: {type: 'Date', required: false},
            approvedBy: {type: 'String', required: false},
            approvedByName: {type: 'String', required: false},
            started: {type: 'Date', required: false},
            startedLast: {type: 'Date', required: false},
            finished: {type: 'Date', required: false},
        };
    }

    /**
     * Getter for title
     * 
     * @returns {string|undefined} message title
     */
    get title() {
        return this._data.title;
    }

    /**
     * Setter for title
     * 
     * @param {string|undefined} title message title
     */
    set title(title) {
        if (title !== null && title !== undefined) {
            this._data.title = title;
        }
        else {
            delete this._data.title;
        }
    }

    /**
     * Getter for appName
     * 
     * @returns {string|undefined} message appName
     */
    get appName() {
        return this._data.appName;
    }

    /**
     * Setter for appName
     * 
     * @param {string|undefined} appName message appName
     */
    set appName(appName) {
        if (appName !== null && appName !== undefined) {
            this._data.appName = appName;
        }
        else {
            delete this._data.appName;
        }
    }

    /**
     * Getter for silent
     * 
     * @returns {string|undefined} message silent
     */
    get silent() {
        return this._data.silent;
    }

    /**
     * Setter for silent
     * 
     * @param {string|undefined} silent message silent
     */
    set silent(silent) {
        if (silent !== null && silent !== undefined) {
            this._data.silent = silent;
        }
        else {
            delete this._data.silent;
        }
    }

    /**
     * Getter for scheduled
     * 
     * @returns {string|undefined} message scheduled
     */
    get scheduled() {
        return this._data.scheduled;
    }

    /**
     * Setter for scheduled
     * 
     * @param {string|undefined} scheduled message scheduled
     */
    set scheduled(scheduled) {
        if (scheduled !== null && scheduled !== undefined) {
            this._data.scheduled = scheduled;
        }
        else {
            delete this._data.scheduled;
        }
    }

    /**
     * Getter for locales
     * 
     * @returns {object|undefined} message locales
     */
    get locales() {
        return this._data.locales;
    }

    /**
     * Setter for locales
     * 
     * @param {object|undefined} locales message locales
     */
    set locales(locales) {
        if (locales !== null && locales !== undefined) {
            this._data.locales = locales;
        }
        else {
            delete this._data.locales;
        }
    }

    /**
     * Getter for created
     * 
     * @returns {Date|undefined} date of creation
     */
    get created() {
        return this._data.created;
    }

    /**
     * Setter for created
     * 
     * @param {Date|number|string|undefined} created date of creation
     */
    set created(created) {
        if (created !== null && created !== undefined) {
            this._data.created = toDate(created);
        }
        else {
            delete this._data.created;
        }
    }

    /**
     * Getter for createdBy
     * 
     * @returns {string|undefined} user who created the message
     */
    get createdBy() {
        return this._data.createdBy;
    }

    /**
     * Setter for createdBy
     * 
     * @param {string|undefined} createdBy user who created the message
     */
    set createdBy(createdBy) {
        if (createdBy !== null && createdBy !== undefined) {
            this._data.createdBy = createdBy;
        }
        else {
            delete this._data.createdBy;
        }
    }

    /**
     * Getter for createdBy
     * 
     * @returns {string|undefined} user who created the message
     */
    get createdByName() {
        return this._data.createdByName;
    }

    /**
     * Setter for createdByName
     * 
     * @param {string|undefined} createdByName user who created the message
     */
    set createdByName(createdByName) {
        if (createdByName !== null && createdByName !== undefined) {
            this._data.createdByName = createdByName;
        }
        else {
            delete this._data.createdByName;
        }
    }

    /**
     * Getter for updated
     * 
     * @returns {Date|undefined} date of last modification
     */
    get updated() {
        return this._data.updated;
    }

    /**
     * Setter for updated
     * 
     * @param {Date|number|string|undefined} updated date of last modification
     */
    set updated(updated) {
        if (updated !== null && updated !== undefined) {
            this._data.updated = toDate(updated);
        }
        else {
            delete this._data.updated;
        }
    }

    /**
     * Getter for updatedBy
     * 
     * @returns {string|undefined} user who modified last
     */
    get updatedBy() {
        return this._data.updatedBy;
    }

    /**
     * Setter for updatedBy
     * 
     * @param {string|undefined} updatedBy user who modified last
     */
    set updatedBy(updatedBy) {
        if (updatedBy !== null && updatedBy !== undefined) {
            this._data.updatedBy = updatedBy;
        }
        else {
            delete this._data.updatedBy;
        }
    }

    /**
     * Getter for updatedByName
     * 
     * @returns {string|undefined} user who modified last
     */
    get updatedByName() {
        return this._data.updatedByName;
    }

    /**
     * Setter for updatedByName
     * 
     * @param {string|undefined} updatedByName user who modified last
     */
    set updatedByName(updatedByName) {
        if (updatedByName !== null && updatedByName !== undefined) {
            this._data.updatedByName = updatedByName;
        }
        else {
            delete this._data.updatedByName;
        }
    }

    /**
     * Getter for approved
     * 
     * @returns {Date|undefined} date of approval (push_approver plugin)
     */
    get approved() {
        return this._data.approved;
    }

    /**
     * Setter for approved
     * 
     * @param {Date|number|string|undefined} approved date of approval (push_approver plugin)
     */
    set approved(approved) {
        if (approved !== null && approved !== undefined) {
            this._data.approved = toDate(approved);
        }
        else {
            delete this._data.approved;
        }
    }

    /**
     * Getter for approvedBy
     * 
     * @returns {string|undefined} user who approved (push_approver plugin)
     */
    get approvedBy() {
        return this._data.approvedBy;
    }

    /**
     * Setter for approvedBy
     * 
     * @param {string|undefined} approvedBy user who approved (push_approver plugin)
     */
    set approvedBy(approvedBy) {
        if (approvedBy !== null && approvedBy !== undefined) {
            this._data.approvedBy = approvedBy;
        }
        else {
            delete this._data.approvedBy;
        }
    }

    /**
     * Getter for approvedByName
     * 
     * @returns {string|undefined} user who approved (push_approver plugin)
     */
    get approvedByName() {
        return this._data.approvedByName;
    }

    /**
     * Setter for approvedByName
     * 
     * @param {string|undefined} approvedByName user who approved (push_approver plugin)
     */
    set approvedByName(approvedByName) {
        if (approvedByName !== null && approvedByName !== undefined) {
            this._data.approvedByName = approvedByName;
        }
        else {
            delete this._data.approvedByName;
        }
    }

    /**
     * Getter for started
     * 
     * @returns {Date|undefined} date of first sending start
     */
    get started() {
        return this._data.started;
    }

    /**
     * Setter for started
     * 
     * @param {Date|number|string|undefined} started date of first sending start
     */
    set started(started) {
        if (started !== null && started !== undefined) {
            this._data.started = toDate(started);
        }
        else {
            delete this._data.started;
        }
    }

    /**
     * Getter for startedLast
     * 
     * @returns {Date|undefined} date of last sending start
     */
    get startedLast() {
        return this._data.startedLast;
    }

    /**
     * Setter for startedLast
     * 
     * @param {Date|number|string|undefined} startedLast date of last sending start
     */
    set startedLast(startedLast) {
        if (startedLast !== null && startedLast !== undefined) {
            this._data.startedLast = toDate(startedLast);
        }
        else {
            delete this._data.startedLast;
        }
    }

    /**
     * Getter for finished
     * 
     * @returns {Date|undefined} date of state being set to Done
     */
    get finished() {
        return this._data.finished;
    }

    /**
     * Setter for finished
     * 
     * @param {Date|undefined} finished date of state being set to Done
     */
    set finished(finished) {
        if (finished !== null && finished !== undefined) {
            this._data.finished = toDate(finished);
        }
        else {
            delete this._data.finished;
        }
    }

    /**
     * Backwards-compatibility conversion of Note to Info
     * 
     * @deprecated
     * @param {object} note Note object
     * @returns {Info} Info instance
     */
    static fromNote(note) {
        return new Info({
            created: note.created,
            createdBy: note.creator,
            approvedBy: note.approver,
        });
    }

}


module.exports = { Info };