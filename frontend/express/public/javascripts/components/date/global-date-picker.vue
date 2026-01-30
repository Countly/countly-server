<template>
    <cly-date-picker
        is-global-date-picker
        v-bind="$attrs"
        timestampFormat="ms"
        :disabled-shortcuts="['0days']"
        modelMode="absolute"
        v-model="globalDate"
        @change="onChange"
    ></cly-date-picker>
</template>

<script>
import countlyCommon from '../../countly/countly.common.js';

export default {
    computed: {
        globalDate: {
            get: function() {
                return this.$store.getters["countlyCommon/period"];
            },
            set: function(newVal) {
                countlyCommon.setPeriod(newVal);
            }
        }
    },
    methods: {
        onChange: function() {
            this.$root.$emit("cly-date-change");
        }
    }
};
</script>
