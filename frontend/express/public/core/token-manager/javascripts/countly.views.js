/*global app, countlyVue, countlyCommon, CV, $, countlyGlobal, countlyTokenManager, countlyUserManagement, countlyAuth, CountlyHelpers */
(function() {
    var PERMISSION_TYPES = ["c", "r", "u", "d"];

    var TokenDrawer = countlyVue.views.create({
        template: CV.T('/core/token-manager/templates/token-manager-drawer.html'),
        data: function() {
            return {
                tokenUsage: '0',
                tokenExpiration: '0',
                title: '',
                features: [],
                filteredFeatures: [],
                searchQuery: '',
                allByType: {c: false, r: false, u: false, d: false},
                permissionSet: countlyAuth.permissionSetGenerator(1)[0],
                constants: {
                    "availableProps": [
                        { label: CV.i18n('token_manager.limit.h'), value: "hours" },
                        { label: CV.i18n('token_manager.limit.d'), value: "days" },
                        { label: CV.i18n('token_manager.limit.m'), value: "months" }
                    ]
                }
            };
        },
        mounted: function() {
            var self = this;
            $.when(countlyUserManagement.fetchFeatures()).then(function() {
                self.features = countlyUserManagement.getFeatures() || [];
                self.filteredFeatures = self.features;
            });
        },
        methods: {
            featureBeautifier: function(feature) {
                return countlyAuth.featureBeautifier(feature);
            },
            search: function() {
                var self = this;
                var query = (self.searchQuery || "").toLowerCase();
                if (query !== "") {
                    self.filteredFeatures = self.features.filter(function(feature) {
                        return self.featureBeautifier(feature).toLowerCase().indexOf(query) !== -1;
                    });
                }
                else {
                    self.filteredFeatures = self.features;
                }
                //the column headers describe the rows on screen, and those just changed
                self.syncAllFlags();
            },
            clearSearch: function() {
                this.searchQuery = '';
                this.filteredFeatures = this.features;
                this.syncAllFlags();
            },
            //granting anything on a feature implies being able to read it, mirroring how a user's
            //own permissions are edited in user management
            setPermissionByFeature: function(type, feature) {
                if (type !== 'r' && this.permissionSet[type].allowed[feature] && !this.permissionSet.r.allowed[feature]) {
                    this.$set(this.permissionSet.r.allowed, feature, true);
                }
                if (type === 'r' && !this.permissionSet.r.allowed[feature]) {
                    for (var i = 0; i < PERMISSION_TYPES.length; i++) {
                        this.$set(this.permissionSet[PERMISSION_TYPES[i]].allowed, feature, false);
                    }
                }
                this.syncAllFlags();
            },
            setPermissionByType: function(type) {
                var on = this.allByType[type];
                for (var i = 0; i < this.filteredFeatures.length; i++) {
                    var feature = this.filteredFeatures[i];
                    this.$set(this.permissionSet[type].allowed, feature, on);
                    if (on && type !== 'r') {
                        this.$set(this.permissionSet.r.allowed, feature, true);
                    }
                    if (!on && type === 'r') {
                        for (var j = 0; j < PERMISSION_TYPES.length; j++) {
                            this.$set(this.permissionSet[PERMISSION_TYPES[j]].allowed, feature, false);
                        }
                    }
                }
                this.syncAllFlags();
            },
            syncAllFlags: function() {
                var self = this;
                /**
                * Whether every feature in a list is allowed for one access type.
                * @param {string} type - access type (c, r, u, d)
                * @param {string[]} features - features to check
                * @returns {boolean} true when the list is non-empty and fully allowed
                */
                var allOf = function(type, features) {
                    return features.length > 0 && features.every(function(feature) {
                        return self.permissionSet[type].allowed[feature] === true;
                    });
                };
                PERMISSION_TYPES.forEach(function(type) {
                    //"all" must mean every feature, including ones added later, so it is only set
                    //when the whole list is selected - the server refuses an "all" grant the
                    //creator does not hold
                    self.permissionSet[type].all = allOf(type, self.features);
                    //the column header toggles the rows on screen, so it reports on those. Reading
                    //it off the full list instead would leave it ticked after a filtered toggle -
                    //the value would go false, true, false within one tick, so Vue would see no
                    //change to patch and the box the browser just ticked would stay ticked while
                    //the model said otherwise.
                    self.allByType[type] = allOf(type, self.filteredFeatures);
                });
            },
            buildPermission: function(apps) {
                var permission = {_: {a: [], u: [apps]}, c: {}, r: {}, u: {}, d: {}};
                return countlyAuth.combinePermissionObject([apps], [this.permissionSet], permission);
            },
            onClose: function() {
                this.tokenUsage = '0';
                this.tokenExpiration = '0';
                this.searchQuery = '';
                this.filteredFeatures = this.features;
                this.permissionSet = countlyAuth.permissionSetGenerator(1)[0];
                this.allByType = {c: false, r: false, u: false, d: false};
            },
            onSubmit: function(doc) {
                var self = this;
                var ttl = 0;
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

                var options = {
                    purpose: doc.description,
                    multi: doc.checkboxMultipleTimes,
                    ttl: ttl
                };
                if (self.tokenUsage === "1") {
                    options.permission = self.buildPermission(doc.selectApps || []);
                }
                else {
                    //an unlimited token carries the creator's own permissions, and only such a
                    //token may be granted permission to sign in
                    options.canLogin = doc.checkboxCanLogin === true;
                }

                countlyTokenManager.createTokenWithPermissions(options, function(err) {
                    if (err) {
                        CountlyHelpers.alert(CV.i18n('token_manager.create-error'), "red");
                        return;
                    }
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
                        j--;
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
                    row.canLogin = row.can_login === true;
                    row.permissionSummary = this.describePermission(row);
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
            //describe what a token may do, so the list distinguishes a limited token from one that
            //carries the owner's own permissions
            describePermission: function(row) {
                if (!row.token_permission) {
                    return CV.i18n('token_manager.permission.full');
                }
                var counts = {c: 0, r: 0, u: 0, d: 0};
                var labels = [];
                PERMISSION_TYPES.forEach(function(type) {
                    var forType = row.token_permission[type] || {};
                    for (var appId in forType) {
                        var entry = forType[appId];
                        if (!entry) {
                            continue;
                        }
                        var grants = entry.all === true;
                        for (var feature in entry.allowed || {}) {
                            if (entry.allowed[feature] === true) {
                                grants = true;
                                break;
                            }
                        }
                        if (grants) {
                            counts[type]++;
                        }
                    }
                });
                PERMISSION_TYPES.forEach(function(type) {
                    if (counts[type] > 0) {
                        labels.push(CV.i18n('token_manager.permission.' + type));
                    }
                });
                return labels.length ? labels.join(", ") : CV.i18n('token_manager.permission.none');
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
                    description: "", checkboxMultipleTimes: false, checkboxCanLogin: false, selectApps: []
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