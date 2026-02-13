<template>
    <div>
        <cly-datatable-n :rows="ratings" :force-loading="isLoading">
            <el-table-column prop="widget" column-key="widget_id" :label="i18n('feedback.widget-id')">
                <template v-slot="rowScope">
                    <div class="text-medium">
                        {{ rowScope.row.widget_id }}
                    </div>
                </template>
            </el-table-column>
            <el-table-column prop="rating" :label="i18n('feedback.rating')">
                <template v-slot="rowScope">
                    <span class="text-medium">
                        {{ rowScope.row.rating }}
                    </span>
                </template>
            </el-table-column>
            <el-table-column prop="time" column-key="ts" :label="i18n('feedback.time')">
                <template v-slot="rowScope">
                    <span class="text-medium">{{unescapeHtml(rowScope.row.ts)}}</span>
                </template>
            </el-table-column>
        </cly-datatable-n>
    </div>
</template>

<script>
import countlyVue from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';

export default {
    components: {
        ClyDatatableN
    },
    mixins: [countlyVue.mixins.i18n, countlyVue.mixins.commonFormatters],
    props: {
        ratings: {
            type: Array,
            default: function() {
                return [
                    { widget: '1', rating: 1, time: 1 },
                    { widget: '2', rating: 2, time: 2 },
                    { widget: '3', rating: 3, time: 3 },
                    { widget: '4', rating: 4, time: 4 },
                    { widget: '5', rating: 5, time: 5 }
                ];
            }
        },
        isLoading: {
            type: Boolean,
            default: false,
            required: false
        }
    }
};
</script>
