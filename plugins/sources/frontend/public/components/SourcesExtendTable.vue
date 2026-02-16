<template>
    <div>
        <table class="stats-table">
            <thead>
                <tr>
                    <th>{{ i18n('sources.source') }}</th>
                    <th>{{ i18n('common.table.total-sessions') }}</th>
                    <th>{{ i18n('common.table.total-users') }}</th>
                    <th>{{ i18n('common.new-users') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="(row, index) in rowsComputed"
                    :key="row"
                >
                    <td>{{ rows[rowsComputed[index]].sources }}</td>
                    <td>{{ rows[rowsComputed[index]].t }}</td>
                    <td>{{ rows[rowsComputed[index]].u }}</td>
                    <td>{{ rows[rowsComputed[index]].n }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    props: {
        rows: {
            type: Object,
            default: function() {
                return {};
            }
        }
    },
    computed: {
        rowsComputed: function() {
            var computedArray = [];
            for (var el in this.rows) {
                computedArray.push(el);
            }
            return computedArray;
        }
    }
};
</script>
