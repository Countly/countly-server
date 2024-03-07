/* global app, countlyAuth, countlyVue, countlyPopulator, CountlyHelpers, CV, countlyCommon, countlyGlobal, Vue, moment */
(function() {
    var FEATURE_NAME = 'populator';

    var PopulatorView = countlyVue.views.create({
        template: countlyVue.T("/populator/templates/populator.html"),
        data: function() {
            return {
                currentTab: "data-populator",
                dialog: {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: '', params: {}},
                selectedTemplate: '',
                generateDataModal: {showDialog: false},
                percentage: 0,
                templates: [],
                progressBarColor: '#0166D6',
                progressBar: null,
                progressBarWidth: '0 / 0',
                finishedGenerateModal: {showDialog: false},
                description: CV.i18n('populator.warning3'),
                titleDescription: {header: '', button: ''},
                currentPopulateTab: 'pop-with-temp',
                environmentName: '',
                isOpen: 'false',
                numberOfRuns: [
                    {value: 10, text: 10},
                    {value: 50, text: 50},
                    {value: 100, text: 100},
                ],
                selectedRunCount: 10,

                isLoading: false,
                environments: [],
                selectedEnvironment: '',
            };
        },
        computed: {
            populateTabs: function() {
                return [
                    {
                        title: this.i18n('populator.pop-with-temp'),
                        name: "pop-with-temp",
                    },
                    {
                        title: this.i18n('populator.pop-with-env'),
                        name: "pop-with-env",
                    }
                ];
            },
        },
        methods: {
            refreshTable: function(res) {
                if (res.result) {
                    this.refresh(true);
                }
            },
            newTemplate: function() {
                this.titleDescription = {header: CV.i18n('populator.create-new-template'), button: CV.i18n('common.create')};
                // todo: Get this initial state from model instead of hardcoding it
                this.openDrawer("populatorTemplate", {
                    name: '',
                    uniqueUserCount: 100,
                    platformType: ["Mobile"],
                    users: [],
                    events: [],
                    views: [],
                    sequences: [],
                    behavior: {}
                });
            },
            refresh: function(isRefresh) {
                if (isRefresh) {
                    this.getTemplateList(false);
                }
            },
            handleDrawerActions: function(command, template) {
                switch (command) {
                case "edit":
                    this.titleDescription = {header: CV.i18n('populator.drawer-title-edit'), button: CV.i18n('populator.save')};
                    this.openDrawer("populatorTemplate", template);
                    break;
                case "duplicate":
                    template.is_duplicate = true;
                    this.titleDescription = {header: CV.i18n('populator.drawer-title-duplicate'), button: CV.i18n('populator.duplicate')};
                    this.openDrawer("populatorTemplate", template);
                    break;
                case "delete":
                    this.dialog = {
                        type: "deleteTemplate",
                        showDialog: true,
                        saveButtonLabel: CV.i18n('common.yes'),
                        cancelButtonLabel: CV.i18n('common.no'),
                        title: CV.i18n('populator.delete-template-header'),
                        text: CV.i18n('populator.delete-template-description', template.name),
                        params: {templateId: template._id}
                    };
                    break;
                default:
                    break;
                }
            },
            submitConfirmDialog: function() {
                var self = this;
                if (this.dialog.type === "deleteTemplate") {
                    countlyPopulator.removeTemplate(this.dialog.params.templateId, function(res) {
                        if (res.result) {
                            CountlyHelpers.notify({
                                type: "ok",
                                title: CV.i18n("common.success"),
                                message: CV.i18n('populator-success-delete-template'),
                                sticky: false,
                                clearAll: true
                            });
                            self.refresh(true);
                        }
                        else {
                            CountlyHelpers.notify({
                                type: "error",
                                title: CV.i18n("common.error"),
                                message: CV.i18n('populator.failed-to-remove-template', self.dialog.params.templateId),
                                sticky: false,
                                clearAll: true
                            });
                        }
                        self.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                    });
                }
                else {
                    if (this.isOpen) {
                        countlyPopulator.checkEnvironment(this.environmentName, function(res) {
                            if (res.errorMsg) {
                                CountlyHelpers.notify({type: "error", title: CV.i18n("common.error"), message: res.errorMsg, sticky: false, clearAll: true});
                                self.dialog.showDialog = false;
                                return;
                            }
                            else {
                                self.startPopulate();
                                self.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                            }
                        });
                    }
                    else {
                        this.startPopulate();
                        this.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                    }
                }
            },
            closeConfirmDialog: function() {
                this.environmentName = '';
                this.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                this.description = CV.i18n('populator.warning3');
            },
            redirectHomePage: function() {
                this.generateDataModal = { showDialog: false };
                var self = this;
                countlyPopulator.stopGenerating(false, function() {
                    window.clearInterval(self.progressBar);
                    self.generateDataModal = { showDialog: false };
                    self.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                });
                window.location.href = '#/home';
                window.location.reload();
            },
            continuePopulate: function() {
                this.finishedGenerateModal = { showDialog: false };
                self.description = CV.i18n('populator.warning3');
            },
            moveProgressBar: function(template) {
                var self = this;
                self.percentage = 0;
                self.progressBar = setInterval(function() {
                    if (countlyPopulator.isGenerating()) {
                        self.percentage = countlyPopulator.getCompletedRequestCount() / (template.uniqueUserCount) * 100;
                        self.progressBarWidth = countlyPopulator.getCompletedRequestCount() + " / " + template.uniqueUserCount;
                    }
                    else {
                        self.percentage = 100;
                        countlyPopulator.stopGenerating(true);
                        window.clearInterval(self.progressBar);
                        self.generateDataModal = { showDialog: false };
                        self.finishedGenerateModal = {showDialog: true};
                        self.description = CV.i18n('populator.warning3');
                        self.environmentName = '';
                        self.getTemplateList();
                        if (self.isOpen) {
                            self.isOpen = false;
                        }
                    }
                }, 1000);
            },
            startPopulate: function() {
                var self = this;
                self.percentage = 0;
                this.generateDataModal = { showDialog: true };

                countlyPopulator.setStartTime(countlyCommon.periodObj.start / 1000);
                countlyPopulator.setEndTime(countlyCommon.periodObj.end / 1000);

                if (this.currentPopulateTab === 'pop-with-env') { // populate with environment selected
                    const { templateId, name } = this.environments.filter(x=>x._id === self.selectedEnvironment)[0];
                    countlyPopulator.getEnvironment(templateId, self.selectedEnvironment, function(env) {
                        if (env && env.length) {
                            countlyPopulator.getTemplate(templateId, function(template) {
                                env = env.map(environmentName => {
                                    return { ...environmentName, name: name };
                                });
                                countlyPopulator.generateUsers(self.selectedRunCount, template, env);
                                self.moveProgressBar(template);
                            });
                        }
                        else {
                            CountlyHelpers.notify({
                                type: "error",
                                title: CV.i18n("common.error"),
                                message: CV.i18n('populator.no-data-fetch-environment'),
                                sticky: false,
                                clearAll: true
                            });
                        }
                    });
                }
                else {
                    countlyPopulator.setSelectedTemplate(self.selectedTemplate);
                    countlyPopulator.getTemplate(self.selectedTemplate, function(template) {
                        template.saveEnvironment = self.isOpen;
                        template.environmentName = self.environmentName;
                        countlyPopulator.generateUsers(self.selectedRunCount, template);
                        self.moveProgressBar(template);
                    });
                }
            },
            stopPopulate: function() {
                this.finishedGenerateModal = { showDialog: false };
                this.generateDataModal = { showDialog: false };
                this.description = CV.i18n('populator.warning3');
                var self = this;
                countlyPopulator.stopGenerating(true, function() {
                    window.clearInterval(self.progressBar);
                    self.generateDataModal = { showDialog: false };
                    self.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                    if (self.isOpen) {
                        self.isOpen = false;
                        self.getTemplateList(); // refresh the environment list and template
                    }
                    self.environmentName = '';
                });
            },
            openDialog: function() {
                this.description = CV.i18n('populator.warning4');
                this.dialog = {
                    type: "check",
                    showDialog: false,
                    saveButtonLabel: CV.i18n('populator.yes-populate-data'),
                    cancelButtonLabel: CV.i18n('populator.no-populate-data'),
                    title: CV.i18n('populator.warning1', CountlyHelpers.appIdsToNames([countlyCommon.ACTIVE_APP_ID])),
                    text: CV.i18n('populator.warning2')
                };

                if (this.isOpen) {
                    var self = this;
                    countlyPopulator.checkEnvironment(this.environmentName, function(res) {
                        if (res.errorMsg) {
                            CountlyHelpers.notify({type: "error", title: CV.i18n("common.error"), message: res.errorMsg, sticky: false, clearAll: true});
                            self.environmentName = '';
                            self.isOpen = false;
                        }
                        else {
                            self.dialog.showDialog = true;
                        }
                    });
                }
                else {
                    this.dialog.showDialog = true;
                }
            },
            closeGenerateDataModal: function() {
                this.generateDataModal = { showDialog: false };
                this.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                this.getTemplateList();
            },
            getTemplateList: function(force) {
                var self = this;
                self.isLoading = force;
                self.templates = [];
                countlyPopulator.getEnvironments(function(environments) {
                    self.environments = environments;

                    countlyPopulator.getTemplates(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type, function(templates) {
                        templates.forEach(function(item) {
                            if (self.environments.filter(x => x.templateId === item._id).length) {
                                item.hasEnvironment = true;
                            }
                            else {
                                item.hasEnvironment = false;
                            }
                            self.templates.push({
                                _id: item._id,
                                name: item.name,
                                buttonShow: !item.isDefault,
                                isDefault: item.isDefault === true ? CV.i18n('populator.template-type-default') : CV.i18n('populator.template-type-custom'),
                                // Could also use uniqueUserCount property instead?
                                userCount: (item.users !== undefined ? Object.keys(item.users).length : 0),
                                eventCount: (item.events !== undefined ? Object.keys(item.events).length : 0),
                                viewCount: (item.views !== undefined ? Object.keys(item.views).length : 0),
                                sequenceCount: (item.sequences !== undefined ? Object.keys(item.sequences).length : 0),
                                // generatedOn is missing as a property
                                generatedOn: (item.generatedOn !== undefined ? moment(new Date(item.generatedOn)).format("DD MMM YYYY") : '?'),
                                generatedOnTs: item.generatedOn ? item.generatedOn : undefined,
                                uniqueUserCount: item.uniqueUserCount,
                                platformType: item.platformType || [],
                                users: item.users || [],
                                events: item.events || [],
                                views: item.views || [],
                                sequences: item.sequences || [],
                                behavior: item.behavior,
                                hasEnvironment: item.hasEnvironment,
                                lastEditedBy: (item.lastEditedBy !== undefined ? item.lastEditedBy : '-'),
                            });
                        });
                        self.isLoading = false;
                    });
                });
            },
            onRowClick: function(params) {
                app.navigate("/manage/populate/environment/" + params._id, true);
            },
        },
        watch: {
            selectedTemplate: function() {
                this.isOpen = false;
                this.environmentName = '';
            },
            environmentName: function(newVal) {
                if (newVal.length) {
                    this.isOpen = true;
                }
                else {
                    this.isOpen = false;
                }
            }
        },
        beforeCreate: function() {
        },
        created: function() {
            this.getTemplateList(true);
            if (!this.canUserCreate) {
                this.currentTab = "templates";
            }
        },
        mixins: [
            countlyVue.mixins.hasDrawers("populatorTemplate"),
            countlyVue.mixins.auth(FEATURE_NAME)
        ]
    });

    var EnvironmentDetail = countlyVue.views.create({
        data: function() {
            var self = this;
            var tableStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("environmentUsersTable", {
                columns: ['userName', "platform", "device"],
                onRequest: function() {
                    self.isLoading = true;
                    if (self.environmentId) {
                        return {
                            type: "GET",
                            url: countlyCommon.API_URL + "/o/populator/environment/get",
                            data: {
                                app_id: countlyCommon.ACTIVE_APP_ID,
                                template_id: self.$route.params.id,
                                environment_id: self.environmentId
                            }
                        };
                    }
                },
                onReady: function(context, rows) {
                    self.isLoading = false;
                    rows.forEach(item => {
                        if (item.custom) {
                            const customKeys = Object.keys(item.custom);
                            customKeys.forEach(key => {
                                if (!self.customProperties.includes(key)) {
                                    self.customProperties.push(key);
                                }
                            });
                        }
                    });
                    return rows;
                }
            }));
            return {
                environmentInformations: [],
                templateInformations: {},
                templateId: this.$route.params.id,
                customProperties: [],
                isLoading: false,
                environmentId: '',
                filterByEnvironmentOptions: [],
                dialog: {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''},
                tableStore,
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "environmentUsersTable")
            };
        },
        computed: {
            hasDeleteRight: function() {
                return countlyAuth.validateDelete(FEATURE_NAME);
            },
        },
        methods: {
            refresh: function(force) {
                if (this.isLoading || force) {
                    this.isLoading = false;
                    this.tableStore.dispatch("fetchEnvironmentUsersTable");
                }
            },
            deleteEnvironment: function() {
                this.openDialog();
            },
            closeConfirmDialog: function() {
                this.dialog.showDialog = false;
            },
            submitConfirmDialog: function() {
                var self = this;
                countlyPopulator.removeEnvironment(this.templateId, this.environmentId, function(res) {
                    if (res.result) {
                        CountlyHelpers.notify({type: "ok", title: CV.i18n("common.success"), message: CV.i18n('populator-success-delete-environment'), sticky: true, clearAll: true});
                        self.dialog.showDialog = false;
                        app.navigate("/manage/populate", true);
                    }
                    else {
                        CountlyHelpers.notify({type: "error", title: CV.i18n("common.error"), message: CV.i18n('populator.failed-to-delete-environment', self.environmentId), sticky: false, clearAll: true});
                    }
                });
            },
            openDialog: function() {
                this.dialog = {
                    type: "check",
                    showDialog: true,
                    saveButtonLabel: CV.i18n('common.yes'),
                    cancelButtonLabel: CV.i18n('common.cancel'),
                    title: CV.i18n('populator.environment-delete-warning-title'),
                    text: CV.i18n('populator.environment-delete-warning-description', this.filterByEnvironmentOptions.filter(x => x.value === this.environmentId)[0].label)
                };
            },
            calculateWidth: function(percentage) {
                //added to use the "fixed" prop on the table.
                //fixed only works if width = px, and since the columns are dynamic, we have to make this conversion to fit columns properly
                if (document.querySelector('#populator-environment-table')) {
                    const tableWidth = document.querySelector('#populator-environment-table').offsetWidth;
                    return (tableWidth * percentage) / 100;
                }
                return 300;
            },
            formatTableCell: function(item) {
                return function(row) {
                    return row.custom[item] === null || typeof row.custom[item] === 'undefined' ? '-' : row.custom[item].toString();
                };
            },
            onEnvironmentChange: function() {
                this.refresh(true);
            }
        },
        template: countlyVue.T("/populator/templates/environment_detail.html"),
        created: function() {
            var self = this;
            this.templateId = this.$route.params.id;
            countlyPopulator.getEnvironments(function(envs) {
                self.filterByEnvironmentOptions = envs.filter(x => x.templateId === self.templateId)
                    .map(x => ({value: x._id, label: x.name}));
                self.environmentId = self.filterByEnvironmentOptions[0].value;
                self.refresh(true);
            });
        },
        beforeCreate: function() {
            var self = this;
            countlyPopulator.getTemplate(this.$route.params.id, function(template) {
                self.templateInformations.templateName = template.name,
                self.templateInformations.generatedOn = moment(template.generatedOn).format("DD MMM YYYY");
            });
        }
    });

    var AppLockedView = countlyVue.views.create({
        template: countlyVue.T("/populator/templates/application-lock.html"),
        methods: {
            redirectToAppManager: function() {
                window.location.href = '#/manage/apps';
            }
        }
    });

    var getPopulatorView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: PopulatorView
        });
    };

    var getAppLockedView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: AppLockedView
        });
    };
    app.route("/manage/populate*state", "populate", function() {
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].locked) {
            this.renderWhenReady(getAppLockedView());
        }
        else if (countlyAuth.validateRead("populator")) {
            this.renderWhenReady(getPopulatorView());
        }
        else {
            app.navigate("/", true);
        }
    });

    app.route("/manage/populate/environment/:id", "environment-detail", function(id) {
        var view = new countlyVue.views.BackboneWrapper({
            component: EnvironmentDetail
        });
        view.params = {id: id};
        this.renderWhenReady(view);
    });

    app.addSubMenu("management", {code: "populate", permission: FEATURE_NAME, url: "#/manage/populate", text: "populator.plugin-title", priority: 30, classes: "populator-menu"});
    countlyVue.container.registerMixin("/manage/export/export-features", {
        pluginName: "populator",
        beforeCreate: function() {
            var self = this;
            countlyPopulator.getTemplates(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type, function(templates) {
                var templateList = [];
                templates.forEach(function(template) {
                    if (!template.isDefault) {
                        templateList.push({
                            id: template._id,
                            name: template.name
                        });
                    }
                });
                var selectItem = {
                    id: "populator",
                    name: "Populator Templates",
                    children: templateList
                };
                if (templateList.length) {
                    self.$store.dispatch("countlyConfigTransfer/addConfigurations", selectItem);
                }
            });
        }
    });

    Vue.component("cly-populator-template-drawer", countlyVue.views.create({
        props: {
            controls: {type: Object, default: {}},
            titleDescription: {type: Object, default: {}}
        },
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                items: [
                    {header: CV.i18n('populator-template.users'), isActive: true},
                    {header: CV.i18n('populator-template.events'), isActive: false},
                    {header: CV.i18n('populator-template.views'), isActive: false},
                    {header: CV.i18n('populator-template.sequences'), isActive: false},
                    {header: CV.i18n('populator-template.behavior'), isActive: false },
                ],
                users: [],
                events: [],
                uniqueUserItems: [
                    {value: 100, text: 100},
                    {value: 500, text: 500},
                    {value: 1000, text: 1000}
                ],
                deletedIndex: null
            };
        },
        methods: {
            onSequenceDeleted(index) {
                this.deletedIndex = index + "_" + Date.now(); // to force trigger watcher for same index
            },
            checkInputProbabilities(editedObject) {
                let warningMessage = "";
                let sectionsToVerify = ["users", "views", "events"];

                sectionsToVerify.forEach(function(sectionName) {
                    editedObject[sectionName].forEach(item => {
                        let sectionTotal = null;
                        let conditionTotal = null;
                        if (item.segmentations) {
                            item.segmentations.forEach(segmentation => {
                                sectionTotal = 0;
                                if (segmentation.values) {
                                    segmentation.values.forEach(value => {
                                        sectionTotal += parseInt(value.probability, 10) || 0;
                                    });
                                }
                                if (segmentation.condition) {
                                    segmentation.condition.values.forEach(conditionValue => {
                                        conditionTotal += parseInt(conditionValue.probability, 10) || 0;
                                    });
                                }
                                if (sectionTotal && sectionTotal !== 100 || conditionTotal && conditionTotal !== 100) {
                                    warningMessage += CV.i18n('populator-template.warning-probability-validation', sectionName, segmentation.key) + "<br/></br>";
                                }
                            });
                        }
                        else if (item.values) {
                            item.values.forEach(value => {
                                sectionTotal += parseInt(value.probability, 10) || 0;
                            });
                            if (item.condition) {
                                item.condition.values.forEach(conditionValue => {
                                    conditionTotal += parseInt(conditionValue.probability, 10) || 0;
                                });
                            }
                            if (sectionTotal && sectionTotal !== 100 || conditionTotal && conditionTotal !== 100) {
                                warningMessage += CV.i18n('populator-template.warning-probability-validation', sectionName, item.key) + "<br/></br>";
                            }
                        }
                    });
                });
                return warningMessage;
            },
            onSubmit: function(editedObject) {
                const isEdit = !!editedObject._id;
                const isDuplicate = editedObject.is_duplicate;
                const validationMessages = this.checkInputProbabilities(editedObject);
                if (validationMessages && validationMessages.length) {
                    CountlyHelpers.notify({type: "error", title: CV.i18n("common.error"), message: validationMessages, sticky: true, clearAll: true});
                    this.$refs.populatorDrawer.disableAutoClose = true;
                    return;
                }
                if (isEdit && !isDuplicate) {
                    countlyPopulator.editTemplate(editedObject._id, editedObject, function(res) {
                        if (res.result) {
                            CountlyHelpers.notify({type: "ok", title: CV.i18n("common.success"), message: CV.i18n("populator-success-edit-template"), sticky: false, clearAll: true});
                        }
                    });
                }
                else {
                    countlyPopulator.createTemplate(editedObject, function(res) {
                        if (res && res.result) {
                            CountlyHelpers.notify({type: "ok", title: CV.i18n("common.success"), message: CV.i18n("populator-success-create-template"), sticky: false, clearAll: true});
                        }
                    });
                }
                this.$refs.populatorDrawer.disableAutoClose = false;
            },
            prepareData: function(type, data1, data2) {
                if (type === 'behavior') {
                    const users = data1;
                    const sequences = data2;
                    const preparedData = {users: []};
                    if (users && users.length) {
                        users.forEach(function(item) {
                            preparedData.users.push({keys: item.key, values: item.values});
                        });
                    }
                    if (sequences && sequences.length) {
                        if (!preparedData.sequences) {
                            preparedData.sequences = [];
                        }
                        preparedData.sequences = sequences;
                    }
                    return preparedData;
                }
                else if (type === "sequences") {
                    const events = data1;
                    const views = data2;
                    const preparedData = {events: [], views: []};
                    if (events && events.length) {
                        events.forEach(function(item) {
                            preparedData.events.push({name: item.key, value: item.key.toLowerCase()});
                        });
                    }
                    if (views && views.length) {
                        views.forEach(function(item) {
                            preparedData.views.push({name: item.key, value: item.key.toLowerCase()});
                        });
                    }
                    return preparedData;
                }
            }
        },
        components: {

        },
        template: countlyVue.T("/populator/templates/template_form.html"),
    }));
})();
