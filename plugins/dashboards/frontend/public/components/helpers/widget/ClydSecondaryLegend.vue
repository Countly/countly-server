<template>
<div
    class="bu-is-flex bu-is-flex-wrap-wrap"
    @mousedown.stop
>
    <div
        v-for="(item, idx) in allApps"
        class="clyd-legend-app bu-is-flex bu-mt-2 bu-is-flex-shrink-1"
        :key="item.id"
        :style="appBlockStyles(allApps, idx)"
    >
        <div
            v-if="item.labels && item.labels.length"
            class="bu-is-flex bu-is-align-items-center bu-is-flex-shrink-1 bu-is-flex-grow-1"
            style="min-width: 0"
        >
            <div
                v-for="(label, i) in item.labels"
                :class="['bu-is-flex bu-is-align-items-center bu-is-flex-shrink-1 bu-px-2 bu-mr-1']"
                :style="{
                    backgroundColor: label.color + '26',
                    borderRadius: '4px',
                    minWidth: 0
                }"
            >
                <i
                    class="fas fa-circle bu-mr-2"
                    :style="{
                        fontSize: '6px',
                        color: label.color
                    }"
                />
                <span
                    class="text-small has-ellipsis bu-is-flex-shrink-1"
                    :data-test-id="'widget-label-' + i"
                >{{ unescapeHtml(label.label) }}</span>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import { mixins } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { commonFormattersMixin } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [mixins.customDashboards.apps, commonFormattersMixin],
    props: {
        apps: {
            type: Array,
            default: function() {
                return [];
            },
            required: true
        },
        labels: {
            type: Object,
            default: function() {
                return {};
            },
        }
    },
    computed: {
        allApps: function() {
            var appData = [];
            var labels = this.labels;

            for (var i = 0; i < this.apps.length; i++) {
                var appId = this.apps[i];
                appData.push({
                    id: appId,
                    labels: labels[appId] || []
                });
            }

            return appData;
        }
    },
    methods: {
        appBlockStyles: function(allApps, index) {
            var maxWidth = '50%';
            var paddingRight = '0';

            var rem = allApps.length % 2;

            if (rem !== 0) {
                if ((index + 1) === (allApps.length)) {
                    maxWidth = '100%';
                    paddingRight = '0';
                }
            }

            var styles = {
                minWidth: 0,
                boxSizing: 'border-box',
                maxWidth: maxWidth,
                paddingRight: paddingRight
            };

            return styles;
        }
    }
};
</script>
