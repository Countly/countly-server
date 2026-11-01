require("should");
var fs = require("fs");
var os = require("os");
var path = require("path");
var mongodb = require("mongodb");
var configextender = require("../../api/configextender");
var plugins = require("../../plugins/pluginManager.js");
var countlyConfig = require("../../frontend/express/config");

// Countly databases are named countly, countly_drill, countly_out and countly_fs by default.
// The "databases" config (one env var per database) names each database explicitly and is used
// as is, never parsed from or inserted into the connection string.
var NAMES = {
    countly: "analytics",
    countly_drill: "analytics_drill",
    countly_out: "analytics_out",
    countly_fs: "analytics_fs"
};
var CONNECTION = "mongodb://mongo-host:27017/?authSource=admin";

describe("pluginManager explicit database names", function() {
    describe("configextender env vars", function() {
        it("maps the four env vars into databases config and keeps a string connection intact", async function() {
            var config = configextender("API", {mongodb: CONNECTION}, {
                COUNTLY_CONFIG__DATABASES_COUNTLY: NAMES.countly,
                COUNTLY_CONFIG__DATABASES_COUNTLY_DRILL: NAMES.countly_drill,
                COUNTLY_CONFIG__DATABASES_COUNTLY_OUT: NAMES.countly_out,
                COUNTLY_CONFIG__DATABASES_COUNTLY_FS: NAMES.countly_fs
            });
            config.mongodb.should.equal(CONNECTION);
            config.databases.should.eql(NAMES);
            config.should.not.have.property("DATABASES");
        });

        it("sets a single database without touching the others", async function() {
            var config = configextender("FRONTEND", {mongodb: CONNECTION, databases: {countly: "countly_core"}}, {
                COUNTLY_CONFIG__DATABASES_COUNTLY_DRILL: "drill_core"
            });
            config.databases.should.eql({countly: "countly_core", countly_drill: "drill_core"});
        });

        it("does not create databases config when no env var is set", async function() {
            var config = configextender("API", {mongodb: CONNECTION}, {});
            config.should.not.have.property("databases");
        });

        it("env var overrides databases set in config file", async function() {
            var config = configextender("API", {mongodb: CONNECTION, databases: {countly: "from_file"}}, {
                COUNTLY_CONFIG__DATABASES_COUNTLY: "from_env"
            });
            config.databases.countly.should.equal("from_env");
        });
    });

    describe("getConfiguredDatabaseName", function() {
        it("returns the configured name", async function() {
            plugins.getConfiguredDatabaseName("countly_drill", {databases: NAMES}).should.equal(NAMES.countly_drill);
        });

        it("returns null when not configured, empty or not a string", async function() {
            (plugins.getConfiguredDatabaseName("countly", {}) === null).should.be.true();
            (plugins.getConfiguredDatabaseName("countly", {databases: {countly: ""}}) === null).should.be.true();
            (plugins.getConfiguredDatabaseName("countly", {databases: {countly: {}}}) === null).should.be.true();
            (plugins.getConfiguredDatabaseName("countly", null) === null).should.be.true();
        });

        it("accepts number-like names that env var parsing turns into numbers", async function() {
            var config = configextender("API", {mongodb: CONNECTION}, {COUNTLY_CONFIG__DATABASES_COUNTLY: "2024"});
            plugins.getConfiguredDatabaseName("countly", config).should.equal("2024");
            plugins.getConfiguredDatabaseName("countly", {mongodb: {host: "mongo-host", db: 2024}}).should.equal("2024");
        });

        it("ignores inherited Object.prototype keys", async function() {
            (plugins.getConfiguredDatabaseName("constructor", {databases: {}}) === null).should.be.true();
            (plugins.getConfiguredDatabaseName("toString", {databases: {}}) === null).should.be.true();
        });

        it("uses db of object form mongodb config for main database only", async function() {
            var config = {mongodb: {host: "mongo-host", port: 27017, db: "countly_base"}};
            plugins.getConfiguredDatabaseName("countly", config).should.equal("countly_base");
            (plugins.getConfiguredDatabaseName("countly_drill", config) === null).should.be.true();
        });

        it("databases.countly overrides db of mongodb config", async function() {
            var config = {mongodb: {host: "mongo-host", port: 27017, db: "countly_base"}, databases: {countly: "countly_core"}};
            plugins.getConfiguredDatabaseName("countly", config).should.equal("countly_core");
        });

        it("does not take database name from a connection string", async function() {
            (plugins.getConfiguredDatabaseName("countly", {mongodb: "mongodb://mongo-host:27017/countly_base"}) === null).should.be.true();
        });

        it("uses db of database's own config file as lowest priority", async function() {
            var dbConfig = {mongodb: {host: "mongo-host", port: 27017, db: "custom_drill"}};
            plugins.getConfiguredDatabaseName("countly_drill", {}, dbConfig).should.equal("custom_drill");
            plugins.getConfiguredDatabaseName("countly_drill", {databases: {countly_drill: "drill_core"}}, dbConfig).should.equal("drill_core");
            (plugins.getConfiguredDatabaseName("countly_drill", {}, {mongodb: "mongodb://mongo-host:27017/custom_drill"}) === null).should.be.true();
        });

        it("does not use main config db for other databases or own config file db for main database", async function() {
            var main = {mongodb: {host: "mongo-host", port: 27017, db: "countly_base"}};
            (plugins.getConfiguredDatabaseName("countly_drill", main) === null).should.be.true();
            plugins.getConfiguredDatabaseName("countly", main, {mongodb: {db: "custom_drill"}}).should.equal("countly_base");
        });
    });

    describe("loadDbConfigFile", function() {
        it("returns null for databases without own config file", async function() {
            (plugins.loadDbConfigFile("countly") === null).should.be.true();
            (plugins.loadDbConfigFile(undefined) === null).should.be.true();
            (plugins.loadDbConfigFile("constructor") === null).should.be.true();
        });
    });

    describe("connections", function() {
        var original = {};
        var originalConnect;
        var originalBuildInfo;
        var originalEnv = {};

        before(async function() {
            //env overrides are applied again for drill/out/fs connections, e.g. COUNTLY_CONFIG__MONGODB_HOST
            //set in CI would replace the connection string used here, so run without them
            Object.keys(process.env).filter(function(k) {
                return k.indexOf("COUNTLY_CONFIG") === 0;
            }).forEach(function(k) {
                originalEnv[k] = process.env[k];
                delete process.env[k];
            });
            original.mongodb = countlyConfig.mongodb;
            original.databases = countlyConfig.databases;
            countlyConfig.mongodb = CONNECTION;
            countlyConfig.databases = Object.assign({}, NAMES);
            //no server needed to check which database a handle points to
            originalConnect = mongodb.MongoClient.prototype.connect;
            mongodb.MongoClient.prototype.connect = async function() {
                return this;
            };
            originalBuildInfo = mongodb.Admin.prototype.buildInfo;
            mongodb.Admin.prototype.buildInfo = async function() {
                return {version: "8.0.0"};
            };
        });

        after(async function() {
            mongodb.MongoClient.prototype.connect = originalConnect;
            mongodb.Admin.prototype.buildInfo = originalBuildInfo;
            countlyConfig.mongodb = original.mongodb;
            if (typeof original.databases === "undefined") {
                delete countlyConfig.databases;
            }
            else {
                countlyConfig.databases = original.databases;
            }
            Object.assign(process.env, originalEnv);
        });

        it("opens the configured database for each named connection", async function() {
            for (var name of ["countly", "countly_drill", "countly_out", "countly_fs"]) {
                var db = await plugins.dbConnection(name);
                db.databaseName.should.equal(NAMES[name]);
                await db.client.close();
            }
        });

        it("opens the configured main database for a config object (dashboard connection)", async function() {
            var db = await plugins.dbConnection(countlyConfig);
            db.databaseName.should.equal(NAMES.countly);
            await db.client.close();
        });

        it("opens configured databases on a shared connection", async function() {
            var dbs = await plugins.dbConnection(["countly", "countly_out", "countly_fs", "countly_drill"]);
            dbs.map(function(d) {
                return d.databaseName;
            }).should.eql([NAMES.countly, NAMES.countly_out, NAMES.countly_fs, NAMES.countly_drill]);
            await dbs[0].client.close();
        });

        it("does not put the configured name into the connection string or appname", async function() {
            var db = await plugins.dbConnection("countly_drill");
            db._cly_debug.connection.should.not.containEql(NAMES.countly_drill);
            db._cly_debug.options.appname.should.not.containEql(NAMES.countly_drill);
            await db.client.close();
        });

        it("falls back to names from the connection string when not configured", async function() {
            delete countlyConfig.databases;
            try {
                var db = await plugins.dbConnection("countly_drill");
                db.databaseName.should.equal("countly_drill");
                await db.client.close();
            }
            finally {
                countlyConfig.databases = Object.assign({}, NAMES);
            }
        });

        it("uses the configured name in command line connection params", async function() {
            plugins.getDbConnectionParams("countly").db.should.equal(NAMES.countly);
            plugins.getDbConnectionParams("countly_drill").db.should.equal(NAMES.countly_drill);
        });

        it("uses db of object form mongodb config for main database on every connection", async function() {
            countlyConfig.mongodb = {host: "mongo-host", port: 27017, db: "countly_base"};
            delete countlyConfig.databases;
            try {
                await checkObjectFormDb();
            }
            finally {
                countlyConfig.mongodb = CONNECTION;
                countlyConfig.databases = Object.assign({}, NAMES);
            }
        });

        /**
        * Checks every connection with object form mongodb config having db countly_base
        **/
        async function checkObjectFormDb() {
            var api = await plugins.dbConnection("countly");
            api.databaseName.should.equal("countly_base");
            await api.client.close();

            var dashboard = await plugins.dbConnection(countlyConfig);
            dashboard.databaseName.should.equal("countly_base");
            await dashboard.client.close();

            var drill = await plugins.dbConnection("countly_drill");
            drill.databaseName.should.equal("countly_drill");
            await drill.client.close();

            var shared = await plugins.dbConnection(["countly", "countly_drill"]);
            shared[0].databaseName.should.equal("countly_base");
            shared[1].databaseName.should.equal("countly_drill");
            await shared[0].client.close();

            plugins.getDbConnectionParams("countly").db.should.equal("countly_base");
        }

        it("uses db of drill config file unless databases.countly_drill is set", async function() {
            var file = path.join(os.tmpdir(), "countly-test-drill-config-" + process.pid + ".js");
            fs.writeFileSync(file, "module.exports = " + JSON.stringify({mongodb: {host: "mongo-host", port: 27017, db: "custom_drill"}}) + ";\n");
            var originalFile = plugins.dbConfigFiles.countly_drill;
            plugins.dbConfigFiles.countly_drill = file;
            try {
                delete countlyConfig.databases;
                var drill = await plugins.dbConnection("countly_drill");
                drill.databaseName.should.equal("custom_drill");
                await drill.client.close();
                var shared = await plugins.dbConnection(["countly", "countly_drill"]);
                shared[1].databaseName.should.equal("custom_drill");
                await shared[0].client.close();
                plugins.getDbConnectionParams("countly_drill").db.should.equal("custom_drill");

                countlyConfig.databases = {countly_drill: "drill_core"};
                drill = await plugins.dbConnection("countly_drill");
                drill.databaseName.should.equal("drill_core");
                await drill.client.close();
            }
            finally {
                plugins.dbConfigFiles.countly_drill = originalFile;
                fs.unlinkSync(file);
                countlyConfig.databases = Object.assign({}, NAMES);
            }
        });
    });
});
