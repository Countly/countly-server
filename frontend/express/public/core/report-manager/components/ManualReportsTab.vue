<template>
    <cly-main>
        <div class="bu-pb-4 text-medium" data-test-id="manually-table-remind-label">
            {{ i18n('taskmanager.manually-table-remind') }}
        </div>
        <cly-report-manager-table test-id="datatable-report-manager-manually-created" report-type="manual"></cly-report-manager-table>
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
