<template>
    <el-time-picker
        :append-to-body="appendToBody"
        :clearable="clearable"
        :format="format"
        :picker-options="pickerOptions"
        :style="{'width': width + 'px'}"
        class="cly-vue-time-picker"
        v-bind="$attrs"
        v-on="$listeners"
    >
    </el-time-picker>
</template>

<script>
import moment from 'moment';

export default {
    props: {
        width: {
            type: Number,
            default: 100,
            required: false
        },
        format: {
            type: String,
            default: 'HH:mm',
            required: false
        },
        clearable: {
            type: Boolean,
            default: false,
            required: false
        },
        appendToBody: {
            type: Boolean,
            default: true,
            required: false
        },
        minDateValue: {
            type: Date
        },
        isFuture: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        pickerOptions() {
            const defaultRange = { selectableRange: '00:00:00 - 23:59:00' };

            if (!this.minDateValue) {
                return defaultRange;
            }

            const now = moment();
            const minDateMoment = moment(this.minDateValue);
            const isToday = minDateMoment.isSame(now, 'day');

            if (this.isFuture && isToday) {
                return {
                    selectableRange: `${now.format('HH:mm:ss')} - 23:59:00`
                };
            }

            return defaultRange;
        }
    }
};
</script>
