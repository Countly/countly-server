import { i18n } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import countlyGlobal from '../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { notify } from '../../../../frontend/express/public/javascripts/countly/countly.helpers.js';

import './store/index.js';
import DataMigrationMain from './components/DataMigrationMain.vue';

import './assets/main.scss';

var FEATURE_NAME = 'data_migration';

var DataMigrationMainView = new views.BackboneWrapper({
    component: DataMigrationMain
});

app.route('/manage/data-migration', 'datamigration', function() {
    this.renderWhenReady(DataMigrationMainView);
});

app.addAppSwitchCallback(function(appId) {
    if (appId && countlyGlobal.apps[appId] && countlyGlobal.apps[appId].redirect_url && countlyGlobal.apps[appId].redirect_url !== "") {
        var redirectedText = i18n("data-migration.app-redirected").replace('{app_name}', countlyGlobal.apps[appId].name);
        var mm = "<h4 class='bu-pt-3 bu-pb-1' style='overflow-wrap: break-word;'>" + redirectedText + "</h4>"
            + "<p bu-pt-1>"
            + i18n("data-migration.app-redirected-explanation")
            + " <b><span style='overflow-wrap: break-word;'>"
            + countlyGlobal.apps[appId].redirect_url
            + "</span></b>"
            + "</p><a href='#/manage/apps' style='color:rgb(1, 102, 214); cursor:pointer;'>"
            + i18n("data-migration.app-redirected-remove")
            + "</a>";
        var msg = {
            title: redirectedText,
            message: mm,
            info: i18n("data-migration.app-redirected-remove"),
            sticky: true,
            clearAll: true,
            type: "warning",
            onClick: function() {
                app.navigate("#/manage/apps", true);
            }
        };
        notify(msg);
    }
});

app.addMenu("management", {
    code: "data-migration",
    permission: FEATURE_NAME,
    url: "#/manage/data-migration",
    text: "data-migration.page-title",
    icon: '<div class="logo-icon fa fa-arrows-alt-h"></div>',
    priority: 70
});
