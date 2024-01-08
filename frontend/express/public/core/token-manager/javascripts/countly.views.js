/*global app, countlyVue, countlyCommon, CV, $, countlyGlobal, countlyTokenManager, CountlyHelpers */
(function() {
    var TokenDrawer = countlyVue.views.create({
        template: CV.T('/core/token-manager/templates/token-manager-drawer.html'),
        data: function() {
            return {
                tokenUsage: '0',
                tokenExpiration: '0',
                title: '',
                constants: {
                    "availableProps": [
                        { label: CV.i18n('token_manager.limit.h'), value: "hours" },
                        { label: CV.i18n('token_manager.limit.d'), value: "days" },
                        { label: CV.i18n('token_manager.limit.m'), value: "months" }
                    ],
                    "apps": this.appsData(),
                }
            };
        },
        methods: {
            appsData: function() {
                var apps = [];
                for (var appId in countlyGlobal.apps) {
                    apps.push({ value: appId, name: countlyGlobal.apps[appId].name });
                }
                return apps;
            },
            addEndpoint: function(endpoints) {
                endpoints.push({parameters: [{}]});
            },
            addParameter: function(parameters) {
                parameters.push({});
            },
            removeEndpoint: function(endpoints, endpointIndex) {
                if (endpoints.length > 1) {
                    endpoints.splice(endpointIndex, 1);
                }
            },
            removeParameter: function(parameters, parameterIndex) {
                if (parameters.length > 1) {
                    parameters.splice(parameterIndex, 1);
                }
            },
            onClose: function() {
                this.tokenUsage = '0';
                this.tokenExpiration = '0';
            },
            onSubmit: function(doc) {
                var self = this;
                var ttl = 0;
                var selectApps = doc.selectApps;
                var endpoints = doc.endpoints;
                var newEndpoints = [];
                endpoints.forEach(function(element) {
                    if (element.endpointName !== "" && element.endpointName) {
                        var obj = {params: {}} ;
                        obj.endpoint = element.endpointName;
                        element.parameters.forEach(function(item) {
                            var key = item.queryParameters1;
                            var value = item.queryParameters2;
                            obj.params[key] = value;
                        });
                        newEndpoints.push(obj);
                    }
                });
                endpoints = JSON.stringify(newEndpoints);

                if (self.tokenUsage === "1") {
                    if (doc.selectApps.length > 0) {
                        selectApps = doc.selectApps.join(",");
                    }
                }
                if (self.tokenExpiration === "1") {
                    if (doc.selectTime === "hours") {
                        ttl = doc.timeInput * 3600;
                    }
                    else if (doc.selectTime === "days") {
                        ttl = doc.timeInput * 3600 * 24;
                    }
                    else if (doc.selectTime === "months") {
                        ttl = doc.timeInput * 3600 * 24 * 30;
                    }
                }
                countlyTokenManager.createTokenWithQuery(doc.description, endpoints, doc.checkboxMultipleTimes, selectApps, ttl, function() {
                    self.$emit("create");
                });
            }
        },
        props: {
            controls: {
                type: Object
            }
        },
    });

    var TokenManager = countlyVue.views.create({
        template: CV.T('/core/token-manager/templates/token-manager.html'),
        components: {
            "main-drawer": TokenDrawer
        },
        mixins: [countlyVue.mixins.hasDrawers("main")],
        data: function() {
            return {
                tableData: []
            };
        },
        mounted: function() {
            var self = this;
            $.when(countlyTokenManager.initialize()).then(function() {
                self.prepareTableData();
            });
        },
        methods: {
            refresh: function() {
                var self = this;
                $.when(countlyTokenManager.initialize()).then(function() {
                    self.prepareTableData();
                });
            },
            prepareTableData: function() {
                var tableData = countlyTokenManager.getData();
                var row;
                for (var j = 0; j < tableData.length; j++) {
                    if (tableData[j]._id === countlyGlobal.auth_token) {
                        tableData.splice(j, 1);
                    }
                }
                for (var i = 0; i < tableData.length; i++) {
                    row = tableData[i];
                    if (row.ttl && ((row.ends * 1000) - Date.now()) < 0) {
                        row.status = "expired";
                    }
                    else {
                        row.status = "active";
                    }
                    if (row.ttl) {
                        row.ttlDate = countlyCommon.getDate(row.ends);
                        row.ttlTime = countlyCommon.getTime(row.ends);
                    }
                    else {
                        row.ttlDate = CV.i18n('token_manager.table.not-expire');
                    }
                    if (row.app) {
                        if (row.app.length === 0) {
                            row.app = CV.i18n('token_manager.table.all-apps');
                        }
                        else {
                            row.app = CountlyHelpers.appIdsToNames(row.app);
                        }
                    }
                    else {
                        row.app = CV.i18n('token_manager.table.all-apps');
                    }
                    if (row.purpose && row.purpose !== "") {
                        row.purpose = row.purpose + "";
                        row.purpose = row.purpose[0].toUpperCase() + row.purpose.substring(1);
                    }
                    if (Array.isArray(row.endpoint)) {
                        var lines = [];
                        for (var p = 0; p < row.endpoint.length; p++) {
                            if (typeof row.endpoint[p] === "string") {
                                lines.push(row.endpoint[p]);
                            }
                            else {
                                if (row.endpoint[p].endpoint) {
                                    var params = [];
                                    var have_params = false;
                                    for (var k in row.endpoint[p].params) {
                                        params.push(k + ": " + row.endpoint[p].params[k]);
                                        have_params = true;
                                    }
                                    if (have_params) {
                                        lines.push(row.endpoint[p].endpoint + " (" + params.join(",") + ")");
                                    }
                                    else {
                                        lines.push(row.endpoint[p].endpoint);
                                    }
                                }
                                else {
                                    lines.push(row.endpoint[p]);
                                }
                            }
                        }
                        row.endpoint = lines.join(", ");
                    }
                }
                this.tableData = tableData;
            },
            getColor: function(status) {
                if (status === "active") {
                    return "green";
                }
                else if (status === "expired") {
                    return "red";
                }
            },
            onCreateClick: function() {
                this.openDrawer("main", {
                    description: "", checkboxMultipleTimes: false, endpoints: [{parameters: [{}]}], selectApps: []
                });
            },
            onDelete: function(row) {
                var self = this;
                CountlyHelpers.confirm(CV.i18n("token_manager.delete-token-confirm"), "popStyleGreen", function(result) {
                    if (!result) {
                        return true;
                    }
                    countlyTokenManager.deleteToken(row._id, function(err) {
                        if (err) {
                            CountlyHelpers.alert(CV.i18n("token_manager.delete-error"), "red");
                        }
                        self.refresh(true);
                    });
                }, [CV.i18n("common.no-dont-delete"), CV.i18n("token_manager.yes-delete-token")], {title: CV.i18n("token_manager.delete-token-confirm-title"), image: "delete-token"});
            },

        }
    });

    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: TokenManager,
            vuex: []
        });
    };

    app.route('/manage/token_manager', 'tokenManager', function() {
        this.renderWhenReady(getMainView());
    });

})();