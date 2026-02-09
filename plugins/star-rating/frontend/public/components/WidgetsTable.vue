<template>
    <cly-datatable-n
        :available-dynamic-cols="tableDynamicCols"
        :force-loading="loading"
        :exportFormat="formatExportFunction"
        :persist-key="persistKey"
        row-class-name="bu-is-clickable"
        :rows="widgets"
        test-id="ratings-widgets-data-table"
        :tracked-fields="widgetTableTrackedFields"
        width="100%"
        @row-click="goWidgetDetail"
    >
        <template v-slot="scope">
            <el-table-column
                data-test-id="ratings-widgets-data-table-status-column"
                fixed
                :label="i18n('feedback.status')"
                prop="status"
                sortable
                type="switch"
                width="100"
            >
                <template v-slot="rowScope">
                    <el-switch
                        :disabled="!canUserUpdate"
                        :test-id="'ratings-widgets-data-table-status-' + rowScope.$index"
                        :value="rowScope.row.status"
                        @click.native.stop
                        @input="scope.patch(rowScope.row, { status: !rowScope.row.status})"
                    />
                </template>
            </el-table-column>
            <el-table-column
                column-key="popup_header_text"
                data-test-id="ratings-widgets-data-table-widget-name-column"
                fixed
                :label="i18n('feedback.ratings-widget-name')"
                min-width="300"
                prop="popup_header_text"
            >
                <template v-slot="rowScope">
                    <div>
                        <div :data-test-id="'ratings-widgets-data-table-widget-name-' + rowScope.$index">
                            {{ unescapeHtml(rowScope.row.popup_header_text) }}
                        </div>
                        <div>
                            <span
                                class="color-cool-gray-40 text-small bu-has-text-weight-semibold"
                                :data-test-id="'ratings-widgets-data-table-widget-id-label-' + rowScope.$index"
                            >
                                {{ i18n('feedback.widget-id') }}
                            </span>
                            <span
                                class="color-cool-gray-40 text-small"
                                :data-test-id="'ratings-widgets-data-table-widget-id-value-' + rowScope.$index"
                            >
                                {{ rowScope.row._id }}
                            </span>
                        </div>
                    </div>
                </template>
            </el-table-column>
            <el-table-column
                column-key="internalName"
                data-test-id="ratings-widgets-data-table-internal-widget-name-column"
                fixed
                :label="i18n('feedback.ratings-widget-internal-name')"
                min-width="300"
                prop="internalName"
            >
                <template v-slot="rowScope">
                    <div>
                        <div :data-test-id="'ratings-widgets-data-table-internal-widget-name-' + rowScope.$index">
                            {{ rowScope.row.internalName }}
                        </div>
                    </div>
                </template>
            </el-table-column>
            <template
                v-for="(col,idx) in scope.dynamicCols"
                :prop="col.value"
            >
                <el-table-column
                    v-if="col.value === 'targeting'"
                    column-key="targeting"
                    :key="idx"
                    :label="i18n('feedback.targeting')"
                    min-width="150"
                    prop="targeting"
                >
                    <template v-slot="rowScope">
                        <cly-cohort-targeting
                            inline
                            :targeting="rowScope.row.targeting"
                            :test-id="'ratings-widgets-data-table-targeting-' + rowScope.$index"
                        />
                    </template>
                </el-table-column>
                <el-table-column
                    v-if="col.value === 'responses'"
                    :key="idx"
                    column-key="ratingsCount"
                    :label="i18n('feedback.responses')"
                    min-width="130"
                    prop="ratingsCount"
                    sortable="true"
                >
                    <template
                        v-slot="rowScope"
                        class="bu-is-flex bu-is-justify-content-center"
                    >
                        <span
                            class="text-medium"
                            :data-test-id="'ratings-widgets-data-table-responses-' + rowScope.$index"
                        >
                            {{ rowScope.row.ratingsCount }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column
                    v-if="col.value === 'rating_score'"
                    :key="idx"
                    column-key="ratingScore"
                    :label="i18n('feedback.rating-score')"
                    min-width="150"
                    prop="ratingScore"
                    sortable="true"
                >
                    <template
                        v-slot="rowScope"
                        class="bu-is-flex bu-is-justify-content-center"
                    >
                        <span
                            class="bu-is-size-4"
                            :data-test-id="'ratings-widgets-data-table-rating-score-' + rowScope.$index"
                        >
                            {{ rowScope.row.ratingScore }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column
                    v-if="col.value === 'target_pages'"
                    :key="idx"
                    :label="col.label"
                    min-width="120"
                    prop="target_pages"
                    sortable="true"
                >
                    <template
                        v-slot="rowScope"
                        class="bu-is-flex bu-is-justify-content-center"
                    >
                        <span
                            class="text-medium"
                            :data-test-id="'ratings-widgets-data-table-pages-' + rowScope.$index"
                        >
                            {{ rowScope.row.target_pages }}
                        </span>
                    </template>
                </el-table-column>
            </template>
        </template>
        <template v-slot:bottomline="scope">
            <cly-diff-helper
                v-loading="loading"
                :diff="scope.diff"
                @discard="scope.unpatch()"
                @save="bulkUpdateTableData(scope)"
            />
        </template>
    </cly-datatable-n>
</template>

<script>
import countlyVue, { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import * as CountlyHelpers from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import starRatingPlugin from '../store/index.js';

var FEATURE_NAME = 'star_rating';

function replaceEscapes(str) {
    if (typeof str === 'string') {
        return str.replace(/^&#36;/g, "$").replace(/&#46;/g, '.').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&le;/g, '<=').replace(/&ge;/g, '>=').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }
    return str;
}

export default {
    mixins: [
        countlyVue.mixins.i18n,
        countlyVue.mixins.auth(FEATURE_NAME),
        countlyVue.mixins.commonFormatters
    ],
    props: {
        rows: {
            type: Array,
            default: function() {
                return [];
            }
        }
    },
    data: function() {
        return {
            cohortsEnabled: countlyGlobal.plugins.indexOf('cohorts') > -1,
            loading: false,
            persistKey: 'ratingsWidgetsTable_' + countlyCommon.ACTIVE_APP_ID,
            widgetTableTrackedFields: ['status']
        };
    },
    emits: [
        'widgets-updated'
    ],
    computed: {
        tableDynamicCols: function() {
            var columns = [
                {
                    value: 'rating_score',
                    label: i18n('feedback.rating-score'),
                    default: true,
                    required: true
                },
                {
                    value: 'responses',
                    label: i18n('feedback.responses'),
                    default: true,
                    required: true
                },
                {
                    value: "target_pages",
                    label: i18n("feedback.pages"),
                    default: true,
                    required: true
                }
            ];

            if (this.cohortsEnabled) {
                columns.unshift({
                    value: 'targeting',
                    label: i18n('feedback.targeting'),
                    default: true,
                    required: true
                });
            }

            return columns;
        },
        widgets: function() {
            for (var i = 0; i < this.rows.length; i++) {
                var ratingScore = 0;
                if (this.rows[i].ratingsCount > 0) {
                    ratingScore = (this.rows[i].ratingsSum / this.rows[i].ratingsCount).toFixed(1);
                }
                this.rows[i].ratingScore = ratingScore;
                this.rows[i].popup_header_text = replaceEscapes(this.rows[i].popup_header_text);
                if (this.cohortsEnabled) {
                    this.rows[i] = this.parseTargeting(this.rows[i]);
                }
                if (Array.isArray(this.rows[i].target_pages)) {
                    this.rows[i].target_pages = this.rows[i].target_pages.join(", ");
                }
                else if (!this.rows[i].target_pages) {
                    this.rows[i].target_pages = "-";
                }
            }
            return this.rows;
        }
    },
    methods: {
        bulkUpdateTableData: function(tableScope) {
            var self = this;
            var diff = tableScope?.diff || [];

            if (diff.length > 0) {
                this.loading = true;
                var requests = diff.reduce(function(acc, item) {
                    acc[item.key] = item.newValue;
                    return acc;
                }, {});

                starRatingPlugin.bulkUpdateWidgetStatus(requests)
                    .then(function() {
                        self.loading = false;
                        self.$emit('widgets-updated');

                        CountlyHelpers.notify({
                            type: 'success',
                            message: i18n('feedback.successfully-updated')
                        });
                    })
                    .catch(function() {
                        self.loading = false;

                        CountlyHelpers.notify({
                            type: 'error',
                            message: 'Something went wrong when trying to update the rating widgets status'
                        });
                    });
            }
        },
        formatExportFunction: function() {
            var tableData = this.widgets;
            var table = [];
            for (var k = 0; k < tableData.length; k++) {
                var item = {};

                item[i18n('feedback.status').toUpperCase()] = tableData[k].status ? "Active" : "Inactive";
                item[i18n('feedback.ratings-widget-name').toUpperCase()] = tableData[k].popup_header_text;
                item[i18n('feedback.widget-id').toUpperCase()] = tableData[k]._id;
                item[i18n('feedback.targeting').toUpperCase()] = this.parseTargetingForExport(tableData[k].targeting).trim();
                item[i18n('feedback.rating-score').toUpperCase()] = tableData[k].ratingScore;
                item[i18n('feedback.responses').toUpperCase()] = tableData[k].ratingsCount;
                item[i18n('feedback.pages').toUpperCase()] = tableData[k].target_pages;

                table.push(item);
            }
            return table;
        },
        goWidgetDetail: function(row) {
            window.location.hash = "#/" + countlyCommon.ACTIVE_APP_ID + "/feedback/ratings/widgets/" + row._id;
        },
        parseTargeting: function(widget) {
            if (widget.targeting) {
                try {
                    if (typeof widget.targeting.user_segmentation === "string") {
                        widget.targeting.user_segmentation = JSON.parse(widget.targeting.user_segmentation);
                    }
                }
                catch (e) {
                    widget.targeting.user_segmentation = {};
                }

                try {
                    if (typeof widget.targeting.steps === "string") {
                        widget.targeting.steps = JSON.parse(widget.targeting.steps);
                    }
                }
                catch (e) {
                    widget.targeting.steps = [];
                }

                widget.targeting.user_segmentation = widget.targeting.user_segmentation || {};
                widget.targeting.steps = widget.targeting.steps || [];
            }
            return widget;
        },
        parseTargetingForExport: function(targeting) {
            if (!targeting) {
                return "";
            }
            var description = window.countlyCohorts.getSegmentationDescription(targeting);
            var html = description.behavior;
            var div = document.createElement('div');
            div.innerHTML = html;
            return div.textContent || div.innerText || "";
        }
    }
};
</script>
