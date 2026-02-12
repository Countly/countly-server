import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import countlyGlobal from '../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { getGlobalStore } from '../../../../frontend/express/public/javascripts/countly/vue/data/store.js';
import jQuery from 'jquery';

import './assets/main.scss';

var appList = [];
for (var key in countlyGlobal.apps) {
    appList.push({value: key, label: countlyGlobal.apps[key].name});
}

getGlobalStore().commit('countlyConfigurations/registerLabel', {id: "consolidate", value: jQuery.i18n.map["consolidate.app"]});

app.addAppManagementInput("consolidate", jQuery.i18n.map["consolidate.plugin-title"], {"consolidate": {input: "cly-select-x", attrs: {mode: "multi-check", placement: "bottom-end"}, list: appList, defaultValue: []}});
