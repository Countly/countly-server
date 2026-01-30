<template>
    <div>
        <template v-if="enableGuides">
            <view-guide :test-id="testId" :tooltip="tooltip"></view-guide>
        </template>
        <template v-else-if="tooltip && tooltip.description">
            <cly-tooltip-icon
                :tooltip="tooltip.description"
                icon="ion ion-help-circled"
                style="margin-left:8px"
                :placement="tooltip.placement"
            ></cly-tooltip-icon>
        </template>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../../mixins/base.js';
import { isPluginEnabled } from '../../countly/countly.helpers.js';
import countlyCMS from '../../countly/countly.cms.js';

export default {
    mixins: [BaseComponentMixin],
    props: {
        tooltip: {
            type: Object,
            default: function() {
                return {
                    description: "",
                    placement: "bottom-end"
                };
            }
        },
        testId: {
            type: String,
            default: "cly-guide-test-id"
        }
    },
    data: function() {
        return {
            enableGuides: isPluginEnabled('guides')
        };
    },
    created: function() {
        var self = this;
        if (this.enableGuides) {
            countlyCMS.fetchEntry("server-guide-config").then(function(config) {
                self.enableGuides = (config && config.data && config.data[0] && config.data[0].enableGuides) || false;
            });
        }
    }
};
</script>
