<script>
import { mixins, templateUtil, i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import AnnotationDrawer from '../../../../../frontend/express/public/core/notes/components/AnnotationDrawer.vue';

export default {
    template: templateUtil.stage('/dashboards/templates/widgets/analytics/widget.html'),
    mixins: [
        mixins.customDashboards.global,
        mixins.commonFormatters,
        mixins.zoom,
        mixins.hasDrawers("annotation"),
        mixins.graphNotesCommand
    ],
    components: {
        "drawer": AnnotationDrawer
    },
    computed: {
        title: function() {
            if (this.data.title) {
                return this.data.title;
            }

            return this.i18n("views.widget-type");
        },
        showBuckets: function() {
            return false;
        },
        metricLabels: function() {
            return [];
        },
        tableStructure: function() {
            var columns = [{prop: "view", "title": i18n("views.widget-type")}];

            this.data = this.data || {};
            this.data.metrics = this.data.metrics || [];
            for (var k = 0; k < this.data.metrics.length; k++) {
                if (this.data.metrics[k] === "d" || this.data.metrics[k] === "scr" || this.data.metrics[k] === "br") {
                    columns.push({"prop": this.data.metrics[k], "title": i18n("views." + this.data.metrics[k])});
                }
                else {
                    columns.push({"prop": this.data.metrics[k], "title": i18n("views." + this.data.metrics[k]), "type": "number"});
                }
            }
            return columns;
        },
        getTableData: function() {
            this.data = this.data || {};
            this.data.dashData = this.data.dashData || {};
            this.data.dashData.data = this.data.dashData.data || {};
            this.data.dashData.data.chartData = this.data.dashData.data.chartData || [];

            var tableData = [];
            for (var z = 0; z < this.data.dashData.data.chartData.length; z++) {
                var ob = {"view": this.data.dashData.data.chartData[z].view};
                for (var k = 0; k < this.data.metrics.length; k++) {
                    if (this.data.metrics[k] === "d") {
                        if (this.data.dashData.data.chartData[z].t > 0) {
                            ob[this.data.metrics[k]] = countlyCommon.formatSecond(this.data.dashData.data.chartData[z].d / this.data.dashData.data.chartData[z].t);
                        }
                        else {
                            ob[this.data.metrics[k]] = 0;
                        }
                    }
                    else if (this.data.metrics[k] === "scr") {
                        if (this.data.dashData.data.chartData[k].t > 0) {
                            var vv = parseFloat(this.data.dashData.data.chartData[z].scr) / parseFloat(this.data.dashData.data.chartData[z].t);
                            if (vv > 100) {
                                vv = 100;
                            }
                            ob[this.data.metrics[k]] = countlyCommon.formatNumber(vv) + "%";
                        }
                        else {
                            ob[this.data.metrics[k]] = 0;
                        }
                    }
                    else if (this.data.metrics[k] === "br") {
                        ob[this.data.metrics[k]] = this.data.dashData.data.chartData[z][this.data.metrics[k]] || 0;
                        ob[this.data.metrics[k]] = countlyCommon.formatNumber(ob[this.data.metrics[k]]) + "%";
                    }
                    else {
                        ob[this.data.metrics[k]] = this.data.dashData.data.chartData[z][this.data.metrics[k]];
                    }
                }
                tableData.push(ob);
            }
            return tableData;
        }
    },
    methods: {
        refresh: function() {
            this.refreshNotes();
        },
        onWidgetCommand: function(event) {
            if (event === 'zoom') {
                this.triggerZoom();
                return;
            }
            else if (event === 'add' || event === 'manage' || event === 'show') {
                this.graphNotesHandleCommand(event);
                return;
            }
            else {
                return this.$emit('command', event);
            }
        },
    }
};
</script>
