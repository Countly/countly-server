require("should");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

// The date picker lays out "in the last N hours" and "in the last N minutes" the same way:
// no calendar, a day formatter and no global range to scroll to. Its template treats the two
// alike, but two methods compared tableType against ("hour" || "minute"), which is just
// "hour", so a minute range fell through to the day handling: opening the picker scheduled a
// scroll into the day calendar, and closing it reset the table type to "day".
describe("date picker minute ranges are handled like hour ranges", function() {
    var datePath = path.join(__dirname, "../../frontend/express/public/javascripts/countly/vue/components/date.js");
    var src = fs.readFileSync(datePath, "utf8");
    var DAYS_RANGE = ["days range"];

    /**
     * Lift one method of the component's options object and make it callable.
     *
     * The component file cannot be required here: it registers itself with a browser Vue.
     * The methods under test only read and write `this`, so they are extracted and run
     * against a plain object.
     *
     * @param {string} marker - text that immediately precedes the method's brace
     * @returns {Function} the extracted method
     */
    function liftMethod(marker) {
        var at = src.indexOf(marker);
        if (at === -1) {
            throw new Error("could not find " + marker + "; if it was renamed, update this test rather than deleting it");
        }
        var open = src.indexOf("{", at);
        var depth = 0;
        for (var i = open; i < src.length; i++) {
            if (src[i] === "{") {
                depth++;
            }
            else if (src[i] === "}") {
                depth--;
                if (depth === 0) {
                    var sandbox = {
                        countlyPresets: {
                            getGlobalDatePresetId: function() {
                                return null;
                            }
                        },
                        countlyCommon: { ACTIVE_APP_ID: "app" },
                        localStorage: {
                            getItem: function() {
                                return null;
                            }
                        },
                        globalDaysRange: DAYS_RANGE,
                        globalFutureDaysRange: DAYS_RANGE,
                        globalMonthsRange: [],
                        globalFutureMonthsRange: [],
                        globalYearsRange: [],
                        globalFutureYearsRange: [],
                        scheduled: [],
                        setTimeout: function(fn) {
                            sandbox.scheduled.push(fn);
                        }
                    };
                    var fn = vm.runInNewContext("(function" + src.slice(src.lastIndexOf("(", open), open) + src.slice(open, i + 1) + ")", sandbox);
                    fn.sandbox = sandbox;
                    return fn;
                }
            }
        }
        throw new Error("unbalanced braces after " + marker);
    }

    /**
     * A picker instance with only what the two methods touch.
     * @param {string} tableType - table type the picker is showing
     * @returns {object} the instance
     */
    function picker(tableType) {
        return {
            tableType: tableType,
            retentionConfiguration: null,
            isGlobalDatePicker: false,
            allowPresets: false,
            allowCustomRange: true,
            selectedPreset: null,
            displayOneMode: null,
            isFuture: false,
            inTheLastInput: { parsed: [null] },
            value: null,
            refreshCalendarDOM: function() {},
            abortPicking: function() {},
            clearCommitWarning: function() {},
            loadValue: function() {},
            scrollTo: function() {}
        };
    }

    ["hour", "minute"].forEach(function(tableType) {
        it("opens a " + tableType + " range without a day calendar to scroll into", function() {
            var show = liftMethod("handleDropdownShow: function");
            var vm1 = picker(tableType);
            show.call(vm1);
            vm1.formatter.should.equal("YYYY-MM-DD");
            (vm1.globalRange === null).should.be.true();
            show.sandbox.scheduled.length.should.equal(0);
        });

        it("keeps a " + tableType + " range when the dropdown closes", function() {
            var hide = liftMethod("handleDropdownHide: function");
            var vm1 = picker(tableType);
            hide.call(vm1, false);
            vm1.tableType.should.equal(tableType);
        });
    });

    it("still opens a day range on the day calendar and resets other types to day on close", function() {
        var show = liftMethod("handleDropdownShow: function");
        var day = picker("day");
        show.call(day);
        day.globalRange.should.equal(DAYS_RANGE);
        show.sandbox.scheduled.length.should.equal(1);

        var hide = liftMethod("handleDropdownHide: function");
        var week = picker("week");
        hide.call(week, false);
        week.tableType.should.equal("day");
    });
});
