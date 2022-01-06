/*global countlyVue, CV, countlyCommon, countlyAuth, countlyGlobal, countlyDataMigration, app */
(function() {
    var FEATURE_NAME = 'data_migration';

    var ImportsTab = countlyVue.views.create({
        template: CV.T("/data_migration/templates/imports-tab.html"),
        props: {},
        data: function() {
            return {
                list: [],
                hasCreateRight: countlyAuth.validateCreate(FEATURE_NAME),
                hasDeleteRight: countlyAuth.validateDelete(FEATURE_NAME)
            };
        },
        methods: {
            refresh: function() {
                this.loadImports();
            },
            loadImports: function() {
                var self = this;
                countlyDataMigration.loadImportList()
                    .then(function(res) {
                        if (typeof res.result === "object") {
                            self.list = Object.values(res.result);
                            var importIds = Object.keys(res.result);
                            for (var i = 0; i < importIds.length; i++) {
                                self.list[i]._id = importIds[i];
                            }
                        }
                        else if (typeof res.result === "string") {
                            self.list = [];
                        }
                    });
            },
            handleCommand: function(command, scope, row) {
                switch (command) {
                case 'download-log':
                    window.location.href = "/data-migration/download?logfile=" + row.log;
                    break;
                case 'delete-export':
                    var self = this;
                    this.$confirm(CV.i18n('data-migration.delete-export-confirm'), CV.i18n('management-users.warning'), {
                        confirmButtonText: CV.i18n('common.ok'),
                        cancelButtonText: CV.i18n('common.cancel'),
                        type: 'warning'
                    })
                        .then(function() {
                            countlyDataMigration.deleteImport(row._id, function(res) {
                                if (res.result === 'success') {
                                    self.loadImports();
                                    self.$message({
                                        type: 'success',
                                        message: CV.i18n('data-migration.export-deleted')
                                    });
                                }
                                else {
                                    self.$message({
                                        type: 'error',
                                        message: CV.i18n(res.data.xhr.responseJSON.result)
                                    });
                                }
                            });
                        });
                    break;
                }
            }
        },
        created: function() {
            this.loadImports();
        }
    });

    var ExportsTab = countlyVue.views.create({
        template: CV.T("/data_migration/templates/exports-tab.html"),
        props: {},
        data: function() {
            return {
                list: [],
                hasCreateRight: countlyAuth.validateCreate(FEATURE_NAME),
                hasDeleteRight: countlyAuth.validateDelete(FEATURE_NAME),
                hasUpdateRight: countlyAuth.validateDelete(FEATURE_NAME)
            };
        },
        methods: {
            refresh: function() {
                this.loadExports();
            },
            loadExports: function() {
                var self = this;
                countlyDataMigration.loadExportList()
                    .then(function(res) {
                        if (typeof res.result === "object") {
                            self.list = res.result;
                        }
                        else if (typeof res.result === "string") {
                            self.list = [];
                        }
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
                            self.$message({
                                type: 'success',
                                message: CV.i18n('data-migration.export-started')
                            });
                        }
                        else {
                            self.$message({
                                type: 'error',
                                message: CV.i18n(res.data.xhr.responseJSON.result)
                            });
                        }
                    });
                    break;
                case 'delete-export':
                    this.$confirm(CV.i18n('data-migration.delete-export-confirm'), CV.i18n('management-users.warning'), {
                        confirmButtonText: CV.i18n('common.ok'),
                        cancelButtonText: CV.i18n('common.cancel'),
                        type: 'warning'
                    })
                        .then(function() {
                            countlyDataMigration.deleteExport(row._id, function(res) {
                                if (res.result === 'success') {
                                    self.loadExports();
                                    self.$message({
                                        type: 'success',
                                        message: CV.i18n('data-migration.export-deleted')
                                    });
                                }
                                else {
                                    self.$message({
                                        type: 'error',
                                        message: CV.i18n(res.data.xhr.responseJSON.result)
                                    });
                                }
                            });
                        });
                    break;
                case 'stop-export':
                    countlyDataMigration.stopExport(row._id, function(res) {
                        if (res.result === 'success') {
                            self.loadExports();
                            self.$message({
                                type: 'success',
                                message: CV.i18n('data-migration.export-stopped')
                            });
                        }
                        else {
                            self.$message({
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
            this.loadExports();
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
                            self.$message({
                                type: 'success',
                                message: CV.i18n('data-migration.generated-token')
                            });
                            self.importDrawerCancelButtonLabel = CV.i18n('data-migration.close');
                            self.importDrawerSaveButtonLabel = false;
                        }
                        else {
                            self.$message({
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
                    this.$message({
                        type: 'success',
                        message: CV.i18n('data-migration.import-started')
                    });
                }
                else {
                    this.$message({
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
                var self = this;
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
                        self.$message({
                            type: 'success',
                            message: CV.i18n('data-migration.export-started')
                        });
                    }
                    else {
                        self.$message({
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
            countlyVue.mixins.hasDrawers("export")
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
                },
                hasCreateRight: countlyAuth.validateCreate(FEATURE_NAME)
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

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        //register route
        app.route('/manage/data-migration', 'datamigration', function() {
            this.renderWhenReady(DataMigrationMainView);
        });

        app.addMenu("management", {code: "data-migration", url: "#/manage/data-migration", text: "data-migration.page-title", icon: '<div class="logo-icon fa fa-arrows-alt-h"></div>', priority: 130});
    }
})();