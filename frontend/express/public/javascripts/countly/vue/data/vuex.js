/* global Vue */

(function(countlyVue) {

    var VuexModule = function(name, options) {

        options = options || {};

        var mutations = options.mutations || {},
            actions = options.actions || {};

        if (!mutations.resetState) {
            mutations.resetState = function(state) {
                Object.assign(state, options.resetFn());
            };
        }

        if (!actions.reset) {
            actions.reset = function(context) {
                context.commit("resetState");
            };
        }

        var module = {
            namespaced: true,
            state: options.resetFn(),
            getters: options.getters || {},
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

    var VuexDataTable = function(name, options) {
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
    countlyVue.vuex.DataTable = VuexDataTable;

}(window.countlyVue = window.countlyVue || {}));
