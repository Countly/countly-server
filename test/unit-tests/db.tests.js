var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
var plugins = require("../../plugins/pluginManager");
var db = "";


function runTest(options) {
    it('Running with callbacks correctly', function(done) {
        if (options.op === "insert") {
            db.collection("testCommands").insert(options.query, function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    res.should.have.property("acknowledged", true);
                    res.should.have.property("insertedCount", 1);
                    res.should.have.property("insertedId");
                    if (options.query._id) {
                        res.should.have.property("insertedId", options.query._id);
                    }
                    done();
                }
            });
        }
        else if (options.op === "findAndModify") {
            db.collection("testCommands").findAndModify(options.query, options.sort || {}, options.update, options.options, function(err, res) {
                should.not.exist(err);
                console.log(JSON.stringify(res));
                res.should.have.property("value");
                if (options.options.new) {
                    if (options.update.$set.name) {
                        res.value.should.have.property("name", options.update.$set.name);
                    }
                }
                else {
                    if (options.query.name) {
                        res.value.should.have.property("name", options.query.name);
                    }
                }
                if (options.query._id) {
                    res.value.should.have.property("_id", options.query._id);
                }

                done();
            });
        }
        else {
            done("unkonown op: " + options.op);
        }
    });

    it('Running with callbacks + error', function(done) {
        if (options.queryError) {
            if (options.op === "insert") {
                db.collection("testCommands").insert(options.queryError, function(err, res) {
                    if (err) {
                        err.should.have.property.code;
                        done();
                    }
                    else {
                        done("Should have failed with error but succeeded");
                    }
                });
            }
            else if (options.op === "findAndModify") {
                db.collection("testCommands").findAndModify(options.query, options.sort || [], options.update, options.options, function(err, res) {
                    should.not.exist(err);
                    console.log("                " + JSON.stringify(res));
                    res.should.have.property("value");
                    if (options.query.name) {
                        res.value.should.have.property("name", options.query);
                    }
                    if (options.query._id) {
                        res.value.should.have.property("_id", options.query._id);
                    }
                    done();
                });
            }
            else {
                done("unkonown op: " + options.op);
            }
        }
        else {
            done();
        }

    });

    it('Running with promises correctly', async function() {
        if (options.op === "insert") {

            var res = await db.collection("testCommands2").insert(options.query);
            console.log("           " + JSON.stringify(res));
            res.should.have.property("acknowledged", true);
            //res.should.have.property("insertedCount", 1);
            res.should.have.property("insertedId");
            if (options.query._id) {
                res.should.have.property("insertedId", options.query._id);
            }

        }
        else if (options.op === "findAndModify") {
            var res = await db.collection("testCommands2").findAndModify(options.query, options.sort || [], options.update, options.options);
            console.log("              " + JSON.stringify(res));

            if (options.options.remove) {
                if (options.query._id) {
                    res.should.have.property("_id", options.query._id);
                }
                else {
                    res.should.have.property("_id");
                }

                if (options.query.name) {
                    res.should.have.property("name", options.query.name);
                }
                else {
                    res.should.have.property("name");
                }
            }
            else {
                res.should.have.property("value");
                if (options.options.new) {
                    res.value.should.have.property("name", options.update.$set.name);
                }
                else {
                    if (options.query.name) {
                        res.value.should.have.property("name", options.query.name);
                    }
                }
                if (options.query._id) {
                    res.value.should.have.property("_id", options.query._id);
                }
                else {
                    res.value.should.have.property("_id");
                }
            }

        }
        else {
            throw new Error("unkonown op: " + options.op);
        }
    });

    it('Running with promises + error', async function() {
        if (options.queryError) {
            if (options.op === "insert") {
                try {
                    var res = await db.collection("testCommands2").insert(options.queryError);
                    throw new Error("Should have failed with error but succeeded");
                }
                catch (err) {
                    err.should.have.property.code;
                }
            }
            else if (options.op === "findAndModify") {
                try {
                    var res = await db.collection("testCommands2").findAndModify(options.query, options.sort || [], options.update, options.options);
                    throw new Error("Should have failed with error but succeeded");
                }
                catch (err) {
                    err.should.have.property.code;
                }
            }
            else {
                throw new Error("unkonown op: " + options.op);
            }
        }

    });
}
describe('Testing Simple database operations', function() {

    describe('Setting up db connection', function() {
        before('Create db connection', async function() {
            testUtils.db = await plugins.dbConnection("countly");
            testUtils.client = testUtils.db.client;
        });
        it('Setting db', function(done) {
            db = testUtils.client.db("countly");
            done();
        });
    });

    describe('Cleanup', function() {
        it('should remove collection with callback', function(done) {
            db.collection("testCommands").drop(function(err, res) {
                if (err) {
                    console.log(err);
                }
                res.should.be.true;
                done();
            });

        });
        it('should remove collection with promise', async function() {
            var res = await db.collection("testCommands2").drop();
            res.should.be.true;
        });
    });

    describe("testing insert operation", function() {
        describe('should insert simple document without _id', function() {
            runTest({"op": "insert", query: { name: "test" }});
        });
        describe('should insert simple document with _id', function() {
            runTest({"op": "insert", query: {_id: "aaaaa", name: "test" }, queryError: {"_id": "aaaaa"}});
        });
    });

    describe('Testing findAndModify', function() {
        describe('Find and modify new + upsert(not existing)', function() {
            runTest({"op": "findAndModify", query: {_id: "bbbb"}, "update": { $set: { name: "test_b" } }, "options": { new: true, upsert: true }});
        });
        describe('Find and modify new + upsert(existing)', function() {
            runTest({"op": "findAndModify", query: {_id: "bbbb"}, "update": { $set: { name: "test_c" } }, "options": { new: true, upsert: true }});
        });
        describe('Find and modify upsert (existing)', function() {
            runTest({"op": "findAndModify", query: {_id: "bbbb"}, "update": { $set: { name: "test_d" } }, "options": { upsert: true }});
        });
        describe('Find and modify upsert:false,new:true', function() {
            runTest({"op": "findAndModify", query: { name: "test" }, "update": { $set: { name: "test2" } }, "options": { new: true }});
        });
        describe('Find and modify upsert:false,new:false', function() {
            runTest({"op": "findAndModify", query: { name: "test" }, "update": { $set: { name: "test2" } }, "options": { new: false }});
        });
        describe('Find and modify remove:true', function() {
            runTest({"op": "findAndModify", query: { _id: "aaaaa" }, "update": {}, "options": { remove: true }});
        });
    });

    describe('Testing aggregation pipeline', function() {
        describe('Run aggregation and get ', function() {
            runTest({"op": "findAndModify", query: {_id: "bbbb"}, "update": { $set: { name: "test_c" } }, "options": { new: true, upsert: true }});
        });
    });

    describe("test working with cursors", function() {
        it("test cursor using await and going toArray()", async function() {
            var cursor = db.collection("testCommands2").find();
            var res = await cursor.toArray();
            console.log(JSON.stringify(res));
            res.length.should.be.above(0);
            res.should.be.an.instanceOf(Array);
        });
        it("test cursor using await and going next()", async function() {
            var cursor = await db.collection("testCommands2").find({});
            var doc = await cursor.next();
            while (doc) {
                doc.should.have.property("_id");
                doc.should.have.property("name");
                doc = await cursor.next();
            }
        });
    });

    describe("test insert Many(+behaviour on duplicate)", function() {
        it("Insert once and check result(promise)", async function(done) {
            var rr = await db.collection("testCommands3").insertMany([{"_id": 1, "_id": 2, "_id": 3}]);

            var cursor = db.collection("testCommands3").find();
            var res = await cursor.toArray();
            res.should.have.property.length(3);
        });

        it("Insert again and check result(callback)", async function(done) {
            var rr = await db.collection("testCommands3").insertMany([{"_id": 4, "_id": 5, "_id": 6}]);

            db.collection("testCommands3").insertMany([{"_id": 4, "_id": 5, "_id": 6}], function(err, res) {
                db.collection("testCommands3").find().toArray(function(err, res) {
                    res.should.have.property.length(6);
                });
            });
        });

        it("Insert and should get duplicate error", async function(done) {
            var rr = await db.collection("testCommands3").insertMany([{"_id": 7, "_id": 1, "_id": 8}]);

            var cursor = db.collection("testCommands3").find();
            var res = await cursor.toArray();
            res.should.have.property.length(8);
        });

    });


    describe('Cleanup', function() {
        it('should remove collection with callback', function(done) {
            db.collection("testCommands").drop(function(err, res) {
                if (err) {
                    console.log(err);
                }
                res.should.be.true;
                done();
            });

        });
        it('should remove collection with promise', async function() {
            var res = await db.collection("testCommands2").drop();
            res.should.be.true;

            res = await db.collection("testCommands3").drop();
            res.should.be.true;
        });
        after('Close db connection', async function() {
            testUtils.client.close();
        });
    });
});