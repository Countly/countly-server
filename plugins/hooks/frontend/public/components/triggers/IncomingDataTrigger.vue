<template>
    <div>
        <cly-form-field name="incoming-data" :label="i18n('hooks.incoming-data')" rules="required">
            <cly-select-x
               class="cly-vue-hook-drawer__is-full-line bu-mb-1"
               placeholder="Select Trigger"
               mode="single-list"
               v-model="value.event[0]"
               @change="eventChange"
               :options="eventOptions">
            </cly-select-x>
        </cly-form-field>

        <div class="bu-mt-4 bu-px-4 bu-py-5 hook-filter-block">
            <div class="bu-level text-small">
                <div class="bu-level bu-level-left hooks-trigger-switch">
                    <el-switch
                        class="text-small"
                        :active-text="i18n('hooks.filter-rule')"
                        v-model="openSegmentTab"
                        active-color="#2FA732">
                    </el-switch>
                </div>
                <div class="bu-level bu-level-right">
                <span class="text-medium color-cool-gray-50">{{i18n("hooks.filtering-tips")}}</span>
                </div>
            </div>

            <cly-form-field name="exclude" v-slot:default v-if="openSegmentTab">
                <cly-qb-segmentation
                    class="hook-segmentation-block"
                    ref="qb"
                    :allowBreakdown="false"
                    :requires-minimal-segmentation="true"
                    v-model="queryObj"
                    :orGroupsEnabled="true"
                    :add-empty-row-on-empty-query="true"
                    :event="selectedEvent"
                    show-in-the-last-minutes
                    show-in-the-last-hours
                >
                </cly-qb-segmentation>
            </cly-form-field>
        </div>
    </div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import jQuery from 'jquery';
import ClyFormField from '../../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';
import ClySelectX from '../../../../../../frontend/express/public/javascripts/components/input/select-x.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyFormField,
        ClySelectX,
    },
    data: function() {
        var defaultFilter = {};
        var result = {};
        try {
            defaultFilter = JSON.parse(this.$props.value.filter) || {};
        }
        finally {
            result = {
                eventOptions: [],
                hiddenFields: [],
                openSegmentTab: this.$props.value.filter ? true : false,
                query: defaultFilter.dbFilter,
            };
        }
        return result;
    },
    props: {
        value: {
            type: Object
        },
        app: {
            type: String,
        }
    },
    mounted: function() {
        this.getEventOptions();
    },
    computed: {
        selectedEvent: function() {
            var event = this.$props.value.event[0];
            if (event && event.indexOf("***") > 0) {
                event = event.split("***")[1];
                return event;
            }
            return "";
        },
        queryObj: {
            set: function(newValue) {
                var queryData = Object.assign({}, this.$props.value);
                queryData.filter = JSON.stringify({dbFilter: newValue});
                this.$emit("input", queryData);
                this.query = newValue;
                return;
            },
            get: function() {
                return this.query;
            }
        },
        selectedApp: function() {
            return this.$props.app;
        }
    },
    watch: {
        selectedApp: function() {
            this.getEventOptions();
        },
        'openSegmentTab': {
            deep: true,
            handler: function(newVal) {
                if (!newVal) {
                    this.queryObj = {};
                }
            }
        },
    },
    methods: {
        eventChange: function() {
            this.queryObj = {};
        },
        queryChange: function(changedQueryWrapper, isQueryValid) {
            if (isQueryValid) {
                var queryObj = Object.assign({}, this.$props.value);
                queryObj.filter = JSON.stringify({dbFilter: changedQueryWrapper.query});
                this.$emit("input", Object.assign({}, queryObj));
            }
        },
        getEventOptions: function() {
            var self = this;
            var apps = [this.$props.app];
            window.countlyEvent.getEventsForApps(apps, function(events) {
                events = events.map(function(e) {
                    e.label = e.name; return e;
                });
                jQuery.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + '/o/internal-events',
                    data: {
                        app_id: apps[0],
                    },
                    success: function(json) {
                        var internal_events = [];
                        json.forEach(function(event) {
                            internal_events.push({value: apps[0] + "***" + event, label: jQuery.i18n.map["internal-events." + event] || event, description: '', count: '', sum: ''});
                        });
                        events = events.concat(internal_events);
                        events.unshift({value: apps[0] + "****", label: jQuery.i18n.map["hooks.any-events"]});
                        self.eventOptions = Object.assign([], events);
                    }
                });
            });
        },
    },
};
</script>
