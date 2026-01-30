import Vue from 'vue';
import Vuex from 'vuex';
import _ from 'underscore';
import countlyGlobal from '../../countly.global';
import { ajax } from '../core';

/**
 * Capitalizes the first letter of a string and prepends a prefix.
 * @param {string} prefix - The prefix to add before the capitalized string
 * @param {string} str - The string to capitalize
 * @returns {string} The prefixed and capitalized string
 * @example
 * _capitalized('set', 'userName') // returns 'setUserName'
 */
const _capitalized = function(prefix, str) {
    return prefix + str[0].toUpperCase() + str.substring(1);
};

/**
 * Creates a Vuex module with automatic reset functionality and submodule support.
 * @param {string} name - The name of the module
 * @param {Object} [options={}] - Configuration options for the module
 * @param {boolean} [options.namespaced=true] - Whether the module should be namespaced
 * @param {Array} [options.submodules] - Array of submodule references to include
 * @param {Object} [options.mutations] - Vuex mutations object
 * @param {Object} [options.actions] - Vuex actions object
 * @param {Object} [options.getters] - Vuex getters object
 * @param {Function} [options.state] - Factory function that returns the initial state
 * @param {Function} [options.destroy] - Cleanup function called when module is destroyed
 * @returns {Object} A module reference object containing the module configuration
 */
export const Module = function(name, options) {

    options = options || {};

    var namespaced = options.namespaced !== false,
        submodules = options.submodules;

    var mutations = options.mutations || {},
        actions = options.actions || {},
        getters = options.getters || {};

    var _resetFn = function() {
        if (options.state) {
            return options.state();
        }
        return {};
    };

    var module = {
        namespaced: namespaced,
        state: _resetFn(),
        getters: getters,
        mutations: mutations,
        actions: actions
    };

    var resetKey = '',
        resetStateKey = '';

    if (!namespaced) {
        resetStateKey = _capitalized("reset", name + "State");
        resetKey = _capitalized("reset", name);
    }
    else {
        resetStateKey = "resetState";
        resetKey = "reset";
    }

    var ref = {
        name: name,
        destroy: options.destroy,
        module: module,
        _resetKey: resetKey,
        _parent: null
    };

    mutations[resetStateKey] = function(state) {
        var newState = _resetFn();
        Object.keys(newState).forEach(function(key) {
            state[key] = newState[key];
        });
    };

    actions[resetKey] = function(context, params) {
        context.commit(resetStateKey);
        params = params || {};
        var deep = params.deep !== false;

        if (submodules && deep) {
            var path = params._path,
                currentPath = '';

            if (!path) {
                var currentParent = ref._parent;
                currentPath = name;
                while (currentParent) {
                    currentPath = currentParent.name + "/" + currentPath;
                    currentParent = currentParent._parent;
                }
            }
            else {
                currentPath = path + "/" + name;
            }

            submodules.forEach(function(submodule) {
                if (submodule.module.namespaced) {
                    var subReset = currentPath + "/" + submodule.name + "/reset";
                    context.dispatch(subReset, { deep: true, _path: currentPath }, {root: true});
                }
                else {
                    context.dispatch(submodule._resetKey, { deep: true, _path: currentPath });
                }
            });
        }
    };

    if (submodules) {
        module.modules = {};
        submodules.forEach(function(submodule) {
            module.modules[submodule.name] = submodule.module;
            submodule._parent = ref;
        });
    }

    return ref;
};

/**
 * Internal request parameter names that should not be passed through to the server.
 * @type {string[]}
 */
const _internalRequestParams = ["page", "perPage", "sort", "searchQuery", "cursor", "useCursorPagination"];

/**
 * Data table adapters for converting between frontend and legacy API formats.
 * @type {Object}
 */
export const dataTableAdapters = {
    /**
     * Converts frontend request parameters to legacy DataTables format.
     * Automatically detects ClickHouse availability and uses cursor pagination when appropriate.
     * @param {Object} requestParams - The frontend request parameters
     * @param {number} [requestParams.page] - Current page number (1-based)
     * @param {number} [requestParams.perPage] - Number of items per page
     * @param {Array} [requestParams.sort] - Sort configuration array
     * @param {string} [requestParams.searchQuery] - Search query string
     * @param {string} [requestParams.cursor] - Cursor for cursor-based pagination
     * @param {boolean} [requestParams.useCursorPagination] - Whether to use cursor pagination
     * @param {string} [requestParams.paginationMode] - Pagination mode ('next' or 'prev')
     * @param {Array} [cols] - Array of column names for sorting
     * @returns {Object} Converted parameters in legacy DataTables format
     */
    toLegacyRequest: function(requestParams, cols) {
        var convertedParams = {};

        // Auto-detect ClickHouse availability and enable cursor pagination
        var isClickHouseAvailable = dataTableAdapters.isClickHouseAvailable();
        var shouldUseCursorPagination = requestParams.useCursorPagination || isClickHouseAvailable;

        // Always set the flag so frontend knows what pagination type to use
        convertedParams.useCursorPagination = shouldUseCursorPagination;

        if (shouldUseCursorPagination) {
            // Use cursor pagination for ClickHouse - ONLY send cursor pagination params
            convertedParams.limit = requestParams.perPage;

            // Add cursor and pagination mode if available
            if (requestParams.cursor) {
                convertedParams.cursor = requestParams.cursor;
            }
            if (requestParams.paginationMode) {
                convertedParams.paginationMode = requestParams.paginationMode;
            }

            // IMPORTANT: Do NOT send traditional pagination params
            // convertedParams.iDisplayStart and convertedParams.iDisplayLength should NOT be set
        }
        else {
            // Use traditional pagination for MongoDB - ONLY send traditional pagination params
            convertedParams.iDisplayStart = (requestParams.page - 1) * requestParams.perPage;
            convertedParams.iDisplayLength = requestParams.perPage;

            // IMPORTANT: Do NOT send cursor pagination params
            // convertedParams.limit, convertedParams.cursor, convertedParams.paginationMode should NOT be set
        }

        if (cols && requestParams.sort && requestParams.sort.length > 0) {
            var sorter = requestParams.sort[0];
            var sortFieldIndex = cols.indexOf(sorter.field);
            if (sortFieldIndex > -1) {
                convertedParams.iSortCol_0 = sortFieldIndex;
                convertedParams.sSortDir_0 = sorter.type;
            }
        }
        if (requestParams.searchQuery) {
            convertedParams.sSearch = requestParams.searchQuery;
        }
        Object.keys(requestParams).forEach(function(paramKey) {
            if (!_internalRequestParams.includes(paramKey)) {
                convertedParams[paramKey] = requestParams[paramKey];
            }
        });
        return convertedParams;
    },

    /**
     * Converts a legacy DataTables API response to the standard frontend format.
     * @param {Object} [response={}] - The legacy API response
     * @param {Array} [response.aaData] - Array of row data
     * @param {number} [response.iTotalDisplayRecords] - Total number of filtered records
     * @param {number} [response.iTotalRecords] - Total number of unfiltered records
     * @param {string|number} [response.sEcho] - Echo value for request tracking
     * @param {boolean} [response.hasNextPage] - Whether there is a next page (cursor pagination)
     * @param {string} [response.nextCursor] - Cursor for the next page
     * @param {string} [response.paginationMode] - Current pagination mode
     * @param {Object} [requestOptions={}] - The original request options
     * @param {string} [requestOptions.url] - The request URL
     * @param {Object} [requestOptions.data] - The request data
     * @returns {Object} Standardized response object with rows, totalRows, and export settings
     */
    toStandardResponse: function(response, requestOptions) {
        response = response || {};
        requestOptions = requestOptions || {};

        var reservedFields = {
            "aaData": true,
            "iTotalDisplayRecords": true,
            "iTotalRecords": true,
            "sEcho": true,
            "hasNextPage": true,
            "nextCursor": true,
            "paginationMode": true
        };

        var fields = {
            rows: response.aaData || [],
            totalRows: response.iTotalDisplayRecords || 0,
            notFilteredTotalRows: response.iTotalRecords || 0
        };
        if (Object.prototype.hasOwnProperty.call(response, "sEcho")) {
            fields.echo = parseInt(response.sEcho, 10);
        }

        // Store response for database type detection
        window.lastApiResponse = response;

        // Handle cursor pagination fields

        if (response.hasNextPage) {
            fields.hasNextPage = response.hasNextPage;
        }
        if (response.nextCursor) {
            fields.nextCursor = response.nextCursor;
        }
        if (response.paginationMode) {
            fields.paginationMode = response.paginationMode;
        }

        Object.keys(response).forEach(function(respKey) {
            if (!reservedFields[respKey] && !Object.prototype.hasOwnProperty.call(fields, respKey)) {
                fields[respKey] = response[respKey];
            }
        });

        if (Object.prototype.hasOwnProperty.call(requestOptions, "url")) {
            var pairs = [];
            for (var dataKey in requestOptions.data) {
                if (dataKey === "iDisplayStart" || dataKey === "iDisplayLength") {
                    continue;
                }
                pairs.push(dataKey + "=" + requestOptions.data[dataKey]);
            }
            pairs.push("api_key=" + countlyGlobal.member.api_key);

            fields.exportSettings = {
                resourcePath: requestOptions.url + "?" + pairs.join("&"),
                resourceProp: "aaData"
            };
        }
        return fields;
    },

    /**
     * Checks if ClickHouse is available based on the last API response.
     * ClickHouse availability is detected by the presence of cursor pagination data.
     * @returns {boolean} True if ClickHouse is available, false otherwise
     */
    isClickHouseAvailable: function() {
        // Check if we have a recent response with cursor pagination data
        // This indicates ClickHouse is being used
        if (window.lastApiResponse) {
            const hasCursorData = window.lastApiResponse.hasNextPage !== undefined || window.lastApiResponse.nextCursor !== undefined || window.lastApiResponse.paginationMode !== undefined;
            return hasCursorData;
        }

        // Fallback: check if we're explicitly using MongoDB
        if (window.dbOverride === 'mongodb') {
            return false;
        }

        // Default to mongoDB if no explicit override
        return false;
    }
};

/**
 * Creates a server-side data table Vuex module with automatic pagination and fetching.
 * Supports both traditional offset pagination (MongoDB) and cursor pagination (ClickHouse).
 * @param {string} name - The name of the resource/table
 * @param {Object} options - Configuration options
 * @param {Function} options.onRequest - Function that returns request options for fetching data
 * @param {Array} [options.columns] - Array of column names for sorting
 * @param {Function} [options.onOverrideRequest] - Hook to modify request options before sending
 * @param {Function} [options.onOverrideResponse] - Hook to process response before storing
 * @param {Function} [options.onReady] - Hook to transform rows after receiving response
 * @param {Function} [options.onError] - Error handler function
 * @param {Function} [options.onTask] - Handler for task-based responses
 * @returns {Object} A Vuex module reference for the data table
 */
export const ServerDataTable = function(name, options) {
    var getters = {},
        mutations = {},
        actions = {},
        lastSuccessfulRequestField = "lastSuccessfulRequest",
        lastResponseField = "lastResponse",
        counterField = "requestCounter",
        echoField = "requestLastEcho",
        paramsField = "params",
        statusField = "status",
        resourceName = name,
        statusKey = _capitalized(name, statusField),
        counterKey = _capitalized(name, counterField),
        paramsKey = _capitalized(name, paramsField),
        lastSuccessfulRequestKey = _capitalized(name, lastSuccessfulRequestField);

    var state = function() {
        var stateObj = {};
        stateObj[lastResponseField] = dataTableAdapters.toStandardResponse();
        stateObj[lastSuccessfulRequestField] = null;
        stateObj[counterField] = 0;
        stateObj[statusField] = "ready";
        stateObj[echoField] = 0;
        stateObj[paramsField] = {
            ready: false,
            useCursorPagination: false,
            cursor: null,
            paginationMode: null
        };
        return stateObj;
    };

    //
    getters[name] = function(_state) {
        return _state[lastResponseField];
    };
    getters[statusKey] = function(_state) {
        return _state[statusField];
    };
    getters[paramsKey] = function(_state) {
        return _state[paramsField];
    };
    getters[lastSuccessfulRequestKey] = function(_state) {
        return _state[lastSuccessfulRequestField];
    };

    //
    mutations[_capitalized("set", resourceName)] = function(_state, newValue) {
        _state[lastResponseField] = newValue;
        _state[statusField] = "ready";
        _state[echoField] = newValue.echo || 0;
    };

    mutations[_capitalized("set", paramsKey)] = function(_state, newValue) {
        _state[paramsField] = newValue;
    };

    mutations[_capitalized("increment", counterKey)] = function(_state) {
        _state[counterField]++;
    };

    mutations[_capitalized("set", statusKey)] = function(_state, newValue) {
        _state[statusField] = newValue;
    };

    mutations[_capitalized("set", lastSuccessfulRequestKey)] = function(_state, newValue) {
        _state[lastSuccessfulRequestField] = newValue;
    };

    //
    actions[_capitalized("fetch", resourceName)] = function(context, actionParams) {
        var promise = null,
            requestParams = context.state[paramsField],
            requestOptions = options.onRequest(context, actionParams);

        if (!requestParams.ready || !requestOptions) {
            promise = Promise.resolve();
        }
        else {
            var legacyOptions = dataTableAdapters.toLegacyRequest(requestParams, options.columns);
            legacyOptions.sEcho = context.state[counterField];
            _.extend(requestOptions.data, legacyOptions);
            if (options.onOverrideRequest) {
                options.onOverrideRequest(context, requestOptions);
            }
            if (actionParams && actionParams._silent === false) {
                context.commit(_capitalized("set", statusKey), "pending");
            }
            else {
                context.commit(_capitalized("set", statusKey), "silent-pending");
            }
            promise = ajax(requestOptions, { disableAutoCatch: true });
            context.commit(_capitalized("increment", counterKey));
        }
        return promise
            .then(function(res) {
                if (!res) {
                    return;
                }
                if (options.onOverrideResponse) {
                    options.onOverrideResponse(context, res);
                }
                var convertedResponse = dataTableAdapters.toStandardResponse(res, requestOptions);
                if (res.task_id) {
                    if (typeof options.onTask === 'function') {
                        options.onTask(context, res.task_id);
                    }
                    context.commit(_capitalized("set", resourceName), convertedResponse);
                    context.commit(_capitalized("set", lastSuccessfulRequestKey), requestOptions);
                }
                else {
                    if (!Object.prototype.hasOwnProperty.call(convertedResponse, "echo") ||
                        convertedResponse.echo >= context.state[echoField]) {

                        // Generic cursor pagination response handling
                        if (convertedResponse.hasNextPage !== undefined || convertedResponse.nextCursor !== undefined) {

                            // Update the params with cursor information
                            var cursorParams = {};
                            if (convertedResponse.hasNextPage !== undefined) {
                                cursorParams.hasNextPage = convertedResponse.hasNextPage;
                            }
                            if (convertedResponse.nextCursor !== undefined) {
                                cursorParams.nextCursor = convertedResponse.nextCursor;
                            }
                            if (convertedResponse.paginationMode !== undefined) {
                                cursorParams.paginationMode = convertedResponse.paginationMode;
                            }

                            // Update the params in the state
                            context.commit(_capitalized("set", paramsKey), Object.assign({}, context.state[paramsField], cursorParams));
                        }

                        if (typeof options.onReady === 'function') {
                            convertedResponse.rows = options.onReady(context, convertedResponse.rows);
                        }
                        context.commit(_capitalized("set", resourceName), convertedResponse);
                        context.commit(_capitalized("set", lastSuccessfulRequestKey), requestOptions);
                    }
                }
            })
            .catch(function(err) {
                if (typeof options.onError === 'function') {
                    options.onError(context, err);
                }
                else {
                    window.app.activeView.onError(err);
                }
                return context.commit(_capitalized("set", resourceName), dataTableAdapters.toStandardResponse());
            });
    };

    actions[_capitalized("pasteAndFetch", resourceName)] = function(context, remoteParams) {
        context.commit(_capitalized("set", paramsKey), Object.assign({}, context.state[paramsField], remoteParams, {ready: true}));
        return context.dispatch(_capitalized("fetch", resourceName), { _silent: false });
    };

    actions[_capitalized("updateParams", resourceName)] = function(context, remoteParams) {
        context.commit(_capitalized("set", paramsKey), Object.assign({}, remoteParams));
    };

    return Module(name, {
        namespaced: false,
        state: state,
        getters: getters,
        mutations: mutations,
        actions: actions
    });
};

/**
 * Creates a mutable table Vuex module that tracks changes to rows.
 * Allows patching and unpatching of row data while keeping track of original values.
 * @param {string} name - The name of the mutable table module
 * @param {Object} options - Configuration options
 * @param {Function} options.keyFn - Function that returns a unique key for a row
 * @param {Function} options.sourceRows - Getter function that returns the source rows
 * @param {Array} [options.trackedFields=[]] - Array of field names to track for changes
 * @returns {Object} A Vuex module reference for the mutable table
 */
export const MutableTable = function(name, options) {
    var _state = function() {
        return {
            trackedFields: options.trackedFields || [],
            patches: {}
        };
    };

    var keyFn = function(row, dontStringify) {
        if (dontStringify) {
            return options.keyFn(row);
        }
        return JSON.stringify(options.keyFn(row));
    };

    var tableGetters = {
        sourceRows: options.sourceRows,
        /**
         * Computes the diff between original and patched values for tracked fields.
         * @param {Object} state - Vuex state
         * @param {Object} getters - Vuex getters
         * @returns {Array} Array of diff objects with key, field, newValue, and oldValue
         */
        diff: function(state, getters) {
            if (state.trackedFields.length === 0 || Object.keys(state.patches).length === 0) {
                return [];
            }
            var diff = [];
            getters.sourceRows.forEach(function(row) {
                var rowKey = keyFn(row);
                if (state.patches[rowKey]) {
                    var originalKey = keyFn(row, true);
                    state.trackedFields.forEach(function(fieldName) {
                        if (Object.prototype.hasOwnProperty.call(state.patches[rowKey], fieldName) && row[fieldName] !== state.patches[rowKey][fieldName]) {
                            diff.push({
                                key: originalKey,
                                field: fieldName,
                                newValue: state.patches[rowKey][fieldName],
                                oldValue: row[fieldName]
                            });
                        }
                    });
                }
            });
            return diff;
        },
        /**
         * Returns rows with patches applied.
         * @param {Object} state - Vuex state
         * @param {Object} getters - Vuex getters
         * @returns {Array} Array of rows with patches applied
         */
        rows: function(state, getters) {
            if (Object.keys(state.patches).length === 0) {
                return getters.sourceRows;
            }
            return getters.sourceRows.map(function(row) {
                var rowKey = keyFn(row);
                if (state.patches[rowKey]) {
                    return Object.assign({}, row, state.patches[rowKey]);
                }
                return row;
            });
        }
    };

    var mutations = {
        /**
         * Applies a patch to a specific row.
         * @param {Object} state - Vuex state
         * @param {Object} obj - Patch object
         * @param {Object} obj.row - The row to patch
         * @param {Object} obj.fields - Fields to update
         */
        patch: function(state, obj) {
            var row = obj.row,
                fields = obj.fields;

            var rowKey = keyFn(row);
            var currentPatch = Object.assign({}, state.patches[rowKey], fields);

            Vue.set(state.patches, rowKey, currentPatch);
        },
        /**
         * Removes patches from rows.
         * @param {Object} state - Vuex state
         * @param {Object} obj - Unpatch object
         * @param {Object} [obj.row] - The row to unpatch (if null, unpatches all rows)
         * @param {Array} [obj.fields] - Specific fields to unpatch (if null, removes all patches for the row)
         */
        unpatch: function(state, obj) {
            var row = obj.row,
                fields = obj.fields;

            var rowKeys = null;
            if (!row) {
                rowKeys = Object.keys(state.patches);
            }
            else {
                rowKeys = [keyFn(row)];
            }

            rowKeys.forEach(function(rowKey) {
                if (!state.patches[rowKey]) {
                    return;
                }

                if (!fields) {
                    Vue.delete(state.patches, rowKey);
                }
                else {
                    fields.forEach(function(fieldName) {
                        Vue.delete(state.patches[rowKey], fieldName);
                    });
                    if (Object.keys(state.patches[rowKey]).length === 0) {
                        Vue.delete(state.patches, rowKey);
                    }
                }
            });

        }
    };
    return Module(name, {
        state: _state,
        getters: tableGetters,
        mutations: mutations
    });
};

/**
 * Creates a data source object for interacting with a server data table.
 * Provides fetch and updateParams methods along with address objects for reactive bindings.
 * @param {Object} storeInstance - The Vuex store instance
 * @param {string} [path] - The module path (optional if resourceName is the second argument)
 * @param {string} [resourceName] - The resource name
 * @returns {Object} Data source object with fetch, updateParams, and address properties
 * @property {Function} fetch - Function to fetch data with given params
 * @property {Function} updateParams - Function to update params without fetching
 * @property {Object} statusAddress - Address object for the status getter
 * @property {Object} paramsAddress - Address object for the params getter
 * @property {Object} dataAddress - Address object for the data getter
 * @property {Object} requestAddress - Address object for the last successful request getter
 */
export const getServerDataSource = function(storeInstance, path, resourceName) {

    var statusPath = null,
        paramsPath = null,
        pasteAndFetchPath = null,
        updateParamsPath = null,
        resourcePath = null,
        requestPath = null;

    if (arguments.length === 3 && path) {
        statusPath = path + "/" + _capitalized(resourceName, 'status');
        paramsPath = path + "/" + _capitalized(resourceName, 'params');
        pasteAndFetchPath = path + "/" + _capitalized("pasteAndFetch", resourceName);
        updateParamsPath = path + "/" + _capitalized("updateParams", resourceName);
        resourcePath = path + "/" + resourceName,
        requestPath = path + "/" + _capitalized(resourceName, 'lastSuccessfulRequest');
    }
    else {
        resourceName = path;
        statusPath = _capitalized(resourceName, 'status');
        paramsPath = _capitalized(resourceName, 'params');
        pasteAndFetchPath = _capitalized("pasteAndFetch", resourceName);
        updateParamsPath = _capitalized("updateParams", resourceName);
        resourcePath = resourceName;
        requestPath = _capitalized(resourceName, 'lastSuccessfulRequest');
    }

    return {
        fetch: function(params) {
            return storeInstance.dispatch(pasteAndFetchPath, params);
        },
        updateParams: function(params) {
            return storeInstance.dispatch(updateParamsPath, params);
        },
        statusAddress: {
            type: 'vuex-getter',
            store: storeInstance,
            path: statusPath
        },
        paramsAddress: {
            type: 'vuex-getter',
            store: storeInstance,
            path: paramsPath
        },
        dataAddress: {
            type: 'vuex-getter',
            store: storeInstance,
            path: resourcePath
        },
        requestAddress: {
            type: 'vuex-getter',
            store: storeInstance,
            path: requestPath
        }
    };
};

/**
 * Creates a local Vuex store instance from a module wrapper.
 * Useful for creating isolated stores for components.
 * @param {Object} wrapper - A module reference object (returned by Module)
 * @param {string} wrapper.name - The module name
 * @param {Object} wrapper.module - The Vuex module configuration
 * @returns {Vuex.Store} A new Vuex store instance containing the module
 */
export const getLocalStore = function(wrapper) {
    var storeConfig = { modules: {} };
    storeConfig.modules[wrapper.name] = wrapper.module;
    return new Vuex.Store(storeConfig);
};

/**
 * Creates a fetch mixin module for handling loading and error states.
 * Provides actions for managing fetch lifecycle (init, error, success) and loading state.
 * @returns {Object} A Vuex module reference with fetch state management
 * @property {Object} state - Contains hasError, error, and isLoading
 * @property {Object} actions - onFetchInit, onFetchError, onFetchSuccess, setIsLoadingIfNecessary
 * @property {Object} mutations - setFetchInit, setFetchError, setFetchSuccess, setIsLoading
 * @property {Object} getters - isLoading
 */
export const FetchMixin = function() {
    /**
     * Factory function for fetch state.
     * @returns {Object} Initial fetch state
     */
    var countlyFetchState = function() {
        return {
            hasError: false,
            error: null,
            isLoading: false
        };
    };

    var countlyFetchActions = {
        /**
         * Action called when a fetch operation is initiated.
         * @param {Object} context - Vuex action context
         * @param {Object} payload - Action payload
         * @param {boolean} payload.useLoader - Whether to show loading indicator
         */
        onFetchInit: function(context, payload) {
            context.commit('setFetchInit');
            context.dispatch('setIsLoadingIfNecessary', {useLoader: payload.useLoader, value: true });
        },
        /**
         * Action called when a fetch operation fails.
         * @param {Object} context - Vuex action context
         * @param {Object} payload - Action payload
         * @param {Error} payload.error - The error that occurred
         * @param {boolean} payload.useLoader - Whether to hide loading indicator
         */
        onFetchError: function(context, payload) {
            context.commit('setFetchError', payload.error);
            context.dispatch('setIsLoadingIfNecessary', {useLoader: payload.useLoader, value: false });
        },
        /**
         * Action called when a fetch operation succeeds.
         * @param {Object} context - Vuex action context
         * @param {Object} payload - Action payload
         * @param {boolean} payload.useLoader - Whether to hide loading indicator
         */
        onFetchSuccess: function(context, payload) {
            context.commit('setFetchSuccess');
            context.dispatch('setIsLoadingIfNecessary', {useLoader: payload.useLoader, value: false });
        },
        /**
         * Conditionally sets loading state if useLoader is true.
         * @param {Object} context - Vuex action context
         * @param {Object} payload - Action payload
         * @param {boolean} payload.useLoader - Whether to update loading state
         * @param {boolean} payload.value - The loading state value
         */
        setIsLoadingIfNecessary: function(context, payload) {
            if (payload.useLoader) {
                context.commit('setIsLoading', payload.value);
            }
        }
    };

    var countlyFetchMutations = {
        /**
         * Resets error state on fetch init.
         * @param {Object} state - Vuex state
         */
        setFetchInit: function(state) {
            state.hasError = false;
            state.error = null;
        },
        /**
         * Sets error state on fetch error.
         * @param {Object} state - Vuex state
         * @param {Error} error - The error that occurred
         */
        setFetchError: function(state, error) {
            state.hasError = true;
            state.error = error;
        },
        /**
         * Clears error state on fetch success.
         * @param {Object} state - Vuex state
         */
        setFetchSuccess: function(state) {
            state.hasError = false;
            state.error = null;
        },
        /**
         * Sets the loading state.
         * @param {Object} state - Vuex state
         * @param {boolean} value - The loading state value
         */
        setIsLoading: function(state, value) {
            state.isLoading = value;
        }
    };

    var countlyFetchGetters = {
        /**
         * Returns the current loading state.
         * @param {Object} state - Vuex state
         * @returns {boolean} Whether the module is currently loading
         */
        isLoading: function(state) {
            return state.isLoading;
        }
    };

    return Module('countlyFetch', {
        namespaced: false,
        state: countlyFetchState,
        actions: countlyFetchActions,
        getters: countlyFetchGetters,
        mutations: countlyFetchMutations
    });
};
