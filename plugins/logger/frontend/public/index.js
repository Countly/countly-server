import countlyVue, { i18n } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';

import countlyLogger from './store/index.js';
import LoggerView from './components/LoggerView.vue';

import './assets/main.scss';

var logger = new countlyVue.views.BackboneWrapper({
    component: LoggerView
});

app.logger = logger;

app.route('/manage/logger', 'logger', function() {
    var params = {};
    this.logger.params = params;
    this.renderWhenReady(this.logger);
});

app.addSubMenu("management", { code: "logger", permission: "logger", url: "#/manage/logger", text: "logger.title", priority: 50 });

if (app.configurationsView) {
    app.configurationsView.registerLabel("logger.state", "logger.state");
    app.configurationsView.registerInput("logger.state", {
        input: "el-select",
        attrs: {},
        list: [
            { value: 'on', label: i18n("logger.state-on") },
            { value: 'off', label: i18n("logger.state-off") },
            { value: 'automatic', label: i18n("logger.state-automatic") }
        ]
    });
    app.configurationsView.registerLabel("logger.limit", "logger.limit");
}
