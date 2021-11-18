/*global app, countlyVue, countlyCommon, CV, $, countlyGlobal, countlyTokenManager, CountlyHelpers */
(function() {
    var TokenDrawer = countlyVue.views.create({
        template: CV.T('/core/token-manager/templates/token-manager-drawer.html'),
        data: function() {
            return {
                title: '',
                constants: {
                    "availableProps": [
                        { label: "hours", value: "hours" },
                        { label: "days", value: "days" },
                        { label: "mounts", value: "mounts" }
                    ],
                    "apps": this.appsData()
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
        mounted: function(row) {
            var self = this;
            $.when(countlyTokenManager.initialize()).then(function() {
                self.prepareTableData(row);
            });
        },
        methods: {
            refresh: function(row) {
                var self = this;
                $.when(countlyTokenManager.initialize()).then(function() {
                    self.prepareTableData(row);
                });
            },
            prepareTableData: function(row) {
                var tableData = countlyTokenManager.getData();
                for (var j = 0; j < tableData.length; j++) {
                    if (tableData[j]._id === countlyGlobal.auth_token) {
                        tableData.splice(j, 1);
                    }
                }
                for (var i = 0; i < tableData.length; i++) {
                    row = tableData[i];
                    if (row.ttl && ((row.ends * 1000) - Date.now()) < 0) {
                        row.status = "Expired";
                    }
                    else {
                        row.status = "Active";
                    }
                    if (row.ttl) {
                        row.ttlDate = countlyCommon.getDate(row.ends);
                        row.ttlTime = countlyCommon.getTime(row.ends);

                    }
                    else {
                        row.ttlDate = "No expiry";
                    }
                    if (row.app) {
                        if (row.app.length === 0) {
                            row.app = "All apps";
                        }
                        else {
                            row.app = CountlyHelpers.appIdsToNames(row.app);
                        }
                    }
                    else {
                        row.app = "All apps";
                    }
                    if (row.purpose !== "") {
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
                        row.endpoint = lines.join("</br>");
                    }
                }
                this.tableData = tableData;
            },
            getColor: function(row) {
                if (row.status === "Active") {
                    return "green";
                }
                else if (row.status === "Expired") {
                    return "red";
                }
            },
            onCreateClick: function() {
                this.openDrawer("main", {
                    description: "-", elCheckboxValue: false, radioVal1: "0", radioVal2: "0", endpointName: " ", field1: " ", field2: " ",
                });
            }
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
