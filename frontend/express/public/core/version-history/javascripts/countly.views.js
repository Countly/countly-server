/* global countlyVue, app, countlyGlobal, countlyVersionHistoryManager, CV, jQuery*/
var VersionHistoryView = countlyVue.views.create({
    template: CV.T('/core/version-history/templates/version-history.html'),
    data: function() {
        return {
            tableData: {
                db: [],
                fs: [],
                pkg: "",
                mongo: ""
            }
        };
    },
    mounted: function() {
        this.tableData = countlyVersionHistoryManager.getData(true) || this.tableData;
    },
    methods: {
        getTable: function(dataObj) {
            if (!Array.isArray(dataObj)) {
                dataObj = [];
            }
            if (dataObj.length === 0) {
                dataObj.push({"version": countlyGlobal.countlyVersion, "updated": new Date().toString()});
                dataObj[dataObj.length - 1].version += " " + jQuery.i18n.map["version_history.current-version"];
                dataObj[dataObj.length - 1].updated = new Date(dataObj[dataObj.length - 1].updated).toString();
            }
            else {
                dataObj[dataObj.length - 1].version = this.tableData.pkg + " " + jQuery.i18n.map["version_history.current-version"];
                for (var i = 0; i < dataObj.length; i++) {
                    dataObj[dataObj.length - (i + 1)].updated = new Date(dataObj[dataObj.length - (i + 1)].updated).toString();
                }
            }

            return dataObj;
        }
    },
    computed: {
        dbTitle: function() {
            return jQuery.i18n.map["version_history.page-title"] + " (DB)";
        },
        fsTitle: function() {
            return jQuery.i18n.map["version_history.page-title"] + " (FS)";
        },
        packageVersion: function() {
            return jQuery.i18n.map["version_history.package-version"] + ": " + this.tableData.pkg;
        },
        mongoVersion: function() {
            return "MongDb version: " + this.tableData.mongo;
        },
        versionHistoryViewDbRows: function() {
            return this.getTable(this.tableData.db);

        },
        versionHistoryViewFsRows: function() {
            return this.getTable(this.tableData.fs);
        }

    }
});

app.route("/versions", 'versions', function() {
    this.renderWhenReady(new CV.views.BackboneWrapper({
        component: VersionHistoryView
    }));
});
