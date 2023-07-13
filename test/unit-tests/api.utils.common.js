var should = require("should");
var testUtils = require("../testUtils");
var common = require("../../api/utils/common");
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
            _ObjectID: mongodb.ObjectID
        };

        it('should validate ObjectID', () => {
            let id = mongodb.ObjectID(),
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

        it('should validate ObjectID[]', () => {
            let id1 = mongodb.ObjectID(),
                id2 = mongodb.ObjectID(),
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
            let id = mongodb.ObjectID(),
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
});
