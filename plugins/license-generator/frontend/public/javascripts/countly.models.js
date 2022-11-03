/* global CV,countlyCommon,countlyVue, jQuery, app */
(function(countlyLicenseGenerator /*, $*/) {
    var licenseTableResource = countlyVue.vuex.ServerDataTable("licenseTable", {
        columns: ['name', 'active_tier', 'start', "end", "activation_status", "activation_date", "activated_cn", "license_status"],
        loadedData: {},
        data: {},
        onRequest: function(context) {
            var data = {
                visibleColumns: JSON.stringify(context.state.params.selectedDynamicCols),
            };

            var filter = context.rootState.countlyLicenseGenerator.activeFilter;

            var query = {};
            if (filter.activation_status) {
                if (filter.activation_status === 'active') {
                    query.activation_status = 'active';
                }
                else if (filter.activation_status === 'inactive') {
                    query.activation_status = {"$ne": 'active'};
                }
            }

            if (filter.license_status) {
                if (filter.license_status === 'active') {
                    query.license_status = true;
                }
                else if (filter.license_status === 'inactive') {
                    query.license_status = {"$ne": true};
                }
            }
            if (filter.name && filter.name !== 'all') {
                query.name = filter.name;
            }
            if (Object.keys(query).length > 0) {
                data.query = JSON.stringify(query);
            }
            data.app_id = countlyCommon.ACTIVE_APP_ID;
            return {
                type: "GET",
                url: countlyCommon.API_URL + countlyCommon.API_PARTS.data.r + "/license-generator/list",
                data: data
            };
        },
        onReady: function(context, rows) {
            context.dispatch("listTableFetched", true);
            return rows;
        },
        onError: function(context, error) {
            if (error) {
                if (error.status !== 0) { //not on canceled ones
                    app.activeView.onError(error);
                }
            }
        }
    });

    countlyLicenseGenerator.factory = {
        getEmpty: function() {
            var time = new Date();
            time = new Date(time.getFullYear(), time.getMonth(), time.getUTCDate(), 0, 0, 0);
            var time2 = new Date(time.getFullYear() + 1, time.getMonth(), time.getUTCDate(), 0, 0, 0);
            return {
                name: "",
                start: time.valueOf() / 1000, //timestamp is seconds
                end: time2.valueOf() / 1000, //timestamp is seconds
                rule: "dp_monthly",
                active_tier: 1,
                tiers: [],
                currency: "USD", //one of currencies symbol
                invoicing_interval: "monthly",
                lock_on_metric: false,
                lock_on_expire: false
            };
        }
    };

    countlyLicenseGenerator.service = {
        updatelicense: function(data) {
            var submitData = data;
            submitData.app_id = countlyCommon.ACTIVE_APP_ID; //for validator
            submitData.tiers = JSON.stringify(submitData.tiers || []);

            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/license-generator/edit",
                data: submitData,
                dataType: "json"
            }, {"disableAutoCatch": true});
        },
        createlicense: function(data) {
            var submitData = data;
            submitData.app_id = countlyCommon.ACTIVE_APP_ID; //for validator
            submitData.tiers = JSON.stringify(submitData.tiers || []);

            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/license-generator/create",
                data: submitData,
                dataType: "json"
            }, {"disableAutoCatch": true});
        },
        deletelicenses: function(licenses) {
            console.log('deletelicenses', licenses);
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/license-generator/delete",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    "licenses": licenses //single or multiple with ',' in middle
                },
                dataType: "json"
            }, {"disableAutoCatch": true});
        },
        fetchNamesList: function(query) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.r + "/license-generator/names",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    query: query
                },
                dataType: "json"
            });
        },
    };


    countlyLicenseGenerator.getVuexModule = function() {
        return countlyVue.vuex.Module("countlyLicenseGenerator", {
            actions: {
                create: function(context, data) {
                    context.dispatch('onActionError', "");
                    return countlyLicenseGenerator.service.createlicense(data)
                        .then(function() {
                            //context.dispatch("fetchFlowsTable");
                        }, function(err) {
                            context.dispatch('onActionError', err);
                        }).catch(function(error) {
                            context.dispatch('onActionError', error);
                        });

                },
                update: function(context, data) {
                    context.dispatch('onActionError', "");
                    return countlyLicenseGenerator.service.updatelicense(data)
                        .then(function() {
                            //context.dispatch("fetchFlowsTable");
                        }, function(err) {
                            context.dispatch('onActionError', err);
                        }).catch(function(error) {
                            context.dispatch('onActionError', error);
                        });
                },
                delete: function(context, data) {
                    console.log('inside delete');
                    context.dispatch('onActionError', "");
                    return countlyLicenseGenerator.service.deletelicenses(data)
                        .then(function() {
                            context.dispatch("fetchLicenseTable");
                        }, function(err) {
                            context.dispatch('onActionError', err);
                        }).catch(function(error) {
                            context.dispatch('onActionError', error);
                        });
                },
                fetchNames: function(context, query) {
                    return new Promise(function(resolve) {
                        countlyLicenseGenerator.service.fetchNamesList(query)
                            .then(function(data) {
                                data = data || {};
                                resolve(data.result || []);
                            }).catch(function(error) {
                                context.dispatch('onFetchError', error);
                            });
                    });
                },
                listTableFetched: function(context, value) {
                    context.commit('tableFetched', value);
                },
                onActionError: function(context, error) {
                    context.commit('setActionError', error);
                },
                setActiveFilter: function(context, data) {
                    context.state.activeFilter = data;
                    context.dispatch("fetchLicenseTable");
                }
            },
            state: function() {
                return {
                    data: [],
                    isTableLoaded: false,
                    activeFilter: {
                        name: "all",
                        activation_status: "all",
                        license_status: "all"
                    }
                };
            },
            getters: {
                actionError: function(context) {
                    return context.actionError;
                },
                activeFilter: function(state) {
                    return state.activeFilter;
                }
            },
            mutations: {
                setActionError: function(state, error) {
                    if (error) {
                        state.hasError = true;
                        if (error.responseText) {
                            try {
                                error.responseText = JSON.parse(error.responseText);
                                if (error.responseText.result) {
                                    error = error.responseText.result;
                                }
                                else {
                                    error = error.responseText;
                                }
                            }
                            catch (e) {
                                error = error.responseText;
                            }
                        }
                        state.actionError = error;
                    }
                    else {
                        state.hasError = false;
                        state.actionError = "";
                    }

                },
                tableFetched: function(state, length) {
                    state.isTableLoaded = length;
                }
            },
            submodules: [licenseTableResource]
        });
    };

}(window.countlyLicenseGenerator = window.countlyLicenseGenerator || {}, jQuery));