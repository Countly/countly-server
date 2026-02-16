<template>
    <div v-if="change">
        <p>{{ i18n('systemlogs.changed-data') }}</p>
        <table style="width:100%">
            <thead>
                <tr>
                    <th class="bu-px-5">{{ i18n('systemlogs.field') }}</th>
                    <th class="bu-pl-5">{{ i18n('systemlogs.before') }}</th>
                    <th>{{ i18n('systemlogs.after') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="(item, index) in row.i.before"
                    :key="index"
                >
                    <td class="bu-px-5">{{ index }}</td>
                    <td class="bu-px-5">{{ row.i.before[index] }}</td>
                    <td>{{ row.i.after[index] }}</td>
                </tr>
            </tbody>
        </table>
    </div>
    <div v-else>
        <p>{{ i18n('systemlogs.has-data') }}</p>
        <table style="width:100%">
            <thead>
                <tr>
                    <th>{{ i18n('systemlogs.field') }}</th>
                    <th>{{ i18n('systemlogs.value') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="(item, index) in row.i"
                    :key="index"
                >
                    <td>{{ index }}</td>
                    <td>{{ item }}</td>
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
        row: {
            type: Object,
            default: function() {
                return {};
            }
        }
    },
    computed: {
        change: function() {
            if (typeof this.row.i !== "undefined" && typeof this.row.i.before !== "undefined" && typeof this.row.i.after !== "undefined") {
                return true;
            }
            return false;
        }
    }
};
</script>
