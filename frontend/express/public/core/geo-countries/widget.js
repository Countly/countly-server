import { views, i18nM, mixins, templateUtil } from '../../javascripts/countly/vue/core.js';
import { registerData } from '../../javascripts/countly/vue/container.js';
import GeoWidgetDrawer from './components/GeoWidgetDrawer.vue';
import AnnotationDrawer from '../notes/components/AnnotationDrawer.vue';

var WidgetComponent = views.create({
    // TO-DO: Replace runtime template with SFC import when dashboards plugin migrates shared widget templates.
    template: templateUtil.stage('/dashboards/templates/widgets/analytics/widget.html'),
    mixins: [mixins.customDashboards.global,
        mixins.customDashboards.widget,
        mixins.zoom,
        mixins.hasDrawers("annotation"),
        mixins.graphNotesCommand
    ],
    components: {
        "drawer": AnnotationDrawer
    },
    data: function() {
        return {
            map: {
                "countries": this.i18n("countries.title"),
                "langs": this.i18n("languages.title")
            },
            tableMap: {
                "u": this.i18n("common.table.total-users"),
                "t": this.i18n("common.total-sessions"),
                "n": this.i18n("common.table.new-users"),
                "countries": this.i18n("countries.title"),
                "langs": this.i18n("languages.table.language")
            }
        };
    },
    computed: {
        title: function() {
            if (this.data.title) {
                return this.data.title;
            }
            if (this.data.dashData) {
                return this.i18n("dashboards.data-type.geo") + " (" + (this.map[this.data.breakdowns[0]] || this.data.breakdowns[0]) + ")";
            }

            return this.i18n("dashboards.data-type.geo");
        },
        showBuckets: function() {
            return false;
        },
        metricLabels: function() {
            return [];
        },
        getTableData: function() {
            return this.calculateTableDataFromWidget(this.data);
        },
        tableStructure: function() {
            return this.calculateTableColsFromWidget(this.data, this.tableMap);
        },
        stackedBarOptions: function() {
            return this.calculateStackedBarOptionsFromWidget(this.data, this.tableMap);
        },
        pieGraph: function() {
            return this.calculatePieGraphFromWidget(this.data, this.tableMap);
        }
    },
    methods: {
        refresh: function() {
            this.refreshNotes();
        }
    }
});

registerData("/custom/dashboards/widget", {
    type: "analytics",
    label: i18nM("dashboards.widget-type.analytics"),
    priority: 1,
    primary: false,
    getter: function(widget) {
        return widget.widget_type === "analytics" && widget.data_type === "geo";
    },
    drawer: {
        component: GeoWidgetDrawer,
        getEmpty: function() {
            return {
                title: "",
                feature: "geo",
                widget_type: "analytics",
                app_count: 'single',
                data_type: "geo",
                apps: [],
                visualization: "",
                custom_period: null,
                metrics: ["t"],
                breakdowns: ["countries"],
                bar_color: 1
            };
        },
        beforeSaveFn: function(/*doc*/) {
        }
    },
    grid: {
        component: WidgetComponent,
        dimensions: function() {
            return {
                minWidth: 2,
                minHeight: 4,
                width: 2,
                height: 4
            };
        },
        onClick: function() {}
    }
});
