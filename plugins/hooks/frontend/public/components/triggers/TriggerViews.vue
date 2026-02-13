<template>
    <div>
        <cly-form-field name="trigger" :label="i18n('hooks.trigger-via')" rules="required">
            <el-select v-model="value.type" class="bu-mt-1">
                <el-option v-for="item in triggersOption" :key="item.value" :value="item.value" :label="item.label">
                </el-option>
            </el-select>
        </cly-form-field>

        <div class="bu-mt-2">
            <component
                :is="value.type"
                v-model="value.configuration"
                :hookData="$attrs.hookData"
                :app="$attrs.hookData.apps[0]"
            />
        </div>
    </div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import jQuery from 'jquery';
import APIEndPointTrigger from './APIEndPointTrigger.vue';
import IncomingDataTrigger from './IncomingDataTrigger.vue';
import InternalEventTrigger from './InternalEventTrigger.vue';
import ScheduledTrigger from './ScheduledTrigger.vue';
import ClyFormField from '../../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';

var TriggerFactory = {
    options: [
        {label: jQuery.i18n.map["hooks.trigger-api-endpoint-uri"], value: 'APIEndPointTrigger'},
        {label: jQuery.i18n.map["hooks.IncomingData"], value: 'IncomingDataTrigger'},
        {label: jQuery.i18n.map["hooks.internal-event-selector-title"], value: 'InternalEventTrigger'},
        {label: jQuery.i18n.map["hooks.ScheduledTrigger"], value: 'ScheduledTrigger'},
    ]
};

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            triggersOption: TriggerFactory.options,
        };
    },
    computed: {
        triggerType: function() {
            return this.value.type;
        }
    },
    props: {
        value: {
            type: Object
        },
    },
    watch: {
        triggerType: function(newValue, oldValue) {
            if (!oldValue && this.value.configuration) { // edit record
                return;
            }
            switch (newValue) {
            case 'APIEndPointTrigger':
                var uri = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function(c) {
                    return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
                });
                this.value.configuration = {path: uri, method: 'get'};
                break;
            case 'IncomingDataTrigger':
                this.value.configuration = {event: [null], filter: null};
                break;
            case 'InternalEventTrigger':
                this.value.configuration = {eventType: null, cohortID: null, hookID: null, alertID: null};
                break;
            case 'ScheduledTrigger':
                this.value.configuration = {period1: 'month', cron: null};
                break;
            }
        },
    },
    components: {
        APIEndPointTrigger: APIEndPointTrigger,
        IncomingDataTrigger: IncomingDataTrigger,
        InternalEventTrigger: InternalEventTrigger,
        ScheduledTrigger: ScheduledTrigger,
        ClyFormField,
    },
    methods: {
    }
};
</script>
