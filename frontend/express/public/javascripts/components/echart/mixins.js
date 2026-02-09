import { mergeWith as _mergeWith } from 'lodash';
import { countlyCommon } from '../../countly/countly.common.js';
import moment from 'moment';

// TO-DO: window.hideGraphTooltip dependency will be imported

const FONT_FAMILY = "Inter";

export const EchartRefMixin = {
    data: function() {
        return {
            echartRef: null
        };
    },
    mounted: function() {
        this.echartRef = this.$parent.$refs.echarts;
    }
};

export const LegendMixin = {
    data: function() {
        return {
            calculatedLegend: {
                show: true,
                type: "secondary",
                data: [],
                position: "bottom"
            }
        };
    },
    computed: {
        legendOptions: function() {
            var options = _mergeWith({}, this.calculatedLegend, this.legend || {});

            delete options.data;

            if (this.legend && this.legend.data && this.legend.data.length) {
                options.data = JSON.parse(JSON.stringify(this.legend.data));
            }
            else {
                options.data = JSON.parse(JSON.stringify(this.calculatedLegend.data));
            }

            var self = this;
            options.data.forEach(function(currLegend) {
                var legend = self.calculatedLegend.data.find(function(l) {
                    return l.name === currLegend.name;
                });

                if (legend) {
                    currLegend.color = legend.color;
                    currLegend.displayColor = legend.color;
                }
            });
            return options;
        }
    },
    methods: {
        setCalculatedLegendData: function(opt, series) {
            var data = [];
            var colorIndex = 0;
            var obj = {}, color;
            var colors = opt.color;

            for (var i = 0; i < series.length; i++) {
                var seriesData = series[i];
                var dataSum = 0;

                if (seriesData.type === "pie") {
                    seriesData = seriesData.data;

                    dataSum = seriesData.reduce(function(acc, val) {
                        acc += val.value;
                        return acc;
                    }, 0);

                    for (var j = 0; j < seriesData.length; j++) {
                        color = seriesData[j].color;

                        if (!color) {
                            color = colors[colorIndex];
                            colorIndex++;
                        }

                        obj = {
                            name: seriesData[j].name,
                            color: color,
                            percentage: ((seriesData[j].value / dataSum) * 100).toFixed(1)
                        };

                        data.push(obj);
                    }
                }
                else {
                    color = seriesData.color;

                    if (!color) {
                        color = colors[colorIndex];
                        colorIndex++;
                    }

                    obj = {
                        name: seriesData.name,
                        color: color
                    };

                    data.push(obj);
                }
            }

            this.calculatedLegend.data = data;
            opt.legend.show = false;

            return data;
        },
        patchLegend: function(chartOpt) {
            var echartRef = this.$refs.echarts;
            var legend = this.$refs.legend;

            if (echartRef && legend) {
                var oldChartOpt = echartRef.getOption();

                if (oldChartOpt && Array.isArray(oldChartOpt.legend)) {
                    var oldSelected = oldChartOpt.legend.find(function(item) {
                        return item.id === "__chartLegend";
                    });

                    if (oldSelected && oldSelected.selected) {
                        var legendOptions = this.legendOptions;
                        for (var i = 0; i < legendOptions.data.length; i++) {
                            var leg = legendOptions.data[i];
                            if (oldSelected.selected[leg.name] === false) {
                                chartOpt.legend.selected[leg.name] = false;
                            }
                        }
                    }
                }
            }

            return chartOpt;
        }
    }
};

export const ZoomMixin = {
    methods: {
        onDataZoom: function(event) {
            if (this.$refs.header && this.$refs.header.$refs.zoom) {
                this.$refs.header.$refs.zoom.onZoomFinished(event);
            }

            this.$emit("datazoom", event);
        },
        patchZoom: function(chartOpt) {
            var echartRef = this.$refs.echarts;
            var header = this.$refs.header;

            if (echartRef && header) {
                var oldChartOpt = echartRef.getOption();
                if (oldChartOpt && Array.isArray(oldChartOpt.dataZoom)) {
                    var dataZoom = oldChartOpt.dataZoom[0];

                    if (dataZoom && header.isZoom) {
                        chartOpt.dataZoom[0].start = dataZoom.start;
                        chartOpt.dataZoom[0].end = dataZoom.end;

                        var self = this;
                        this.$nextTick(function() {
                            self.$nextTick(function() {
                                if (header.$refs.zoom) {
                                    header.$refs.zoom.patchZoom(false);
                                }
                                self.$emit("patchzoom");
                            });
                        });
                    }
                }
            }
            return chartOpt;
        }
    }
};

export const ExternalZoomMixin = {
    data: function() {
        return {
            showZoom: false,
        };
    },
    methods: {
        triggerZoom: function() {
            var self = this;
            this.showZoom = true;
            setTimeout(function() {
                self.$nextTick(function() {
                    self.$nextTick(function() {
                        if (self.$refs.zoomRef) {
                            self.onTriggerZoom();
                        }
                        else {
                            var interval = setInterval(function() {
                                if (self.$refs.zoomRef) {
                                    self.onTriggerZoom();
                                    clearInterval(interval);
                                }
                            }, 50);
                        }
                    });
                });
            }, 0);
        },
        onTriggerZoom: function() {
            this.$refs.zoomRef.onZoomTrigger();
            if (this.$refs.echartRef && this.$refs.echartRef.$refs.header) {
                this.$refs.echartRef.$refs.header.isZoom = true;
            }
        },
        onZoomReset: function() {
            if (this.$refs.echartRef && this.$refs.echartRef.$refs.header) {
                this.$refs.echartRef.$refs.header.isZoom = false;
            }
            this.showZoom = false;
        },
        onDataZoom: function() {
            this.$refs.zoomRef.onZoomFinished();
        },
        onPatchZoom: function() {
            this.$refs.zoomRef.patchZoom();
        },
        onWidgetCommand: function(event) {
            if (event === 'zoom') {
                this.triggerZoom();
                return;
            }
            return this.$emit('command', event);
        }
    }
};

export const UpdateOptionsMixin = {
    data: function() {
        return {
            internalUpdateOptions: {
                notMerge: true
            }
        };
    },
    computed: {
        echartUpdateOptions: function() {
            setTimeout(() => {
                if (this.seriesType === 'line') {
                    this.getGraphNotes();
                }
            }, 0);
            return _mergeWith({}, this.internalUpdateOptions, this.updateOptions || {});
        }
    }
};

export const EventsMixin = {
    methods: {
        onSeriesChange: function(v) {
            this.seriesOptions.type = v;
            this.$emit("series-toggle", v);
            if (v === "bar") {
                this.seriesOptions.markPoint.data = [];
            }
            if (v === "line") {
                this.getGraphNotes();
            }
        }
    }
};

/**
 * getWidthOfText - Utility function to measure text width
 * @param {string} txt - The text to measure
 * @param {string} fontname - The font family name
 * @param {string} fontsize - The font size (e.g., "12px")
 * @returns {number} - The width of the text in pixels
 */
export function getWidthOfText(txt, fontname, fontsize) {
    if (getWidthOfText.c === undefined) {
        getWidthOfText.c = document.createElement('canvas');
        getWidthOfText.ctx = getWidthOfText.c.getContext('2d');
    }
    var fontspec = fontsize + ' ' + fontname;
    if (getWidthOfText.ctx.font !== fontspec) {
        getWidthOfText.ctx.font = fontspec;
    }
    return getWidthOfText.ctx.measureText(txt).width;
}

export const xAxisOverflowHandler = {
    data: function() {
        return {
            chartWidth: 0,
            chartHeight: 0
        };
    },
    props: {
        xAxisLabelOverflow: {
            type: String,
            default: 'auto',
            required: false
        }
    },
    methods: {
        patchOptionsForXAxis: function(opt) {
            var xAxisOverflowPatch = this.handleXAxisOverflow(opt, this.xAxisLabelOverflow, {
                w: this.chartWidth,
                h: this.chartHeight
            });
            if (xAxisOverflowPatch) {
                opt = _mergeWith(opt, xAxisOverflowPatch);
            }
            return opt;
        },
        onChartFinished: function() {
            var ref = this.$refs.echarts;
            this.chartWidth = ref.getWidth();
            this.chartHeight = ref.getHeight();
        },
        handleXAxisOverflow: function(options, strategy, size) {
            if (strategy === "unset" || !options || !options.xAxis || !options.xAxis.data) {
                return null;
            }
            var xAxis = options.xAxis;
            var labelW = Math.floor((size.w - 100) / (xAxis.data.length + 1));
            var maxLen = 0;
            var maxStr = "";

            if (xAxis.data.length) {
                xAxis.data = xAxis.data.map(function(item) {
                    return countlyCommon.unescapeHtml(item);
                });
            }
            xAxis.data.forEach(function(item) {
                var str = "";
                if (Array.isArray(item)) {
                    str = (item[1] || item[0] || "") + "";
                }
                else {
                    str = (item || "") + "";
                }

                if (str.length > maxLen) {
                    maxStr = str;
                }

                maxLen = Math.max(maxLen, str.length);
            });

            var longestLabelTextW = getWidthOfText(maxStr, FONT_FAMILY, "12px");
            var returnObj = {
                xAxis: {
                    axisLabel: {
                        fontSize: 12,
                        interval: 0,
                        width: labelW,
                        rotate: 0,
                        overflow: "truncate",
                    }
                }
            };
            if (longestLabelTextW > labelW) {
                returnObj.xAxis.axisLabel.margin = -5;
                returnObj.xAxis.axisLabel.overflow = "break";
                returnObj.grid = {bottom: 40};

                returnObj.xAxis.axisLabel.formatter = function(value) {
                    value = countlyCommon.encodeHtml(value);
                    var ellipsis = "...";
                    var lengthToTruncate = (Math.floor(maxLen / Math.ceil(longestLabelTextW / labelW)) * 2);
                    if (value.length > lengthToTruncate) {
                        return value.substr(0, lengthToTruncate - ellipsis.length) + ellipsis;
                    }
                    else {
                        return value;
                    }
                };
            }
            return returnObj;
        }
    }
};

export const GraphNotesMixin = {
    data: function() {
        return {
            notes: [],
            mergedNotes: [],
        };
    },
    computed: {
        areNotesHidden: function() {
            return this.$store.getters['countlyCommon/getAreNotesHidden'];
        }
    },
    methods: {
        dateChanged: function() {
            if (!this.areNotesHidden) {
                this.seriesOptions.markPoint.data = [];
                var self = this;
                setTimeout(() => {
                    self.getGraphNotes();
                }, 500);
            }
        },
        getDateFormat: function(date) {
            var dateFormats = {
                "yyyy-mm-d-hh-mm": "YYYY-MM-D HH:00",
                "yyyy-mm-d-h-mm": "YYYY-MM-D H:00",
                "d-mmm": "D MMM",
                "dd-mmm": "DD MMM",
                "d-mmm-yyyy": "D MMM YYYY",
                "yyyy-mm-d": "YYYY-MM-D",
                "yyyy-m-d": "YYYY-M-D",
                "yyyy-mm-dd": "YYYY-MM-DD",
                "yyyy-mm": "YYYY-MM",
                "yyyy-m": "YYYY-M",
                "mmm-yyyy": "MMM YYYY",
                "h-00": "H:00",
                "hh-00": "HH:00",
                "dd/mm/yyyy": "DD/MM/YY",
                "mmm": "MMM"
            };

            for (var prop in dateFormats) {
                if (moment(date, dateFormats[prop], true).isValid()) {
                    return dateFormats[prop];
                }
            }
            return null;
        },
        graphNotesTimeConverter: function(ts) {
            var graphNoteDate = new Date(ts);
            if (this.category === "drill" || this.category === "formulas") {
                if (this.notationSelectedBucket === "hourly") {
                    return countlyCommon.formatDate(moment(graphNoteDate), "D MMM YYYY hh:00") || 0;
                }
                else if (this.notationSelectedBucket === "daily") {
                    return countlyCommon.formatDate(moment(graphNoteDate), "D MMM YYYY") || 0;
                }
                else if (this.notationSelectedBucket === "weekly") {
                    return "W" + moment(graphNoteDate).isoWeek() + " " + moment(graphNoteDate).isoWeekYear();
                }
                else if (this.notationSelectedBucket === "monthly") {
                    return countlyCommon.formatDate(moment(graphNoteDate), "MMM YYYY");
                }
            }
            else if (this.category === "push-notification") {
                if (this.notationSelectedBucket === "weekly") {
                    return "W" + moment(graphNoteDate).isoWeek();
                }
                else if (this.notationSelectedBucket === "monthly") {
                    return countlyCommon.formatDate(moment(graphNoteDate), "YYYY MMM");
                }
            }
            else {
                var xAxisLabel = null;
                if (this.$refs.echarts && this.$refs.echarts.option && this.$refs.echarts.option.xAxis.data) {
                    xAxisLabel = this.$refs.echarts.option.xAxis.data[0];
                }
                else {
                    return null;
                }
                var formatType = this.getDateFormat(xAxisLabel);
                return countlyCommon.formatDate(moment(ts), formatType) || 0;
            }
        },
        mergeGraphNotesByDate: function(notes, mergeByWeek) {
            var self = this;
            const oneDay = 24 * 60 * 60 * 1000;
            var multiplierCount = 2;
            if (this.$refs.echarts && (this.$refs.echarts.getWidth() < 500 && this.$refs.echarts.getWidth() !== 100)) {
                multiplierCount = 8;
            }
            notes.forEach(function(orderedItem) {
                orderedItem.dateStr = self.graphNotesTimeConverter(orderedItem.ts);
                orderedItem.weekCount = moment(orderedItem.ts).year() - moment(orderedItem.ts).week();
            });

            if (mergeByWeek) {
                for (var k = 1; k < notes.length; k++) {
                    for (var m = 0; m < k; m++) {
                        if (notes[k].weekCount === notes[m].weekCount) {
                            notes[k].dateStr = notes[m].dateStr;
                        }
                    }
                }
            }

            notes.map(function(item) {
                item.times = notes.filter(obj => obj.dateStr === item.dateStr).length;
            });

            notes = notes.sort(function(a, b) {
                return new Date(b.ts) - new Date(a.ts);
            });
            for (var i = 0; i < notes.length - 1; i++) {
                if ((i !== notes.length - 1) && (Math.round(Math.abs((notes[i].ts - notes[i + 1].ts) / oneDay)) > 0 && Math.round(Math.abs((notes[i].ts - notes[i + 1].ts) / oneDay)) < multiplierCount)) {
                    notes[i].hasCloseDate = true;
                }
            }
            return notes;
        },
        graphNotesTooltipFormatter: function(arr, params) {
            var filteredNotes = arr.filter(x => x.dateStr === params.data.note.dateStr && x.times > 1);
            var minimizeTooltip = false;
            var template = "";
            var conditionalClassName = "graph-notes-tooltip";

            if ((this.$refs && this.$refs.echarts) && (this.$refs.echarts.getHeight() < 200 || this.$refs.echarts.getWidth() < 500)) {
                minimizeTooltip = true;
            }

            if (minimizeTooltip) {
                conditionalClassName = 'graph-notes-tooltip minimize';
            }
            else if (!minimizeTooltip && filteredNotes.length > 0) {
                conditionalClassName = 'graph-notes-tooltip bu-mb-4 bu-mx-2';
            }

            if (filteredNotes.length > 0) {
                for (var i = 0; i < filteredNotes.length; i++) {
                    if (i === 0) {
                        template = '<div class="graph-tooltip-wrapper bu-is-flex bu-is-justify-content-end">\
                                        <span onClick="window.hideGraphTooltip()">\
                                            <i class="el-icon-close"></i>\
                                        </span>\
                                    </div>\
                                    <div class="graph-tooltip-wrapper__container">';
                    }
                    template += '<div class="' + this.sanitizeHtml(conditionalClassName) + '">\
                                    <div class="bu-mb-1"><span class="text-small color-cool-gray-50">#' + this.sanitizeHtml(filteredNotes[i].indicator) + '</span></div>\
                                    <div class="bu-is-flex bu-is-justify-content-space-between graph-notes-tooltip__header">\
                                        <div class="bu-is-flex bu-is-flex-direction-column">\
                                            <div class="text-small input-owner">' + this.sanitizeHtml(filteredNotes[i].owner_name) + '</div>\
                                            <div class="text-small color-cool-gray-50 note-date">' + moment(filteredNotes[i].ts).format("MMM D, YYYY hh:mm A") + '</div>\
                                        </div>\
                                        <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-flex-end">\
                                            <span class="text-small color-cool-gray-50 bu-is-capitalized note-type">' + this.sanitizeHtml(filteredNotes[i].noteType) + '</span>\
                                        </div>\
                                    </div>\
                                    <div class="bu-mt-2 graph-notes-tooltip__body"><span class="text-small input-notes input-minimizer">' + this.sanitizeHtml(filteredNotes[i].note) + '</span></div>\
                                </div>';
                    if (i === filteredNotes.length) {
                        template = "</div>";
                    }
                }
            }
            else {
                template += '<div class="' + this.sanitizeHtml(conditionalClassName) + '">\
                                <div class="bu-is-flex bu-is-justify-content-space-between graph-notes-tooltip__header">\
                                    <div class="bu-is-flex bu-is-flex-direction-column name-wrapper">\
                                        <div class="text-medium input-owner">' + this.sanitizeHtml(params.data.note.owner_name) + '</div>\
                                        <div class="text-small color-cool-gray-50 note-date">' + moment(params.data.note.ts).format("MMM D, YYYY hh:mm A") + '</div>\
                                    </div>\
                                    <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-flex-end">\
                                        <span onClick="window.hideGraphTooltip()">\
                                            <i class="el-icon-close"></i>\
                                        </span>\
                                        <span class="text-small color-cool-gray-50 bu-is-capitalized note-type">' + this.sanitizeHtml(params.data.note.noteType) + '</span>\
                                    </div>\
                                </div>\
                                <div class="graph-notes-tooltip__body"><span class="text-medium input-notes">' + this.sanitizeHtml(params.data.note.note) + '</span></div>\
                            </div>';
            }
            return template;
        },
        weekCountToDate: function(year, week, day) {
            const firstDayOfYear = new Date(year, 0, 1);
            const days = 2 + day + (week - 1) * 7 - firstDayOfYear.getDay();
            return new Date(year, 0, days);
        },
        graphNotesFilterChecks: function() {
            var returnedObj = {};
            var filter = {};
            var appIds = [countlyCommon.ACTIVE_APP_ID];
            if (this.$parent && this.$parent.data) {
                if (this.$parent.data.apps) {
                    appIds = this.$parent.data.apps;
                }
                if (this.$parent.data.custom_period && this.$parent.data.custom_period.length) {
                    if (typeof this.$parent.data.custom_period === "string") {
                        var convertedTimeObj = countlyCommon.getPeriodObj(this.$parent.data.custom_period);
                        filter.customPeriod = [convertedTimeObj.start, convertedTimeObj.end];
                    }
                    else if (Array.isArray(this.$parent.data.custom_period)) {
                        filter.customPeriod = [this.$parent.data.custom_period[0], this.$parent.data.custom_period[1]];
                    }
                }
            }

            if ((this.category === "formulas" || this.category === "drill") && (this.$parent && this.$parent.data)) {
                var xAxisLabels = this.option.xAxis.data;
                var customPeriodStartDate;
                var customPeriodEndDate;
                if (this.$parent.data.bucket === "daily") {
                    customPeriodStartDate = new Date(xAxisLabels[0]).getTime();
                    customPeriodEndDate = new Date(xAxisLabels[xAxisLabels.length - 1]).setHours(23, 59);
                    filter.customPeriod = [customPeriodStartDate, customPeriodEndDate];
                }
                else if (this.$parent.data.bucket === "weekly") {
                    customPeriodStartDate = this.weekCountToDate(xAxisLabels[0].split(' ')[1], xAxisLabels[0].split(' ')[0].split('W')[1], 7);
                    customPeriodEndDate = this.weekCountToDate(xAxisLabels[xAxisLabels.length - 1].split(' ')[1], xAxisLabels[xAxisLabels.length - 1].split(' ')[0].split('W')[1], 7);
                    filter.customPeriod = [customPeriodStartDate.getTime(), customPeriodEndDate.getTime()];
                }
                else if (this.$parent.data.bucket === "monthly") {
                    customPeriodStartDate = new Date(xAxisLabels[0]).getTime();
                    customPeriodEndDate = new Date(xAxisLabels[xAxisLabels.length - 1]).getTime();
                    customPeriodEndDate = moment(customPeriodEndDate).endOf('month')._d.valueOf();
                    filter.customPeriod = [customPeriodStartDate, customPeriodEndDate];
                }
            }
            returnedObj.appIds = appIds;
            returnedObj.customPeriod = filter;
            return returnedObj;
        },
        getGraphNotes: function() {
            // This is a placeholder - actual implementation depends on countlyGraphNotesCommon
            // which should be available globally
            if (this.hideNotation || this.areNotesHidden) {
                this.seriesOptions.markPoint.data = [];
                return;
            }
            // The actual implementation requires countlyGraphNotesCommon
            // which is loaded via legacy scripts
        },
        onClick: function() {
            if (!document.querySelectorAll(".graph-overlay").length) {
                var overlay = document.createElement("div");
                overlay.setAttribute("class", "graph-overlay");
                overlay.setAttribute("style", "width: 100%; height: 100%; top: 0px; background-color: black; position: absolute; z-index: 999; opacity: 0; display: none;");
                var echarts = document.querySelectorAll('.echarts');
                for (var i = 0; i < echarts.length; i++) {
                    if (typeof echarts[i] !== 'undefined') {
                        echarts[i].appendChild(overlay.cloneNode(true));
                    }
                }
            }
            if (document.querySelectorAll(".graph-overlay")) {
                for (var j = 0; j < document.querySelectorAll(".graph-overlay").length; j++) {
                    document.querySelectorAll(".graph-overlay")[j].style.display = "block";
                }
            }
            if (document.querySelectorAll(".graph-notes-tooltip")) {
                for (var z = 0; z < document.querySelectorAll(".graph-notes-tooltip").length; z++) {
                    document.querySelectorAll(".graph-notes-tooltip")[z].parentNode.style.opacity = 1;
                }
            }

            if (document.querySelectorAll(".graph-tooltip-wrapper")) {
                for (var k = 0; k < document.querySelectorAll(".graph-tooltip-wrapper").length; k++) {
                    document.querySelectorAll(".graph-tooltip-wrapper")[k].parentNode.style.opacity = 1;
                }
            }

            if (document.querySelector('x-vue-echarts div .graph-notes-tooltip')) {
                localStorage.setItem('showTooltipFlag', true);
                document.querySelector('x-vue-echarts div .graph-notes-tooltip').parentNode.addEventListener('mouseleave', window.hideTooltip, true);
            }

            if (document.querySelector('x-vue-echarts div .graph-tooltip-wrapper')) {
                localStorage.setItem('showTooltipFlag', true);
                document.querySelector('x-vue-echarts div .graph-tooltip-wrapper').parentNode.addEventListener('mouseleave', window.hideTooltip, true);
            }
            countlyCommon.DISABLE_AUTO_REFRESH = true;
        }
    },
    watch: {
        notationSelectedBucket: function() {
            this.seriesOptions.markPoint.data = [];
            var self = this;
            setTimeout(() => {
                self.getGraphNotes();
            }, 0);
        },
        category: function() {
            this.getGraphNotes();
        },
        areNotesHidden: function() {
            this.getGraphNotes();
        }
    },
    created: function() {
        this.getGraphNotes();
    },
    mounted: function() {
        window.hideGraphTooltip = function() {
            if (typeof document.querySelectorAll(".graph-overlay") !== 'undefined') {
                for (var j = 0; j < document.querySelectorAll(".graph-overlay").length; j++) {
                    document.querySelectorAll(".graph-overlay")[j].style.display = "none";
                }
            }
            if (typeof document.querySelectorAll(".graph-notes-tooltip") !== 'undefined') {
                for (var z = 0; z < document.querySelectorAll(".graph-notes-tooltip").length; z++) {
                    document.querySelectorAll(".graph-notes-tooltip")[z].parentNode.style.opacity = 0;
                }
            }

            if (typeof document.querySelectorAll(".graph-tooltip-wrapper") !== 'undefined') {
                for (var k = 0; k < document.querySelectorAll(".graph-tooltip-wrapper").length; k++) {
                    document.querySelectorAll(".graph-tooltip-wrapper")[k].parentNode.style.opacity = 0;
                }
            }

            if (document.querySelector('x-vue-echarts div .graph-notes-tooltip')) {
                localStorage.removeItem('showTooltipFlag');
            }

            if (document.querySelector('x-vue-echarts div .graph-tooltip-wrapper')) {
                localStorage.removeItem('showTooltipFlag');
            }
            countlyCommon.DISABLE_AUTO_REFRESH = false;
        };

        window.hideTooltip = function(event) {
            if (localStorage.getItem('showTooltipFlag')) {
                event.stopImmediatePropagation();
            }
            return;
        };
    }
};

/**
 * Custom merge function to handle arrays within objects
 * @param {*} objValue - existing object value
 * @param {*} srcValue - source object value
 * @returns {*} - merged value
 */
export function mergeWithCustomizer(objValue, srcValue) {
    if (Array.isArray(srcValue) && typeof objValue === 'object') {
        srcValue.forEach(function(value, index) {
            srcValue[index] = _mergeWith({}, objValue, value);
        });
        return srcValue;
    }
}

// Also expose ExternalZoomMixin to countlyVue.mixins for backward compatibility
if (typeof window !== 'undefined' && window.countlyVue) {
    window.countlyVue.mixins.zoom = ExternalZoomMixin;
}

export { FONT_FAMILY };
