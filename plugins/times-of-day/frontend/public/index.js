import { i18n } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerTab, registerData } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';

import countlyTimesOfDay, { service } from './store/index.js';
import TimesOfDayView from './components/TimesOfDayView.vue';
import TimesOfDayWidget from './components/TimesOfDayWidget.vue';
import TimesOfDayWidgetDrawer from './components/TimesOfDayWidgetDrawer.vue';

import './assets/main.scss';

var FEATURE_NAME = "times_of_day";

// --- Tab ---

registerTab("/analytics/loyalty", {
    priority: 3,
    name: "times-of-day",
    permission: FEATURE_NAME,
    pluginName: "times-of-day",
    title: i18n('times-of-day.title'),
    route: "#/analytics/loyalty/times-of-day",
    dataTestId: "times-of-day",
    component: TimesOfDayView,
    vuex: [{
        clyModel: countlyTimesOfDay
    }],
});

// --- Custom Dashboard Widget ---

registerData("/custom/dashboards/widget", {
    type: "times-of-day",
    label: i18n("times-of-day.title"),
    priority: 8,
    pluginName: "times-of-day",
    primary: true,
    getter: function(widget) {
        return widget.widget_type === "times-of-day";
    },
    drawer: {
        component: TimesOfDayWidgetDrawer,
        getEmpty: function() {
            return {
                title: "",
                feature: FEATURE_NAME,
                widget_type: "times-of-day",
                isPluginWidget: true,
                apps: [],
                data_type: "",
                events: "",
                period: "",
                visualization: "punchcard"
            };
        },
        beforeLoadFn: function(doc, isEdited) {
            if (isEdited) {
                if (doc.data_type === 'event' && doc.events.length) {
                    doc.events = doc.events[0].split('***')[1];
                }
            }
        },
        beforeSaveFn: function(doc) {
            if (doc.data_type === 'event') {
                var eventItem = service.findEventKeyByName(doc.events);
                doc.events = [eventItem.key + '***' + eventItem.name];
            }
            if (doc.data_type === 'session') {
                doc.events = undefined;
            }
        }
    },
    grid: {
        component: TimesOfDayWidget,
        dimensions: function() {
            return {
                minWidth: 4,
                minHeight: 4,
                width: 4,
                height: 4
            };
        }
    }
});
