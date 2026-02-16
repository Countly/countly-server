<template>
    <div>
        <clyd-home-widget-header :widget="headerData" />
        <cly-section>
            <cly-metric-cards
                :multiline="false"
                v-loading="isLoading"
                style="min-height:100px;"
            >
                <cly-metric-card
                    v-for="(item, idx) in sourceItems"
                    :key="idx"
                    :is-percentage="true"
                    :test-id="'sources-index-' + idx"
                    :box-type="5"
                    :label="item.name"
                    :color="item.color"
                    :number="item.percent"
                />
                <div
                    v-if="sourceItems.length < 1 && !isLoading"
                    data-test-id="sources-wrapper-empty-card"
                    class="technology-analytics-wrapper__empty-card"
                >
                    <div
                        class="text-medium"
                        data-test-id="sources-wrapper-empty-card-label"
                    >
                        {{ i18n('common.table.no-data') }}
                    </div>
                </div>
            </cly-metric-cards>
        </cly-section>
    </div>
</template>
<script>
import { i18n, i18nMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import HomeWidgetTitle from '../../../../../frontend/express/public/core/home/components/HomeWidgetTitle.vue';
import countlySources from '../store/index.js';

export default {
    components: {
        'clyd-home-widget-header': HomeWidgetTitle
    },
    mixins: [i18nMixin, autoRefreshMixin],
    data: function() {
        return {
            sourceItems: [],
            isLoading: true,
            headerData: {
                label: i18n("sidebar.acquisition"),
                description: i18n("sources.description"),
                linkTo: {"label": i18n('sources.go-to-acquisition'), "href": "#/analytics/acquisition"},
            }
        };
    },
    mounted: function() {
        var self = this;
        Promise.resolve(countlySources.initialize(true)).then(function() {
            self.calculateAllData();
            self.isLoading = false;
        });
    },
    methods: {
        refresh: function(force) {
            var self = this;
            if (force) {
                self.isLoading = true;
            }
            Promise.resolve(countlySources.initialize(true)).then(function() {
                self.calculateAllData();
                self.isLoading = false;
            });
        },
        calculateAllData: function() {
            var blocks = [];
            var data = countlySources.getData() || {};
            data = data.chartData || [];

            var total = 0;
            var values = [];
            var cn = 5;

            for (var p = 0; p < data.length; p++) {
                total = total + data[p].t;
                if (values.length < 5) {
                    values.push({"name": data[p].sources, "t": data[p].t});
                    values = values.sort(function(a, b) {
                        return a.t - b.t;
                    });
                }
                else {
                    if (values[cn - 1].t < data[p].t) {
                        values[cn - 1] = {"name": data[p].sources, "t": data[p].t};
                        values = values.sort(function(a, b) {
                            return a.t - b.t;
                        });
                    }
                }
            }

            for (var k = 0; k < values.length; k++) {
                var percent = Math.round((values[k].t || 0) * 1000 / (total || 1)) / 10;
                blocks.push({
                    "name": values[k].name,
                    "value": countlyCommon.getShortNumber(values[k].t || 0),
                    "percent": percent,
                    "percentText": percent + "% " + i18n('common.of-total'),
                    "info": "some description",
                    "color": "#CDAD7A",
                    "value_": values[k].t
                });
            }
            blocks.sort(function(a, b) {
                return parseFloat(b.value_) - parseFloat(a.value_);
            });
            this.sourceItems = blocks;
        }
    }
};
</script>
