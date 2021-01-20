/* global Vue, jQuery, _, countlyGlobal */

(function(countlyVue, $) {


    var _capitalized = function(prefix, str) {
        return prefix + str[0].toUpperCase() + str.substring(1);
    };

    var VuexModule = function(name, options) {

        options = options || {};

        var mutations = options.mutations || {},
            actions = options.actions || {},
            getters = options.getters || {},
            mixins = options.mixins || [];

        mixins.forEach(function(mixin) {
            Object.assign(mutations, mixin.mutations);
            Object.assign(actions, mixin.actions);
            Object.assign(getters, mixin.getters);
        });

        var _resetFn = function() {
            var state = options.resetFn();
            mixins.forEach(function(mixin) {
                Object.assign(state, mixin.resetFn());
            });
            return state;
        };

        mutations.resetState = function(state) {
            Object.assign(state, _resetFn());
        };

        actions.reset = function(context) {
            context.commit("resetState");
        };

        var module = {
            namespaced: true,
            state: _resetFn(),
            getters: getters,
            mutations: mutations,
            actions: actions
        };

        if (options.submodules) {
            module.modules = {};
            options.submodules.forEach(function(submodule) {
                module.modules[submodule.name] = submodule.module;
            });
        }

        return {
            name: name,
            module: module
        };
    };

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
            }

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
            resourceName = name,
            counterKey = name + "RequestCounter",
            echoKey = name + "RequestLastEcho",
            paramsKey = name + "Params";

        var resetFn = function() {
            var stateObj = {};
            stateObj[resourceName] = _dataTableAdapters.toStandardResponse();
            stateObj[counterKey] = 0;
            stateObj[echoKey] = 0;
            stateObj[paramsKey] = {
                ready: false
            };
            return stateObj;
        };

        //
        getters[name] = function(_state) {
            return _state[name];
        };

        //
        mutations[_capitalized("set", resourceName)] = function(_state, newValue) {
            _state[resourceName] = newValue;
            _state[echoKey] = newValue.echo || 0;
        };

        mutations[_capitalized("set", paramsKey)] = function(_state, newValue) {
            _state[paramsKey] = newValue;
        };

        mutations[_capitalized("increment", counterKey)] = function(_state) {
            _state[counterKey]++;
        };

        //
        actions[_capitalized("fetch", resourceName)] = function(context, actionParams) {
            var promise = null,
                requestParams = context.state[paramsKey],
                requestOptions = options.onRequest(context, actionParams);

            if (!requestParams.ready || !requestOptions) {
                promise = $.Deferred().resolve();
            }
            else {
                var legacyOptions = _dataTableAdapters.toLegacyRequest(requestParams, options.columns);
                legacyOptions.sEcho = context.state[counterKey];
                _.extend(requestOptions.data, legacyOptions);

                promise = $.when(
                    $.ajax(requestOptions)
                );
                context.commit(_capitalized("increment", counterKey));
            }
            return promise
                .then(function(res) {
                    if (!res) {
                        return;
                    }
                    var convertedResponse = _dataTableAdapters.toStandardResponse(res, requestOptions);
                    if (!Object.prototype.hasOwnProperty.call(convertedResponse, "echo") ||
                        convertedResponse.echo >= context.state[echoKey]) {
                        if (typeof options.onReady === 'function') {
                            convertedResponse.rows = options.onReady(context, convertedResponse.rows);
                        }
                        context.commit(_capitalized("set", resourceName), convertedResponse);
                    }
                })
                .catch(function() {
                    return context.commit(_capitalized("set", resourceName), _dataTableAdapters.toStandardResponse());
                });
        };

        return {
            resetFn: resetFn,
            getters: getters,
            mutations: mutations,
            actions: actions
        };
    };

    var MutableTable = function(name, options) {
        var resetFn = function() {
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
            resetFn: resetFn,
            getters: tableGetters,
            mutations: mutations
        });
    };

    countlyVue.vuex.Module = VuexModule;
    countlyVue.vuex.MutableTable = MutableTable;
    countlyVue.vuex.ServerDataTable = ServerDataTable;

}(window.countlyVue = window.countlyVue || {}, jQuery));
