/* global Vue, Vuex, _, countlyGlobal, CV, app */

(function(countlyVue) {


    var _capitalized = function(prefix, str) {
        return prefix + str[0].toUpperCase() + str.substring(1);
    };

    var VuexModule = function(name, options) {

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

    var _internalRequestParams = ["page", "perPage", "sort", "searchQuery"];

    var _dataTableAdapters = {
        toLegacyRequest: function(requestParams, cols) {
            var convertedParams = {};
            convertedParams.iDisplayStart = (requestParams.page - 1) * requestParams.perPage;
            convertedParams.iDisplayLength = requestParams.perPage;
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
        toStandardResponse: function(response, requestOptions) {
            response = response || {};
            requestOptions = requestOptions || {};

            var reservedFields = {
                "aaData": true,
                "iTotalDisplayRecords": true,
                "iTotalRecords": true,
                "sEcho": true
            };

            var fields = {
                rows: response.aaData || [],
                totalRows: response.iTotalDisplayRecords || 0,
                notFilteredTotalRows: response.iTotalRecords || 0
            };
            if (Object.prototype.hasOwnProperty.call(response, "sEcho")) {
                fields.echo = parseInt(response.sEcho, 10);
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
        }
    };

    var ServerDataTable = function(name, options) {
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
            stateObj[lastResponseField] = _dataTableAdapters.toStandardResponse();
            stateObj[lastSuccessfulRequestField] = null;
            stateObj[counterField] = 0;
            stateObj[statusField] = "ready";
            stateObj[echoField] = 0;
            stateObj[paramsField] = {
                ready: false
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
                var legacyOptions = _dataTableAdapters.toLegacyRequest(requestParams, options.columns);
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
                promise = CV.$.ajax(requestOptions, { disableAutoCatch: true });
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
                    var convertedResponse = _dataTableAdapters.toStandardResponse(res, requestOptions);
                    if (!Object.prototype.hasOwnProperty.call(convertedResponse, "echo") ||
                        convertedResponse.echo >= context.state[echoField]) {
                        if (typeof options.onReady === 'function') {
                            convertedResponse.rows = options.onReady(context, convertedResponse.rows);
                        }
                        context.commit(_capitalized("set", resourceName), convertedResponse);
                        context.commit(_capitalized("set", lastSuccessfulRequestKey), requestOptions);
                    }
                })
                .catch(function(err) {
                    if (typeof options.onError === 'function') {
                        options.onError(context, err);
                    }
                    else {
                        app.activeView.onError(err);
                    }
                    return context.commit(_capitalized("set", resourceName), _dataTableAdapters.toStandardResponse());
                });
        };

        actions[_capitalized("pasteAndFetch", resourceName)] = function(context, remoteParams) {
            context.commit(_capitalized("set", paramsKey), Object.assign({}, context.state[paramsField], remoteParams, {ready: true}));
            return context.dispatch(_capitalized("fetch", resourceName), { _silent: false });
        };

        actions[_capitalized("updateParams", resourceName)] = function(context, remoteParams) {
            context.commit(_capitalized("set", paramsKey), Object.assign({}, remoteParams));
        };

        return VuexModule(name, {
            namespaced: false,
            state: state,
            getters: getters,
            mutations: mutations,
            actions: actions
        });
    };

    var MutableTable = function(name, options) {
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
            patch: function(state, obj) {
                var row = obj.row,
                    fields = obj.fields;

                var rowKey = keyFn(row);
                var currentPatch = Object.assign({}, state.patches[rowKey], fields);

                Vue.set(state.patches, rowKey, currentPatch);
            },
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
        return VuexModule(name, {
            state: _state,
            getters: tableGetters,
            mutations: mutations
        });
    };

    var getServerDataSource = function(storeInstance, path, resourceName) {

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

    var getLocalStore = function(wrapper) {
        var storeConfig = { modules: {} };
        storeConfig.modules[wrapper.name] = wrapper.module;
        return new Vuex.Store(storeConfig);
    };

    countlyVue.vuex.Module = VuexModule;
    countlyVue.vuex.MutableTable = MutableTable;
    countlyVue.vuex.ServerDataTable = ServerDataTable;
    countlyVue.vuex.getServerDataSource = getServerDataSource;
    countlyVue.vuex.getLocalStore = getLocalStore;

    var FetchMixin = function() {
        var countlyFetchState = function() {
            return {
                hasError: false,
                error: null,
                isLoading: false
            };
        };
        var countlyFetchActions = {
            onFetchInit: function(context, payload) {
                context.commit('setFetchInit');
                context.dispatch('setIsLoadingIfNecessary', {useLoader: payload.useLoader, value: true });
            },
            onFetchError: function(context, payload) {
                context.commit('setFetchError', payload.error);
                context.dispatch('setIsLoadingIfNecessary', {useLoader: payload.useLoader, value: false });
            },
            onFetchSuccess: function(context, payload) {
                context.commit('setFetchSuccess');
                context.dispatch('setIsLoadingIfNecessary', {useLoader: payload.useLoader, value: false });
            },
            setIsLoadingIfNecessary: function(context, payload) {
                if (payload.useLoader) {
                    context.commit('setIsLoading', payload.value);
                }
            }
        };
        var countlyFetchMutations = {
            setFetchInit: function(state) {
                state.hasError = false;
                state.error = null;
            },
            setFetchError: function(state, error) {
                state.hasError = true;
                state.error = error;
            },
            setFetchSuccess: function(state) {
                state.hasError = false;
                state.error = null;
            },
            setIsLoading: function(state, value) {
                state.isLoading = value;
            }
        };

        var countlyFetchGetters = {
            isLoading: function(state) {
                return state.isLoading;
            }
        };

        return VuexModule('countlyFetch', {
            namespaced: false,
            state: countlyFetchState,
            actions: countlyFetchActions,
            getters: countlyFetchGetters,
            mutations: countlyFetchMutations
        });
    };
    countlyVue.vuex.FetchMixin = FetchMixin;

}(window.countlyVue = window.countlyVue || {}));
