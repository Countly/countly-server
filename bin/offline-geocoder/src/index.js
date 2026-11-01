"use strict";

const reverse = require('./reverse');
const findLocation = require('./location').find;
const pluginManager = require("../../../plugins/pluginManager.js");

const NO_DB = 'Database connection failed';

function Geocoder(options) {
    var geocoder = function(options) {
        this.options = options || {};

        if (this.options.dbUrl === undefined) {
            this.options.dbUrl = 'mongodb://localhost:27017';
        }

        if (this.options.dbName === undefined) {
            this.options.dbName = 'countly';
        }

        if (this.options.collectionPrefix === undefined) {
            this.options.collectionPrefix = 'geocoder_';
        }

        this.dbClient = null;
        this.dbConnected = false;
        this.connecting = null;

        // NO connection here, on purpose. Every consumer builds this object at REQUIRE
        // time (api/parts/data/usage.js),
        // so connecting in the constructor opened a MongoDB socket merely by importing
        // the module — including in the unit suite, which has no database. The first
        // real lookup connects instead; until then this costs nothing.
    };

    // Connect once, lazily. Concurrent first calls share the in-flight promise rather
    // than opening N connections. A failure is reported and cleared, so a later call
    // can retry once the database is actually up — the eager version could never
    // recover from a blip at boot.
    geocoder.prototype.connect = async function() {
        if (this.dbConnected) {
            return;
        }
        // A caller that already holds a connection (api/parts/data/usage.js passes
        // common.db) shares it, rather than opening a second pool in every worker.
        const shared = typeof this.options.getDb === 'function' ? this.options.getDb() : null;
        if (shared) {
            this.db = shared;
            this.dbConnected = true;
            return;
        }
        if (!this.connecting) {
            this.connecting = pluginManager.dbConnection()
                .then((db) => {
                    this.db = db;
                    this.dbConnected = true;
                })
                .catch((err) => {
                    this.connecting = null;
                    this.dbConnected = false;
                    console.error('[offline-geocoder] database connection failed; geocoding unavailable:', err && err.message ? err.message : err);
                });
        }
        return this.connecting;
    };

    geocoder.prototype.reverse = async function(latitude, longitude, callback) {
        await this.connect();
        if (!this.dbConnected) {
            if (callback) {
                callback(NO_DB);
            }
            return Promise.reject(NO_DB);
        }
        return reverse(this, latitude, longitude, callback);
    };

    geocoder.prototype.location = async function(locationId, locationCountryId) {
        await this.connect();
        if (!this.dbConnected) {
            return Promise.reject(NO_DB);
        }

        return findLocation(this, locationId, locationCountryId);
    };

    return new geocoder(options);
}

module.exports = Geocoder;
