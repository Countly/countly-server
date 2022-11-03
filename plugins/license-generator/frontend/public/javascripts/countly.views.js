/*global  countlyVue, app, countlyLicenseGenerator, CV,CountlyHelpers, countlyCommon*/
(function() {
    var FEATURE_NAME = "license-generator";
    var licenseTiersTable = countlyVue.views.BaseView.extend({
        template: '#tier-table',
        props: {
            dataRows: {
                type: Array,
                default: [],
                required: true
            },
            billingType: {
                type: Object,
                default: {},
                required: true
            },
            type: {
                type: String,
                default: "dp_monthly",
                required: true
            }
        },
        data: function() {
            return {
                selectedRow: 0,
                tierValues: [],
            };
        },
        methods: {
            changeActiveTier: function(id) {
                this.$emit('tier-update', id);
            },
            deleteTier: function(id) {
                this.tierValues.splice(id, 1);
                if (id === this.selectedRow) {
                    this.selectedRow = 0;
                }
                this.$emit('tier-delete', id);
            },
            updateTier: function() {
                this.$emit('tier-update', this.tierValues);
            },
            inputChange: function(inputType, id, text) {
                if (inputType === 'is_active') {
                    for (var i = 0; i < this.tierValues.length; i++) {
                        if (i === id) {
                            this.tierValues[i].is_active = true;
                        }
                        else {
                            this.tierValues[i].is_active = false;
                        }
                    }
                }
                else {
                    this.tierValues[id][inputType] = parseInt(text) || null;
                }
                this.$emit('tier-update', this.tierValues);
            },
            addNewTier: function() {
                this.tierValues.push({
                    id: this.tierValues.length ? this.tierValues[this.tierValues.length - 1].id + 1 : 1,
                    upTo: null,
                    fee: null,
                    is_active: false
                });
                this.$emit('tier-add', this.tierValues);
            },
            renderHeader: function(h) {
                return h('div', {
                    style: {
                        lineHeight: 1.7,
                    }
                }, [
                    h('span', CV.i18n('licenses-generator.up-to')),
                    h('br'),
                    h('span', {style: {fontSize: '10px'}}, CV.i18n('licenses-generator.metric-and-interval-type.' + this.type + '-table', this.billingType.period)),
                ]);
            }
        },
        watch: {
            dataRows: {
                deep: true,
                handler: function() {
                    this.tierValues = this.dataRows.map((d) => ({
                        id: d.id,
                        upTo: d.upTo,
                        fee: d.fee,
                        is_active: d.is_active
                    }));
                }
            },
        },
        created: function() {
            this.tierValues = this.dataRows.map((d) => ({
                id: d.id,
                upTo: d.upTo,
                fee: d.fee,
                is_active: d.is_active
            }));
            if (this.dataRows.length === 0) {
                this.tierValues.push({
                    id: 1,
                    upTo: null,
                    fee: null,
                    is_active: true
                });
                this.selectedRow = 0;
            }
            else {
                this.selectedRow = this.dataRows.findIndex(x=>x.is_active) === -1 ? 0 : this.dataRows.findIndex(x=>x.is_active) ;
            }
        }
    });

    var licensesDrawer = countlyVue.views.BaseView.extend({
        template: '#licenses-drawer',
        components: {
            "license-tiers-table": licenseTiersTable
        },
        data: function() {
            var rules = [];
            var keys = ["dp_monthly", "active_monthly", "dp_total", "active_avg_monthly", "unlimited"];
            for (var z = 0; z < keys.length; z++) {
                rules.push({label: CV.i18n("licenses-generator.metric-and-interval-type." + keys[z]), value: keys[z], description: ""});
            }
            var allNames = [];

            return {
                invoicing_intervals: ['annual', "monthly"],
                rules: rules,
                currencies: ["USD", "GBP", "EUR"],
                title: CV.i18n('licenses-generator.create-new'),
                saveButtonLabel: CV.i18n('common.save'),
                tierValidation: true,
                deletedTierId: 0,
                allNames: allNames
            };
        },
        props: {
            controls: {
                type: Object
            },
        },
        methods: {
            handleTierUpdate: function(tiers) {
                this.tiers = tiers;
                this.checkTierValidation(tiers);
            },
            handleTierDelete: function(id) {
                this.deletedTierId = id;
                this.checkTierValidation(this.tiers);
            },
            handleTierAdd: function(tiers) {
                this.tiers = tiers;
                this.checkTierValidation(tiers);
            },
            checkTierValidation: function(tiers) {
                if (this.$refs.licenseDrawer.editedObject.rule !== 'unlimited' && tiers.find(x=>x.upTo === null || x.fee === null)) {
                    this.tierValidation = true;
                }
                else {
                    this.tierValidation = false;
                }
            },
            onSubmit: function(doc) {
                var self = this;
                var action = "countlyLicenseGenerator/create";
                if (doc._id) {
                    action = "countlyLicenseGenerator/update";
                }

                self.tiers ? doc.tiers = self.tiers : '';
                if (self.deletedTierId) {
                    doc.tiers.splice(self.deletedTierId, 1);
                }
                if (doc.tiers.findIndex(x=>x.is_active) === -1) {
                    doc.tiers[0].is_active = true;
                }
                for (var z = 0; z < doc.tiers.length; z++) {
                    doc.tiers[z][doc.rule] = doc.tiers[z].upTo;
                    if (doc.tiers[z].is_active) {
                        doc.active_tier = doc.tiers.findIndex(x=>x.is_active) + 1; //doc.tiers[z].id;
                    }
                }

                this.$store.dispatch(action, doc).then(function() {
                    var error = self.$store.getters['countlyLicenseGenerator/actionError'];
                    if (error) {
                        CountlyHelpers.notify({type: "error", title: CV.i18n("common.error"), message: error, sticky: false, clearAll: true});
                    }
                    else {
                        self.$store.dispatch("countlyLicenseGenerator/fetchLicenseTable");
                        CountlyHelpers.notify({type: "ok", title: CV.i18n("common.success"), message: CV.i18n("common.success"), sticky: false, clearAll: true});
                        self.deletedTierId = 0;
                    }
                    self.$emit("filter-refresh");
                    self.$root.$emit("cly-refresh");
                });
            },
            onClose: function($event) {
                this.$emit("close", $event);
            },
            onCopy: function(newState) {
                if (!newState._id) {
                    this.title = this.saveButtonLabel = CV.i18n('licenses-generator.create-new');
                }
                else {
                    this.title = this.saveButtonLabel = CV.i18n('licenses-generator.save-changes');
                }
            },
            onOpen: function() {
                var self = this;
                self.checkTierValidation(self.controls.initialEditedObject.tiers);
                this.$store.dispatch("countlyLicenseGenerator/fetchNames", "").then(function(namesData) {
                    var allNames = [];
                    for (var z = 0; z < namesData.length; z++) {
                        allNames.push({'value': namesData[z].name, 'name': namesData[z].name});
                    }
                    self.allNames = allNames;

                });
                this.$watch(
                    () => {
                        return this.$refs.licenseDrawer.editedObject.rule;
                    },
                    (val) => {
                        if (val === 'unlimited') {
                            this.tiers = [];
                            this.tiers.push({
                                id: 1,
                                upTo: null,
                                fee: null,
                                is_active: false
                            });
                        }
                        this.checkTierValidation(this.tiers);
                    }
                );
            }
        },
    });

    var HomeView = countlyVue.views.BaseView.extend({
        template: "#licenses-home",
        components: {
            // "home-table": HomeTable,
            "main-drawer": licensesDrawer
        },
        mixins: [
            countlyVue.mixins.hasDrawers("main"),
            countlyVue.mixins.auth(FEATURE_NAME),
            countlyVue.mixins.commonFormatters
        ],
        computed: {
            activeFilter: {
                set: function(newValue) {
                    return this.$store.dispatch("countlyLicenseGenerator/setActiveFilter", newValue);
                },
                get: function() {
                    return this.$store.getters["countlyLicenseGenerator/activeFilter"];
                }
            },
            activeFilterFields: function() {
                return [
                    {
                        label: CV.i18n('licenses-generator.name'),
                        key: "name",
                        items: this.getNames(),
                        default: "all"
                    },
                    {
                        label: CV.i18n('licenses-generator.activation-status'),
                        key: "activation_status",
                        options: [{value: "all", label: CV.i18n("common.all")}, {value: "active", label: CV.i18n("licenses-generator.active")}, {value: "inactive", label: CV.i18n("licenses-generator.inactive")}],
                        default: "all"
                    },
                    {
                        label: CV.i18n('licenses-generator.license-status'),
                        key: "license_status",
                        items: [{value: "all", label: CV.i18n("common.all")}, {value: "active", label: CV.i18n("licenses-generator.active")}, {value: "inactive", label: CV.i18n("licenses-generator.inactive")}],
                        default: "all"
                    },
                ];
            },
        },
        data: function() {
            return {
                isData: true,
                empty: {
                    title: this.i18n("license-generator.create-first-license"),
                    body: this.i18n("license-generator.create-first-message"),
                    image: "images/cohorts/cohorts-empty.svg"
                },
                remoteTableListData: countlyVue.vuex.getServerDataSource(this.$store, "countlyLicenseGenerator", "licenseTable"),
                tablePersistKey: 'licenseGeneratorTable_' + countlyCommon.ACTIVE_APP_ID,
                deleteDialogTitle: CV.i18n('management-users.warning'),
                deleteDialogText: "",
                deleteDialogConfirmText: CV.i18n('common.ok'),
                showDeleteDialog: false,
                names: [],
                ruleList: [],
            };
        },
        methods: {
            filterRefresh: function() {
                this.fetchNamesList("");
            },
            onCreateClick: function() {
                this.openDrawer("main", countlyLicenseGenerator.factory.getEmpty());
            },
            onDrawerSubmit: function(promise) {
                var self = this;
                promise.then(function() {
                    self.refresh();
                });
            },
            getNames: function() {
                var ret = [{value: "all", label: CV.i18n("common.all")}];
                for (var z = 0; z < this.names.length; z++) {
                    ret.push({value: this.names[z].name, label: this.names[z].name});
                }
                return ret;
            },
            fetchNamesList: function(query) {
                this.loadingNames = true;
                var self = this;
                this.$store.dispatch("countlyLicenseGenerator/fetchNames", query).then(function(data) {
                    self.loadingames = false;
                    self.names = data || [];
                });
            },
            configureOverview: function() {
                this.openDrawer("main", countlyLicenseGenerator.factory.getEmpty());
            },
            getTierValue: function(tiers, rule) {
                var tiersData = [];
                try {
                    tiersData = JSON.parse(tiers);
                }
                catch (e) {
                    tiersData = [];
                }
                for (var z = 0; z < tiersData.length; z++) {
                    if (tiersData[z].is_active && tiersData[z][rule]) {
                        return tiersData[z][rule];
                    }
                }
                //if did not found
                return 0;

            },
            handleCommand: function(command, scope) {
                switch (command) {
                case "edit":
                    scope.tiers = JSON.parse(scope.tiers) || [{}];
                    for (var z = 0; z < scope.tiers.length; z++) {
                        scope.tiers[z].upTo = scope.tiers[z][scope.rule];
                    }
                    // if (scope.active_tier && scope.active_tier < scope.tiers.length) {
                    //     scope.tiers[((scope.active_tier || 1) - 1)].is_active = true;
                    // }
                    this.openDrawer("main", scope);
                    break;
                case "new":
                    scope.name = scope.name + "- Copy";
                    scope.tiers = JSON.parse(scope.tiers) || [];
                    for (var z1 = 0; z1 < scope.tiers.length; z1++) {
                        scope.tiers[z1].upTo = scope.tiers[z1][scope.rule];
                    }
                    scope.tiers[((scope.active_tier || 1) - 1)].is_active = true;
                    delete scope._id;

                    this.openDrawer("main", scope);
                    break;
                case "delete":
                    this.deleteDialogText = CV.i18n('licenses-generator.delete-license', scope.name);
                    this.licenses = scope._id;
                    this.showDeleteDialog = true;
                    break;
                }
            },
            submitDeleteForm: function() {
                this.showDeleteDialog = false;
                var self = this;
                if (self.licenses) {
                    self.$store.dispatch("countlyLicenseGenerator/delete", self.licenses).then(function() {
                        var error = self.$store.getters['countlyLicenseGenerator/actionError'];
                        if (error) {
                            CountlyHelpers.notify({type: "error", title: CV.i18n("common.error"), message: error, sticky: false, clearAll: true});
                        }
                        else {
                            self.$store.dispatch("countlyLicenseGenerator/fetchLicenseTable");
                            CountlyHelpers.notify({type: "ok", title: CV.i18n("common.success"), message: CV.i18n("common.success"), sticky: false, clearAll: true});
                        }
                        self.filterRefresh();
                    });
                }
            },
            closeDeleteForm: function() {
                this.showDeleteDialog = false;
            },
            dateFormatter: function(row, col, value) {
                if (!value) {
                    return '';
                }
                return countlyCommon.getDate(value);
            },
        },
        beforeCreate: function() {
            //this.$store.dispatch("countlyCohorts/home/initialize");
        },
        beforeDestroy: function() {
            //this.$store.dispatch("countlyCohorts/home/reset");
        },
        mounted: function() {
            this.fetchNamesList("");
            var keys = ["dp_monthly", "active_monthly", "dp_total", "active_avg_monthly", "unlimited"];
            for (var z = 0; z < keys.length; z++) {
                this.ruleList.push({label: CV.i18n("licenses-generator.metric-and-interval-type." + keys[z]), value: keys[z], description: ""});
            }
        }
    });

    // Views
    var vuex = [{
        clyModel: countlyLicenseGenerator
    }];

    app.route("/manage/license-generator", "license-generator", function() {
        var licenseGeneratorHomeView = new countlyVue.views.BackboneWrapper({
            component: HomeView,
            vuex: vuex,
            templates: [
                "/license-generator/templates/LicensesHome.html",
                "/license-generator/templates/MainDrawer.html",
                "/license-generator/templates/LicenseTiersTable.html",
                "/drill/templates/query.builder.v2.html",
            ]
        });
        this.renderWhenReady(licenseGeneratorHomeView);
    });

    app.addMenu("management", {code: "license-generator", permission: FEATURE_NAME, url: "#/manage/license-generator", text: "license-generator.title", priority: 120});
})();