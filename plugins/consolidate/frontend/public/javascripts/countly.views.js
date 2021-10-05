/*global countlyGlobal, app, jQuery */

(function() {
    var appList = [];
    for (var key in countlyGlobal.apps) {
        appList.push({value: key, label: countlyGlobal.apps[key].name});
    }

    app.configurationsView.registerLabel("consolidate", jQuery.i18n.map["consolidate.app"]);

    app.addAppManagementInput("consolidate", jQuery.i18n.map["consolidate.plugin-title"], {"consolidate": {input: "el-select", attrs: {multiple: true}, list: appList, defaultValue: []}});
})();