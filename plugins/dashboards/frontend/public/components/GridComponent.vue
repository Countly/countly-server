<template>
<div v-bind:class="[componentId]">
    <div class="grid-stack">
        <widget
            v-for="(widget, index) in allWidgets"
            v-if="widgetSettingsGetter(widget, true)"
            :key="widget._id"
            :widget="widget"
            :settings="widgetSettingsGetter(widget, true)"
            :loading="loading"
            @ready="onReady"
            @command="onWidgetAction"
            :style="{ width: widget.width + 'px', height: widget.height + 'px' }">
        </widget>
    </div>
    <widgets-drawer @reset="onReset" :controls="drawers.widgets"></widgets-drawer>
</div>
</template>

<script>
import { mixins, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { confirm as CountlyConfirm, notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import countlyDashboards from '../store/index.js';
import WidgetsMixin from '../mixins/WidgetsMixin.js';
import WidgetValidationMixin from '../mixins/WidgetValidationMixin.js';
import DimensionsMixin from '../mixins/DimensionsMixin.js';
import WidgetDrawer from './WidgetDrawer.vue';
import WidgetComponent from './WidgetComponent.vue';
import 'gridstack/dist/gridstack.min.css';
import { GridStack } from 'gridstack';

export default {
    mixins: [i18nMixin, mixins.hasDrawers("widgets"), WidgetsMixin, WidgetValidationMixin, DimensionsMixin],
    props: {
        loading: {
            type: Boolean,
            default: true
        },
        canUpdate: {
            type: Boolean,
            default: true
        }
    },
    components: {
        "widgets-drawer": WidgetDrawer,
        "widget": WidgetComponent
    },
    data: function() {
        return {
            grid: null,
            widgetId: null
        };
    },
    computed: {
        allWidgets: function() {
            var allWidgets = JSON.parse(JSON.stringify(this.$store.getters["countlyDashboards/widgets/all"]));
            this.validateWidgets(allWidgets);
            return allWidgets;
        }
    },
    methods: {
        onWidgetAction: function(command, data) {
            var self = this;
            var d = JSON.parse(JSON.stringify(data));
            var setting = this.widgetSettingsGetter(d);

            if (!setting && command !== "delete") {
                countlyDashboards.factory.log("Well this is very strange.");
                countlyDashboards.factory.log("On widget action, atleast one of the widget registrations should be returned.");
                countlyDashboards.factory.log("Kindly check your widget getter, maybe something is wrong there.");
                return;
            }

            switch (command) {
            case "edit":
                var empty = setting.drawer.getEmpty();
                d.__action = "edit";
                this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", true);
                var settings = Object.assign({}, empty, d);
                this.widgetId = settings._id;
                this.openDrawer("widgets", settings);
                break;

            case "delete":
                d.__action = "delete";
                CountlyConfirm(this.i18nM("dashboards.delete-widget-text"), "popStyleGreen", function(result) {
                    if (!result) {
                        return false;
                    }

                    self.$store.dispatch("countlyDashboards/widgets/delete", d._id).then(function(res) {
                        if (res) {
                            var node = document.getElementById(d._id);
                            self.removeGridWidget(node);
                            self.$store.dispatch("countlyDashboards/widgets/remove", d._id);
                            notify({
                                message: "Widget deleted successfully!",
                                type: "success"
                            });
                        }
                    });

                }, [this.i18nM("common.no-dont-delete"), this.i18nM("dashboards.delete-widget")], {title: this.i18nM("dashboards.delete-widget-title")});
                break;
            }
        },
        addWidget: function(widget) {
            var id = widget.id;
            var setting = this.widgetSettingsGetter(widget);

            if (!setting) {
                countlyDashboards.factory.log("This can never happen! \
                addWidget is called after submit. Please check the WidgetDrawer's onSubmit.");

                return;
            }

            var dimensions = this.returnDimensions(setting, widget);

            var validatedWidth = this.calculateWidth(setting, widget, dimensions.width);
            var validatedHeight = this.calculateHeight(setting, widget, dimensions.height);
            var validatedMinWidth = this.calculateWidth(setting, widget, dimensions.minWidth);
            var validatedMinHeight = this.calculateHeight(setting, widget, dimensions.minHeight);

            if (id) {
                var node = {
                    id: id,
                    autoPosition: false,
                    w: validatedWidth,
                    h: validatedHeight,
                    minW: validatedMinWidth,
                    minH: validatedMinHeight,
                    new: true
                };

                this.addGridWidget(node);
            }
        },
        onReady: function(id) {
            this.makeGridWidget(id);
        },
        customCompact: function(grid) {
            if (!grid || !grid.engine || grid.engine.nodes.length === 0) {
                return;
            }
            var engine = grid.engine;
            engine.sortNodes(1);
            var maxY = Math.max.apply(null, engine.nodes.map(function(n) { return n.y + n.h; }));
            var rowOccupancy = new Array(maxY).fill(false);

            engine.nodes.forEach(function(node) {
                for (var y = node.y; y < node.y + node.h; y++) {
                    rowOccupancy[y] = true;
                }
            });

            var emptyRows = [];
            for (var y = 0; y < rowOccupancy.length; y++) {
                if (!rowOccupancy[y]) {
                    emptyRows.push(y);
                }
            }

            if (emptyRows.length > 0) {
                emptyRows.sort(function(a, b) { return b - a; });

                grid.batchUpdate();

                emptyRows.forEach(function(emptyRow) {
                    engine.nodes.forEach(function(node) {
                        if (node.y > emptyRow) {
                            grid.update(node.el, { y: node.y - 1 });
                        }
                    });
                });
                grid.batchUpdate(false);
            }
        },
        initGrid: function() {
            var self = this;
            this.grid = GridStack.init({
                cellHeight: 80,
                margin: 8,
                animate: true,
                float: true,
                column: 12,
                acceptWidgets: true,
                alwaysShowResizeHandle: 'mobile',
                itemClass: 'grid-stack-item',
                handleClass: 'grid-stack-item-content',
                sizeToContent: false,
                columnOpts: {
                    breakpoints: [
                        { w: 768, c: 1 },
                        { w: Infinity, c: 12 }
                    ],
                    disableOneColumnMode: false,
                    oneColumnSize: 768,
                    widthOffset: 0
                },
            });

            if (!this.canUpdate) {
                this.disableGrid();
            }

            this.grid.on("resizestart dragstart", function() {
                self.$nextTick(function() {
                    self.$store.dispatch("countlyDashboards/requests/gridInteraction", true);
                    self.$store.dispatch("countlyDashboards/requests/markSanity", false);
                });
            });

            this.grid.on("resizestop dragstop", function() {
                self.$nextTick(function() {
                    self.$store.dispatch("countlyDashboards/requests/gridInteraction", false);
                });
            });

            this.grid.on('change', function(event, items) {
                if (items && self.grid.opts && self.grid.opts.column && self.grid.opts.column === 12) {
                    items.forEach(function(item) {
                        self.updateWidgetGeography(
                            item.id,
                            {
                                size: [item.w, item.h],
                                position: [item.x, item.y]
                            }
                        );
                    });
                    var debounced = function() {
                        var timer;
                        return function() {
                            clearTimeout(timer);
                            timer = setTimeout(function() {
                                self.$nextTick(function() {
                                    setTimeout(function() {
                                        self.customCompact(self.grid);
                                    }, 10);
                                });
                            }, 400);
                        };
                    }();
                    debounced();
                }
            });

            this.grid.on("removed", function() {
                self.customCompact(self.grid);
            });

            this.grid.on("added", function(event, element) {
                var node = element[0];

                if (node && node.new) {
                    var widgetId = node.id;

                    self.grid.batchUpdate();
                    self.updateGridWidget(node.el, {new: false});
                    self.grid.commit();

                    var s = [node.w, node.h];
                    var p = [node.x, node.y];

                    self.$store.dispatch("countlyDashboards/widgets/update", {id: widgetId, settings: {position: p, size: s}}).then(function(res) {
                        if (res) {
                            self.$store.dispatch("countlyDashboards/widgets/get", widgetId).then(function() {
                                self.removeGridWidget(node.el);
                                self.$store.dispatch("countlyDashboards/requests/isProcessing", false);
                            });
                        }
                    });
                }
            });
        },
        updateWidgetGeography: function(widgetId, settings) {
            var self = this;

            this.$store.dispatch("countlyDashboards/widgets/syncGeography", {_id: widgetId, settings: settings});
            this.$nextTick(function() {
                setTimeout(function() {
                    self.$store.dispatch("countlyDashboards/widgets/update", {id: widgetId, settings: settings});
                }, 100);
            });
        },
        updateAllWidgetsGeography: function() {
            var allGridWidgets = this.savedGrid();

            for (var i = 0; i < allGridWidgets.length; i++) {
                var n = allGridWidgets[i];
                var wId = n.id;
                var size = [n.w, n.h];
                var position = [n.x, n.y];

                this.updateWidgetGeography(wId, {size: size, position: position});
            }
        },
        savedGrid: function() {
            return this.grid.save(false);
        },
        validateWidgets: function(allWidgets) {
            if (this.grid) {
                var self = this;
                this.$nextTick(function() {
                    self.grid.batchUpdate();

                    for (var i = 0; i < allWidgets.length; i++) {
                        var widget = allWidgets[i];
                        var widgetId = widget._id;

                        var locked = false;
                        var noResize = false;
                        var noMove = false;

                        var nodeEl = document.getElementById(widgetId);

                        if (!self.canUpdate) {
                            locked = true;
                            noResize = true;
                            noMove = true;
                        }

                        var setting = {
                            locked: locked,
                            noMove: noMove,
                            noResize: noResize,
                        };

                        self.updateGridWidget(nodeEl, setting);
                    }

                    self.grid.commit();
                });
            }
        },
        updateGridWidget: function(el, settings) {
            this.grid.update(el, settings);
        },
        addGridWidget: function(node) {
            if (this.grid) {
                this.grid.addWidget(node);
            }
        },
        makeGridWidget: function(id) {
            if (this.grid) {
                var self = this;
                this.$nextTick(function() {
                    self.grid.makeWidget("#" + id);
                });
            }
        },
        disableGrid: function() {
            this.grid.disable();
        },
        removeGridWidget: function(el) {
            if (this.grid) {
                this.grid.removeWidget(el);
            }
        },
        destroyGrid: function() {
            if (this.grid) {
                this.grid.destroy();
            }
        },
        autoPosition: function(allWidgets) {
            var autoposition = false;
            allWidgets.forEach(function(widget) {
                if (!widget.position) {
                    autoposition = false;
                }
            });
            return autoposition;
        }
    },
    mounted: function() {
        this.initGrid();
    },
    beforeDestroy: function() {
        this.destroyGrid();
    }
};
</script>
