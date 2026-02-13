<template>
    <cly-drawer
        ref="drawerScope"
        @submit="onSubmit"
        @copy="onCopy"
        @close="onClose"
        :title="i18n('views.drill-drawer.title')"
        :saveButtonLabel="i18n('views.drill-drawer.save-button')"
        v-bind="controls">
        <template v-slot:default="scope">
            <cly-form-step id="view-drill-drawer-form">
                <cly-form-field :label="i18n('events.all.period')" name="period" rules="required" direction="row" v-slot:default>
                    <cly-date-picker
                        timestampFormat="ms"
                        type="daterange"
                        v-model="scope.editedObject.period"
                    >
                    </cly-date-picker>
                </cly-form-field>
                <cly-form-field :label="i18n('events.all.segmentation')" name="segmentation" direction="row" v-slot:default>
                    <cly-select-x
                        :options="availableSegments"
                        :disabledOptions="omittedSegments"
                        v-model="scope.editedObject.selectedSegment"
                        @change="onSegmentChange"
                    >
                    </cly-select-x>
                </cly-form-field>
                <cly-form-field v-if="scope.editedObject.selectedSegment !== 'all'" :label="i18n('events.segment.values')" name="segment-values" direction="row" v-slot:default>
                    <cly-select-x
                        mode="multi-check"
                        :options="segmentValues"
                        searchable
                        :search-placeholder="i18n('events.all.segmentation-values-search.placeholder')"
                        v-model="scope.editedObject.selectedSegmentValues"
                    >
                    </cly-select-x>
                </cly-form-field>
                <cly-form-field-checklistbox
                    ref="viewsChecklistbox"
                    name="views"
                    :label="i18n('views.drill-drawer.views')"
                    :required="false"
                    :options="views"
                    :searchable="true"
                    :search-placeholder="i18n('views.drill-drawer.search-view-name')"
                    v-model="scope.editedObject.selectedViews"
                ></cly-form-field-checklistbox>
            </cly-form-step>
        </template>
    </cly-drawer>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import jQuery from 'jquery';
import ClyDrawer from '../../../../../frontend/express/public/javascripts/components/drawer/cly-drawer.vue';
import ClyFormStep from '../../../../../frontend/express/public/javascripts/components/form/cly-form-step.vue';
import ClyFormField from '../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';
import ClyDatePicker from '../../../../../frontend/express/public/javascripts/components/date/date-picker.vue';
import ClySelectX from '../../../../../frontend/express/public/javascripts/components/input/select-x.vue';
import ClyFormFieldChecklistbox from '../../../../../frontend/express/public/javascripts/components/form/cly-form-field-checklistbox.vue';

export default {
    components: {
        ClyDrawer,
        ClyFormStep,
        ClyFormField,
        ClyDatePicker,
        ClySelectX,
        ClyFormFieldChecklistbox
    },
    mixins: [i18nMixin],
    props: {
        controls: {
            type: Object,
            required: true
        }
    },
    computed: {
        views: function() {
            return Object.entries(window.countlyViews.getViewsNames()).map(function([key, value]) {
                return {
                    value: key,
                    label: value
                };
            });
        },
        availableSegments: function() {
            var segments = this.$store.state.countlyViews.segments || {};
            var sortedKeys = Object.keys(segments).sort(Intl.Collator().compare);
            var list = [{"value": "all", "label": jQuery.i18n.map["views.all-segments"]}];
            for (var i = 0; i < sortedKeys.length; i++) {
                list.push({"value": sortedKeys[i], "label": sortedKeys[i]});
            }
            return list;
        },
        omittedSegments: function() {
            var omittedSegmentsObj = {
                label: i18n("events.all.omitted.segments"),
                options: []
            };
            var omittedSegments = this.$store.getters['countlyViews/getOmittedSegments'];
            if (omittedSegments) {
                omittedSegmentsObj.options = omittedSegments.map(function(item) {
                    return {
                        "label": item,
                        "value": item
                    };
                });
            }
            return omittedSegmentsObj;
        },
        segmentValues: function() {
            const segments = this.$store.state.countlyViews.segments || {};
            const selectedSegment = this.$refs.drawerScope.editedObject.selectedSegment;

            if (!selectedSegment || !segments[selectedSegment]) {
                return [];
            }

            return segments[selectedSegment].map(function(value) {
                return {
                    value: value,
                    label: value
                };
            });
        },
    },
    methods: {
        onSubmit: function(doc) {
            let URLparams = {
                event: "[CLY]_view",
                period: doc.period,
                dbFilter: {},
                byVal: [],
                executed: false
            };
            if (doc.selectedViews.length > 0) {
                URLparams.dbFilter[`sg.name`] = { "$in": doc.selectedViews };
            }
            if (doc.selectedSegment !== "all" && doc.selectedSegmentValues.length > 0) {
                if (doc.selectedSegment === "segment" || doc.selectedSegment === "platform") {
                    URLparams.dbFilter.$or = [
                        { "sg.platform": { "$in": doc.selectedSegmentValues } },
                        { "sg.segment": { "$in": doc.selectedSegmentValues } }
                    ];
                }
                else {
                    URLparams.dbFilter[`sg.${doc.selectedSegment}`] = { "$in": doc.selectedSegmentValues };
                }
            }
            //Go to drill page
            window.app.navigate("#/drill/" + JSON.stringify(URLparams), true);
        },
        onCopy: function() {
        },
        onClose: function() {
        },
        onSegmentChange: function() {
            this.$refs.drawerScope.editedObject.selectedSegmentValues = [];
        }
    }
};
</script>
