/* global countlyVue, countlyCommon, countlyEventsOverview,CV,app*/
(function() {
    var EventsTable = countlyVue.views.BaseView.extend({
        mixins: [countlyVue.mixins.i18n],
        data: function() {
            return {
                scoreTableExportSettings: {
                    title: "Events",
                    timeDependent: true
                }
            };
        },
        methods: {
            onRowClick: function(params) {
                app.navigate("#/analytics/events/key/" + params.name, true);
            }
        },
        computed: {
            eventsTableRows: function() {
                return this.$store.getters["countlyEventsOverview/tableRows"];
            },
            isTableLoading: function() {
                return this.$store.getters["countlyEventsOverview/isTableLoading"];
            }
        },
        template: '#overview-tables-events'
    });

    var OverviewConfigureDrawer = countlyVue.views.create({
        template: CV.T('/core/events/templates/configureEvents.html'),
        data: function() {
            return {
                saveButtonLabel: CV.i18n('common.done'),
                selectEvent: '',
                selectProperty: '',
            };
        },
        computed: {
            title: function() {
                return CV.i18n("events.overview.events.configure.events");
            },
            eventProperties: function() {
                return this.$store.getters["countlyEventsOverview/eventProperties"];
            },
            configureEventsList: function() {
                return this.$store.getters["countlyEventsOverview/configureEventsList"];
            },
            selectedOverviewEvents: {
                get: function() {
                    return this.selectEvent;
                },
                set: function(selectedItem) {
                    this.selectEvent = selectedItem;
                    this.$store.dispatch('countlyEventsOverview/fetchEventProperties', selectedItem);
                }
            }
        },
        props: {
            controls: {
                type: Object
            },
            selectedEvents: {
                type: Array
            }
        },
        methods: {
            onClose: function(event) {
                this.selectEvent = '',
                this.selectProperty = '',
                this.$emit("close", event);
            },
            onSubmit: function() {
                var self = this;
                this.$store.dispatch("countlyEventsOverview/setMonitorEventsLoading", true);
                this.selectedEvents.forEach(function(item, idx) {
                    self.selectedEvents[idx].order = idx;
                });
                this.$store.dispatch('countlyEventsOverview/fetchEditMap', self.selectedEvents);
            },
            add: function() {
                var self = this;
                var alreadyExists = false;
                if (this.selectedEvents.length === 12) {
                    this.$notify.error({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("events.overview.max-c")
                    });
                    return;
                }
                this.selectedEvents.every(function(item) {
                    if (self.selectEvent === item.eventKey && self.selectProperty === item.eventProperty) {
                        alreadyExists = true;
                        return false;
                    }
                    return true;
                });
                if (alreadyExists) {
                    this.$notify.error({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("events.overview.have-already-one")
                    });
                }
                else {
                    var eventAttributes = this.$store.getters["countlyEventsOverview/eventMapping"][this.selectEvent];
                    var obj = {
                        "order": this.selectedEvents.length,
                        "eventKey": this.selectEvent,
                        "eventProperty": this.selectProperty,
                        "is_event_group": eventAttributes.group,
                        "eventName": eventAttributes.eventName,
                        "propertyName": eventAttributes[this.selectProperty]
                    };
                    this.selectedEvents.push(obj);
                    this.selectEvent = '';
                    this.selectProperty = '';
                }
            },
            onDelete: function(id) {
                this.selectedEvents.splice(id, 1);
            }
        }
    });

    var EventsBreakdownHorizontalTile = countlyVue.views.BaseView.extend({
        props: {
            trend: {
                type: String
            },
            change: {
                type: String
            }
        },
        template: '<div class="cly-events-breakdown-horizontal-tile bu-column bu-is-4">\
    <div class="cly-events-breakdown-horizontal-tile__wrapper">\
    <slot name="title"></slot>\
        <div class="cly-events-breakdown-horizontal-tile__values-list bu-columns bu-is-gapless bu-is-multiline bu-is-mobile">\
            <div class="bu-column bu-is-12">\
                <div class="cly-events-breakdown-horizontal-tile__item">\
                    <div class="bu-level bu-is-mobile cly-events-breakdown-horizontal-tile__item-title">\
                        <div class="bu-level-left">\
                            <div class="bu-level-item">\
                            <slot name="countValue"></slot>\
                            <span v-if="trend === \'u\'" class="cly-events-breakdown-horizontal-tile__trend cly-trend-up bu-pl-2"><i class="cly-events-breakdown-horizontal-tile__arrow fas fa-arrow-circle-up"></i>{{change}}</span>\
                            <span v-else class="cly-events-breakdown-horizontal-tile__trend cly-trend-down bu-pl-2"><i class="cly-events-breakdown-horizontal-tile__arrow fas fa-arrow-circle-down"></i>{{change}}</span>\
                            </div>\
                        </div>\
                        <slot name="totalPercentage">\
                        </slot>\
                    </div>\
                    <slot name="progressBar"></slot>\
                </div>\
            </div>\
        </div>\
    </div>\
</div>'
    });

    var MonitorEventsBreakdownHorizontalTile = countlyVue.views.BaseView.extend({
        props: {
            trend: {
                type: String
            },
            change: {
                type: String
            }
        },
        template: '<div class="cly-monitor-events-breakdown-horizontal-tile bu-column bu-is-6">\
    <div class="cly-monitor-events-breakdown-horizontal-tile__wrapper">\
    <slot name="title"></slot>\
        <div class="cly-monitor-events-breakdown-horizontal-tile__values-list bu-columns bu-is-gapless bu-is-multiline bu-is-mobile">\
            <div class="bu-column bu-is-4">\
                <div class="cly-monitor-events-breakdown-horizontal-tile__item">\
                    <div class="bu-level bu-is-mobile cly-monitor-events-breakdown-horizontal-tile__item-title">\
                        <div class="bu-level-left">\
                            <div class="bu-level-item">\
                            <slot name="countValue"></slot>\
                            <span v-if="trend === \'u\'" class="cly-trend-up cly-monitor-events-breakdown-horizontal-tile__trend bu-pl-2"><i class="cly-monitor-events-breakdown-horizontal-tile__arrow fas fa-arrow-circle-up"></i>{{change}}</span>\
                            <span v-else class="cly-trend-down cly-monitor-events-breakdown-horizontal-tile__trend bu-pl-2"><i class="cly-monitor-events-breakdown-horizontal-tile__arrow fas fa-arrow-circle-down"></i>{{change}}</span>\
                            </div>\
                        </div>\
                    </div>\
                    <slot name="propertyName"></slot>\
                </div>\
            </div>\
            <div class="bu-column bu-is-8">\
            <slot name="barGraph"></slot>\
            </div>\
        </div>\
    </div>\
</div>'
    });


    var EventsOverviewView = countlyVue.views.BaseView.extend({
        template: "#events-overview",
        mixins: [countlyVue.mixins.hasDrawers("configureDrawer")],
        components: {
            "detail-tables": EventsTable,
            "events-breakdown-horizontal-tile": EventsBreakdownHorizontalTile,
            "monitor-events-breakdown-horizontal-tile": MonitorEventsBreakdownHorizontalTile,
            'overview-drawer': OverviewConfigureDrawer
        },
        methods: {
            configureOverview: function() {
                this.$store.dispatch('countlyEventsOverview/fetchConfigureOverview');
                this.openDrawer("configureDrawer", {});
            }
        },
        computed: {
            selectedEvents: function() {
                return this.$store.getters["countlyEventsOverview/configureOverview"];
            },
            topEvents: function() {
                return this.$store.getters["countlyEventsOverview/topEvents"];
            },
            eventsOverview: function() {
                return this.$store.getters["countlyEventsOverview/eventsOverview"];
            },
            monitorEventsData: function() {
                return this.$store.getters["countlyEventsOverview/monitorEventsData"];
            },
            selectedDatePeriod: {
                get: function() {
                    return this.$store.getters["countlyEventsOverview/selectedDatePeriod"];
                },
                set: function(value) {
                    countlyCommon.setPeriod(value);
                    this.$store.dispatch('countlyEventsOverview/fetchSelectedDatePeriod', value);
                    this.$store.dispatch('countlyEventsOverview/fetchMonitorEvents');
                }
            },
            updatedAt: function() {
                var deatilEvents = this.$store.getters["countlyEventsOverview/detailEvents"];
                return CV.i18n('events.overview.updated') + " " + countlyCommon.formatTimeAgoText(deatilEvents.ts).text;
            },
            isMonitorEventsLoading: function() {
                return this.$store.getters["countlyEventsOverview/isMonitorEventsLoading"];
            }
        },
        data: function() {
            return {
                description: CV.i18n('events.overview.title.new'),
                disabledDatePicker: '1months',
                monitorEventsLegend: {"show": false}
            };
        },
        beforeCreate: function() {
            var self = this;
            this.$store.dispatch('countlyEventsOverview/fetchEventsOverview').then(function() {
                self.$store.dispatch("countlyEventsOverview/setTableLoading", false);
            });
        }
    });

    var eventsOverviewVuex = [{
        clyModel: countlyEventsOverview
    }];

    var EventsOverviewViewWrapper = new countlyVue.views.BackboneWrapper({
        component: EventsOverviewView,
        vuex: eventsOverviewVuex,
        templates: [
            "/core/events/templates/overview.html" ]
    });

    app.route("/analytics/events/overview", "overview", function() {
        this.renderWhenReady(EventsOverviewViewWrapper);
    });


    var EventsHomeWidget = countlyVue.views.create({
        template: CV.T("/core/events/templates/eventsHomeWidget.html"),
        data: function() {
            return {
                items: [],
                linkTo: {"label": CV.i18n('events.go-to-events'), "href": "#/analytics/events/overview"},
                isLoading: false,
                isLoadedOnce: false
            };
        },
        mounted: function() {
            var self = this;
            this.isLoading = true;
            this.$store.dispatch('countlyEventsOverview/fetchTopEvents', 5).then(function() {
                self.calculateAllData();
                self.isLoading = false;
                self.isLoadedOnce = true;
            }).catch(function(errored) {
                self.dealWithError(errored);
            });
        },
        beforeCreate: function() {
            this.module = countlyEventsOverview.getVuexModule();
            CV.vuex.registerGlobally(this.module);
        },
        beforeDestroy: function() {
            CV.vuex.unregister(this.module.name);
        },
        methods: {
            dealWithError: function(errored) {
                var self = this;
                if (errored && errored.abort_reason === "duplicate") {
                    if (self.isLoadedOnce) { //we have something, show that.
                        self.calculateAllData();
                        self.isLoading = false;
                    }
                    else {
                        setTimeout(self.refresh(), 1000); //we have nothing retry.
                    }
                }
                else {
                    this.vm.$root.$emit("cly-error", {message: errored});//show error
                }

            },
            refresh: function() {
                var self = this;
                if (this.isLoadedOnce === false) {
                    self.isLoading = false;
                }
                this.$store.dispatch('countlyEventsOverview/fetchTopEvents', 5).then(function() {
                    self.calculateAllData();
                    self.isLoading = false;
                    self.isLoadedOnce = true;
                }).catch(function(errored) {
                    self.dealWithError(errored);
                });
            },
            calculateAllData: function() {
                var data = this.$store.getters["countlyEventsOverview/topEvents"];
                data = data.splice(0, 5);
                this.items = data;
            }
        }
    });
    countlyVue.container.registerData("/home/widgets", {
        _id: "events-dashboard-widget",
        enabled: {"default": true}, //object. For each type set if by default enabled
        available: {"default": true}, //object. default - for all app types. For other as specified.
        placeBeforeDatePicker: true,
        order: 2,
        component: EventsHomeWidget
    });

})();