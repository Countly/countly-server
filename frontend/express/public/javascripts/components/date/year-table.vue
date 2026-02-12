<template>
    <div class="cly-vue-daterp__date-table-wrapper" :class="dateMeta.anchorClass">
        <span class="text-medium">{{ dateMeta.title }}</span>
        <extended-year-table v-if="visible" v-bind="$attrs" v-on="$listeners" :min-date="minDate" :max-date="maxDate"></extended-year-table>
        <div v-if="!visible" style="height:180px"></div>
    </div>
</template>

<script>
import moment from 'moment';
import { AbstractTableMixin } from './mixins.js';
import { YearTable } from 'element-ui/src/index.js';

const ExtendedYearTable = {
    extends: YearTable,
    props: {
        minDate: Date,
        maxDate: Date
    },
    methods: {
        getCellStyle(year) {
            const style = YearTable.methods.getCellStyle.call(this, year);
            const extendedStyle = Object.assign({}, style);
            const minDateYear = moment(this.minDate).year();
            const maxDateYear = moment(this.maxDate).year();
            extendedStyle["start-date"] = year === minDateYear;
            extendedStyle["end-date"] = year === maxDateYear;
            extendedStyle["in-range"] = year >= minDateYear && year <= maxDateYear;
            return extendedStyle;
        }
    }
};

export default {
    mixins: [AbstractTableMixin],
    props: {
        minDate: Date,
        maxDate: Date
    },
    components: {
        'extended-year-table': ExtendedYearTable
    }
};
</script>
