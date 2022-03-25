/* global app, countlyAuth, countlyVue, countlyPopulator, CountlyHelpers, CV, countlyCommon, $, countlyGlobal */
(function() {
    var FEATURE_NAME = 'populator';

    var PopulatorView = countlyVue.views.create({
        template: countlyVue.T("/populator/templates/populator.html"),
        data: function() {
            return {
                currentTab: "data-populator",
                maxTime: 60,
                maxTimeout: null,
                dialog: {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''},
                selectedTemplate: '',
                generateDataModal: {showDialog: false},
                percentage: 0,
                templates: [],
                progressBarColor: '#0166D6',
                progressBar: null,
                finishedGenerateModal: {showDialog: false},
                description: CV.i18n('populator.warning3'),
                titleDescription: {header: '', button: ''},

                //event properties
                eventName: '',
                eventKey: '',
                eventValue: [],
                segments: '',
                sum: 0,
                dur: 0,
                submittedForm2: {selectedTemplate: ''}
            };
        },
        methods: {
            refreshTable: function(res) {
                if (res.result) {
                    this.refresh(true);
                }
            },
            newTemplate: function() {
                this.titleDescription = {header: CV.i18n('populator.create-new-template'), button: CV.i18n('common.create')};
                this.openDrawer("populatorTemplate", {
                    name: '',
                    isDefault: false,
                    up: [{key: "", value: []}],
                    events: [{eventName: "", duration: ['', ''], sum: ['', ''], segments: [{key: "", value: []}], checkedEventProperties: {duration: false, sum: false}}]
                });
            },
            refresh: function(isRefresh) {
                if (isRefresh) {
                    this.getTemplateList();
                }
            },
            changeTemplate: function(command, template) {
                var eventVariants;
                if (typeof template.events !== 'undefined') {
                    Object.keys(template && template.events || {}).forEach(function(key) {
                        eventVariants = template.events[key];
                        if (!Array.isArray(eventVariants)) {
                            eventVariants = [eventVariants];
                            template.events[key] = eventVariants;
                        }
                    });
                }

                if (command === "edit" || command === "duplicate") {
                    this.titleDescription = {header: CV.i18n('populator.drawer-title-edit'), button: CV.i18n('populator.save')};

                    var preparedDrawerUpObject = [{key: "", value: []}];
                    var preparedDrawerEventObject = [{eventName: "", duration: ['', ''], sum: ['', ''], segments: [{key: "", value: []}], checkedEventProperties: {duration: false, sum: false}}];
                    var preparedSegmentObject = [];

                    if (command === "duplicate") {
                        template.is_duplicate = true;
                        this.titleDescription = {header: CV.i18n('populator.drawer-title-duplicate'), button: CV.i18n('populator.duplicate')};
                    }

                    for (var key in template.up) {
                        preparedDrawerUpObject.push({ key: key, value: template.up[key]});
                    }

                    for (var i = 0; i < template.eventCount; i++) {
                        var durationExist = typeof Object.values(template.events)[i][0].duration !== "undefined";
                        var sumExist = typeof Object.values(template.events)[i][0].sum !== "undefined";
                        var segmentExist = typeof Object.values(template.events)[i][0].segments !== "undefined";
                        preparedSegmentObject = [];

                        var drawerEventObject = {
                            eventName: Object.keys(template.events)[i],
                            checkedEventProperties: { duration: durationExist, "sum": sumExist },
                        };

                        if (durationExist) {
                            drawerEventObject.duration = Object.values(template.events)[i][0].duration;
                        }
                        else {
                            drawerEventObject.duration = [null, null];
                        }
                        if (sumExist) {
                            drawerEventObject.sum = Object.values(template.events)[i][0].sum;
                        }
                        else {
                            drawerEventObject.sum = [null, null];
                        }
                        if (segmentExist) {
                            for (var item in Object.values(template.events)[i][0].segments) {
                                preparedSegmentObject.push({key: item, value: Object.values(template.events)[i][0].segments[item]});
                            }
                            drawerEventObject.segments = preparedSegmentObject;
                        }
                        else {
                            drawerEventObject.segments = [{key: "", value: []}];
                        }

                        preparedDrawerEventObject.push(drawerEventObject);
                    }

                    if (preparedDrawerUpObject.length > 1 && preparedDrawerUpObject[0].key === "") {
                        preparedDrawerUpObject = preparedDrawerUpObject.slice(1);
                    }
                    template.up = preparedDrawerUpObject;

                    if (preparedDrawerEventObject.length > 1 && preparedDrawerEventObject[0].eventName === "") {
                        preparedDrawerEventObject = preparedDrawerEventObject.slice(1);
                    }
                    template.events = preparedDrawerEventObject;

                    this.openDrawer("populatorTemplate", template);
                }
                else if (command === "delete") {
                    var self = this;
                    countlyPopulator.removeTemplate(template._id, function(res) {
                        if (res.result) {
                            CountlyHelpers.notify({type: "ok", title: CV.i18n("common.success"), message: CV.i18n('populator-success-delete-template'), sticky: true, clearAll: true});
                            self.refresh(true);
                        }
                        else {
                            CountlyHelpers.notify({type: "error", title: CV.i18n("common.error"), message: CV.i18n('populator.failed-to-remove-template', template._id), sticky: false, clearAll: true});
                        }
                    });
                }
            },
            submitConfirmDialog: function() {
                this.startPopulate();
                this.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
            },
            closeConfirmDialog: function() {
                this.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                this.description = CV.i18n('populator.warning3');
            },
            redirectHomePage: function() {
                this.generateDataModal = { showDialog: false };
                var self = this;
                countlyPopulator.stopGenerating(function() {
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
            startPopulate: function() {
                var self = this;
                self.percentage = 0;
                this.generateDataModal = { showDialog: true };

                countlyPopulator.setStartTime(countlyCommon.periodObj.start / 1000);
                countlyPopulator.setEndTime(countlyCommon.periodObj.end / 1000);

                countlyPopulator.setSelectedTemplate(self.selectedTemplate);
                countlyPopulator.getTemplate(self.selectedTemplate, function(template) {
                    countlyPopulator.generateUsers(self.maxTime * 4, template);
                });
                var startTime = Math.round(Date.now() / 1000);
                this.progressBar = setInterval(function() {
                    if (parseInt(self.percentage) < 100) {
                        self.percentage = parseFloat((Math.round(Date.now() / 1000) - startTime) / self.maxTime) * 100;
                        if (self.percentage > 100) {
                            self.percentage = 100;
                        }
                    }
                    else {
                        self.percentage = 100;
                        countlyPopulator.stopGenerating();
                        window.clearInterval(self.progressBar);
                        self.generateDataModal = { showDialog: false };
                        self.finishedGenerateModal = {showDialog: true};
                        self.description = CV.i18n('populator.warning3');
                    }
                }, 1000);
            },
            stopPopulate: function() {
                this.finishedGenerateModal = { showDialog: false };
                this.generateDataModal = { showDialog: false };
                this.description = CV.i18n('populator.warning3');
                var self = this;
                countlyPopulator.stopGenerating(function() {
                    window.clearInterval(self.progressBar);
                    self.generateDataModal = { showDialog: false };
                    self.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
                });
            },
            openDialog: function() {
                if (this.selectedTemplate === '' || this.selectedTemplate === null || this.selectedTemplate === undefined) {
                    CountlyHelpers.notify({type: "warning", title: CV.i18n("common.error"), message: CV.i18n('populator.select-a-template-first'), sticky: false, clearAll: true});
                    return;
                }
                this.description = CV.i18n('populator.warning4');
                this.dialog = {
                    type: "check",
                    showDialog: true,
                    saveButtonLabel: CV.i18n('populator.yes-populate-data'),
                    cancelButtonLabel: CV.i18n('populator.no-populate-data'),
                    title: CV.i18n('populator.warning1', CountlyHelpers.appIdsToNames([countlyCommon.ACTIVE_APP_ID])),
                    text: CV.i18n('populator.warning2')
                };
            },
            closeGenerateDataModal: function() {
                this.generateDataModal = { showDialog: false };
                this.dialog = {type: '', showDialog: false, saveButtonLabel: '', cancelButtonLabel: '', title: '', text: ''};
            },
            getTemplateList: function() {
                var self = this;
                self.templates = [];
                countlyPopulator.getTemplates(function(templates) {
                    templates.forEach(function(item) {
                        self.templates.push({
                            _id: item._id,
                            name: item.name,
                            buttonShow: !item.isDefault,
                            isDefault: item.isDefault === true ? CV.i18n('populator.template-type-default') : CV.i18n('populator.template-type-custom'),
                            upCount: (item.up !== undefined ? Object.keys(item.up).length : 0),
                            eventCount: (item.events !== undefined ? Object.keys(item.events).length : 0),
                            editedBy: (item.lastEditedBy !== undefined ? item.lastEditedBy : '-'),
                            up: item.up,
                            events: item.events
                        });
                    });
                });
            },
        },
        beforeCreate: function() {
        },
        created: function() {
            this.getTemplateList();
            if (!this.canUserCreate) {
                this.currentTab = "templates";
            }
        },
        mixins: [
            countlyVue.mixins.hasDrawers("populatorTemplate"),
            countlyVue.mixins.auth(FEATURE_NAME)
        ]
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

    $(document).ready(function() {
        app.addSubMenu("management", {code: "populate", permission: FEATURE_NAME, url: "#/manage/populate", text: "populator.plugin-title", priority: 30, classes: "populator-menu"});
    });
    countlyVue.container.registerMixin("/manage/export/export-features", {
        beforeCreate: function() {
            var self = this;
            countlyPopulator.getTemplates(function(templates) {
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
})();