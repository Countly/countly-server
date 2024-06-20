/*global app, countlyVue, CV, CountlyHelpers, countlyCommon*/

(function() {
    var FEATURE_NAME = "content";

    var ContentDrawer = countlyVue.views.create({
        template: CV.T("/license/templates/content-drawer.html"),
        props: {
            settings: Object,
            controls: Object,
        },
        data: function() {
            return {
                licenseFile: null,
            };
        },
        methods: {
            handleUploaderEvent: function(_, fileList) {
                if (fileList.length) {
                    if (fileList.length > 1) {
                        fileList.splice(0, 1);
                    }
                    this.licenseFile = fileList[0].raw;
                }
                else {
                    this.licenseFile = null;
                }
            },
            handleSubmit: function() {
                var formData = new FormData();
                var drawer = this.$refs.addContentDrawer;
                var self = this;

                this.$store.dispatch("countlyLicenseManager/uploadLicenseFile", formData)
                    .then(function() {
                        CountlyHelpers.notify({message: CV.i18n("license.notification.license-file-uploaded"), sticky: false, type: "success"});
                        self.$store.dispatch("countlyLicenseManager/checkLicense");
                        self.$emit("license-uploaded");
                        if (typeof window.lmcomm === "function") {
                            window.lmcomm();
                        }
                    })
                    .catch(function(errResp) {
                        CountlyHelpers.notify({message: errResp.result, sticky: false, type: "error"});
                    })
                    .finally(function() {
                        drawer.isSubmitPending = false;
                        drawer.doClose();
                    });
            },
            handleRemove: function(file) {
                const uploadFileList = this.$refs.fileUploader.uploadFiles;
                uploadFileList.splice(uploadFileList.indexOf(file), 1);
                this.licenseFile = null;
            }
        },
    });

    var ContentLibraryTabView = countlyVue.views.create({
        template: CV.T("/content/templates/library.html"),
        mixins: [],
        data: function() {

            return {
                filterAssestOption: [
                    { value: 'dateDec', label: 'Date Descending' },
                    { value: 'dateInc', label: 'Date Ascending' },
                    { value: 'nameAsc', label: 'Name Ascending' },
                    { value: 'nameDec', label: 'Name Descending' }
                ],
                assetFilter: "dateDec"
            };
        },
        methods: {
            onClickAddAsset: function() {
                return 'TODO OPEN DRAWER';
            }
        }
    });

    var ContentView = countlyVue.views.create({
        template: CV.T("/content/templates/content.html"),
        mixins: [],
        data: function() {
            var localTabs = [];
            localTabs.push(
                {
                    title: 'Assets',
                    priority: 1,
                    name: "Assetss",
                    component: ContentLibraryTabView,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/content/content/library"
                }
            );
            localTabs.push(
                {
                    title: 'Dummy',
                    priority: 2,
                    name: "Dummy",
                    component: ContentLibraryTabView,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/content/content/library"
                }
            );

            return {
                currentSecondaryTab: (this.$route.params && this.$route.params.secondaryTab) || "content",
                localTabs
            };
        },
        computed: {
            secondaryTabs: function() {
                return this.localTabs;
            }
        }
    });

    var ContentIndexView = countlyVue.views.create({
        template: CV.T("/content/templates/index.html"),
        components: {
            "content-drawer": ContentDrawer,
        },
        mixins: [
            countlyVue.container.mixins(["/manage/content"]),
            countlyVue.container.tabsMixin({
                "externalTabs": "/manage/content"
            }),
            countlyVue.mixins.commonFormatters,
            countlyVue.mixins.hasDrawers(["add-content"])
        ],
        data: function() {
            var localTabs = [];

            localTabs.push({
                priority: 1,
                title: 'Library',
                name: "Library",
                component: ContentView,
                route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/content/content",
            });
            localTabs.push({
                priority: 2,
                title: 'Dummy',
                name: "Dummy",
                component: ContentView,
                route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/content/content",
            });

            return {
                currentPrimaryTab: (this.$route.params && this.$route.params.primaryTab) || "content",
                localTabs,
                drawerSettings: {
                    title: 'TITLE',
                    saveButtonLabel: 'SAVE'
                }
            };
        },
        computed: {
            primaryTabs: function() {
                return this.localTabs;
            }
        },
        methods: {
            handleContentDrawer: function() {
                this.openDrawer("add-content");
            }
        }
    });
    app.route('/manage/content', 'content', function() {
        this.renderWhenReady(new countlyVue.views.BackboneWrapper({
            component: ContentIndexView,
            vuex: [],
        }));
    });

    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: ContentIndexView,
            vuex: [],
            //templates: defaultTemplates,
        });
    };

    app.route("/manage/content/:primaryTab", 'content', function(primaryTab) {
        var mainView = getMainView();
        mainView.params = {
            primaryTab: primaryTab
        };
        this.renderWhenReady(mainView);
    });

    app.route("/manage/content/:primaryTab/:secondaryTab", 'content', function(primaryTab, secondaryTab) {
        var mainView = getMainView();
        mainView.params = {
            primaryTab: primaryTab,
            secondaryTab: secondaryTab
        };
        this.renderWhenReady(mainView);
    });

    app.addSubMenu("management", { code: "content", permission: FEATURE_NAME, pluginName: "content", url: "#/manage/content", text: "Content Title", priority: 40 });

})();
