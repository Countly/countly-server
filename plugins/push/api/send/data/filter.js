'use strict';

const { Validatable } = require('./const');

/**
 * Class for storing and handling user filters
 */
class Filter extends Validatable {
    /**
     * Constructor
     * 
     * @param {object|null} data            filter data
     * @param {string}      data.user       app_userAPPID query
     * @param {string}      data.drill      drill query
     * @param {ObjectID[]}  data.geos       array of geo ids
     * @param {string[]}    data.cohorts    array of cohort ids
     */
    constructor(data) {
        super(data);
    }

    /**
     * Validation scheme for common.validateArgs
     */
    static get scheme() {
        return {
            user: { type: 'JSON', required: false, nonempty: true, custom: Filter.filterQueryValidator },
            drill: { type: 'JSON', required: false, nonempty: true, custom: Filter.filterQueryValidator },
            geos: { type: 'ObjectID[]', required: false, 'min-length': 1 },
            cohorts: { type: 'String[]', required: false, 'min-length': 1 },
        };
    }

    /**
     * Validator function for user & drill filter queries
     * 
     * @param {object} json filter object
     * @returns {string|undefined} error sting in case of validation error
     */
    static filterQueryValidator(json) {
        if (json === null || json === undefined) {
            return;
        }
        try {
            json = JSON.parse(json);
            if (typeof json !== 'object' || Array.isArray(json)) {
                return 'Filter user/drill must be a JSON string of an object';
            }
        }
        catch (ignored) {
            return 'Filter user/drill must be a valid JSON string of an object';
        }
    }

    /**
     * Check if this filter is empty
     * 
     * @returns {boolean} true if no filters is set
     */
    get isEmpty() {
        return !this._data.user && !this._data.drill && (!this._data.geos || !this._data.geos.length) && (!this._data.cohorts || !this._data.cohorts.length);
    }

    /**
     * Get user profile filter
     * 
     * @returns {object|undefined} filter object
     */
    get user() {
        return this._data.user ? JSON.parse(this._data.user) : undefined;
    }

    /**
     * Set user profile filter
     * 
     * @param {object|undefined} user filter object
     */
    set user(user) {
        if (user) {
            this._data.user = typeof user === 'object' ? JSON.stringify(user) : user;
        }
        else {
            delete this._data.user;
        }
    }

    /**
     * Get drill filter
     * 
     * @returns {object|undefined} filter object
     */
    get drill() {
        return this._data.drill ? JSON.parse(this._data.drill) : undefined;
    }

    /**
     * Set drill filter
     * 
     * @param {object|undefined} drill filter object
     */
    set drill(drill) {
        if (drill) {
            this._data.drill = typeof drill === 'object' ? JSON.stringify(drill) : drill;
        }
        else {
            delete this._data.drill;
        }
    }

    /**
     * Get geos
     */
    get geos() {
        return this._data.geos || [];
    }

    /**
     * Set geos
     * 
     * @param {ObjectID[]} geos geo ids array
     */
    set geos(geos) {
        this._data.geos = geos;
    }

    /**
     * Get cohorts
     * 
     * @returns {string[]|undefined} cohort ids array
     */
    get cohorts() {
        return this._data.cohorts || [];
    }

    /**
     * Set cohorts
     * 
     * @param {string[]|undefined} cohorts cohort ids array
     */
    set cohorts(cohorts) {
        this._data.cohorts = cohorts;
    }

    /**
     * Backwards-compatibility conversion of Note to Filter
     * 
     * @deprecated
     * @param {object} note Note object
     * @returns {Filter} Filter instance
     */
    static fromNote(note) {
        let filter = new Filter({geos: note.geos, cohorts: note.cohorts});
        if (note.userConditions) {
            filter.user = note.userConditions;
        }
        if (note.drillConditions) {
            filter.drill = note.drillConditions;
        }
        return filter;
    }
}

module.exports = { Filter };