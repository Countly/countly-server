const should = require("should");
const WhereClauseConverter = require("../../api/WhereClauseConverter");

describe("ClickHouse WhereClauseConverter", function() {
    let converter;
    beforeEach(function() {
        converter = new WhereClauseConverter();
    });
    describe("Basic field conditions", function() {
        it("should convert simple equality", function() {
            const mongoQuery = { a: "123", e: "event1" };
            const expectedSql = "WHERE `a`::String = {p0:String} AND `e`::String = {p1:String}";
            const expectedParams = { p0: "123", p1: "event1" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert numeric equality", function() {
            const mongoQuery = { count: 10, price: 99.99 };
            const expectedSql = "WHERE toFloat64OrNull(CAST(`count`, 'String')) = {p0:Float64} AND toFloat64OrNull(CAST(`price`, 'String')) = {p1:Float64}";
            const expectedParams = { p0: 10, p1: 99.99 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert boolean equality", function() {
            const mongoQuery = { active: true, deleted: false };
            const expectedSql = "WHERE `active`::Bool = {p0:Bool} AND `deleted`::Bool = {p1:Bool}";
            const expectedParams = { p0: true, p1: false };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert null values", function() {
            const mongoQuery = { field1: null };
            const expectedSql = "WHERE `field1` IS NULL";
            const expectedParams = {};

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should quote field names with hyphens", function() {
            const mongoQuery = { "sg.button-name": "Subscribe" };
            const expectedSql = "WHERE `sg`.`button-name`::String = {p0:String}";
            const expectedParams = { p0: "Subscribe" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should quote field names with hyphens in $in operator", function() {
            const mongoQuery = { "sg.button-name": { $in: ["Subscribe", "Cancel"] } };
            const expectedSql = "WHERE `sg`.`button-name`::String IN ({p0:String},{p1:String})";
            const expectedParams = { p0: "Subscribe", p1: "Cancel" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
    });

    describe("Comparison operators", function() {
        it("should convert $gt operator", function() {
            const mongoQuery = { age: { $gt: 18 } };
            const expectedSql = "WHERE toFloat64OrNull(CAST(`age`, 'String')) > {p0:Float64}";
            const expectedParams = { p0: 18 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert $gte operator", function() {
            const mongoQuery = { score: { $gte: 90 } };
            const expectedSql = "WHERE toFloat64OrNull(CAST(`score`, 'String')) >= {p0:Float64}";
            const expectedParams = { p0: 90 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert $lt operator", function() {
            const mongoQuery = { temperature: { $lt: 0 } };
            const expectedSql = "WHERE toFloat64OrNull(CAST(`temperature`, 'String')) < {p0:Float64}";
            const expectedParams = { p0: 0 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert $lte operator", function() {
            const mongoQuery = { humidity: { $lte: 50 } };
            const expectedSql = "WHERE toFloat64OrNull(CAST(`humidity`, 'String')) <= {p0:Float64}";
            const expectedParams = { p0: 50 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert $ne operator", function() {
            const mongoQuery = { status: { $ne: "inactive" } };
            const expectedSql = "WHERE `status`::String != {p0:String}";
            const expectedParams = { p0: "inactive" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert $ne with null to IS NOT NULL", function() {
            const mongoQuery = { status: { $ne: null } };
            const expectedSql = "WHERE `status` IS NOT NULL";
            const expectedParams = {};

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert multiple operators on same field", function() {
            const mongoQuery = { age: { $gte: 18, $lt: 65 } };
            const expectedSql = "WHERE toFloat64OrNull(CAST(`age`, 'String')) >= {p0:Float64} AND toFloat64OrNull(CAST(`age`, 'String')) < {p1:Float64}";
            const expectedParams = { p0: 18, p1: 65 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
    });

    describe("Special DateTime field handling", function() {
        it("should handle ts field with direct comparison", function() {
            const mongoQuery = { ts: { $gte: 1735678800000, $lt: 1751490000000 } };
            const expectedSql = "WHERE `ts` >= {p0:DateTime64(3)} AND `ts` < {p1:DateTime64(3)}";
            const expectedParams = { p0: 1735678800, p1: 1751490000 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert millisecond timestamps to seconds for DateTime64", function() {
            const mongoQuery = { ts: 1735678800000 };
            const expectedSql = "WHERE `ts` = {p0:DateTime64(3)}";
            const expectedParams = { p0: 1735678800 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
    });

    describe("Array operators", function() {
        it("should convert $in operator", function() {
            const mongoQuery = { "up.cc": { $in: ["CN", "IN", "TR"] } };
            const expectedSql = "WHERE `up`.`cc`::String IN ({p0:String},{p1:String},{p2:String})";
            const expectedParams = { p0: "CN", p1: "IN", p2: "TR" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert $nin operator", function() {
            const mongoQuery = { category: { $nin: ["spam", "deleted"] } };
            const expectedSql = "WHERE `category`::String NOT IN ({p0:String},{p1:String})";
            const expectedParams = { p0: "spam", p1: "deleted" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle empty $in array", function() {
            const mongoQuery = { tag: { $in: [] } };
            const expectedSql = "WHERE 1 = 0";
            const expectedParams = {};

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle empty $nin array", function() {
            const mongoQuery = { tag: { $nin: [] } };
            const expectedSql = "WHERE 1 = 1";
            const expectedParams = {};

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert $all operator", function() {
            const mongoQuery = { tags: { $all: ["red", "blue"] } };
            const expectedSql = "WHERE hasAll(`tags`, [{p0:String},{p1:String}])";
            const expectedParams = { p0: "red", p1: "blue" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
    });

    describe("Logical operators", function() {
        it("should convert simple $or", function() {
            const mongoQuery = {
                $or: [{ type: "A" }, { type: "B" }],
                status: "active"
            };
            const expectedSql = "WHERE (`type`::String = {p0:String} OR `type`::String = {p1:String}) AND `status`::String = {p2:String}";
            const expectedParams = { p0: "A", p1: "B", p2: "active" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert simple $and", function() {
            const mongoQuery = {
                $and: [{ age: { $gte: 18 } }, { age: { $lt: 65 } }],
                country: "US"
            };
            const expectedSql = "WHERE (toFloat64OrNull(CAST(`age`, 'String')) >= {p0:Float64} AND toFloat64OrNull(CAST(`age`, 'String')) < {p1:Float64}) AND `country`::String = {p2:String}";
            const expectedParams = { p0: 18, p1: 65, p2: "US" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert $nor operator", function() {
            const mongoQuery = { $nor: [{ status: "banned" }, { deleted: true }] };
            const expectedSql = "WHERE NOT (`status`::String = {p0:String} OR `deleted`::Bool = {p1:Bool})";
            const expectedParams = { p0: "banned", p1: true };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle empty $or array", function() {
            const mongoQuery = { $or: [], status: "active" };
            const expectedSql = "WHERE (1 = 0) AND `status`::String = {p0:String}";
            const expectedParams = { p0: "active" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle empty $and array", function() {
            const mongoQuery = { $and: [], status: "active" };
            const expectedSql = "WHERE (1 = 1) AND `status`::String = {p0:String}";
            const expectedParams = { p0: "active" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
    });

    describe("Complex nested queries", function() {
        it("should handle nested $and and $or", function() {
            const mongoQuery = {
                $and: [
                    { $or: [{ a: 1 }, { b: 2 }] },
                    { $or: [{ c: 3 }, { d: 4 }] }
                ],
                e: 5
            };
            const expectedSql = "WHERE ((toFloat64OrNull(CAST(`a`, 'String')) = {p0:Float64} OR toFloat64OrNull(CAST(`b`, 'String')) = {p1:Float64}) AND (toFloat64OrNull(CAST(`c`, 'String')) = {p2:Float64} OR toFloat64OrNull(CAST(`d`, 'String')) = {p3:Float64})) AND toFloat64OrNull(CAST(`e`, 'String')) = {p4:Float64}";
            const expectedParams = { p0: 1, p1: 2, p2: 3, p3: 4, p4: 5 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle complex drill query from comparison log", function() {
            const mongoQuery = {
                "up.age": { $lt: 90 },
                "$or": [
                    { "up.cc": { $in: ["CN", "IN", "TR"] } },
                    { "up.cty": { $in: ["Tokyo"] } }
                ],
                "ts": { $gte: 1735678800000, $lt: 1751490000000 },
                "a": "686267600c6cdf2e1f91709b",
                "e": "[CLY]_session"
            };
            const expectedSql = "WHERE (`up`.`cc`::String IN ({p0:String},{p1:String},{p2:String}) OR `up`.`cty`::String IN ({p3:String})) AND toFloat64OrNull(CAST(`up`.`age`, 'String')) < {p4:Float64} AND `ts` >= {p5:DateTime64(3)} AND `ts` < {p6:DateTime64(3)} AND `a`::String = {p7:String} AND `e`::String = {p8:String}";
            const expectedParams = {
                p0: "CN",
                p1: "IN",
                p2: "TR",
                p3: "Tokyo",
                p4: 90,
                p5: 1735678800,
                p6: 1751490000,
                p7: "686267600c6cdf2e1f91709b",
                p8: "[CLY]_session"
            };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle deeply nested logical operators", function() {
            const mongoQuery = {
                $or: [
                    { $and: [{ a: 1 }, { b: 2 }] },
                    { $and: [{ c: 3 }, { d: 4 }] }
                ]
            };
            const expectedSql = "WHERE ((toFloat64OrNull(CAST(`a`, 'String')) = {p0:Float64} AND toFloat64OrNull(CAST(`b`, 'String')) = {p1:Float64}) OR (toFloat64OrNull(CAST(`c`, 'String')) = {p2:Float64} AND toFloat64OrNull(CAST(`d`, 'String')) = {p3:Float64}))";
            const expectedParams = { p0: 1, p1: 2, p2: 3, p3: 4 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
    });

    describe("String operators", function() {
        it("should convert $regex operator", function() {
            const mongoQuery = { name: { $regex: "^John" } };
            const expectedSql = "WHERE match(`name`::String, {p0:String})";
            const expectedParams = { p0: "^John" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert rgxcn (regex contains) operator", function() {
            const mongoQuery = { description: { rgxcn: "error" } };
            const expectedSql = "WHERE match(`description`::String, {p0:String})";
            const expectedParams = { p0: "error" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert rgxntc (regex not contains) operator", function() {
            const mongoQuery = { log: { rgxntc: "debug" } };
            const expectedSql = "WHERE NOT match(`log`::String, {p0:String})";
            const expectedParams = { p0: "debug" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert rgxbw (regex begins with) operator", function() {
            const mongoQuery = { path: { rgxbw: "/api/" } };
            const expectedSql = "WHERE startsWith(`path`::String, {p0:String})";
            const expectedParams = { p0: "/api/" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert rgxitl (regex case insensitive) operator", function() {
            const mongoQuery = { email: { rgxitl: "admin" } };
            const expectedSql = "WHERE match(`email`::String, {p0:String})";
            const expectedParams = { p0: "(?i)admin" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
    });

    describe("String operators with converted regex. (Drill preprocessing converts base operators to regex.)", function() {
        it("Test start with case", function() {
            const mongoQuery = { name: { $regex: new RegExp("^John") } };
            const expectedSql = "WHERE match(`name`::String, {p0:String})";
            const expectedParams = { p0: "^John" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
        it("test contains case", function() {
            const mongoQuery = { name: { $regex: new RegExp(".*John.*") } };
            const expectedSql = "WHERE match(`name`::String, {p0:String})";
            const expectedParams = { p0: ".*John.*" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
        it("Test not contains case", function() {
            const mongoQuery = { name: {"$not": new RegExp(".*John.*") }};
            const expectedSql = "WHERE NOT (match(`name`::String, {p0:String}))";
            const expectedParams = { p0: ".*John.*" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

    });

    describe("Special operators", function() {
        it("should convert $exists true", function() {
            const mongoQuery = { username: { $exists: true } };
            const expectedSql = "WHERE `username` IS NOT NULL";
            const expectedParams = {};

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert $exists false", function() {
            const mongoQuery = { deletedAt: { $exists: false } };
            const expectedSql = "WHERE `deletedAt` IS NULL";
            const expectedParams = {};

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should convert $size operator", function() {
            const mongoQuery = { tags: { $size: 3 } };
            const expectedSql = "WHERE length(`tags`) = {p0:Float64}";
            const expectedParams = { p0: 3 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
    });

    describe("$not operator", function() {
        it("should negate simple equality", function() {
            const mongoQuery = { status: { $not: { $ne: "active" } } };
            const expectedSql = "WHERE NOT (`status`::String != {p0:String})";
            const expectedParams = { p0: "active" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle field-level $not", function() {
            const mongoQuery = { age: { $not: { $gte: 18 } } };
            const expectedSql = "WHERE NOT (toFloat64OrNull(CAST(`age`, 'String')) >= {p0:Float64})";
            const expectedParams = { p0: 18 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle query-level $not", function() {
            const mongoQuery = { $not: { status: "active", type: "premium" } };
            const expectedSql = "WHERE NOT (`status`::String = {p0:String} AND `type`::String = {p1:String})";
            const expectedParams = { p0: "active", p1: "premium" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle empty $not object as existence check", function() {
            const mongoQuery = { "up.username": { $not: {} } };
            const expectedSql = "WHERE `up`.`username` IS NOT NULL";
            const expectedParams = {};

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
    });

    describe("Real-world Countly Drill queries", function() {
        it("should handle user profile queries", function() {
            const mongoQuery = {
                "a": "app123",
                "e": "[CLY]_session",
                "up.cc": { $in: ["US", "UK", "CA"] },
                "up.cty": "New York",
                "up.la": { $in: ["en", "es"] }
            };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.containEql("`up`.`cc`::String IN");
            result.sql.should.containEql("`up`.`cty`::String = ");
            result.sql.should.containEql("`up`.`la`::String IN");
        });

        it("should handle custom event segmentation", function() {
            const mongoQuery = {
                "a": "app123",
                "e": "Purchase",
                "sg.Category": { $in: ["Electronics", "Clothing"] },
                "sg.Price": { $gte: 50, $lte: 500 },
                "ts": { $gte: 1735678800000 }
            };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.containEql("`sg`.`Category`::String IN");
            result.sql.should.containEql("toFloat64OrNull(CAST(`sg`.`Price`, 'String')) >=");
            result.sql.should.containEql("toFloat64OrNull(CAST(`sg`.`Price`, 'String')) <=");
        });

        it("should handle session duration queries", function() {
            const mongoQuery = {
                "a": "app123",
                "e": "[CLY]_session",
                "dur": { $gt: 60 },
                "sc": { $gte: 1 }
            };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.containEql("toFloat64OrNull(CAST(`dur`, 'String')) >");
            result.sql.should.containEql("toFloat64OrNull(CAST(`sc`, 'String')) >=");
        });
    });

    describe("Edge cases and error handling", function() {
        it("should handle empty query object", function() {
            const mongoQuery = {};
            const expectedSql = "";
            const expectedParams = {};

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should throw error for invalid root literal", function() {
            should.throws(() => {
                converter.queryObjToWhere("invalid");
            }, /Unexpected literal at root/);
        });

        it("should throw error for array at root", function() {
            should.throws(() => {
                converter.queryObjToWhere([{ a: 1 }]);
            }, /Unexpected literal at root/);
        });

        it("should handle special characters in field names", function() {
            const mongoQuery = {
                "custom.field-name": "value",
                "up.email@domain": "test"
            };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.containEql("`custom`.`field-name`::String");
            result.sql.should.containEql("`up`.`email@domain`::String");
        });

        it("should skip fields with unprocessable values", function() {
            const mongoQuery = {
                createdAt: new Date('2024-01-01'),
                name: "John"
            };
            const expectedSql = "WHERE `name`::String = {p0:String}";
            const expectedParams = { p0: "John" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
    });

    describe("Type inference", function() {
        it("should infer correct types for values", function() {
            const mongoQuery = {
                str: "hello",
                num: 42,
                float: 3.14,
                bool: true,
                arr: ["a", "b"],
                nil: null
            };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.containEql("`str`::String");
            result.sql.should.containEql("toFloat64OrNull(CAST(`num`, 'String'))");
            result.sql.should.containEql("toFloat64OrNull(CAST(`float`, 'String'))");
            result.sql.should.containEql("`bool`::Bool");
            result.sql.should.containEql("`arr`::Array(String)");
            result.sql.should.containEql("`nil` IS NULL");
        });
    });

    describe("JSON field handling", function() {
        it("should handle nested JSON paths", function() {
            const mongoQuery = {
                "up.profile.age": { $gte: 18 },
                "custom.data.category": "premium",
                "sg.items.0.price": { $gt: 100 }
            };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.containEql("`up`.`profile`.`age`");
            result.sql.should.containEql("`custom`.`data`.`category`");
            result.sql.should.containEql("`sg`.`items`[1].`price`");
        });
    });

    describe("Operator precedence edge cases", function() {
        it("should properly parenthesize OR expressions when mixed with AND", function() {
            const mongoQuery = {
                $or: [{ field1: "value1" }, { field2: "value2" }],
                field3: "value3",
                field4: { $gt: 10 }
            };
            const expectedSql = "WHERE (`field1`::String = {p0:String} OR `field2`::String = {p1:String}) AND `field3`::String = {p2:String} AND toFloat64OrNull(CAST(`field4`, 'String')) > {p3:Float64}";
            const expectedParams = { p0: "value1", p1: "value2", p2: "value3", p3: 10 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle multiple OR expressions with proper parentheses", function() {
            const mongoQuery = {
                $or: [{ status: "active" }, { status: "pending" }],
                $and: [
                    { $or: [{ type: "A" }, { type: "B" }] },
                    { priority: "high" }
                ]
            };
            const expectedSql = "WHERE ((`type`::String = {p0:String} OR `type`::String = {p1:String}) AND `priority`::String = {p2:String}) AND (`status`::String = {p3:String} OR `status`::String = {p4:String})";
            const expectedParams = { p0: "A", p1: "B", p2: "high", p3: "active", p4: "pending" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle OR with mixed field and array operators", function() {
            const mongoQuery = {
                $or: [
                    { "up.cc": { $in: ["CN", "IN"] } },
                    { "up.cty": "Tokyo" },
                    { "up.age": { $lt: 30 } }
                ],
                active: true
            };
            const expectedSql = "WHERE (`up`.`cc`::String IN ({p0:String},{p1:String}) OR `up`.`cty`::String = {p2:String} OR toFloat64OrNull(CAST(`up`.`age`, 'String')) < {p3:Float64}) AND `active`::Bool = {p4:Bool}";
            const expectedParams = { p0: "CN", p1: "IN", p2: "Tokyo", p3: 30, p4: true };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle comparison log bug scenario - missing username NOT condition", function() {
            const mongoQuery = {
                "up.age": { $lt: 90 },
                "up.username": { $not: {} },
                $or: [
                    { "up.cc": { $in: ["CN", "IN", "TR"] } },
                    { "up.cty": { $in: ["Tokyo"] } }
                ],
                ts: { $gte: 1735678800000, $lt: 1751490000000 },
                a: "686267600c6cdf2e1f91709b",
                e: "[CLY]_session"
            };

            const result = converter.queryObjToWhere(mongoQuery);
            // Should properly parenthesize the OR condition
            result.sql.should.containEql("(`up`.`cc`::String IN ({p0:String},{p1:String},{p2:String}) OR `up`.`cty`::String IN ({p3:String}))");
            // Should have all other conditions connected with AND
            result.sql.should.containEql("AND toFloat64OrNull(CAST(`up`.`age`, 'String')) < {p4:Float64}");
            result.sql.should.containEql("AND `ts` >= {p5:DateTime64(3)}");
            result.sql.should.containEql("AND `a`::String = {p7:String}");
        });

        it("should handle nested logical expressions with proper parentheses", function() {
            const mongoQuery = {
                $and: [
                    { $or: [{ a: 1 }, { b: 2 }] }
                ],
                c: 3
            };
            const expectedSql = "WHERE ((toFloat64OrNull(CAST(`a`, 'String')) = {p0:Float64} OR toFloat64OrNull(CAST(`b`, 'String')) = {p1:Float64})) AND toFloat64OrNull(CAST(`c`, 'String')) = {p2:Float64}";
            const expectedParams = { p0: 1, p1: 2, p2: 3 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle complex nested precedence correctly", function() {
            const mongoQuery = {
                $or: [
                    { field1: "a", field2: "b" },
                    { field3: "c" }
                ],
                $and: [
                    { field4: "d" },
                    { $or: [{ field5: "e" }, { field6: "f" }] }
                ]
            };

            const result = converter.queryObjToWhere(mongoQuery);
            // Both logical operators should be present and properly parenthesized
            result.sql.should.containEql("(`field4`::String = {p0:String} AND (`field5`::String = {p1:String} OR `field6`::String = {p2:String}))");
            result.sql.should.containEql("((`field1`::String = {p3:String} AND `field2`::String = {p4:String}) OR `field3`::String = {p5:String})");
        });
    });

    describe("AND conditions within OR parentheses", function() {
        it("should properly parenthesize implicit AND conditions within OR", function() {
            const mongoQuery = {
                $or: [
                    { e: "[CLY]_custom", n: "Login" },
                    { e: "[CLY]_session" }
                ]
            };
            const expectedSql = "WHERE ((`e`::String = {p0:String} AND `n`::String = {p1:String}) OR `e`::String = {p2:String})";
            const expectedParams = { p0: "[CLY]_custom", p1: "Login", p2: "[CLY]_session" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle multiple AND conditions in different OR branches", function() {
            const mongoQuery = {
                $or: [
                    { event: "purchase", category: "electronics", price: { $gte: 100 } },
                    { event: "view", page: "home" },
                    { event: "click", element: "button", position: "top" }
                ]
            };
            const expectedSql = "WHERE ((`event`::String = {p0:String} AND `category`::String = {p1:String} AND toFloat64OrNull(CAST(`price`, 'String')) >= {p2:Float64}) OR (`event`::String = {p3:String} AND `page`::String = {p4:String}) OR (`event`::String = {p5:String} AND `element`::String = {p6:String} AND `position`::String = {p7:String}))";
            const expectedParams = {
                p0: "purchase",
                p1: "electronics",
                p2: 100,
                p3: "view",
                p4: "home",
                p5: "click",
                p6: "button",
                p7: "top"
            };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle mixed single and multi-condition OR branches", function() {
            const mongoQuery = {
                $or: [
                    { status: "active" },
                    { type: "premium", verified: true },
                    { role: "admin" }
                ]
            };
            const expectedSql = "WHERE (`status`::String = {p0:String} OR (`type`::String = {p1:String} AND `verified`::Bool = {p2:Bool}) OR `role`::String = {p3:String})";
            const expectedParams = { p0: "active", p1: "premium", p2: true, p3: "admin" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle complex nested conditions with AND within OR", function() {
            const mongoQuery = {
                a: "686267600c6cdf2e1f91709b",
                $or: [
                    { "up.cc": "US", "up.age": { $gte: 25 } },
                    { "up.cc": "UK", "up.verified": true }
                ],
                ts: { $gte: 1735678800000 }
            };
            const expectedSql = "WHERE ((`up`.`cc`::String = {p0:String} AND toFloat64OrNull(CAST(`up`.`age`, 'String')) >= {p1:Float64}) OR (`up`.`cc`::String = {p2:String} AND `up`.`verified`::Bool = {p3:Bool})) AND `a`::String = {p4:String} AND `ts` >= {p5:DateTime64(3)}";
            const expectedParams = {
                p0: "US",
                p1: 25,
                p2: "UK",
                p3: true,
                p4: "686267600c6cdf2e1f91709b",
                p5: 1735678800
            };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle deeply nested OR with AND conditions", function() {
            const mongoQuery = {
                $or: [
                    {
                        $and: [
                            { category: "electronics", price: { $lt: 500 } },
                            { brand: "apple" }
                        ]
                    },
                    { category: "books", author: "tolkien", available: true }
                ]
            };
            const expectedSql = "WHERE ((`category`::String = {p0:String} AND toFloat64OrNull(CAST(`price`, 'String')) < {p1:Float64} AND `brand`::String = {p2:String}) OR (`category`::String = {p3:String} AND `author`::String = {p4:String} AND `available`::Bool = {p5:Bool}))";
            const expectedParams = {
                p0: "electronics",
                p1: 500,
                p2: "apple",
                p3: "books",
                p4: "tolkien",
                p5: true
            };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle real Countly drill query with AND within OR", function() {
            const mongoQuery = {
                a: "686267600c6cdf2e1f91709b",
                e: "[CLY]_session",
                $or: [
                    { "up.cc": "CN", "sg.button": "subscribe" },
                    { "up.cc": "US", "sg.button": "login" },
                    { "up.cty": "Tokyo" }
                ],
                ts: { $gte: 1735678800000, $lt: 1751490000000 }
            };

            const result = converter.queryObjToWhere(mongoQuery);
            // Should properly parenthesize the multi-condition OR branches
            result.sql.should.containEql("(`up`.`cc`::String = ");
            result.sql.should.containEql(" AND `sg`.`button`::String = ");
            result.sql.should.containEql(") OR (`up`.`cc`::String = ");
            result.sql.should.containEql(" AND `sg`.`button`::String = ");
            result.sql.should.containEql(") OR `up`.`cty`::String = ");
        });
    });

    describe("sSearch functionality", function() {
        it("should handle sSearch as string (backward compatibility)", function() {
            const mongoQuery = { sSearch: "test" };
            const expectedSql = "WHERE (lower(`e`) LIKE lower({p0:String}) OR lower(`n`) LIKE lower({p1:String}))";
            const expectedParams = { p0: "%test%", p1: "%test%" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle sSearch as array of field descriptors", function() {
            const mongoQuery = {
                sSearch: [
                    { field: 'e', value: 'event' },
                    { field: 'n', value: 'name' }
                ]
            };
            const expectedSql = "WHERE (lower(`e`) LIKE lower({p0:String}) OR lower(`n`) LIKE lower({p1:String}))";
            const expectedParams = { p0: "%event%", p1: "%name%" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle sSearch array with mixed field types", function() {
            const mongoQuery = {
                sSearch: [
                    { field: 'e', value: 'purchase' },
                    { field: 'sg.category', value: 'electronics' }
                ]
            };
            const expectedSql = "WHERE (lower(`e`) LIKE lower({p0:String}) OR lower(`sg`.`category`) LIKE lower({p1:String}))";
            const expectedParams = { p0: "%purchase%", p1: "%electronics%" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should escape special characters in sSearch values", function() {
            const mongoQuery = { sSearch: "test%_\\" };
            const expectedSql = "WHERE (lower(`e`) LIKE lower({p0:String}) OR lower(`n`) LIKE lower({p1:String}))";
            const expectedParams = { p0: "%test\\%\\_\\\\%", p1: "%test\\%\\_\\\\%" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle sSearch array with empty or invalid items", function() {
            const mongoQuery = {
                sSearch: [
                    { field: 'e', value: 'valid' },
                    { field: '', value: 'invalid' }, // empty field
                    { field: 'n', value: '' }, // empty value
                    { field: 'x' }, // missing value
                    { value: 'missing_field' }, // missing field
                    null, // null item
                    { field: 'y', value: 'ok' } // valid item
                ]
            };
            const expectedSql = "WHERE (lower(`e`) LIKE lower({p0:String}) OR lower(`y`) LIKE lower({p1:String}))";
            const expectedParams = { p0: "%valid%", p1: "%ok%" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle sSearch with $not operator", function() {
            const mongoQuery = { sSearch: { $not: "excluded" } };
            const expectedSql = "WHERE NOT ((lower(`e`) LIKE lower({p0:String}) OR lower(`n`) LIKE lower({p1:String})))";
            const expectedParams = { p0: "%excluded%", p1: "%excluded%" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle sSearch array with $not operator", function() {
            const mongoQuery = {
                sSearch: {
                    $not: [
                        { field: 'e', value: 'blocked' },
                        { field: 'n', value: 'forbidden' }
                    ]
                }
            };
            const expectedSql = "WHERE NOT ((lower(`e`) LIKE lower({p0:String}) OR lower(`n`) LIKE lower({p1:String})))";
            const expectedParams = { p0: "%blocked%", p1: "%forbidden%" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should combine sSearch with other conditions", function() {
            const mongoQuery = {
                a: "app123",
                sSearch: "test",
                e: "[CLY]_session"
            };
            const expectedSql = "WHERE `a`::String = {p0:String} AND (lower(`e`) LIKE lower({p1:String}) OR lower(`n`) LIKE lower({p2:String})) AND `e`::String = {p3:String}";
            const expectedParams = { p0: "app123", p1: "%test%", p2: "%test%", p3: "[CLY]_session" };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });

        it("should handle sSearch array with other conditions", function() {
            const mongoQuery = {
                a: "app123",
                sSearch: [
                    { field: 'e', value: 'event' },
                    { field: 'n', value: 'name' }
                ],
                ts: { $gte: 1735678800000 }
            };
            const expectedSql = "WHERE `a`::String = {p0:String} AND (lower(`e`) LIKE lower({p1:String}) OR lower(`n`) LIKE lower({p2:String})) AND `ts` >= {p3:DateTime64(3)}";
            const expectedParams = { p0: "app123", p1: "%event%", p2: "%name%", p3: 1735678800 };

            const result = converter.queryObjToWhere(mongoQuery);
            result.sql.should.equal(expectedSql);
            result.params.should.deepEqual(expectedParams);
        });
    });

    describe("Additional comprehensive tests", function() {
        describe("Identifier quoting & escaping", function() {
            it("quotes identifiers with dots/hyphens/@/spaces/leading digit", function() {
                const mongoQuery = {
                    "sg.button-name": "Subscribe",
                    "up.email@domain": "a@b.c",
                    "weird name": "ok",
                    "9lives": "cat"
                };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal(
                    "WHERE `sg`.`button-name`::String = {p0:String} AND `up`.`email@domain`::String = {p1:String} AND `weird name`::String = {p2:String} AND `9lives`::String = {p3:String}"
                );
            });

            it("escapes backticks inside identifiers", function() {
                const mongoQuery = { "cra`zy": "x" };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE `cra``zy`::String = {p0:String}");
            });

            it("quotes reserved keywords as identifiers", function() {
                const mongoQuery = { select: "x", date: "2025-01-01" };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE `select`::String = {p0:String} AND `date`::String = {p1:String}");
            });
        });

        describe("NULL semantics", function() {
            it("uses IS NULL for literal null", function() {
                const mongoQuery = { field1: null, field2: "x" };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE `field1` IS NULL AND `field2`::String = {p0:String}");
                result.params.should.deepEqual({ p0: "x" });
            });

            it("uses IS NOT NULL for $ne null", function() {
                const mongoQuery = { field1: { $ne: null } };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE `field1` IS NOT NULL");
                result.params.should.deepEqual({});
            });
        });

        describe("Numeric comparisons without string cast", function() {
            it("omits String cast in numeric comparisons", function() {
                const mongoQuery = { age: { $gt: 18 }, score: { $lte: 99.5 } };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal(
                    "WHERE toFloat64OrNull(CAST(`age`, 'String')) > {p0:Float64} AND toFloat64OrNull(CAST(`score`, 'String')) <= {p1:Float64}"
                );
                result.params.should.deepEqual({ p0: 18, p1: 99.5 });
            });
        });

        describe("$size correctness", function() {
            it("generates length(field) for $size (array/string)", function() {
                const mongoQuery = { tags: { $size: 3 } };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE length(`tags`) = {p0:Float64}");
                result.params.should.deepEqual({ p0: 3 });
            });
        });

        describe("$eq and regex $options", function() {
            it("supports $eq", function() {
                const mongoQuery = { price: { $eq: 10 } };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE toFloat64OrNull(CAST(`price`, 'String')) = {p0:Float64}");
                result.params.should.deepEqual({ p0: 10 });
            });

            it("supports $regex with $options: 'i'", function() {
                const mongoQuery = { name: { $regex: "john", $options: "i" } };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE match(`name`::String, {p0:String})");
                result.params.should.deepEqual({ p0: "(?i)john" });
            });
        });

        describe("$all empty and $nor empty", function() {
            it("treats $all: [] as tautology", function() {
                const mongoQuery = { tags: { $all: [] }, a: 1 };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE (1 = 1) AND toFloat64OrNull(CAST(`a`, 'String')) = {p0:Float64}");
                result.params.should.deepEqual({ p0: 1 });
            });

            it("handles empty $nor array as (1 = 1)", function() {
                const mongoQuery = { $nor: [], status: "ok" };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE (1 = 1) AND `status`::String = {p0:String}");
                result.params.should.deepEqual({ p0: "ok" });
            });
        });

        describe("DateTime64 in arrays ($in/$nin)", function() {
            it("converts ms -> seconds for DateTime64 in $in", function() {
                const conv = new WhereClauseConverter({ specialFields: { ts: "DateTime64(3)" } });
                const mongoQuery = { ts: { $in: [1735678800000, 1735679800000] } };
                const result = conv.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE `ts` IN ({p0:DateTime64(3)},{p1:DateTime64(3)})");
                result.params.should.deepEqual({ p0: 1735678800, p1: 1735679800 });
            });
        });

        describe("Precedence + NOT guard", function() {
            it("keeps precedence with NOT over OR", function() {
                const mongoQuery = {
                    $not: { $or: [{ a: 1 }, { b: 2 }] },
                    c: 3
                };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.containEql("NOT ((toFloat64OrNull(CAST(`a`, 'String')) = {p0:Float64} OR toFloat64OrNull(CAST(`b`, 'String')) = {p1:Float64}))");
                result.sql.should.containEql("toFloat64OrNull(CAST(`c`, 'String')) = {p2:Float64}");
            });
        });

        describe("Field-level $not + string operator", function() {
            it("negates string operator under $not", function() {
                const mongoQuery = { name: { $not: { rgxcn: "err" } } };
                const result = converter.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE NOT (match(`name`::String, {p0:String}))");
                result.params.should.deepEqual({ p0: "err" });
            });
        });

        describe("Special fields in arrays for $in", function() {
            it("applies special field conversion for arrays in $in", function() {
                const conv = new WhereClauseConverter({ specialFields: { ts: "DateTime64(3)" } });
                const mongoQuery = { ts: { $in: [new Date("2025-01-01T00:00:00Z"), 1735678800000] } };
                const result = conv.queryObjToWhere(mongoQuery);
                result.sql.should.equal("WHERE `ts` IN ({p0:DateTime64(3)},{p1:DateTime64(3)})");
                result.params.p0.should.be.Number();
                result.params.p1.should.be.Number();
            });
        });
    });
});