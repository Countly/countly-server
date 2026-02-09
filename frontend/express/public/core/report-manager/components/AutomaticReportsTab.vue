<template>
    <cly-main>
        <div class="bu-pb-4 text-medium" data-test-id="automatically-table-remind-label">
            {{ i18n('taskmanager.automatically-table-remind') }}
        </div>
        <cly-report-manager-table test-id="datatable-report-manager-automatically-created" report-type="auto"></cly-report-manager-table>
    </cly-main>
</template>

<script>
import { i18nMixin } from '../../../javascripts/countly/vue/core.js';
import ClyReportManagerTable from './ClyReportManagerTable.vue';

export default {
    components: {
        ClyReportManagerTable
    },
    mixins: [i18nMixin]
};
</script>
