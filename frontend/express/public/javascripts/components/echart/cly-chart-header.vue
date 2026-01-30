<template>
    <div class="bu-level">
        <div class="bu-level-left">
            <div class="bu-level-item" v-if="showToggle && !isZoom">
                <cly-chart-toggle :test-id="testId" :chart-type="chartType" @series-toggle="onSeriesChange" v-on="$listeners"></cly-chart-toggle>
            </div>
            <slot v-if="!isZoom" name="chart-left" v-bind:echart="echartRef"></slot>
            <slot name="chart-header-left-input"></slot>
        </div>
        <div class="bu-level-right bu-mt-1">
            <slot v-if="!isZoom" name="chart-right" v-bind:echart="echartRef"></slot>
            <div class="bu-level-item" v-if="(selectedChartType === 'line') && (!hideNotation && !isZoom)">
                <cly-annotation-management :category="category" @refresh="refresh"></cly-annotation-management>
            </div>
            <cly-more-options :test-id="testId + '-cly-chart-more-dropdown'" v-if="!isZoom && (showDownload || showZoom)" class="bu-level-item" size="small" @command="handleCommand($event)">
                <el-dropdown-item :data-test-id="testId + '-download-button'" v-if="showDownload" command="download"><i class="cly-icon-btn cly-icon-download bu-mr-3"></i>Download</el-dropdown-item>
                <el-dropdown-item :data-test-id="testId + '-more-zoom-button'" v-if="showZoom" command="zoom"><i class="cly-icon-btn cly-icon-zoom bu-mr-3"></i>Zoom In</el-dropdown-item>
            </cly-more-options>
            <cly-chart-zoom @zoom-reset="onZoomReset" :is-zoom="isZoom" @zoom-triggered="onZoomTrigger" ref="zoom" v-if="showZoom" :echartRef="echartRef" class="bu-level-item"></cly-chart-zoom>
        </div>
    </div>
</template>

<script>
import { EchartRefMixin } from './mixins.js';
import ClyChartZoom from './cly-chart-zoom.vue';
import ClyChartToggle from './cly-chart-toggle.vue';
import ClyAnnotationManagement from './cly-annotation-management.vue';

export default {
    mixins: [EchartRefMixin],
    components: {
        "cly-chart-zoom": ClyChartZoom,
        "cly-chart-toggle": ClyChartToggle,
        "cly-annotation-management": ClyAnnotationManagement
    },
    props: {
        showZoom: {
            type: Boolean,
            default: false
        },
        showToggle: {
            type: Boolean,
            default: false
        },
        showDownload: {
            type: Boolean,
            default: false
        },
        chartType: {
            type: String,
            default: 'line'
        },
        category: {
            type: String,
            default: '',
            required: false
        },
        hideNotation: {
            type: Boolean,
            default: false,
            required: false
        },
        testId: {
            type: String,
            default: 'cly-chart-header-test-id',
        }
    },
    data: function() {
        return {
            isZoom: false,
            selectedChartType: ''
        };
    },
    methods: {
        downloadImage: function() {
            if (!this.echartRef) {
                this.echartRef = this.$parent.$refs.echarts;
            }
            var chartOptions = this.echartRef.getOption();

            var aTag = document.createElement('a');
            aTag.setAttribute("download", "image.png");
            aTag.setAttribute("href", this.echartRef.getDataURL({
                type: 'png',
                pixelRatio: 2,
                backgroundColor: chartOptions.backgroundColor || "#fff"
            }));

            var evt = new MouseEvent('click', {
                bubbles: true,
                cancelable: false
            });

            aTag.dispatchEvent(evt);
        },
        onZoomTrigger: function() {
            this.isZoom = true;
        },
        onZoomReset: function() {
            this.isZoom = false;
        },
        onSeriesChange: function(v) {
            this.selectedChartType = v;
        },
        handleCommand: function(command) {
            switch (command) {
            case "download":
                this.downloadImage();
                break;
            case "zoom":
                this.isZoom = true;
                break;
            default:
                break;
            }
        },
        refresh: function() {
            this.$emit("graph-notes-refresh");
        },
        notesVisibility: function() {
            this.$emit("notes-visibility");
        }
    },
    created: function() {
        if (!this.selectedChartType) {
            this.selectedChartType = this.chartType;
        }
        if (window.location.href.split('/').indexOf('custom') > -1) {
            this.selectedChartType = "dashboard";
        }
    }
};
</script>
