/*global CountlyHelpers, countlyGlobal, jQuery, CV, countlyVue */

(function() {
    var PluginUploadDrawer = countlyVue.views.create({
        template: CV.T('/plugin-upload/templates/drawer.html'),
        data: function() {
            return {
                uploadData: {
                    _csrf: countlyGlobal.csrf_token
                },
            };
        },
        props: {
            controls: { type: Object }
        },
        methods: {
            handleUploadSuccess: function(result) {
                var aa = result.split('.');
                if (aa.length === 2 && aa[0] === 'Success') {
                    this.$emit('updloaded', aa[1]);
                    var msg = {title: jQuery.i18n.map["plugin-upload.success"], message: jQuery.i18n.map["plugin-upload.success"], clearAll: true, sticky: true};
                    CountlyHelpers.notify(msg);
                }
                else if (jQuery.i18n.map['plugin-upload.' + result] !== undefined) {
                    var msg2 = {title: jQuery.i18n.map["plugin-upload.error"], message: jQuery.i18n.map['plugin-upload.' + result], sticky: true, clearAll: true, type: "error"};
                    CountlyHelpers.notify(msg2);
                }
                else {
                    var msg3 = {title: jQuery.i18n.map["plugin-upload.error"], message: result, sticky: true, clearAll: true, type: "error"};
                    CountlyHelpers.notify(msg3);
                }
            },
            handleUploadError: function(err) {
                var resp;
                if (err.message) {
                    try {
                        resp = JSON.parse(err.message);
                        if (resp && resp.result) {
                            resp = resp.result;
                        }
                        else {
                            resp = null;
                        }
                    }
                    catch (ex) {
                        resp = null;
                    }
                }
                if (!resp) {
                    resp = err;
                }
                if (resp === 'Request Entity Too Large') {
                    resp = jQuery.i18n.map["plugin-upload.toobig"];
                }
                var msg = {title: jQuery.i18n.map["plugin-upload.error"], message: resp, sticky: true, clearAll: true, type: "error"};
                CountlyHelpers.notify(msg);
            },
            checkFileType: function(file) {
                var ee = file.name.split('.');
                var last = "";
                var plast = "";
                if (ee.length > 0) {
                    last = ee[ee.length - 1];
                }
                if (ee.length > 1) {
                    plast = ee[ee.length - 2];
                }
                if (last === 'tar' || last === 'zip' || last === 'tgz') {
                    return true;
                }
                else if (plast === 'tar' && last === 'gz') {
                    return true;
                }
                CountlyHelpers.alert(jQuery.i18n.map["plugin-upload.badformat"], "popStyleGreen", {title: jQuery.i18n.map["common.error"], image: "token-warning"});
                return false;
            }
        }
    });

    var PluginUploadComponent = countlyVue.views.create({
        template: CV.T('/plugin-upload/templates/plugin-upload.html'),
        components: {
            "main-drawer": PluginUploadDrawer
        },
        mixins: [countlyVue.mixins.hasDrawers("main")],
        data: function() {
            return {
            };
        },
        methods: {
            refreshPluginList: function(plugin) {
                this.$emit('update-row', plugin);
                this.closeDrawer("main");
            },
            uploadPlugin: function() {
                this.openDrawer("main", {});
            }
        }
    });

    countlyVue.container.registerData("/plugins/header", {
        _id: "plugin_upload",
        component: PluginUploadComponent
    });

})();