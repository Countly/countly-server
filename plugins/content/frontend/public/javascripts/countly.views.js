/*global app, countlyVue, CV, CountlyHelpers, countlyCommon, Vue, jQuery, countlyContentBuilder*/

(function() {
    var FEATURE_NAME = "content";

    Vue.component("cly-content-asset-upload-drawer", countlyVue.views.create({
        props: {
            controls: {type: Object}
        },
        data: function() {


            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                platformOptions: [],
                assetFiles: [],
                filterByPlatformOptions: 'platforms',
                filterByPlatform: "all",
                tags: ['blue', 'calm', 'happy'],
            };
        },
        computed: {
            title: function() {
                return 'Asset Upload';
            },
        },
        methods: {
            generateVideoThumbnail: function(file) {
                return new Promise((resolve) => {
                    const canvas = document.createElement("canvas");
                    const video = document.createElement("video");

                    video.autoplay = true;
                    video.muted = true;
                    video.src = URL.createObjectURL(file);

                    video.onloadeddata = () => {
                        let ctx = canvas.getContext("2d");

                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;

                        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                        video.pause();
                        return resolve(canvas.toDataURL("image/webp"));
                    };
                });
            },
            handleUploaderEvent: function(_, fileList) {
                this.assetFiles = fileList.map(function(fileEntry) {
                    return fileEntry.raw;
                });
            },
            handleRemove: function(file) {
                this.assetFiles = this.assetFiles.filter(function(f) {
                    return f !== file;
                });
            },

            handleClose: function() {
                this.assetFiles = [];
            },
            onSubmit: async function(editedObject) {
                var formData = new FormData(),
                    self = this;

                formData.append("app_id", this.appId);

                if (editedObject.tags) {
                    if (!Array.isArray(editedObject.tags)) {
                        editedObject.tags = [editedObject.tags];
                    }
                    formData.append('tags', editedObject.tags);
                }

                await Promise.all(self.assetFiles.map(async function(file) {
                    const buffer = await file.arrayBuffer();
                    if (file.type.includes("video")) {
                        const thumbnail = await self.generateVideoThumbnail(new Blob([buffer]));
                        formData.append("thumbnail", thumbnail);
                    }
                    formData.append("assets", file);
                }));

                jQuery.ajax({
                    url: countlyCommon.API_PARTS.data.w + "/content/asset-upload",
                    data: formData,
                    processData: false,
                    contentType: false,
                    type: "POST",
                    success: function() {
                        self.$emit("assets-changed");
                    },
                    error: function(xhr) {
                        CountlyHelpers.alert(xhr.responseJSON.result, "red");
                    }
                });
            }
        },
        template: countlyVue.T("/content/templates/asset-drawer.html")
    }));

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
        mixins: [countlyVue.mixins.hasDrawers("crashSymbol")],
        data: function() {

            return {
                filterAssestOption: [
                    { value: 'dateDec', label: 'Date Descending' },
                    { value: 'dateInc', label: 'Date Ascending' },
                    { value: 'nameAsc', label: 'Name Ascending' },
                    { value: 'nameDec', label: 'Name Descending' }
                ],
                assetFilter: "dateDec",
                assets: [],
            };
        },
        methods: {
            onClickAddAsset: function() {
                this.openDrawer("crashSymbol", {});
            }
        },
        computed: {
            assetList: {
                get: function() {
                    var assets = this.$store.getters['countlyContentBuilder/assets'];
                    return assets.map(function(asset) {
                        var mimeType = asset.metadata.mimeType;
                        var thumbnail = `data:${mimeType};base64,${asset.metadata.thumbnail}`;
                        return {
                            name: asset.filename,
                            thumbnail,
                        };
                    });
                },
                cache: false

            }
        },
        mounted: function() {
            this.$store.dispatch('countlyContentBuilder/fetchAssets');

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


    var vuex = [{
        clyModel: countlyContentBuilder
    }];

    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: ContentIndexView,
            vuex: vuex,
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
