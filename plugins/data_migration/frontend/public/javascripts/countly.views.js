/*global countlyVue, CV, countlyCommon, CountlyHelpers, countlyGlobal, countlyDataMigration, app,jQuery */
(function() {
    var FEATURE_NAME = 'data_migration';

    var ImportsTab = countlyVue.views.create({
        template: CV.T("/data_migration/templates/imports-tab.html"),
        props: {},
        mixins: [
            countlyVue.mixins.auth(FEATURE_NAME)
        ],
        data: function() {
            return {
                list: [],
                importsTablePersistKey: 'imports_table_' + countlyCommon.ACTIVE_APP_ID,
                isLoading: false
            };
        },
        methods: {
            refresh: function(force) {
                this.loadImports(force);
            },
            loadImports: function(forceLoading) {
                if (forceLoading) {
                    this.isLoading = true;
                }
                var self = this;
                countlyDataMigration.loadImportList()
                    .then(function(res) {
                        if (typeof res.result === "object") {
                            var finalArr = [];
                            for (var key in res.result) {
                                var element = res.result[key];
                                finalArr.push(element);
                            }
                            self.list = finalArr;
                        }
                        else if (typeof res.result === "string") {
                            self.list = [];
                        }
                        self.isLoading = false;
                    });
            },
            handleCommand: function(command, scope, row) {
                switch (command) {
                case 'download-log':
                    window.location.href = "/data-migration/download?logfile=" + row.log;
                    break;
                case 'delete-export':
                    var self = this;
                    CountlyHelpers.confirm(CV.i18n('data-migration.delete-export-confirm'), "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyDataMigration.deleteImport(row.key, function(res) {
                            if (res.result === 'success') {
                                self.loadImports();
                                CountlyHelpers.notify({
                                    type: 'success',
                                    message: CV.i18n('data-migration.export-deleted')
                                });
                            }
                            else {
                                CountlyHelpers.notify({
                                    type: 'error',
                                    message: CV.i18n(res.data.xhr.responseJSON.result)
                                });
                            }
                        });
                    }, [], { title: CV.i18n('management-users.warning'), image: 'delete-exports' });
                    break;
                }
            }
        },
        created: function() {
            this.loadImports(true);
        }
    });

    var ExportsTab = countlyVue.views.create({
        template: CV.T("/data_migration/templates/exports-tab.html"),
        props: {},
        mixins: [
            countlyVue.mixins.auth(FEATURE_NAME)
        ],
        data: function() {
            return {
                list: [],
                exportsTablePersistKey: 'exports_table_' + countlyCommon.ACTIVE_APP_ID,
                isLoading: false
            };
        },
        methods: {
            refresh: function(force) {
                this.loadExports(force);
            },
            loadExports: function(forceLoading) {
                var self = this;
                if (forceLoading) {
                    this.isLoading = true;
                }
                countlyDataMigration.loadExportList()
                    .then(function(res) {
                        if (typeof res.result === "object") {
                            self.list = res.result;
                        }
                        else if (typeof res.result === "string") {
                            self.list = [];
                        }
                        self.isLoading = false;
                    });
            },
            handleCommand: function(command, scope, row) {
                var self = this;
                switch (command) {
                case 'download-log':
                    window.location.href = "/data-migration/download?logfile=" + row.log;
                    break;
                case 'download-export':
                    window.location.href = "/data-migration/download?id=" + row._id;
                    break;
                case 'resend':
                    countlyDataMigration.sendExport(row._id, row.server_token, row.server_address, row.redirect_traffic, function(res) {
                        if (res.result === 'success') {
                            CountlyHelpers.notify({
                                type: 'success',
                                message: CV.i18n('data-migration.export-started')
                            });
                        }
                        else {
                            CountlyHelpers.notify({
                                type: 'error',
                                message: CV.i18n(res.data.xhr.responseJSON.result)
                            });
                        }
                    });
                    break;
                case 'delete-export':
                    CountlyHelpers.confirm(CV.i18n('data-migration.delete-export-confirm'), "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyDataMigration.deleteExport(row._id, function(res) {
                            if (res.result === 'success') {
                                self.loadExports();
                                CountlyHelpers.notify({
                                    type: 'success',
                                    message: CV.i18n('data-migration.export-deleted')
                                });
                            }
                            else {
                                CountlyHelpers.notify({
                                    type: 'error',
                                    message: CV.i18n(res.data.xhr.responseJSON.result)
                                });
                            }
                        });
                    }, [], { title: CV.i18n('management-users.warning'), image: 'delete-exports' });
                    break;
                case 'stop-export':
                    countlyDataMigration.stopExport(row._id, function(res) {
                        if (res.result === 'success') {
                            self.loadExports();
                            CountlyHelpers.notify({
                                type: 'success',
                                message: CV.i18n('data-migration.export-stopped')
                            });
                        }
                        else {
                            CountlyHelpers.notify({
                                type: 'error',
                                message: CV.i18n(res.data.xhr.responseJSON.result)
                            });
                        }
                    });
                    break;
                }
            }
        },
        created: function() {
            this.loadExports(true);
        }
    });

    var ImportDrawer = countlyVue.views.create({
        template: CV.T("/data_migration/templates/drawer-import.html"),
        props: {
            settings: Object,
            controls: Object
        },
        data: function() {
            return {
                serverDomain: countlyGlobal.domain,
                serverToken: '',
                tokenGenerated: false,
                importDropzoneOptions: {
                    createImageThumbnails: false,
                    autoProcessQueue: false,
                    addRemoveLinks: true,
                    acceptedFiles: 'application/x-gzip',
                    dictDefaultMessage: this.i18n('feedback.drop-message'),
                    dictRemoveFile: this.i18n('feedback.remove-file'),
                    url: "/i/datamigration/import",
                    paramName: "import_file",
                    params: { api_key: countlyGlobal.member.api_key, app_id: countlyCommon.ACTIVE_APP_ID }
                },
                importDrawerCancelButtonLabel: CV.i18n('data-migration.cancel'),
                importDrawerSaveButtonLabel: CV.i18n('data-migration.import-title')
            };
        },
        methods: {
            onSubmit: function(submitted) {
                var self = this;
                if (submitted.from_server === 1) {
                    countlyDataMigration.createToken(function(res) {
                        if (res.result === "success") {
                            self.serverToken = res.data;
                            self.tokenGenerated = true;
                            CountlyHelpers.notify({
                                type: 'success',
                                message: CV.i18n('data-migration.generated-token')
                            });
                            self.importDrawerCancelButtonLabel = CV.i18n('data-migration.close');
                            self.importDrawerSaveButtonLabel = false;
                        }
                        else {
                            CountlyHelpers.notify({
                                type: 'error',
                                message: CV.i18n(res.data.xhr.responseJSON.result)
                            });
                        }
                        // set drawer pending state false
                        self.$refs.importDrawer.isSubmitPending = false;
                    });
                }
                else {
                    self.$refs.importDropzone.processQueue();
                }
            },
            onComplete: function(res) {
                if (res.xhr.status === 200) {
                    CountlyHelpers.notify({
                        type: 'success',
                        message: CV.i18n('data-migration.import-started')
                    });
                }
                else {
                    CountlyHelpers.notify({
                        type: 'error',
                        message: CV.i18n(res.data.xhr.responseJSON.result)
                    });
                }
                // set pending false and
                // close drawer
                this.$refs.importDrawer.isSubmitPending = false;
                this.$refs.importDrawer.doClose();
            },
            onOpen: function() {
                this.tokenGenerated = false;
                this.importDrawerCancelButtonLabel = CV.i18n('data-migration.cancel');
                this.importDrawerSaveButtonLabel = CV.i18n('data-migration.create-token');
            },
            updateImportType: function(type) {
                if (type === 1) {
                    this.importDrawerSaveButtonLabel = CV.i18n('data-migration.create-token');
                }
                else {
                    this.importDrawerSaveButtonLabel = CV.i18n('data-migration.import-title');
                }
            },
            copy: function(type) {
                var text = document.querySelector('#data-migration-server-' + type + '-input');
                text.select();
                document.execCommand("copy");
                var message = '';
                if (type === 'token') {
                    message = 'data-migration.tokken-coppied-in-clipboard';
                }
                else {
                    message = 'data-migration.address-coppied-in-clipboard';
                }
                CountlyHelpers.notify({
                    type: 'info',
                    message: CV.i18n(message)
                });
            }
        }
    });

    var ExportDrawer = countlyVue.views.create({
        template: CV.T("/data_migration/templates/drawer-export.html"),
        props: {
            settings: Object,
            controls: Object
        },
        data: function() {
            return {
                apps: [],
                exportDrawerSaveButtonLabel: CV.i18n('data-migration.export-data-button')
            };
        },
        methods: {
            onClose: function() {},
            onSubmit: function(submitted) {
                var API_KEY = countlyGlobal.member.api_key;
                var APP_ID = countlyCommon.ACTIVE_APP_ID;

                var requestData = submitted;
                requestData.api_key = API_KEY;
                requestData.app_id = APP_ID;
                requestData.apps = submitted.apps.join(",");
                requestData.aditional_files = requestData.aditional_files ? 1 : 0;
                requestData.redirect_traffic = requestData.redirect_traffic ? 1 : 0;

                countlyDataMigration.saveExport(requestData, function(res) {
                    if (res.result === "success") {
                        CountlyHelpers.notify({
                            type: 'success',
                            message: CV.i18n('data-migration.export-started')
                        });
                    }
                    else {
                        CountlyHelpers.notify({
                            type: 'error',
                            message: CV.i18n(res.data.xhr.responseJSON.result)
                        });
                    }
                });
            },
            onOpen: function() {}
        },
        created: function() {
            var apps = Object.keys(countlyGlobal.apps);
            for (var i = 0; i < apps.length; i++) {
                this.apps.push({
                    label: countlyGlobal.apps[apps[i]].name,
                    value: countlyGlobal.apps[apps[i]]._id
                });
            }
        }
    });

    var DataMigrationMain = countlyVue.views.create({
        template: CV.T("/data_migration/templates/main.html"),
        components: {
            'import-drawer': ImportDrawer,
            'export-drawer': ExportDrawer
        },
        mixins: [
            countlyVue.mixins.hasDrawers("import"),
            countlyVue.mixins.hasDrawers("export"),
            countlyVue.mixins.auth(FEATURE_NAME)
        ],
        data: function() {
            return {
                dynamicTab: "imports",
                tabs: [
                    {
                        title: CV.i18n('data-migration.imports'),
                        name: "imports",
                        component: ImportsTab
                    },
                    {
                        title: CV.i18n('data-migration.exports'),
                        name: "exports",
                        component: ExportsTab
                    }
                ],
                drawerSettings: {
                    import: {
                        title: CV.i18n('data-migration.import-data')
                    },
                    export: {
                        title: CV.i18n('data-migration.export-data')
                    }
                }
            };
        },
        methods: {
            create: function(type) {
                if (typeof type === "undefined") {
                    type = "import";
                }
                var initialDrawerObject = {
                    import: {
                        import_file: "",
                        from_server: 1
                    },
                    export: {
                        target_path: "",
                        server_address: "",
                        server_token: "",
                        apps: [], // comma separated strings
                        only_export: 0, // 1
                        aditional_files: 0, // 1
                        redirect_traffic: 0 // 1
                    }
                };

                this.openDrawer(type, initialDrawerObject[type]);
            },
            handleCommand: function(command) {
                this.create(command);
            }
        }
    });

    var DataMigrationMainView = new countlyVue.views.BackboneWrapper({
        component: DataMigrationMain
    });

    //register route
    app.route('/manage/data-migration', 'datamigration', function() {
        this.renderWhenReady(DataMigrationMainView);
    });


    //switching apps. show message if redirect url is set
    app.addAppSwitchCallback(function(appId) {
        if (appId && countlyGlobal.apps[appId] && countlyGlobal.apps[appId].redirect_url && countlyGlobal.apps[appId].redirect_url !== "") {
            var mm = "<h4 class='bu-pt-3 bu-pb-1' style='overflow-wrap: break-word;'>" + jQuery.i18n.map["data-migration.app-redirected"].replace('{app_name}', countlyGlobal.apps[appId].name) + "</h4><p bu-pt-1>" + jQuery.i18n.map["data-migration.app-redirected-explanation"] + " <b><span style='overflow-wrap: break-word;'>" + countlyGlobal.apps[appId].redirect_url + "<span></b><p><a href='#/manage/apps' style='color:rgb(1, 102, 214); cursor:pointer;'>" + jQuery.i18n.map["data-migration.app-redirected-remove"] + "</a>";
            var msg = {
                title: jQuery.i18n.map["data-migration.app-redirected"].replace('{app_name}', countlyGlobal.apps[appId].name),
                message: mm,
                info: jQuery.i18n.map["data-migration.app-redirected-remove"],
                sticky: true,
                clearAll: true,
                type: "warning",
                onClick: function() {
                    app.navigate("#/manage/apps", true);
                }
            };
            CountlyHelpers.notify(msg);
        }
    });

    app.addMenu("management", {code: "data-migration", permission: FEATURE_NAME, url: "#/manage/data-migration", text: "data-migration.page-title", icon: '<div class="logo-icon fa fa-arrows-alt-h"></div>', priority: 70});
})();