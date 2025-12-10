var should = require("should");
var testUtils = require("../testUtils");
var common = require("../../api/utils/common");
var countlyCommon = require("../../api/lib/countly.common.js");
var moment = require("moment-timezone");
const mongodb = require('mongodb');

describe("Common API utility functions", function() {
    describe("versionCompare", function() {
        function testCompare(v1, v2, expected) {
            common.versionCompare(v1, v2).should.equal(expected);
            common.versionCompare(v2, v1).should.equal(expected * -1);
        }

        it("should compare versions correctly", function(done) {
            testCompare("1:0", "1:1", -1);
            testCompare("2:0", "1:1", 1);

            testCompare("1:0+builtonmars", "1:0+builtonearth", 0);

            testCompare("1:0:1", "1:0", 1);

            testCompare("5:3-beta", "5:3", -1);
            testCompare("5:3-251e6992f5", "5:3-303535874", 0);

            testCompare("9:74AGT", "9:80AGT", -1);
            testCompare("10:14AGT", "9:80AGT", 1);

            done();
        });
    });

    describe('validateArgs extra types', () => {
        common.db = common.db || {
            _ObjectId: mongodb.ObjectId
        };

        it('should validate ObjectId', () => {
            let id = new mongodb.ObjectId(),
                scheme = {
                    id: { type: 'ObjectID', required: true },
                    idstr: { type: 'ObjectID', required: true }
                };

            should.deepEqual(common.validateArgs({id, idstr: id.toString()}, scheme), {id, idstr: id});
            should.deepEqual(common.validateArgs({id, idstr: id.toString()}, scheme, true), {errors: [], result: true, obj: {id, idstr: id}});
            should.deepEqual(common.validateArgs({id}, scheme, true), {errors: ['Missing idstr argument'], result: false});
            should.deepEqual(common.validateArgs({id: 'asd', idstr: id.toString()}, scheme, true), {errors: ['Incorrect ObjectID for id'], result: false});
            should.deepEqual(common.validateArgs({id: id.toString(), idstr: id.toString()}, scheme, true), {errors: [], result: true, obj: {id: id, idstr: id}});
        });

        it('should validate ObjectId[]', () => {
            let id1 = new mongodb.ObjectId(),
                id2 = new mongodb.ObjectId(),
                scheme = {
                    ids: { type: 'ObjectID[]', required: true },
                };

            should.deepEqual(common.validateArgs({ids: []}, scheme), {ids: []});
            should.deepEqual(common.validateArgs({ids: [id1, id2]}, scheme), {ids: [id1, id2]});
            should.deepEqual(common.validateArgs({ids: [id1.toString(), id2]}, scheme, true), {errors: [], result: true, obj: {ids: [id1, id2]}});
            should.deepEqual(common.validateArgs({}, scheme, true), {errors: ['Missing ids argument'], result: false});
            should.deepEqual(common.validateArgs({ids: {}}, scheme, true), {errors: ['Invalid type for ids'], result: false});
            should.deepEqual(common.validateArgs({ids: id1}, scheme, true), {errors: ['Invalid type for ids'], result: false});
            should.deepEqual(common.validateArgs({ids: 123}, scheme, true), {errors: ['Invalid type for ids'], result: false});
            should.deepEqual(common.validateArgs({ids: id1.toString()}, scheme, true), {errors: ['Invalid type for ids'], result: false});
            should.deepEqual(common.validateArgs({ids: ['a']}, scheme, true), {errors: ['ids: Incorrect ObjectID for 0'], result: false});
            should.deepEqual(common.validateArgs({ids: [id1, id2.toString(), 'a']}, scheme, true), {errors: ['ids: Incorrect ObjectID for 2'], result: false});
        });

        it('should validate inner scheme', () => {
            let id = new mongodb.ObjectId(),
                scheme = {
                    _id: { type: 'ObjectID', required: true },
                    num: { type: 'Number' },
                    object: {
                        type: {
                            str: { type: 'String', required: true },
                            ids: { type: 'ObjectID[]' }
                        }
                    },
                    array: {
                        type: {
                            str: { type: 'String', required: true },
                            ids: { type: 'ObjectID[]' }
                        },
                        array: true
                    },
                };

            should.deepEqual(common.validateArgs({_id: id}, scheme), {_id: id});
            should.deepEqual(common.validateArgs({}, scheme, true), {errors: ['Missing _id argument'], result: false});
            should.deepEqual(common.validateArgs({
                _id: id,
                object: {}
            }, scheme, true), {
                result: false,
                errors: ['object: Missing str argument']
            });
            should.deepEqual(common.validateArgs({
                _id: id,
                object: {
                    str: 'str',
                    ids: [id, 'a']
                }
            }, scheme, true), {
                result: false,
                errors: ['object: ids: Incorrect ObjectID for 1']
            });
            should.deepEqual(common.validateArgs({
                _id: id,
                array: [{
                    str: 'str',
                    ids: [id, 'a']
                }]
            }, scheme, true), {
                result: false,
                errors: ['array: 0: ids: Incorrect ObjectID for 1']
            });
            should.deepEqual(common.validateArgs({
                _id: id,
                array: [[]]
            }, scheme, true), {
                result: false,
                errors: ['array: 0: Missing str argument']
            });
            should.deepEqual(common.validateArgs({
                _id: id,
                array: [Number(5)]
            }, scheme, true), {
                result: false,
                errors: ['array: Invalid type for 0', 'array: 0: Missing str argument']
            });
        });

        it('should validate in', () => {
            let schemeString = {
                    data: { type: 'String', in: ['a', 'b', 'c'] },
                },
                schemeArray = {
                    data: { type: 'String[]', in: () => ['a', 'b', 'c'] },
                };

            should.deepEqual(common.validateArgs({}, schemeString), {});
            should.deepEqual(common.validateArgs({data: 'a'}, schemeString), {data: 'a'});
            should.deepEqual(common.validateArgs({data: 'b'}, schemeString), {data: 'b'});
            should.deepEqual(common.validateArgs({data: 'c'}, schemeString), {data: 'c'});
            should.deepEqual(common.validateArgs({data: 'aa'}, schemeString), false);
            should.deepEqual(common.validateArgs({data: 'd'}, schemeString), false);
            should.deepEqual(common.validateArgs({data: ['a']}, schemeArray), {data: ['a']});
            should.deepEqual(common.validateArgs({data: ['b']}, schemeArray), {data: ['b']});
            should.deepEqual(common.validateArgs({data: ['c']}, schemeArray), {data: ['c']});
            should.deepEqual(common.validateArgs({data: ['c', 'a']}, schemeArray), {data: ['c', 'a']});
            should.deepEqual(common.validateArgs({data: ['c', 'a', 'a']}, schemeArray), {data: ['c', 'a', 'a']});
            should.deepEqual(common.validateArgs({data: ['c', 'a', 'd']}, schemeArray), false);
            should.deepEqual(common.validateArgs({data: ['aa']}, schemeArray), false);
            should.deepEqual(common.validateArgs({data: ['d']}, schemeArray), false);
            should.deepEqual(common.validateArgs({data: 'x'}, schemeString, true), {errors: ['Value of data is invalid'], result: false});
            should.deepEqual(common.validateArgs({data: ['x']}, schemeArray, true), {errors: ['Value of data is invalid'], result: false});
        });

        it('should validate date', () => {
            let scheme = {
                    date: { type: 'Date' },
                },
                tsMs = Date.now(),
                dateMs = new Date(tsMs),
                strMs = dateMs.toISOString(),
                tsSec = Math.floor(tsMs / 1000),
                dateSec = new Date(tsSec * 1000),
                strSec = dateSec.toISOString();

            should.deepEqual(common.validateArgs({}, scheme), {});
            should.deepEqual(common.validateArgs({date: null}, scheme), {date: null});
            should.deepEqual(common.validateArgs({date: undefined}, scheme), {});
            should.deepEqual(common.validateArgs({date: tsMs}, scheme), {date: dateMs});
            should.deepEqual(common.validateArgs({date: dateMs}, scheme), {date: dateMs});
            should.deepEqual(common.validateArgs({date: strMs}, scheme), {date: dateMs});
            should.deepEqual(common.validateArgs({date: tsSec}, scheme), {date: dateSec});
            should.deepEqual(common.validateArgs({date: dateSec}, scheme), {date: dateSec});
            should.deepEqual(common.validateArgs({date: strSec}, scheme), {date: dateSec});
        });

        it('should validate JSON', () => {
            let scheme = {
                json: { type: 'JSON' },
            };

            should.deepEqual(common.validateArgs({}, scheme), {});
            should.deepEqual(common.validateArgs({json: null}, scheme), {json: 'null'});
            should.deepEqual(common.validateArgs({json: undefined}, scheme), {});
            should.deepEqual(common.validateArgs({json: JSON.stringify({a: true})}, scheme), {json: '{"a":true}'});
            should.deepEqual(common.validateArgs({json: JSON.stringify([{a: true}])}, scheme), {json: '[{"a":true}]'});
            should.deepEqual(common.validateArgs({json: {a: true}}, scheme), {json: '{"a":true}'});
            should.deepEqual(common.validateArgs({json: [{a: true}]}, scheme), {json: '[{"a":true}]'});
        });

        it('should validate custom', () => {
            let scheme = {
                custom: { type: 'String', custom: v => v === 'valid' ? undefined : 'value is invalid' },
            };

            should.deepEqual(common.validateArgs({}, scheme), {});
            should.deepEqual(common.validateArgs({json: null}, scheme), {});
            should.deepEqual(common.validateArgs({custom: 'invalid'}, scheme), false);
            should.deepEqual(common.validateArgs({custom: 3}, scheme), false);
            should.deepEqual(common.validateArgs({custom: 'valid'}, scheme), {custom: 'valid'});
            should.deepEqual(common.validateArgs({custom: 'x'}, scheme, true), {errors: ['value is invalid'], result: false});
        });

        it('should validate boolean / number strings', () => {
            let scheme = {
                boolString: {type: 'BooleanString'},
                bool: {type: 'Boolean'},
                intString: {type: 'IntegerString'},
                num: {type: 'Number'},
            };
            should.deepEqual(common.validateArgs({bool: 'true'}, scheme), {bool: 'true'});
            should.deepEqual(common.validateArgs({boolString: 'true'}, scheme), {boolString: true});
            should.deepEqual(common.validateArgs({boolString: 'false'}, scheme), {boolString: false});
            should.deepEqual(common.validateArgs({boolString: 'x'}, scheme), false);

            should.deepEqual(common.validateArgs({num: '2'}, scheme), false);
            should.deepEqual(common.validateArgs({intString: '2'}, scheme), {intString: 2});
            should.deepEqual(common.validateArgs({intString: '0'}, scheme), {intString: 0});
            should.deepEqual(common.validateArgs({intString: 'x'}, scheme), false);
        });

        it('should validate min/max', () => {
            let scheme = {
                str: { type: 'String', min: 'c', max: 'f' },
                num: { type: 'Number', min: 5, max: 10 },
            };

            should.deepEqual(common.validateArgs({}, scheme), {});
            should.deepEqual(common.validateArgs({str: null, num: null}, scheme), false);
            should.deepEqual(common.validateArgs({str: 'asd'}, scheme), false);
            should.deepEqual(common.validateArgs({str: 'c'}, scheme), {str: 'c'});
            should.deepEqual(common.validateArgs({str: 'ca'}, scheme), {str: 'ca'});
            should.deepEqual(common.validateArgs({str: 'd'}, scheme), {str: 'd'});
            should.deepEqual(common.validateArgs({str: 'f'}, scheme), {str: 'f'});
            should.deepEqual(common.validateArgs({str: 'g'}, scheme), false);
            should.deepEqual(common.validateArgs({num: 0}, scheme), false);
            should.deepEqual(common.validateArgs({num: 5}, scheme), {num: 5});
            should.deepEqual(common.validateArgs({num: 6}, scheme), {num: 6});
            should.deepEqual(common.validateArgs({num: 10}, scheme), {num: 10});
            should.deepEqual(common.validateArgs({num: 11}, scheme), false);
        });

        it('should validate nonempty', () => {
            let scheme = {
                obj: { type: 'Object', nonempty: true },
                objarr: { type: 'Object[]', nonempty: true },
                inner: {
                    type: {
                        str: {type: 'String'}
                    },
                    nonempty: true
                },
                innerarr: {
                    type: {
                        str: {type: 'String'}
                    },
                    array: true,
                    nonempty: true
                },
                innernonemptyarr: {
                    type: {
                        str: 'String',
                    },
                    array: true,
                    nonempty: true
                },
                json: {
                    type: 'JSON',
                    nonempty: true
                },
                jsonarr: {
                    type: 'JSON[]',
                    nonempty: true
                },
            };

            should.deepEqual(common.validateArgs({}, scheme), {});
            should.deepEqual(common.validateArgs({obj: {}}, scheme), false);
            should.deepEqual(common.validateArgs({obj: ['1']}, scheme), false);
            should.deepEqual(common.validateArgs({obj: []}, scheme), false);
            should.deepEqual(common.validateArgs({obj: {x: 1}}, scheme), {obj: {x: 1}});

            should.deepEqual(common.validateArgs({objarr: []}, scheme), false);
            should.deepEqual(common.validateArgs({objarr: [{}]}, scheme), false);
            should.deepEqual(common.validateArgs({objarr: [{a: 1}]}, scheme), {objarr: [{a: 1}]});
            should.deepEqual(common.validateArgs({objarr: [{}, {a: 1}]}, scheme), false);
            should.deepEqual(common.validateArgs({objarr: [{b: 1}, {a: 1}]}, scheme), {objarr: [{b: 1}, {a: 1}]});

            should.deepEqual(common.validateArgs({inner: {}}, scheme), false);
            should.deepEqual(common.validateArgs({inner: {x: 1}}, scheme), {inner: {x: 1}});
            should.deepEqual(common.validateArgs({inner: {str: 'str'}}, scheme), {inner: {str: 'str'}});

            should.deepEqual(common.validateArgs({innerarr: {}}, scheme), false);
            should.deepEqual(common.validateArgs({innerarr: [{}]}, scheme), false);
            should.deepEqual(common.validateArgs({innerarr: [{x: 1}]}, scheme), {innerarr: [{x: 1}]});
            should.deepEqual(common.validateArgs({innerarr: [{x: 1}, {}]}, scheme), false);
            should.deepEqual(common.validateArgs({innerarr: [{x: 1}, {y: 2}]}, scheme), {innerarr: [{x: 1}, {y: 2}]});
            should.deepEqual(common.validateArgs({innerarr: [{str: 'str'}]}, scheme), {innerarr: [{str: 'str'}]});

            should.deepEqual(common.validateArgs({json: '{}'}, scheme), false);
            should.deepEqual(common.validateArgs({json: '[]'}, scheme), false);
            should.deepEqual(common.validateArgs({json: '{"x": 1}'}, scheme), {json: '{"x":1}'});
            should.deepEqual(common.validateArgs({json: '{"str": "str"}'}, scheme), {json: '{"str":"str"}'});
            should.deepEqual(common.validateArgs({json: '["a"]'}, scheme), {json: '["a"]'});

            should.deepEqual(common.validateArgs({jsonarr: []}, scheme), false);
            should.deepEqual(common.validateArgs({jsonarr: ['{}']}, scheme), false);
            should.deepEqual(common.validateArgs({jsonarr: ['{"x":1}']}, scheme), {jsonarr: ['{"x":1}']});
            should.deepEqual(common.validateArgs({jsonarr: ['{}', '{"x":1}']}, scheme), false);
            should.deepEqual(common.validateArgs({jsonarr: ['{"x":1}', '{}']}, scheme), false);
            should.deepEqual(common.validateArgs({jsonarr: ['{"x":1}', '{"y": 2}']}, scheme), {jsonarr: ['{"x":1}', '{"y":2}']});

        });
    });

    describe('Parsing app version', () => {
        it('should not parse invalid semver', () => {
            should.deepEqual(common.parseAppVersion('abcd'), { original: 'abcd', success: false });
        });

        it('should parse semver into its parts', () => {
            should.deepEqual(common.parseAppVersion('1.0.0'), {
                major: 1,
                minor: 0,
                patch: 0,
                prerelease: [],
                build: [],
                original: '1.0.0',
                success: true,
            });
        });

        it('should coerce incomplete semver', () => {
            should.deepEqual(common.parseAppVersion('1'), {
                major: 1,
                minor: 0,
                patch: 0,
                prerelease: [],
                build: [],
                original: '1',
                success: true,
            });
        });

        it('should parse semver prerelease', () => {
            should.deepEqual(common.parseAppVersion('1.0.0-prerelease'), {
                major: 1,
                minor: 0,
                patch: 0,
                prerelease: ['prerelease'],
                build: [],
                original: '1.0.0-prerelease',
                success: true,
            });
        });

        it('should parse semver build', () => {
            should.deepEqual(common.parseAppVersion('1.0.0+build'), {
                major: 1,
                minor: 0,
                patch: 0,
                prerelease: [],
                build: ['build'],
                original: '1.0.0+build',
                success: true,
            });
        });

        it('should parse semver prerelease and build', () => {
            should.deepEqual(common.parseAppVersion('1.0.0-prerelease+build'), {
                major: 1,
                minor: 0,
                patch: 0,
                prerelease: ['prerelease'],
                build: ['build'],
                original: '1.0.0-prerelease+build',
                success: true,
            });
        });
    });

    describe("getPeriodRange", function() {
        const stringPeriod = '["01-09-2025 00:00:00","30-09-2025 23:59:59"]';
        const numericPeriod = [
            Date.UTC(2025, 8, 1, 0, 0, 0), // 0: January, 8: September
            Date.UTC(2025, 8, 30, 23, 59, 59) // 0: January, 8: September
        ];
        const expectedStart = "2025-09-01 00:00:00.000";
        const expectedEnd = "2025-09-30 23:59:59.999";

        function formatForUser(ts, tz, offset) {
            var effectiveOffset = typeof offset === "number" ? offset : -(tz ? moment.tz(tz).utcOffset() : 0);
            return moment.utc(ts).add(-effectiveOffset, "minutes").format("YYYY-MM-DD HH:mm:ss.SSS");
        }

        function assertRange(range, tz, offset) {
            formatForUser(range.$gte, tz, offset).should.equal(expectedStart);
            formatForUser(range.$lte, tz, offset).should.equal(expectedEnd);
        }

        var periodVariants = [
            {label: "string period array", getPeriod: () => stringPeriod},
            {label: "numeric period array", getPeriod: () => numericPeriod}
        ];

        periodVariants.forEach(({label, getPeriod}) => {
            describe(`using ${label}`, function() {
                it("should align start and end when only Europe/Istanbul timezone is provided", function() {
                    var timezone = "Europe/Istanbul";
                    var range = countlyCommon.getPeriodRange(getPeriod(), timezone);
                    assertRange(range, timezone);
                });

                it("should align start and end when only America/New_York timezone is provided", function() {
                    var timezone = "America/New_York";
                    var range = countlyCommon.getPeriodRange(getPeriod(), timezone);
                    assertRange(range, timezone);
                });

                it("should align start and end when only offset is provided", function() {
                    var offset = -120; // UTC+2
                    var range = countlyCommon.getPeriodRange(getPeriod(), undefined, offset);
                    assertRange(range, null, offset);
                });

                it("should align start and end when only America/New_York offset is provided", function() {
                    var offset = 300; // UTC-5
                    var range = countlyCommon.getPeriodRange(getPeriod(), undefined, offset);
                    assertRange(range, null, offset);
                });

                it("should align start and end when both timezone and offset are provided", function() {
                    var timezone = "Europe/Istanbul";
                    var offset = -180;
                    var range = countlyCommon.getPeriodRange(getPeriod(), timezone, offset);
                    assertRange(range, timezone);
                });

                it("should align start and end when America/New_York timezone and offset are provided", function() {
                    var timezone = "America/New_York";
                    var offset = 300;
                    var range = countlyCommon.getPeriodRange(getPeriod(), timezone, offset);
                    assertRange(range, timezone);
                });

                describe("with different server default timezone", function() {
                    var originalDefault;

                    before(function() {
                        originalDefault = moment.tz.guess() || "Europe/Istanbul";
                        moment.tz.setDefault(originalDefault);
                    });

                    afterEach(function() {
                        moment.tz.setDefault(originalDefault);
                    });

                    it("should still work when system timezone is UTC", function() {
                        moment.tz.setDefault("UTC");
                        var timezone = "Europe/Istanbul";
                        var range = countlyCommon.getPeriodRange(getPeriod(), timezone);
                        assertRange(range, timezone);
                    });

                    it("should still work when system timezone is Europe/Moscow", function() {
                        moment.tz.setDefault("Europe/Moscow");
                        var offset = -120; // UTC+2
                        var range = countlyCommon.getPeriodRange(getPeriod(), undefined, offset);
                        assertRange(range, null, offset);
                    });
                });
            });
        });

        describe("keyword period month", function() {
            function computeExpectedRange(timezone, offset) {
                var reference = moment().utc();
                var startTimestamp = reference.clone().startOf("year");
                var endTimestamp = reference.clone().endOf("day");
                var effectiveOffset = typeof offset === "number" ? offset : -(timezone ? moment.tz(timezone).utcOffset() : 0);

                return {
                    start: startTimestamp.valueOf() + effectiveOffset * 60000,
                    end: endTimestamp.valueOf() + effectiveOffset * 60000
                };
            }

            function assertMonthRange(range, timezone, offset, expected) {
                range.$gte.should.equal(expected.start);
                range.$lte.should.equal(expected.end);

                var expectedStartString = formatForUser(expected.start, timezone, offset);
                var expectedEndString = formatForUser(expected.end, timezone, offset);

                formatForUser(range.$gte, timezone, offset).should.equal(expectedStartString);
                formatForUser(range.$lte, timezone, offset).should.equal(expectedEndString);
            }

            it("should align start and end when only timezone is provided", function() {
                var timezone = "Europe/Istanbul";
                var range = countlyCommon.getPeriodRange("month", timezone);
                var expected = computeExpectedRange(timezone);
                assertMonthRange(range, timezone, undefined, expected);
            });

            it("should align start and end when only America/New_York timezone is provided", function() {
                var timezone = "America/New_York";
                var range = countlyCommon.getPeriodRange("month", timezone);
                var expected = computeExpectedRange(timezone);
                assertMonthRange(range, timezone, undefined, expected);
            });

            it("should align start and end when only offset is provided", function() {
                var offset = -180;
                var range = countlyCommon.getPeriodRange("month", undefined, offset);
                var expected = computeExpectedRange(undefined, offset);
                assertMonthRange(range, null, offset, expected);
            });

            it("should align start and end when only America/New_York offset is provided", function() {
                var offset = 300;
                var range = countlyCommon.getPeriodRange("month", undefined, offset);
                var expected = computeExpectedRange(undefined, offset);
                assertMonthRange(range, null, offset, expected);
            });

            it("should align start and end when both timezone and offset are provided", function() {
                var timezone = "Europe/Istanbul";
                var offset = -180;
                var range = countlyCommon.getPeriodRange("month", timezone, offset);
                var expected = computeExpectedRange(timezone, offset);
                assertMonthRange(range, timezone, offset, expected);
            });

            it("should align start and end when America/New_York timezone and offset are provided", function() {
                var timezone = "America/New_York";
                var offset = 300;
                var range = countlyCommon.getPeriodRange("month", timezone, offset);
                var expected = computeExpectedRange(timezone, offset);
                assertMonthRange(range, timezone, offset, expected);
            });
        });

        describe("keyword period hour", function() {
            function computeExpectedRange(timezone, offset) {
                var reference = moment().utc();
                var startTimestamp = reference.clone().startOf("day");
                var endTimestamp = reference.clone().endOf("day");
                var effectiveOffset = typeof offset === "number" ? offset : -(timezone ? moment.tz(timezone).utcOffset() : 0);

                return {
                    start: startTimestamp.valueOf() + effectiveOffset * 60000,
                    end: endTimestamp.valueOf() + effectiveOffset * 60000
                };
            }

            function assertHourRange(range, timezone, offset, expected) {
                range.$gte.should.equal(expected.start);
                range.$lte.should.equal(expected.end);

                var expectedStartString = formatForUser(expected.start, timezone, offset);
                var expectedEndString = formatForUser(expected.end, timezone, offset);

                formatForUser(range.$gte, timezone, offset).should.equal(expectedStartString);
                formatForUser(range.$lte, timezone, offset).should.equal(expectedEndString);
            }

            it("should align start and end when only timezone is provided", function() {
                var timezone = "Europe/Istanbul";
                var range = countlyCommon.getPeriodRange("hour", timezone);
                var expected = computeExpectedRange(timezone);
                assertHourRange(range, timezone, undefined, expected);
            });

            it("should align start and end when only America/New_York timezone is provided", function() {
                var timezone = "America/New_York";
                var range = countlyCommon.getPeriodRange("hour", timezone);
                var expected = computeExpectedRange(timezone);
                assertHourRange(range, timezone, undefined, expected);
            });

            it("should align start and end when only offset is provided", function() {
                var offset = -180;
                var range = countlyCommon.getPeriodRange("hour", undefined, offset);
                var expected = computeExpectedRange(undefined, offset);
                assertHourRange(range, null, offset, expected);
            });

            it("should align start and end when only America/New_York offset is provided", function() {
                var offset = 300;
                var range = countlyCommon.getPeriodRange("hour", undefined, offset);
                var expected = computeExpectedRange(undefined, offset);
                assertHourRange(range, null, offset, expected);
            });

            it("should align start and end when both timezone and offset are provided", function() {
                var timezone = "Europe/Istanbul";
                var offset = -180;
                var range = countlyCommon.getPeriodRange("hour", timezone, offset);
                var expected = computeExpectedRange(timezone, offset);
                assertHourRange(range, timezone, offset, expected);
            });

            it("should align start and end when America/New_York timezone and offset are provided", function() {
                var timezone = "America/New_York";
                var offset = 300;
                var range = countlyCommon.getPeriodRange("hour", timezone, offset);
                var expected = computeExpectedRange(timezone, offset);
                assertHourRange(range, timezone, offset, expected);
            });
        });
    });
});
