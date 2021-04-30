const { toDate, Jsonable } = require('./const');

/**
 * Message information (non-important stuff)
 */
class Info extends Jsonable {
    /**
     * 
     * @param {object}      data                message info data
     * @param {string}      data.title          message title if any
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