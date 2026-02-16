<template>
    <div>
        <clyd-sourceapps v-model="scope.editedObject.apps" />
        <clyd-datatype
            v-model="scope.editedObject.data_type"
            :enabledTypes="['event','session']"
            :extra-types="[{value: 'event', label: i18n('times-of-day.event')}]"
        />
        <template v-if="scope.editedObject.data_type === 'event'">
            <cly-form-field
                name="selectedEvent"
                rules="required"
                :label="i18n('times-of-day.event')"
            >
                <cly-select-x
                    :auto-commit="true"
                    :hide-all-options-tab="true"
                    :options="eventOptions"
                    v-model="scope.editedObject.events"
                />
            </cly-form-field>
        </template>
        <cly-form-field
            name="timePeriod"
            rules="required"
            :label="i18n('times-of-day.time-period')"
        >
            <el-select v-model="scope.editedObject.period">
                <el-option
                    v-for="item in dateBuckets"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                />
            </el-select>
        </cly-form-field>
        <cly-form-field-group :label="i18n('dashboards.additional-settings')">
            <clyd-title v-model="scope.editedObject.title" />
        </cly-form-field-group>
    </div>
</template>
<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { service } from '../store/index.js';

export default {
    mixins: [i18nMixin],
    props: {
        scope: {
            type: Object,
            default: function() {
                return {};
            }
        }
    },
    data: function() {
        return {
            dateBuckets: service.getDateBucketsList(),
            eventOptions: service.getEventOptions(),
        };
    }
};
</script>
