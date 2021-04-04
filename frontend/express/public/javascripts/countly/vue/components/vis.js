/* global jQuery, Vue, countlyCommon, _, VueECharts */

(function(countlyVue, $) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    Vue.component("cly-time-graph-w", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                dataPoints: {
                    required: true,
                    type: Array,
                    default: function() {
                        return [];
                    }
                },
                bucket: { required: false, default: null, type: String },
                overrideBucket: { required: false, default: false, type: Boolean },
                frozen: {default: false, type: Boolean},
                configPaths: { required: true, type: Array },
                configSmall: { required: false, default: false, type: Boolean },
                configOptions: { required: false, default: null, type: Object }
            },
            data: function() {
                return {
                    options: JSON.parse(JSON.stringify(this.configOptions)),
                    paths: JSON.parse(JSON.stringify(this.configPaths)),
                    small: JSON.parse(JSON.stringify(this.configSmall))
                };
            },
            computed: {
                hasData: function() {
                    if (this.dataPoints.length === 0) {
                        return false;
                    }
                    if (this.dataPoints[0].length === 0) {
                        return false;
                    }
                    return true;
                }
            },
            watch: {
                dataPoints: function() {
                    this.refresh();
                },
                frozen: function(newValue) {
                    if (!newValue) {
                        this.refresh();
                    }
                }
            },
            mounted: function() {
                this.refresh();
            },
            beforeDestroy: function() {
                this.unbindResizer();
            },
            methods: {
                refresh: function() {

                    if (this.frozen || $(this.$refs.container).is(":hidden") || !this.hasData) {
                        // no need to refresh if hidden
                        return;
                    }

                    var self = this;

                    var points = this.dataPoints.map(function(path, pathIdx) {
                        var series = path.map(function(val, idx) {
                            return [idx + 1, val];
                        });
                        var pathCopy = _.extend({}, self.paths[pathIdx]);
                        pathCopy.data = series;
                        return pathCopy;
                    });

                    this.unbindResizer();

                    countlyCommon.drawTimeGraph(points,
                        $(this.$refs.container),
                        this.bucket, this.overrideBucket,
                        this.small, null,
                        this.options);

                    setTimeout(function() {
                        self.initializeResizer();
                    }, 0);
                },
                initializeResizer: function() {
                    var plot = $(this.$refs.container).data("plot");
                    plot.getPlaceholder().resize(this._onResize);
                },
                unbindResizer: function() {
                    var plot = $(this.$refs.container).data("plot");
                    if (plot) {
                        plot.getPlaceholder().unbind("resize", this._onResize);
                    }
                },
                _onResize: function() {
                    var self = this,
                        plot = $(this.$refs.container).data("plot"),
                        placeholder = plot.getPlaceholder();

                    if (placeholder.width() === 0 || placeholder.height() === 0) {
                        return;
                    }

                    // plot.resize();
                    // plot.setupGrid();
                    // plot.draw();

                    var graphWidth = plot.width();

                    $(self.$refs.container).find(".graph-key-event-label").each(function() {
                        var o = plot.pointOffset({x: $(this).data("points")[0], y: $(this).data("points")[1]});

                        if (o.left <= 15) {
                            o.left = 15;
                        }

                        if (o.left >= (graphWidth - 15)) {
                            o.left = (graphWidth - 15);
                        }

                        $(this).css({
                            left: o.left
                        });
                    });

                    $(self.$refs.container).find(".graph-note-label").each(function() {
                        var o = plot.pointOffset({x: $(this).data("points")[0], y: $(this).data("points")[1]});

                        $(this).css({
                            left: o.left
                        });
                    });
                }
            },
            template: '<div class="cly-vue-time-graph-w">\n' +
                            '<div ref="container" class="graph-container"></div>\n' +
                            '<div class="cly-vue-graph-no-data" v-if="!hasData">\n' +
                                '<div class="inner">\n' +
                                    '<div class="icon"></div>\n' +
                                    '<div class="text">{{i18n("common.graph.no-data")}}</div>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-graph-w", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                dataPoints: {
                    required: true,
                    type: Object,
                    default: function() {
                        return {};
                    }
                },
                graphType: { required: false, type: String, default: "bar" },
                frozen: {default: false, type: Boolean},
                configOptions: { required: false, default: null, type: Object }
            },
            data: function() {
                return {
                    options: JSON.parse(JSON.stringify(this.configOptions))
                };
            },
            computed: {
                hasData: function() {
                    return !!this.dataPoints;
                }
            },
            watch: {
                dataPoints: function() {
                    this.refresh();
                },
                graphType: function() {
                    this.refresh();
                },
                frozen: function(newValue) {
                    if (!newValue) {
                        this.refresh();
                    }
                }
            },
            mounted: function() {
                this.refresh();
            },
            methods: {
                refresh: function() {

                    if (this.frozen || $(this.$refs.container).is(":hidden") || !this.hasData) {
                        // no need to refresh if hidden
                        return;
                    }

                    countlyCommon.drawGraph(this.dataPoints,
                        $(this.$refs.container),
                        this.graphType,
                        this.options);
                }
            },
            template: '<div class="cly-vue-graph-w">\n' +
                            '<div ref="container" class="graph-container"></div>\n' +
                            '<div class="cly-vue-graph-no-data" v-if="!hasData">\n' +
                                '<div class="inner">\n' +
                                    '<div class="icon"></div>\n' +
                                    '<div class="text">{{i18n("common.graph.no-data")}}</div>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-chart", countlyBaseComponent.extend({
        provide: function() {
            var obj = {};
            obj[VueECharts.THEME_KEY] = "white";
            return obj;
        },
        props: {
            autoresize: {
                type: Boolean,
                default: true
            }
        },
        template: '<echarts v-bind="$attrs" v-on="$listeners" :autoresize="autoresize"></echarts>'
    }));

}(window.countlyVue = window.countlyVue || {}, jQuery));
