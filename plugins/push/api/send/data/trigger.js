'use strict';

const { PushError } = require('./error'),
    { toDate, TriggerKind, Validatable } = require('./const');

/**
 * Base clsss for message triggers
 */
class Trigger extends Validatable {
    /**
     * Constructor
     * 
     * @param {object}          data        filter data
     * @param {Date|number}     data.start  message start date
     */
    constructor(data) {
        super(data);
        if (!(this instanceof Trigger)) {
            throw new PushError('Trigger must be constructed with new');
        }
        else if (data instanceof Trigger) {
            return data;
        }

        if (!data.kind || Object.values(TriggerKind).indexOf(data.kind) === -1) {
            throw new PushError('Trigger must have a valid kind');
        }

        this._data = data;
    }

    /**
     * Class validation rules
     */
    static get scheme() {
        return {
            kind: {type: 'String', in: Object.values(TriggerKind)},
            start: {type: 'Date', required: true}
        };
    }

    /**
     * Class validation rules
     */
    get kind() {
        return this._data.kind;
    }

    /**
     * Get start date
     * 
     * @returns {Date|undefined} start date
     */
    get start() {
        return toDate(this._data.start);
    }

    /**
     * Set start date
     * 
     * @param {Date|number}  start  message start date
     */
    set start(start) {
        if (start) {
            this._data.start = toDate(start);
        }
        else {
            delete this._data.start;
        }
    }

    /**
     * Construct an appropriate trigger from given data or throw a PushError if data is invalid
     * 
     * @param {object} data trigger data
     * @returns {Trigger} Trigger subclass instance
     */
    static from(data) {
        if (data instanceof Trigger) {
            return data;
        }
        else if (data.kind === TriggerKind.Plain) {
            return new PlainTrigger(data);
        }
        else if (data.kind === TriggerKind.Event) {
            return new EventTrigger(data);
        }
        else if (data.kind === TriggerKind.Cohort) {
            return new CohortTrigger(data);
        }
        else if (data.kind === TriggerKind.API) {
            return new APITrigger(data);
        }
        else if (data.kind === TriggerKind.Recurring) {
            return new RecurringTrigger(data);
        }
        else if (data.kind === TriggerKind.Multi) {
            return new MultiTrigger(data);
        }
        else {
            throw new PushError(`Invalid trigger kind ${data.kind}`);
        }
    }

    /**
     * Backwards-compatibility conversion of Note to Trigger
     * 
     * @deprecated
     * @param {object} note Note object
     * @returns {Trigger[]} Trigger subclass instance
     */
    static fromNote(note) {
        if (!(note instanceof require('../../parts/note').Note)) {
            throw new PushError('fromNote supports only Note instance argument');
        }

        if (note.tx) {
            return [new APITrigger({
                start: note.date,
            })];
        }
        else if (note.auto) {
            if (note.autoOnEntry === 'events') {
                return [new EventTrigger({
                    start: note.date,
                    end: note.autoEnd,
                    actuals: note.actualDates,
                    time: note.autoTime,
                    reschedule: false,
                    delay: note.autoDelay,
                    cap: note.autoCapMessages,
                    sleep: note.autoCapSleep,
                    events: note.autoEvents,
                })];
            }
            else {
                return [new CohortTrigger({
                    start: note.date,
                    end: note.autoEnd,
                    actuals: note.actualDates,
                    time: note.autoTime,
                    cancels: note.autoCancelTrigger,
                    reschedule: false,
                    delay: note.autoDelay,
                    cap: note.autoCapMessages,
                    sleep: note.autoCapSleep,
                    cohorts: note.autoCohorts,
                    entry: note.autoOnEntry,
                })];
            }
        }
        else {
            return [new PlainTrigger({
                start: note.date,
                delayed: note.delayed,
                tz: typeof note.tz === 'number' ? true : false,
                sctz: typeof note.tz === 'number' ? note.tz : undefined
            })];
        }
    }
}

/**
 * One-time message trigger
 */
class PlainTrigger extends Trigger {
    /**
     * Constructor
     * 
     * @param {object}              data        filter data
     * @param {boolean}             data.tz     in case tz = true, sctz is scheduler's timezone offset in minutes (GMT +3 is "-180")
     * @param {number}              data.sctz   scheduler's timezone offset in minutes (GMT +3 is "-180")
     * @param {boolean}             delayed     true if audience calculation should be done right before sending the message
     */
    constructor(data) {
        data.kind = TriggerKind.Plain;
        data.tz = data.tz || false;
        super(data);
    }

    /**
     * Class validation rules
     */
    static get scheme() {
        return Object.assign({}, super.scheme, {
            tz: {type: 'Boolean', required: false},
            sctz: {type: 'Number', required: false},
            delayed: {type: 'Boolean', required: false},
        });
    }

    /**
     * Getter for sctz
     * 
     * @returns {number|undefined} in case tz = true, this is scheduler's timezone offset in minutes (GMT +3 is "-180")
     */
    get sctz() {
        return this._data.sctz;
    }

    /**
     * Set scheduler's timezone offset, effectively setting `tz` prop as well
     * 
     * @param {number|undefined}  sctz  scheduler's timezone offset in seconds (GMT +3 = `-180`)
     */
    set sctz(sctz) {
        if (typeof sctz === 'number') {
            this._data.sctz = sctz;
            this._data.tz = true;
        }
        else {
            delete this._data.sctz;
            delete this._data.tz;
        }
    }

    /**
     * Getter for tz
     * Note that you don't set this field, but set `sctz` instead
     * 
     * @returns {boolean} true if the trigger is timezoned
     */
    get tz() {
        return typeof this._data.sctz === 'number';
    }

    /**
     * Getter for delayed
     * 
     * @returns {boolean|undefined} true if audience calculation is delayed
     */
    get delayed() {
        return this._data.delayed;
    }

    /**
     * Set delayed property
     * 
     * @param {boolean|undefined}  delayed  true if audience calculation should be delayed
     */
    set delayed(delayed) {
        if (typeof delayed === 'boolean') {
            this._data.delayed = delayed;
        }
        else {
            delete this._data.delayed;
        }
    }
}

/**
 * Automated trigger
 */
class AutoTrigger extends Trigger {
    /**
     * Constructor
     * 
     * @param {object|null}     data            filter data
     * @param {Date}            data.end        message end date (don't send anything after this date, set status to Stopped)
     * @param {boolean}         data.actuals    whether to use server calculation date (false) or event/cohort entry date for scheduling (true)
     * @param {number}          data.time       time (milliseconds since 00:00) when to send in user's timezone
     * @param {boolean}         data.reschedule allow rescheduling to next day when sending on "time" is not an option
     * @param {number}          data.delay      delay sending this much seconds after the trigger
     * @param {number}          data.cap        send maximum this much messages
     * @param {number}          data.sleep      minimum time in ms between 2 messages
     */
    constructor(data) {
        super(data);
    }

    /**
     * Class validation rules
     */
    static get scheme() {
        return Object.assign({}, super.scheme, {
            end: {type: 'Date', required: false},
            actuals: {type: 'Boolean', required: false},
            time: {type: 'Number', required: false},
            reschedule: {type: 'Boolean', required: false},
            delay: {type: 'Number', required: false},
            cap: {type: 'Number', required: false},
            sleep: {type: 'Number', required: false},
        });
    }

    /**
     * Get end date
     * 
     * @returns {Date|undefined} end date
     */
    get end() {
        return this._data.end ? toDate(this._data.end) : undefined;
    }

    /**
     * Set end date
     * 
     * @param {Date|number|undefined}  end  message end date
     */
    set end(end) {
        if (end) {
            this._data.end = toDate(end);
        }
        else {
            delete this._data.end;
        }
    }

    /**
     * Getter for actuals
     * 
     * @returns {boolean} whether to use event/cohort time instead of server calculation time
     */
    get actuals() {
        return this._data.actuals || false;
    }

    /**
     * Setter for actuals
     * 
     * @param {boolean|undefined} actuals whether to use event/cohort time instead of server calculation time
     */
    set actuals(actuals) {
        if (actuals !== null && actuals !== undefined) {
            this._data.actuals = actuals;
        }
        else {
            delete this._data.actuals;
        }
    }

    /**
     * Getter for time
     * 
     * @returns {number|undefined} time (seconds since 00:00) when to send in user's timezone
     */
    get time() {
        return this._data.time;
    }

    /**
     * Setter for time
     * 
     * @param {number|undefined} time time (seconds since 00:00) when to send in user's timezone
     */
    set time(time) {
        if (time !== null && time !== undefined) {
            this._data.time = time;
        }
        else {
            delete this._data.time;
        }
    }

    /**
     * Getter for reschedule
     * 
     * @returns {boolean} allow rescheduling to next day when sending on "time" is not an option
     */
    get reschedule() {
        return this._data.reschedule || false;
    }

    /**
     * Setter for reschedule
     * 
     * @param {boolean|undefined} reschedule allow rescheduling to next day when sending on "time" is not an option
     */
    set reschedule(reschedule) {
        if (reschedule !== null && reschedule !== undefined) {
            this._data.reschedule = reschedule;
        }
        else {
            delete this._data.reschedule;
        }
    }

    /**
     * Getter for delay
     * 
     * @returns {number|undefined} delay sending this much seconds after the trigger date
     */
    get delay() {
        return this._data.delay;
    }

    /**
     * Setter for delay
     * 
     * @param {number|undefined} delay delay sending this much seconds after the trigger date
     */
    set delay(delay) {
        if (delay !== null && delay !== undefined) {
            this._data.delay = delay;
        }
        else {
            delete this._data.delay;
        }
    }

    /**
     * Getter for cap
     * 
     * @returns {number|undefined} send maximum this much messages
     */
    get cap() {
        return this._data.cap;
    }

    /**
     * Setter for cap
     * 
     * @param {number|undefined} cap send maximum this much messages
     */
    set cap(cap) {
        if (cap !== null && cap !== undefined) {
            this._data.cap = cap;
        }
        else {
            delete this._data.cap;
        }
    }

    /**
     * Getter for sleep
     * 
     * @returns {number|undefined} minimum time in ms between 2 messages
     */
    get sleep() {
        return this._data.sleep;
    }

    /**
     * Setter for sleep
     * 
     * @param {number|undefined} sleep minimum time in ms between 2 messages
     */
    set sleep(sleep) {
        if (sleep !== null && sleep !== undefined) {
            this._data.sleep = sleep;
        }
        else {
            delete this._data.sleep;
        }
    }
}

/**
 * On-event message trigger
 */
class EventTrigger extends AutoTrigger {
    /**
     * Constructor
     * 
     * @param {object|null}     data            filter data
     * @param {string[]}        data.events     set of triggering event keys
     */
    constructor(data) {
        data.kind = TriggerKind.Event;
        super(data);
    }

    /**
     * Class validation rules
     */
    static get scheme() {
        return Object.assign({}, super.scheme, {
            events: {type: 'String[]', required: true, 'min-length': 1},
        });
    }

    /**
     * Getter for events
     * 
     * @returns {string[]|undefined} array/set of triggering event keys
     */
    get events() {
        return this._data.events;
    }

    /**
     * Setter for events
     * 
     * @param {string[]|undefined} events array/set of triggering event keys
     */
    set events(events) {
        if (Array.isArray(events)) {
            this._data.events = Array.from(new Set(events));
        }
        else {
            delete this._data.events;
        }
    }

    /**
     * Add event key to the set
     * 
     * @param {string} key event key to push
     */
    push(key) {
        if (!this._data.events) {
            this._data.events = [];
        }
        if (this._data.events.indexOf(key) === -1) {
            this._data.events.push(key);
        }
    }

    /**
     * Remove event key from the set
     * 
     * @param {string} key event key to push
     */
    pop(key) {
        if (!this._data.events) {
            this._data.events = [];
        }
        if (this._data.events && this._data.events.indexOf(key) !== -1) {
            this._data.events.splice(this._data.events.indexOf(key), 1);
        }
    }
}

/**
 * On-cohort message trigger
 */
class CohortTrigger extends AutoTrigger {
    /**
     * Constructor
     * 
     * @param {object|null}     data            filter data
     * @param {string[]}        data.cohorts    array of triggering cohort ids
     * @param {boolean}         data.entry      trigger on cohrot entry (true) or exit (false)
     * @param {boolean}         data.cancels    whether to remove notification from queue on trigger inversion (when user exits cohort for entry = true and vice versa)
     */
    constructor(data) {
        data.kind = TriggerKind.Cohort;
        super(data);
    }

    /**
     * Class validation rules
     */
    static get scheme() {
        return Object.assign({}, super.scheme, {
            cohorts: {type: 'String[]', required: true, 'min-length': 1},
            entry: {type: 'Boolean', required: false},
            cancels: {type: 'Boolean', required: false},
        });
    }

    /**
     * Getter for cohorts
     * 
     * @returns {string[]|undefined} array/set of triggering cohort ids
     */
    get cohorts() {
        return this._data.cohorts;
    }

    /**
     * Setter for cohorts
     * 
     * @param {string[]|undefined} cohorts array/set of triggering cohort ids
     */
    set cohorts(cohorts) {
        if (Array.isArray(cohorts)) {
            this._data.cohorts = Array.from(new Set(cohorts));
        }
        else {
            delete this._data.cohorts;
        }
    }

    /**
     * Add cohort id to the set
     * 
     * @param {string} id cohort id to push
     */
    push(id) {
        if (!this._data.cohorts) {
            this._data.cohorts = [];
        }
        if (this._data.cohorts.indexOf(id) === -1) {
            this._data.cohorts.push(id);
        }
    }

    /**
     * Remove cohort id from the set
     * 
     * @param {string} id cohort id to push
     */
    pop(id) {
        if (!this._data.cohorts) {
            this._data.cohorts = [];
        }
        if (this._data.cohorts && this._data.cohorts.indexOf(id) !== -1) {
            this._data.cohorts.splice(this._data.cohorts.indexOf(id), 1);
        }
    }

    /**
     * Getter for entry
     * 
     * @returns {boolean} trigger on cohrot entry (true) or exit (false)
     */
    get entry() {
        return this._data.entry || false;
    }

    /**
     * Setter for entry
     * 
     * @param {boolean|undefined} entry trigger on cohrot entry (true) or exit (false)
     */
    set entry(entry) {
        if (entry !== null && entry !== undefined) {
            this._data.entry = entry;
        }
        else {
            delete this._data.entry;
        }
    }

    /**
     * Getter for cancels
     * 
     * @returns {boolean} whether to remove notification from queue on trigger inversion (when user exits cohort for entry = true and vice versa)
     */
    get cancels() {
        return this._data.cancels || false;
    }

    /**
     * Setter for cancels
     * 
     * @param {boolean|undefined} cancels whether to remove notification from queue on trigger inversion (when user exits cohort for entry = true and vice versa)
     */
    set cancels(cancels) {
        if (cancels !== null && cancels !== undefined) {
            this._data.cancels = cancels;
        }
        else {
            delete this._data.cancels;
        }
    }
}

/**
 * API (transactional) message trigger
 */
class APITrigger extends AutoTrigger {
    /**
     * Constructor
     * 
     * @param {object|null} data filter data
     */
    constructor(data) {
        data.kind = TriggerKind.API;
        super(data);
    }
}

/**
 * Recurring trigger
 */
class RecurringTrigger extends Trigger {
    /**
     * Constructor
     * 
     * @param {object|null} data filter data
     */
    constructor(data) {
        data.kind = TriggerKind.Recurring;
        super(data);
    }
}

/**
 * Multi trigger
 */
class MultiTrigger extends Trigger {
    /**
     * Constructor
     * 
     * @param {object|null} data filter data
     */
    constructor(data) {
        data.kind = TriggerKind.Multi;
        super(data);
    }
}

module.exports = { Trigger, TriggerKind, PlainTrigger, EventTrigger, CohortTrigger, APITrigger, RecurringTrigger, MultiTrigger };