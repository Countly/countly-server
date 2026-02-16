<template>
    <div>
        <clyd-home-widget-header :widget="headerData" />
        <cly-section class="keywords-dashboard-widget">
            <cly-metric-cards
                :multiline="true"
                v-loading="isLoading"
                style="min-height:100px;"
            >
                <cly-metric-card :label="searchTermsTop3[0].label">
                    <template v-slot:number>
                        {{ searchTermsTop3[0].value }}
                    </template>
                    <template v-slot:description>
                        <span class="text-medium">{{ searchTermsTop3[0].percentage }}% {{ i18n('keywords.total') }}</span>
                    </template>
                </cly-metric-card>
                <cly-metric-card :label="searchTermsTop3[1].label">
                    <template v-slot:number>
                        {{ searchTermsTop3[1].value }}
                    </template>
                    <template v-slot:description>
                        <span class="text-medium">{{ searchTermsTop3[1].percentage }}% {{ i18n('keywords.total') }}</span>
                    </template>
                </cly-metric-card>
                <cly-metric-card :label="searchTermsTop3[2].label">
                    <template v-slot:number>
                        {{ searchTermsTop3[2].value }}
                    </template>
                    <template v-slot:description>
                        <span class="text-medium">{{ searchTermsTop3[2].percentage }}% {{ i18n('keywords.total') }}</span>
                    </template>
                </cly-metric-card>
            </cly-metric-cards>
        </cly-section>
    </div>
</template>
<script>
import { i18nMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
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
            searchTermsTop3: [
                { percentage: 0, label: this.i18n('common.table.no-data'), value: 0 },
                { percentage: 0, label: this.i18n('common.table.no-data'), value: 0 },
                { percentage: 0, label: this.i18n('common.table.no-data'), value: 0 }
            ],
            isLoading: true,
            headerData: {
                label: this.i18n("keywords.top_terms"),
                description: this.i18n("sources.description"),
                linkTo: {"label": this.i18n('keywords.go-to-keywords'), "href": "#/analytics/acquisition/search-terms"},
            }
        };
    },
    mounted: function() {
        var self = this;
        countlySources.initializeKeywords().then(function() {
            self.searchTermsTop3 = self.calculateAllData();
            self.isLoading = false;
        });
    },
    methods: {
        refresh: function(force) {
            var self = this;
            if (force) {
                self.isLoading = true;
            }
            countlySources.initializeKeywords().then(function() {
                self.searchTermsTop3 = self.calculateAllData();
                self.isLoading = false;
            });
        },
        calculateAllData: function() {
            var data = countlySources.getKeywords();
            var totalsArray = [];
            var sum = 0;
            for (var i = 0; data.length > i; i++) {
                totalsArray.push([i, data[i].t]);
                sum += data[i].t;
            }
            totalsArray.sort(function(a, b) {
                return a[1] - b[1];
            }).reverse();

            var totalsData = [];
            for (var z = 0; z < 3; z++) {
                if (totalsArray[z]) {
                    totalsData.push({percentage: Math.round((data[totalsArray[z][0]].t / sum) * 100), label: data[totalsArray[z][0]]._id, value: countlyCommon.getShortNumber(totalsArray[z][1] || 0)});
                }
                else {
                    totalsData.push({ percentage: 0, label: this.i18n('common.table.no-data'), value: 0 });
                }
            }
            return totalsData;
        }
    }
};
</script>
