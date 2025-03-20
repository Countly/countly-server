'use strict';

const { PushError, ValidationError } = require('./error'),
    { toDate, TriggerKind, Validatable, RecurringType, Time } = require('./const'),
    moment = require('moment');

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
     * Check if the trigger is rescheduleable
     */
    get isRescheduleable() {
        return this instanceof ReschedulingTrigger;
    }

    /**
     * Class validation rules
     */
    static get scheme() {
        return {
            kind: {type: 'String', in: Object.values(TriggerKind)},
            start: {type: 'Date', required: true},
            last: {type: 'Date', required: false},
        };
    }

    /**
     * Class validation rules for all trigger kinds
     * @param {object} data data to validate
     * @returns {object} trigger scheme for given data
     */
    static discriminator(data) {
        if (data.kind === TriggerKind.Cohort) {
            return CohortTrigger.scheme;
        }
        else if (data.kind === TriggerKind.Event) {
            return EventTrigger.scheme;
        }
        else if (data.kind === TriggerKind.API) {
            return APITrigger.scheme;
        }
        else if (data.kind === TriggerKind.Plain) {
            return PlainTrigger.scheme;
        }
        else if (data.kind === TriggerKind.Recurring) {
            return RecurringTrigger.scheme;
        }
        else if (data.kind === TriggerKind.Multi) {
            return MultiTrigger.scheme;
        }
        else {
            throw new ValidationError('Unsupported Trigger kind');
        }
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
        data.tz = typeof data.sctz === 'number' ? true : false;
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
            time: {type: 'Number', required: false, min: Time.MIN, max: Time.MAX},
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
 * Superclass for triggers which allow message to be scheduled again
 */
class ReschedulingTrigger extends Trigger {
    /**
     * Class validation rules
    */
    static get scheme() {
        return Object.assign({}, super.scheme, {
            tz: {type: 'Boolean', required: false},
            sctz: {type: 'Number', required: false},
            delayed: {type: 'Boolean', required: false},
            reschedule: {type: 'Boolean', required: false},
            last: {type: 'Date', required: false},
            prev: {type: 'Date', required: false},
        });
    }

    /**
     * Get prev reference date
     * 
     * @returns {Date|undefined} prev reference date
     */
    get prev() {
        return toDate(this._data.prev);
    }

    /**
     * Set prev reference date
     * 
     * @param {Date|number}  prev  message prev reference date
     */
    set prev(prev) {
        if (prev) {
            this._data.prev = toDate(prev);
        }
        else {
            delete this._data.prev;
        }
    }

    /**
     * Get last reference date
     * 
     * @returns {Date|undefined} last reference date
     */
    get last() {
        return toDate(this._data.last);
    }

    /**
     * Set last reference date
     * 
     * @param {Date|number}  last  message last reference date
     */
    set last(last) {
        if (last) {
            this._data.last = toDate(last);
        }
        else {
            delete this._data.last;
        }
    }

    /**
     * Calculate first reference date = date when a UTC user should receive this message
     * 
     * @returns {Date} first reference date
     */
    reference() {
        if (Math.random() < 2) {
            throw new Error('Must be overridden');
        }
        return new Date();
    }

    /**
     * Calculate next reference date = date when a UTC user should receive this message
     * 
     * @param {Date|null} previousReference previous reference date if any
     * @returns {Date} next reference date
     */
    nextReference(/*previousReference*/) {
        if (Math.random() < 2) {
            throw new Error('Must be overridden');
        }
        return null;
    }

    /**
     * Calculate next schedule job date
     * 
     * @param {Date} reference reference date
     * @returns {Date|null} date for next schedule job or null if no more reschedules is possible
     */
    scheduleDate(/*reference*/) {
        if (Math.random() < 2) {
            throw new Error('Must be overridden');
        }
        return null;
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

    /**
     * Getter for reschedule
     * 
     * @returns {boolean|undefined} true if notification should be rescheduled to next day if it cannot be sent on time
     */
    get reschedule() {
        return this._data.reschedule;
    }

    /**
     * Set reschedule property
     * 
     * @param {boolean|undefined}  reschedule  true if notification should be rescheduled to next day if it cannot be sent on time
     */
    set reschedule(reschedule) {
        if (typeof reschedule === 'boolean') {
            this._data.reschedule = reschedule;
        }
        else {
            delete this._data.reschedule;
        }
    }
}


/**
 * Recurring trigger
 */
class RecurringTrigger extends ReschedulingTrigger {
    /**
     * Constructor
     * 
     * @param {object|null} data filter data
     * @param {Date} data.end message end date (don't send anything after this date, set status to Stopped)
     * @param {string} data.bucket notification frequency ("daily", "weekly", "monthly")
     * @param {number} data.time time (milliseconds since 00:00) when to send in user's timezone
     * @param {string} data.every repetition indicator (every 7 days/weeks/months)
     * @param {Number[]} data.on repetition indicator (on 1-Monday, 2-Tuesday... or Day 1st, 2nd, 3rd... of month)
     * @param {boolean} data.sctz   in case tz = true, sctz is scheduler's timezone offset in minutes (GMT +3 is "-180")
     * @param {boolean} delayed     true if audience calculation should be done right before sending the message
     */
    constructor(data) {
        data.kind = TriggerKind.Recurring;
        super(data);
    }

    /**
     * Class validation rules
    */
    static get scheme() {
        return Object.assign({}, super.scheme, {
            sctz: {type: 'Number', required: true},
            end: {type: 'Date', required: false},
            bucket: {type: 'String', required: true, in: Object.values(RecurringType)},
            time: {type: 'Number', required: true, min: Time.MIN, max: Time.MAX},
            every: {type: 'Number', required: true},
            on: {type: 'Number[]', required: false},
        });
    }

    /**
     * Calculate first reference date = date when a UTC user should receive this message
     * 
     * @returns {Date} first reference date
     */
    reference() {
        let date = new Date(this.start.getTime() - this.sctz * 60000); // minimal reference date in UTC, TBD: what happens when day overflows here?
        date.setHours(Math.floor(this.time / 60 / 60000));
        date.setMinutes(Math.floor((this.time - date.getHours() * 60 * 60000) / 60000));
        date.setSeconds(0);
        date.setMilliseconds(0);

        if (this.bucket === RecurringType.Weekly) {
            let days = this.on.map(on => moment(date).locale('ru').day(on).toDate())
                .concat(this.on.map(on => moment(date).locale('ru').add(-1, 'weeks').day(on).toDate()))
                .concat(this.on.map(on => moment(date).locale('ru').add(1, 'weeks').day(on).toDate()));
            days = days.filter(d => d.getTime() >= this.start.getTime());
            days.sort((a, b) => a.getTime() > b.getTime() ? 1 : -1);
            date = days.shift();
            while (days.length && date && date.getTime() < this.start.getTime()) {
                date = days.shift();
            }
        }
        else if (this.bucket === RecurringType.Monthly) {
            let prevMonth = moment(date).add(-1, 'months'),
                nextMonth = moment(date).add(1, 'months'),
                daysInCurMonth = moment(date).add(1, 'months').date(1).add(-1, 'days').toDate(),
                daysInPrevMonth = prevMonth.add(1, 'months').date(1).add(-1, 'days').toDate(),
                daysInNextMonth = nextMonth.add(1, 'months').date(1).add(-1, 'days').toDate();

            let days = this.on.map(on => moment(date).date(on > 0 ? on : daysInCurMonth + on).toDate())
                .concat(this.on.map(on => prevMonth.date(on > 0 ? on : daysInPrevMonth + on).toDate()))
                .concat(this.on.map(on => nextMonth.date(on > 0 ? on : daysInNextMonth + on).toDate()))
                .filter(d => d.getTime() >= this.start.getTime());

            days.sort((a, b) => a.getTime() > b.getTime() ? 1 : -1);
            date = days.shift();
            while (days.length && date && date.getTime() < this.start.getTime()) {
                date = days.shift();
            }
        }

        return date;
    }

    /**
     * Calculate next reference date = date when a UTC user should receive this message
     * 
     * @param {Date|null} previousReference previous reference date if any
     * @returns {Date} next reference date
     */
    nextReference(previousReference) {
        let next = previousReference ? new Date(previousReference.getTime()) : this.reference();
        if (!next && !this.reference()) {
            require('../../../../../api/utils/log')('push:trigger').e('Failed to find first reference date for trigger: %j', this.json);
            return null;
        }
        if (this.bucket === RecurringType.Daily) {
            if (!this.last && !previousReference) {
                return next;
            }
            next.setDate(next.getDate() + this.every);
        }
        else if (this.bucket === RecurringType.Weekly) {
            let day = moment(next).locale('ru').day();
            if (!this.last && !previousReference && this.on.includes(day)) {
                return next;
            }
            let days = this.on.map(on => moment(next).locale('ru').day(on).toDate())
                .concat(this.on.map(on => moment(next).locale('ru').add(-this.every, 'weeks').day(on).toDate()))
                .concat(this.on.map(on => moment(next).locale('ru').add(this.every, 'weeks').day(on).toDate()));
            days = days
                .filter(d => d.getTime() > this.start.getTime())
                .filter(d => this.last ? true : d.getTime() > next.getTime());
            days.sort((a, b) => a.getTime() > b.getTime() ? 1 : -1);
            next = days[0];

        }
        else if (this.bucket === RecurringType.Monthly) {
            let prevMonth = moment(next).add(-this.every, 'months'),
                nextMonth = moment(next).add(this.every, 'months'),
                daysInCurMonth = moment(next).add(1, 'months').date(1).add(-1, 'days').toDate(),
                daysInPrevMonth = prevMonth.add(1, 'months').date(1).add(-1, 'days').toDate(),
                daysInNextMonth = nextMonth.add(1, 'months').date(1).add(-1, 'days').toDate();

            let day = next.getDate();
            if (!this.last && !previousReference && this.on.filter(on => (on > 0 ? on : daysInCurMonth + on) === day).length) {
                return next;
            }

            let days = this.on.map(on => moment(next).date(on > 0 ? on : daysInCurMonth + on).toDate())
                .concat(this.on.map(on => prevMonth.date(on > 0 ? on : daysInPrevMonth + on).toDate()))
                .concat(this.on.map(on => nextMonth.date(on > 0 ? on : daysInNextMonth + on).toDate()))
                .filter(d => d.getTime() > this.start.getTime())
                .filter(d => this.last ? true : d.getTime() > next.getTime());
            days.sort((a, b) => a.getTime() > b.getTime() ? 1 : -1);
            next = days[0];
        }
        else {
            throw new PushError('Invalid bucket');
        }

        // reset time just in case
        next.setHours(Math.floor(this.time / 60 / 60000));
        next.setMinutes(Math.floor((this.time - next.getHours() * 60 * 60000) / 60000));
        next.setSeconds(0);
        next.setMilliseconds(0);

        return next;
    }

    /**
     * Calculate next schedule job date
     * 
     * @param {Date} reference reference date
     * @param {Number} now current time in ms (for tests to be able to override it)
     * @returns {Date|null} date for next schedule job or null if no more reschedules is possible
     */
    scheduleDate(reference) {
        let ref = reference,
            date = new Date(ref.getTime() - Time.EASTMOST_TIMEZONE - Time.SCHEDULE_AHEAD);
        return this.end && date.getTime() > this.end.getTime() ? null : date;
    }

    /**
     * Get end date
     * 
     * @returns {Date|undefined} end date
     */
    get end() {
        return toDate(this._data.end);
    }

    /**
     * Set end date
     * 
     * @param {Date|number}  end  message end date
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
     * Get bucket
     * 
     * @returns {Date|undefined} bucket
     */
    get bucket() {
        return this._data.bucket;
    }

    /**
     * Set bucket
     * 
     * @param {Date|number}  bucket  trigger bucket
     */
    set bucket(bucket) {
        if (typeof bucket === 'string') {
            this._data.bucket = bucket;
        }
        else {
            delete this._data.bucket;
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
        if (typeof time === 'number') {
            this._data.time = time;
        }
        else {
            delete this._data.time;
        }
    }

    /**
     * Getter for every
     * 
     * @returns {number|undefined} repeat each this many weeks / months
     */
    get every() {
        return this._data.every;
    }

    /**
     * Setter for every
     * 
     * @param {number|undefined} every repeat each this many weeks / months
     */
    set every(every) {
        if (typeof every === 'number') {
            this._data.every = every;
        }
        else {
            delete this._data.every;
        }
    }

    /**
     * Getter for on
     * 
     * @returns {number|undefined} repeat each of these weekdays / month days
     */
    get on() {
        return this._data.on;
    }

    /**
     * Setter for on
     * 
     * @param {number|undefined} on repeat each of these weekdays / month days
     */
    set on(on) {
        if (Array.isArray(on) && !on.filter(n => typeof n !== 'number').length) {
            this._data.on = on;
        }
        else {
            delete this._data.on;
        }
    }

}

/**
 * Multi trigger
 */
class MultiTrigger extends ReschedulingTrigger {
    /**
     * Constructor
     * 
     * @param {object|null} data filter data
     * @param {boolean} data.sctz   in case tz = true, sctz is scheduler's timezone offset in minutes (GMT +3 is "-180")
     * @param {Date[]} data.dates   delivery times for multiple notifications
     * @param {boolean} delayed     true if audience calculation should be done right before sending the message
     * */
    constructor(data) {
        data.kind = TriggerKind.Multi;
        super(data);
    }

    /**
     * Class validation rules
    */
    static get scheme() {
        return Object.assign({}, super.scheme, {
            dates: {type: 'Date[]', required: true},
        });
    }

    /**
     * Calculate first reference date = date when a UTC user should receive this message
     * 
     * @returns {Date} first reference date
     */
    reference() {
        return this.tz ? new Date(toDate(this.dates[0]).getTime() - this.sctz * 60000) : toDate(this.dates[0]);
    }

    /**
     * Calculate next reference date = date when a UTC user should receive this message
     * 
     * @param {Date|null} previousReference previous reference date if any
     * @returns {Date} next reference date
     */
    nextReference(previousReference) {
        if (previousReference) {
            return this.dates.map(d => this.tz ? new Date(toDate(d).getTime() - this.sctz * 60000) : toDate(d))
                .filter(d => toDate(d).getTime() > toDate(previousReference).getTime())[0];
        }
        else {
            return this.reference();
        }
    }

    /**
     * Calculate next schedule job date
     * 
     * @param {Date} reference reference date
     * @param {Number} now current time in ms (for tests to be able to override it)
     * @returns {Date|null} date for next schedule job or null if no more reschedules is possible
     */
    scheduleDate(reference) {
        if (!reference) {
            return null;
        }
        let ref = reference,
            date = this.tz ? new Date(ref.getTime() - Time.EASTMOST_TIMEZONE - Time.SCHEDULE_AHEAD) : new Date(ref.getTime() - Time.SCHEDULE_AHEAD);
        return this.end && date.getTime() > this.end.getTime() ? null : date;
    }

    /**
     * Getter for dates
     * 
     * @returns {number|undefined} array of dates to send the message on
     */
    get dates() {
        return this._data.dates;
    }

    /**
     * Setter for dates
     * 
     * @param {number|undefined} dates array of dates to send the message on
     */
    set dates(dates) {
        if (Array.isArray(dates) && !dates.filter(n => !(n instanceof Date)).length) {
            dates.sort();
            this._data.dates = dates;
        }
        else {
            delete this._data.dates;
        }
    }

}

module.exports = { Trigger, TriggerKind, PlainTrigger, EventTrigger, CohortTrigger, APITrigger, MultiTrigger, RecurringTrigger };
