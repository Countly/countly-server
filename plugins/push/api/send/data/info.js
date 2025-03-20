const { toDate, Validatable } = require('./const');

/**
 * Message information (non-important stuff)
 */
class Info extends Validatable {
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
     * @param {string}      data.createdByName  full name of a user who created
     * @param {Date}        data.updated        date of last modification
     * @param {string}      data.updatedBy      user who modified last
     * @param {string}      data.updatedByName  full name of a user who modified this mesage last
     * @param {Date}        data.removed        date of deletion
     * @param {string}      data.removedBy      user who deleted this mesage
     * @param {string}      data.removedByName  full name of a user who deleted this mesage
     * @param {Date}        data.submitted       date of submission (push_approver plugin)
     * @param {string}      data.submittedBy     user who submitted (push_approver plugin)
     * @param {string}      data.submittedByName name of the user who submitted (push_approver plugin)
     * @param {Date}        data.approved       date of approval (push_approver plugin)
     * @param {string}      data.approvedBy     user who approved (push_approver plugin)
     * @param {string}      data.approvedByName name of the user who approved (push_approver plugin)
     * @param {Date}        data.rejectedAt     date of rejection (push_approver plugin)
     * @param {string}      data.rejectedBy     user who rejected (push_approver plugin)
     * @param {string}      data.rejectedByName name of the user who rejected (push_approver plugin)
     * @param {Date}        data.started        date of first sending start
     * @param {Date}        data.startedLast    date of last sending start
     * @param {Date}        data.finished       date of state being set to Done
     * @param {Boolean}     data.demo           true if this is a demo message
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
            createdBy: {type: 'ObjectID', required: false},
            createdByName: {type: 'String', required: false},
            updated: {type: 'Date', required: false},
            updatedBy: {type: 'ObjectID', required: false},
            updatedByName: {type: 'String', required: false},
            removed: {type: 'Date', required: false},
            removedBy: {type: 'ObjectID', required: false},
            removedByName: {type: 'String', required: false},
            submitted: {type: 'Date', required: false},
            submittedBy: {type: 'ObjectID', required: false},
            submittedByName: {type: 'String', required: false},
            approved: {type: 'Date', required: false},
            approvedBy: {type: 'ObjectID', required: false},
            approvedByName: {type: 'String', required: false},
            rejected: {type: 'Boolean', required: false},
            rejectedAt: {type: 'Date', required: false},
            rejectedBy: {type: 'ObjectID', required: false},
            rejectedByName: {type: 'String', required: false},
            started: {type: 'Date', required: false},
            startedLast: {type: 'Date', required: false},
            finished: {type: 'Date', required: false},
            demo: {type: 'Boolean', required: false},
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
     * Getter for removed
     * 
     * @returns {Date|undefined} date of last deletion
     */
    get removed() {
        return this._data.removed;
    }

    /**
     * Setter for removed
     * 
     * @param {Date|number|string|undefined} removed date of last deletion
     */
    set removed(removed) {
        if (removed !== null && removed !== undefined) {
            this._data.removed = toDate(removed);
        }
        else {
            delete this._data.removed;
        }
    }

    /**
     * Getter for removedBy
     * 
     * @returns {string|undefined} user who deleted
     */
    get removedBy() {
        return this._data.removedBy;
    }

    /**
     * Setter for removedBy
     * 
     * @param {string|undefined} removedBy user who deleted
     */
    set removedBy(removedBy) {
        if (removedBy !== null && removedBy !== undefined) {
            this._data.removedBy = removedBy;
        }
        else {
            delete this._data.removedBy;
        }
    }

    /**
     * Getter for removedByName
     * 
     * @returns {string|undefined} user who deleted
     */
    get removedByName() {
        return this._data.removedByName;
    }

    /**
     * Setter for removedByName
     * 
     * @param {string|undefined} removedByName user who deleted
     */
    set removedByName(removedByName) {
        if (removedByName !== null && removedByName !== undefined) {
            this._data.removedByName = removedByName;
        }
        else {
            delete this._data.removedByName;
        }
    }

    /**
     * Getter for submitted
     * 
     * @returns {Date|undefined} date of approval (push_approver plugin)
     */
    get submitted() {
        return this._data.submitted;
    }

    /**
     * Setter for submitted
     * 
     * @param {Date|number|string|undefined} submitted date of approval (push_approver plugin)
     */
    set submitted(submitted) {
        if (submitted !== null && submitted !== undefined) {
            this._data.submitted = toDate(submitted);
        }
        else {
            delete this._data.submitted;
        }
    }

    /**
     * Getter for submittedBy
     * 
     * @returns {string|undefined} user who submitted (push_approver plugin)
     */
    get submittedBy() {
        return this._data.submittedBy;
    }

    /**
     * Setter for submittedBy
     * 
     * @param {string|undefined} submittedBy user who submitted (push_approver plugin)
     */
    set submittedBy(submittedBy) {
        if (submittedBy !== null && submittedBy !== undefined) {
            this._data.submittedBy = submittedBy;
        }
        else {
            delete this._data.submittedBy;
        }
    }

    /**
     * Getter for submittedByName
     * 
     * @returns {string|undefined} user who submitted (push_approver plugin)
     */
    get submittedByName() {
        return this._data.submittedByName;
    }

    /**
     * Setter for submittedByName
     * 
     * @param {string|undefined} submittedByName user who submitted (push_approver plugin)
     */
    set submittedByName(submittedByName) {
        if (submittedByName !== null && submittedByName !== undefined) {
            this._data.submittedByName = submittedByName;
        }
        else {
            delete this._data.submittedByName;
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
     * Getter for rejected
     * 
     * @returns {boolean|undefined} message rejected
     */
    get rejected() {
        return this._data.rejected;
    }

    /**
     * Setter for rejected
     * 
     * @param {boolean|undefined} rejected message rejected
     */
    set rejected(rejected) {
        if (typeof rejected === 'boolean') {
            this._data.rejected = rejected;
        }
        else {
            delete this._data.rejected;
        }
    }

    /**
     * Getter for rejected
     * 
     * @returns {Date|undefined} date of approval (push_approver plugin)
     */
    get rejectedAt() {
        return this._data.rejectedAt;
    }

    /**
     * Setter for rejected
     * 
     * @param {Date|number|string|undefined} rejectedAt date of approval (push_approver plugin)
     */
    set rejectedAt(rejectedAt) {
        if (rejectedAt !== null && rejectedAt !== undefined) {
            this._data.rejectedAt = toDate(rejectedAt);
        }
        else {
            delete this._data.rejectedAt;
        }
    }

    /**
     * Getter for rejectedBy
     * 
     * @returns {string|undefined} user who rejected (push_approver plugin)
     */
    get rejectedBy() {
        return this._data.rejectedBy;
    }

    /**
     * Setter for rejectedBy
     * 
     * @param {string|undefined} rejectedBy user who rejected (push_approver plugin)
     */
    set rejectedBy(rejectedBy) {
        if (rejectedBy !== null && rejectedBy !== undefined) {
            this._data.rejectedBy = rejectedBy;
        }
        else {
            delete this._data.rejectedBy;
        }
    }

    /**
     * Getter for rejectedByName
     * 
     * @returns {string|undefined} user who rejected (push_approver plugin)
     */
    get rejectedByName() {
        return this._data.rejectedByName;
    }

    /**
     * Setter for rejectedByName
     * 
     * @param {string|undefined} rejectedByName user who rejected (push_approver plugin)
     */
    set rejectedByName(rejectedByName) {
        if (rejectedByName !== null && rejectedByName !== undefined) {
            this._data.rejectedByName = rejectedByName;
        }
        else {
            delete this._data.rejectedByName;
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
     * Getter for demo
     * 
     * @returns {boolean|undefined} message demo
     */
    get demo() {
        return this._data.demo;
    }

    /**
     * Setter for demo
     * 
     * @param {boolean|undefined} demo message demo
     */
    set demo(demo) {
        if (demo !== null && demo !== undefined) {
            this._data.demo = demo;
        }
        else {
            delete this._data.demo;
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