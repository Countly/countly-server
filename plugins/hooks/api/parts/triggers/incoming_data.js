
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
            this.pipeline = (data) => {
                try {
                    data.rule._originalInput = JSON.parse(JSON.stringify(data.params || {}));
                }
                catch (e) {
                    log.e("[hooks internal_events] parsing originalInput", e);
                }
                return options.pipeline(data);
            };
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
     * @param {object} ob - trggered out from pipeline
     */
    async process(ob) {
        let rules = [];
        if (ob.is_mock === true) {
            return ob;
        }
        rules = this._rules.filter((r) => {
            return r.apps[0] === ob.params.app_id.toString();
        });
        if (rules.length) {
            for (let i = 0; i < rules.length; i++) {
                await this.matchFilter(ob.params, rules[i]);
            }
        }
    }


    /**
     * register trigger processor
     */
    register() {
        InternalEvents.forEach((e) => {
            plugins.register(e, (obj) => {
                try {
                    const ob = {
                        params: {
                            app_user: JSON.parse(JSON.stringify(obj.params.app_user)),
                            app_id: common.db.ObjectID(obj.params.app_id.toString()),
                            req: {
                                header: JSON.parse(JSON.stringify(obj.params.req.headers || {})),
                            },
                            ip_address: obj.params.ip_address,
                            qstring: JSON.parse(JSON.stringify(obj.params.qstring || {})),
                        },
                        events: JSON.parse(JSON.stringify(obj.events || [])),
                    };
                    log.d(e, ob, "[Incoming data capture]");
                    if (e === '/plugins/drill') {
                        const hooksData = {
                            params: {...ob.params},
                            event: e,
                        };
                        if (ob.events) {
                            hooksData.params.qstring.events = ob.events;
                        }
                        this.process(hooksData);
                        return;
                    }
                    this.process(ob);
                }
                catch (err) {
                    console.log(err);
                }
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
        filter = filter.dbFilter || {};
        filter = filter.query ? filter.query : filter;
        log.d("[incoming data trigger]", params, rule);

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
         *  @param {object} filterObj - object with operations
         *  @returns {bool} true if user should be matched 
         */
        function assertOperation(value, filterObj) {
            var matched = true;
            if (filterObj.$in && filterObj.$in.indexOf(value) === -1) {
                matched = false;
            }
            if (filterObj.$nin && filterObj.$nin.indexOf(value) !== -1) {
                matched = false;
            }
            if (filterObj.$nin && filterObj.$nin.indexOf(value) !== -1) {
                matched = false;
            }
            if (filterObj.$regex && filterObj.$regex.test && !filterObj.$regex.test(value)) {
                matched = false;
            }
            if (filterObj.$not && filterObj.$not.test && filterObj.$not.test(value)) {
                matched = false;
            }
            if (filterObj.rgxcn && (filterObj.rgxcn[0] !== undefined) && value.indexOf(filterObj.rgxcn[0]) === -1) {
                matched = false;
            }
            if (filterObj.rgxbw && (filterObj.rgxbw[0] !== undefined) && value.indexOf(filterObj.rgxbw[0]) === -1) {
                matched = false;
            }
            if ((filterObj.$lte !== undefined) && value > filterObj.$lte) {
                matched = false;
            }
            if ((filterObj.$gte !== undefined) && value < filterObj.$gte) {
                matched = false;
            }
            if ((filterObj.$lt !== undefined) && value >= filterObj.$lt) {
                matched = false;
            }
            if ((filterObj.$gt !== undefined) && value <= filterObj.$gt) {
                matched = false;
            }
            return matched;
        }
        /**
         *  Assert if filter applies to this user
         *  @param {object} userObj - User's document
         *  @param {Object} filterObj - filter's document
         *  @returns {bool} if request matched 
         */
        function assertFilter(userObj, filterObj) {
            let matched = true;
            for (let prop in filterObj) {
                const parts = prop.split(".");
                if (parts.length < 2) {
                    continue; // ignore 
                }
                if (parts[0] === "up" || (parts.length === 1 && !eventProperties[parts[0]])) {
                    let test = parts[0];
                    if (test === "up") {
                        test = parts[1];
                    }
                    if (!assertOperation(userObj[test], filterObj[prop])) {
                        matched = false;
                    }
                }
                else if (parts[0] !== "sg" && (!assertOperation(userObj[parts[0]] && userObj[parts[0]][parts[1]], filterObj[prop]))) {

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
                const events = params.qstring.events.filter(function(e) {
                    if (targetEventKey === e.key || targetEventKey === "*") {
                        let notMatch = false;
                        for (let prop in eventRules) {
                            let parts = prop.split(".");
                            if (parts[0] === "sg") {
                                if (!assertOperation(common.convertToType(e.segmentation && e.segmentation[parts[1]]), eventRules[prop])) {

                                    notMatch = true;
                                }
                            }
                            else if (!assertOperation(common.convertToType(e[eventPropertiesMap[parts[0]]]), eventRules[prop])) {
                                notMatch = true;
                            }
                        }
                        if (!notMatch) {
                            log.d("find matched event", e, "by", filter, "from", user);
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
                        console.log(err, "[IncomingDataTrigger]");
                    }
                    // send to pipeline
                    this.pipeline({
                        params: {events, user},
                        rule: rule,
                    });
                }
            }
        }
    }
}

module.exports = IncomingDataTrigger;
const InternalEvents = [
    "/sdk",
    "/hooks/incoming_data",
];
