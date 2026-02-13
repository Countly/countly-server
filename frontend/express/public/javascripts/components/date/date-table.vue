<template>
    <div class="cly-vue-daterp__date-table-wrapper" :class="dateMeta.anchorClass">
        <span class="text-medium">{{ dateMeta.title }}</span>
        <el-date-table v-if="visible" v-bind="$attrs" v-on="$listeners"></el-date-table>
        <div v-if="!visible" style="height:180px"></div>
    </div>
</template>

<script>
import { AbstractTableMixin } from './mixins.js';
import ElementUI from 'element-ui/src/index.js';
var DateTable = ElementUI.DateTable;

export default {
    mixins: [AbstractTableMixin],
    components: {
        'el-date-table': DateTable
    }
};
</script>
