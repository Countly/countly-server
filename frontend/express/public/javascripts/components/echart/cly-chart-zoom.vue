<template>
    <div>
        <div v-if="zoomInfo && zoomStatus === 'triggered'" class="bu-mr-3 color-cool-gray-50 text-smallish">
            {{$i18n('common.zoom-info')}}
        </div>
        <el-button class="chart-zoom-button" @click="onZoomCancel" v-if="zoomStatus === 'triggered'" size="small">
            {{$i18n('common.cancel-zoom')}}
        </el-button>
        <el-button class="chart-zoom-button" @click="onZoomReset" v-if="zoomStatus === 'done'" size="small">
            {{$i18n('common.zoom-reset')}}
        </el-button>
    </div>
</template>

<script>
export default {
    props: {
        echartRef: {
            type: Object
        },
        zoomInfo: {
            type: Boolean,
            default: true
        },
        isZoom: {
            type: Boolean,
            default: false
        }
    },
    data: function() {
        return {
            zoomStatus: "reset"
        };
    },
    watch: {
        isZoom: function(newVal) {
            if (newVal) {
                this.onZoomTrigger();
            }
        }
    },
    methods: {
        onZoomTrigger: function(e) {
            if (this.echartRef) {
                this.echartRef.setOption({tooltip: {show: false}}, {notMerge: false});

                this.echartRef.dispatchAction({
                    type: "takeGlobalCursor",
                    key: 'dataZoomSelect',
                    dataZoomSelectActive: true
                });
            }

            this.zoomStatus = "triggered";
            if (e) {
                this.$emit("zoom-triggered", e);
            }
        },
        onZoomReset: function() {
            if (this.echartRef) {
                this.echartRef.setOption({tooltip: {show: true}}, {notMerge: false});

                this.echartRef.dispatchAction({
                    type: "restore",
                });
            }

            this.zoomStatus = "reset";
            this.$emit("zoom-reset");
        },
        onZoomCancel: function() {
            if (this.echartRef) {
                this.echartRef.setOption({tooltip: {show: true}}, {notMerge: false});

                this.echartRef.dispatchAction({
                    type: "takeGlobalCursor",
                    key: 'dataZoomSelect',
                    dataZoomSelectActive: false
                });
            }

            this.zoomStatus = "reset";
            this.$emit("zoom-reset");
        },
        onZoomFinished: function() {
            if (this.echartRef) {
                this.echartRef.setOption({tooltip: {show: true}}, {notMerge: false});

                this.echartRef.dispatchAction({
                    type: "takeGlobalCursor",
                    key: 'dataZoomSelect',
                    dataZoomSelectActive: false
                });
            }

            this.zoomStatus = "done";
        },
        patchZoom: function() {
            if (this.zoomStatus === "triggered") {
                this.onZoomTrigger(false);
            }
        }
    }
};
</script>
