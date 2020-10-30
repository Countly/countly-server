
const plugins = require('../../../../pluginManager.js');
const common = require('../../../../../api/utils/common.js');
const utils = require('../../utils.js');
const log = common.log('hooks:incoming_data_trigger');



/**
 * Incoming data from sdk event trigger
 */
class IncomingDataTrigger {
    /**
     * Init variables
     * @param {object} options - config options
     * @param {object} options.pipeline -pipeline instance inited by Hooks class
     */
    constructor(options) {
        this._rules = [];
        this.pipeline = () => {};
        if (options.pipeline) {
            this.pipeline = options.pipeline;
        }
        this.register();
    }

    /**
     * syncRules with hook module periodically, filter related hooks
     * @param {Array} rules - hook record objects array
     */
    syncRules(rules) {
        if (rules instanceof Array) {
            const newRules = rules.filter(r => {
                return r.trigger.type === 'IncomingDataTrigger';
            });
            this._rules = newRules.map(r => {
                try {
                    // parse JSON string
                    console.log(r.trigger);
                    r.trigger.configuration.filter = JSON.parse(r.trigger.configuration.filter);
                }
                catch (err) {
                    console.log(err);
                }
                return r;
            });
        }
    }

    /**
     * process pipeline feed, pick out matched record with rule
     * @param {string} eventType - internal event types
     * @param {object} ob - trggered out from pipeline
     */
    async process(eventType, ob) {
        for (let i = 0; i < this._rules.length; i++) {
            const rule = this._rules[i];
            // match
            if (rule.apps[0] === ob.params.app_id.toString()) {
                await this.matchFilter(ob.params, rule);
            }
        }
    }


    /**
     * register trigger processor
     */
    register() {
        InternalEvents.forEach((e) => {
            plugins.register(e, (ob) => {
                console.log(ob, e, "[IncominngDataTrigger]");
                this.process(e, ob);
            });
        });
    }

    /**
     * filter function  like block plugin
     * @param {object} params - common params obj from dispatcher
     * @param {object} rule - rule object for testing
     */
    async matchFilter(params, rule) {
        const user = JSON.parse(JSON.stringify(params.app_user)) || {};
        let {filter, event} = rule.trigger.configuration;
        const targetEventKey = event[0].split("***")[1];
        filter = filter.dbFilter;

        //process metrics before comparing
        const map = {
            "_os": "p",
            "_os_version": "pv",
            "_device": "d",
            "_resolution": "r",
            "_carrier": "c",
            "_app_version": "av",
            "_density": "dnst",
            "_locale": "lo",
            "_lang": "la",
            "_store": "src",
            "_browser": "brw"
        };

        if (params.qstring.metrics) {
            const regexp = /[\-_]+/;
            for (let i in map) {
                if (params.qstring.metrics[i]) {
                    let metric;
                    switch (i) {
                    case "_app_version":
                        metric = params.qstring.metrics._app_version + "";
                        if (metric.indexOf('.') === -1) {
                            metric += ".0";
                        }
                        metric = (metric + "").replace(/^\$/, "").replace(/\./g, ":");
                        break;
                    case "_locale":
                        metric = (params.qstring.metrics._locale + "").toLowerCase().split(regexp)[0];
                        break;
                    case "_store":
                        metric = (params.qstring.metrics._store + "").replace(/\./g, '&#46;');
                        break;
                    default:
                        metric = (params.qstring.metrics[i] + "").replace(/^\$/, "").replace(/\./g, ":");
                    }
                    //if metrics don't match store them for possible update
                    //and use to compare with block rules
                    if (metric !== user[map[i]]) {
                        user[map[i]] = metric;
                    }
                    user.did = params.qstring.device_id;
                    user.ip = params.ip_address;
                    if (params.req && params.req.headers) {
                        user.hostname = params.req.headers.origin;
                        user.referer = params.req.headers.referer;
                        user.ua = params.req.headers["user-agent"];
                    }

                }
            }
        }

        const eventProperties = {c: true, s: true, dur: true};
        const eventPropertiesMap = {c: "count", s: "sum", dur: "duration"};
        /**
         *  Assert if rule operation applies to value
         *  @param {varies} value - user's value
         *  @param {object} filter - object with operations
         *  @returns {bool} true if user should be matched 
         */
        function assertOperation(value, filter) {
            var matched = true;
            if (filter.$in && filter.$in.indexOf(value) === -1) {
                matched = false;
            }
            if (filter.$nin && filter.$nin.indexOf(value) !== -1) {
                matched = false;
            }
            if (filter.$nin && filter.$nin.indexOf(value) !== -1) {
                matched = false;
            }
            if (filter.$regex && filter.$regex.test && !filter.$regex.test(value)) {
                matched = false;
            }
            if (filter.$not && filter.$not.test && filter.$not.test(value)) {
                matched = false;
            }
            return matched;
        }
        /**
         *  Assert if filter applies to this user
         *  @param {object} user - User's document
         *  @param {Object} filter - filter's document
         *  @returns {bool} if request matched 
         */
        function assertFilter(user, filter) {
            let matched = true;
            for (let prop in filter) {
                const parts = prop.split(".");
                if (parts.length < 2) {
                    continue; // fix bug
                }
                if (parts[0] === "up" || (parts.length === 1 && !eventProperties[parts[0]])) {
                    let test = parts[0];
                    if (test === "up") {
                        test = parts[1];
                    }
                    //    if (!user[test] || !assertOperation(user[test], filter[prop])) {
                    if (!assertOperation(user[test], filter[prop])) {
                        matched = false;
                    }
                }
                //                else if (parts[0] !== "sg" && (!user[parts[0]] || !user[parts[0]][parts[1]] || !assertOperation(user[parts[0]][parts[1]], filter[prop]))) {
                else if (parts[0] !== "sg" && (!assertOperation(user[parts[0]] && user[parts[0]][parts[1]], filter[prop]))) {

                    matched = false;
                }
            }
            return matched;
        }

        if (params.qstring.events && params.qstring.events.length && Array.isArray(params.qstring.events)) {
            const eventRules = {};
            for (let prop in filter) {
                const parts = prop.split(".");
                if (parts[0] === "sg" || (parts.length === 1 && eventProperties[parts[0]])) {
                    eventRules[prop] = filter[prop];
                }
            }
            if (assertFilter(user, filter)) {
                //at this point we know that all user filter have been matched
                //now we only need to check events which match event filter 
                const events = params.qstring.events.filter(function(event) {
                    if (targetEventKey === event.key || targetEventKey === "*") {
                        let notMatch = false;
                        for (let prop in eventRules) {
                            let parts = prop.split(".");
                            if (parts[0] === "sg") {
                                //                                if (!event.segmentation || !assertOperation(common.convertToType(event.segmentation[parts[1]]), eventRules[prop])) {
                                if (!assertOperation(common.convertToType(event.segmentation && event.segmentation[parts[1]]), eventRules[prop])) {

                                    notMatch = true;
                                }
                            }
                            else if (!assertOperation(common.convertToType(event[eventPropertiesMap[parts[0]]]), eventRules[prop])) {
                                notMatch = true;
                            }
                        }
                        if (!notMatch) {
                            log.i("find matched event", event, "by", filter, "from", user);
                            console.log("find matched event", event, "by", filter, "from", user);
                        }
                        return !notMatch;
                    }
                    return false;
                });
                if (events.length > 0) {
                    try {
                        utils.updateRuleTriggerTime(rule._id);
                    }
                    catch (err) {
                        console.log(err, "??#3");
                    }
                    rule.effects.forEach(e => {
                        this.pipeline({
                            params: {events, user},
                            rule: rule,
                            effect: e,
                        });
                    });
                }
            }
        }
    }
}

module.exports = IncomingDataTrigger;
const InternalEvents = [
    "/sdk",
];
