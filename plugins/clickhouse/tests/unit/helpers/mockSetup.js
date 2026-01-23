/**
 * Mock setup for unit tests that need to mock core dependencies.
 *
 * This module provides isolated mocking that doesn't interfere with
 * existing unit tests that have their own mocking approach.
 */
const Module = require('module');

// Store original Module._load
const originalLoad = Module._load;
let mockingEnabled = false;

/**
 * Mock logger that mimics countly log interface
 */
function createMockLogger(prefix) {
    const noop = () => {};
    const logger = {
        d: noop,
        i: noop,
        w: noop, // Suppress warnings in tests
        e: noop, // Suppress error logging in tests
        debug: noop,
        info: noop,
        warn: noop,
        error: noop // Suppress error logging in tests
    };
    return logger;
}

/**
 * Create a mock ClickHouse client for testing
 * @param {Object} options - Mock options
 * @param {Array} [options.queryResults=[]] - Results to return from query()
 * @param {Object} [options.execResult={ success: true }] - Result to return from exec()
 * @param {Error} [options.queryError] - Error to throw from query()
 * @param {Error} [options.execError] - Error to throw from exec()
 * @returns {Object} Mock ClickHouse client
 */
function createMockClickHouseClient(options = {}) {
    const {
        queryResults = [],
        execResult = { success: true },
        queryError,
        execError
    } = options;

    return {
        exec: async(opts) => {
            if (execError) {
                throw execError;
            }
            return execResult;
        },
        query: async(opts) => {
            if (queryError) {
                throw queryError;
            }
            return {
                json: async() => queryResults
            };
        },
        command: async(opts) => {
            if (execError) {
                throw execError;
            }
            return execResult;
        },
        insert: async(opts) => {
            if (execError) {
                throw execError;
            }
            return execResult;
        },
        _lastExecQuery: null,
        _lastQueryQuery: null
    };
}

/**
 * Create a mock ClickHouse config for testing
 * @param {Object} overrides - Configuration overrides
 * @returns {Object} Mock ClickHouse configuration
 */
function createMockClickHouseConfig(overrides = {}) {
    return {
        cluster: { shards: false, replicas: false },
        database: 'countly_drill',
        url: 'http://localhost:8123',
        username: 'default',
        password: '',
        dictionary: {
            nativePort: 9000
        },
        ...overrides
    };
}

// Global mutable mock for common module - uses getters for dynamic access
let mockCommonOverrides = {};

// Default mock DB
const defaultMockDb = {
    collection: () => ({
        findOne: async() => null,
        find: () => ({ toArray: async() => [] }),
        insertOne: async() => ({ insertedId: 'mock_id' }),
        updateOne: async() => ({ modifiedCount: 1 }),
        deleteOne: async() => ({ deletedCount: 1 })
    })
};

// Singleton mock common object with dynamic getters
const mockCommon = {
    log: function(prefix) {
        return createMockLogger(prefix);
    },
    getConfig: () => ({}),
    dbUserHasAccessToCollection: () => true,
    // Use getters for dynamic properties that can be overridden
    get db() {
        return mockCommonOverrides.db || defaultMockDb;
    },
    get clickhouseQueryService() {
        return mockCommonOverrides.clickhouseQueryService || null;
    }
};

/**
 * Create a mock common module for testing
 * Returns the singleton mock common object
 * @returns {Object} Mock common module
 */
function createMockCommon() {
    return mockCommon;
}

/**
 * Set overrides for the mock common module
 * Use this to customize common behavior in tests
 * @param {Object} overrides - Overrides for common properties
 */
function setMockCommonOverrides(overrides) {
    mockCommonOverrides = overrides;
}

/**
 * Reset mock common overrides
 */
function resetMockCommonOverrides() {
    mockCommonOverrides = {};
}

/**
 * Setup module mocking for core dependencies.
 * Must be called before requiring any plugin modules that depend on core.
 */
function setupMocking() {
    console.log("setting up mocking");
    if (mockingEnabled) {
        return;
    }

    Module._load = function(request, parent) {
        // Mock the log.js module from core
        if (request.includes('api/utils/log.js') || request.includes('api/utils/log')) {
            return function(prefix) {
                return createMockLogger(prefix);
            };
        }

        // Mock common.js if needed
        if (request.includes('api/utils/common.js') || request.includes('api/utils/common')) {
            return createMockCommon();
        }

        // Mock api/config module
        if (request.includes('api/config') && !request.includes('config.sample') && !request.includes('configextender')) {
            return createMockClickHouseConfig();
        }

        // Mock pluginManager.js
        if (request.includes('pluginManager.js') || request.includes('pluginManager')) {
            return {
                getPluginsApis: () => ({}),
                dispatch: () => {},
                dispatchSync: () => {},
                isPluginEnabled: () => false
            };
        }

        // Mock countly.common.js (for WhereClauseConverter)
        if (request.includes('countly.common.js') || request.includes('countly.common')) {
            return {
                encode: (str) => str ? encodeURIComponent(str) : str,
                decode: (str) => str ? decodeURIComponent(str) : str
            };
        }

        return originalLoad.apply(this, arguments);
    };

    mockingEnabled = true;
}

/**
 * Reset module mocking
 */
// Do not setup mocking automatically. Must call setupMocking() manually in test setup/teardown.
function resetMocking() {
    console.log("resetting mocking");
    Module._load = originalLoad;
    mockingEnabled = false;
}

// Setup mocking immediately when this module is loaded
//setupMocking();

module.exports = {
    setupMocking,
    resetMocking,
    createMockLogger,
    createMockClickHouseClient,
    createMockClickHouseConfig,
    createMockCommon,
    setMockCommonOverrides,
    resetMockCommonOverrides
};
