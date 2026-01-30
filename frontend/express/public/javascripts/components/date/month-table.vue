<template>
    <div class="cly-vue-daterp__date-table-wrapper" :class="dateMeta.anchorClass">
        <span class="text-medium">{{ dateMeta.title }}</span>
        <el-month-table v-if="visible" v-bind="$attrs" v-on="$listeners"></el-month-table>
        <div v-if="!visible" style="height:180px"></div>
    </div>
</template>

<script>
import { AbstractTableMixin } from './mixins.js';

export default {
    mixins: [AbstractTableMixin],
    components: {
        'el-month-table': window.ELEMENT.MonthTable // TO-DO: window reference will be removed and it will be imported after vue 3 migration
    }
};
</script>
