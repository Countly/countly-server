/*global jQuery, countlyCommon, moment, countlyGlobal, d3*/

(function(countlyDataPoints, $) {
    //Private Properties
    var _dataPointsObj = {},
        _periods = [],
        _todPunchCardData = [],
        _selectedPeriod = "";

    //Public Methods
    countlyDataPoints.initialize = function() {
        return $.when(
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/server-stats/data-points",
                data: {},
                dataType: "json",
                success: function(json) {
                    countlyDataPoints.reset();
                    _dataPointsObj = json;

                    // format months object
                    var periods = Object.keys(json["all-apps"]).slice(0, 3).concat(Object.keys(json["all-apps"]).slice(12, 15));

                    if (_dataPointsObj["all-apps"]) {
                        for (var i = 0; i < periods.length; i++) {
                            _selectedPeriod = periods[i];

                            if (i > 2) {
                                _periods.push({
                                    period: periods[i],
                                    text: moment(periods[i], "YYYY-M").format("MMM YYYY")
                                });
                            }
                            else {
                                _periods.push({
                                    period: periods[i],
                                    text: periods[i].replace("_", " ")
                                });
                            }
                        }
                    }
                }
            })
        ).then(function() {
            return true;
        });
    };

    countlyDataPoints.punchCard = function(date_range) {

        var data = {};

        if (date_range) {
            data.date_range = date_range;
        }
        return $.when(
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/server-stats/punch-card",
                dataType: "json",
                data: data,
                success: function(json) {
                    _todPunchCardData = json;
                }
            })
        ).then(function() {
            return true;
        });
    };

    countlyDataPoints.getPunchCardData = function() {
        return _todPunchCardData;
    };

    countlyDataPoints.refresh = function() {
        return true;
    };

    countlyDataPoints.reset = function() {
        _dataPointsObj = {};
        _periods = [];
        _selectedPeriod = "";
    };

    countlyDataPoints.getTableData = function() {
        var tableData = [];

        for (var app in _dataPointsObj) {
            var periodData = _dataPointsObj[app][_selectedPeriod];

            tableData.push({
                "app-name": getAppName(app),
                "sessions": periodData.sessions,
                "events": periodData.events,
                "data-points": periodData["data-points"],
                "change": periodData.change
            });
        }

        return tableData;
    };

    countlyDataPoints.getPeriods = function() {
        for (var i = 0; i < _periods.length; i++) {
            _periods[i].selected = (_periods[i].period === _selectedPeriod);
        }

        return _periods;
    };

    countlyDataPoints.setPeriod = function(period) {
        _selectedPeriod = period;
    };

    countlyDataPoints.loadPunchCard = function(dpPunchData) {
        var chartAreaWidth = $('#chart').width() - 50;
        chartAreaWidth = chartAreaWidth > 972 ? 972 : chartAreaWidth;
        var chartAreaHeight = chartAreaWidth * 0.35;
        var margin = { top: 20, right: 10, bottom: 10, left: 10 };
        var width = chartAreaWidth - margin.left - margin.right;
        var height = chartAreaHeight - margin.top - margin.bottom;
        var padding = 3;
        var xLabelHeight = 30;
        var yLabelWidth = 80;
        var borderWidth = 1;
        var duration = 0;

        var chart = d3.select('#chart').append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var border = chart.append('rect')
            .attr('id', 'tod-chart-area')
            .attr('x', yLabelWidth)
            .attr('y', xLabelHeight)
            .style('fill-opacity', 0)
            .style('stroke', '#D0D0D0')
            .style('stroke-width', borderWidth)
            .style('shape-rendering', 'crispEdges');

        loadPunchCard(dpPunchData);

        /**
         * Load d3 punch chard
         * @param {object} punchCardData | Chart data
         */
        function loadPunchCard(punchCardData) {
            var labelsX = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"];
            var labelMapping = {
                "0": jQuery.i18n.map['times-of-day.monday'],
                "1": jQuery.i18n.map['times-of-day.tuesday'],
                "2": jQuery.i18n.map['times-of-day.wednesday'],
                "3": jQuery.i18n.map['times-of-day.thursday'],
                "4": jQuery.i18n.map['times-of-day.friday'],
                "5": jQuery.i18n.map['times-of-day.saturday'],
                "6": jQuery.i18n.map['times-of-day.sunday'],
            };
            var data = [];
            for (var i = 0; i < 7; i++) {
                data.push({
                    label: labelMapping[i],
                    day: i,
                    values: punchCardData[0].sumValue[i],
                    averages: punchCardData[3].avgValue[i],
                    minValues: punchCardData[1].minValue[i],
                    maxValues: punchCardData[2].maxValue[i],
                });
            }

            update(data, labelsX);

            $('#mouseOverRectEvent').tooltipster({
                animationDuration: 0,
                delay: 100,
                theme: 'tooltipster-borderless',
                trigger: 'custom',
                triggerOpen: {
                    mouseenter: true,
                    touchstart: true
                },
                triggerClose: {
                    mouseleave: true,
                    touchleave: true
                },
                interactive: true,
                contentAsHTML: true
            });
        }

        /**
         * Convert hexadecimal to RGB value
         * @param {string} hex value for color
         * @returns {string} converted rgb value of hex color
         */
        function hexToRgb(hex) {
            hex = hex.substr(1, 6);
            var bigint = parseInt(hex, 16);
            var r = (bigint >> 16) & 255;
            var g = (bigint >> 8) & 255;
            var b = bigint & 255;

            return r + "," + g + "," + b;
        }
        /**
         * Update function
         * @param {*} data -
         * @param {*} labelsX -
         */
        function update(data, labelsX) {
            var allValues = Array.prototype.concat.apply([], data.map(function(d) {
                return d.values;
            }));
            var maxWidth = d3.max(data.map(function(d) {
                return d.values.length;
            }));
            var maxR = d3.min([(width - yLabelWidth) / maxWidth, (height - xLabelHeight) / data.length]) / 2;
            var r = function(d) {
                if (d === 0) {
                    return 0;
                }

                var f = d3.scale.sqrt()
                    .domain([d3.min(allValues), d3.max(allValues)])
                    .rangeRound([2, maxR - padding]);

                return f(d);
            };
            var c = d3.scale.linear()
                .domain([d3.min(allValues), d3.max(allValues)])
                .rangeRound([0, 100]);

            var rows = chart.selectAll('.row')
                .data(data, function(d) {
                    return d.label;
                });

            rows.enter().append('g')
                .attr('class', 'row')
                .style('fill', '#000000')
                .style('fill-opacity', 1);

            rows.exit()
                .transition()
                .duration(duration)
                .style('fill-opacity', 0)
                .remove();

            rows.transition()
                .duration(duration)
                .attr('transform', function(d, i) {
                    return 'translate(' + yLabelWidth + ',' + (maxR * i * 2 + maxR + xLabelHeight) + ')';
                });

            var dots = rows.selectAll('circle')
                .data(function(d) {
                    return d.values;
                });

            dots.enter().append('circle')
                .attr('cy', 0)
                .attr('r', 0)
                .text(function(d) {
                    return d;
                });

            dots.exit()
                .transition()
                .duration(duration)
                .attr('r', 0)
                .remove();

            dots.transition()
                .duration(duration)
                .attr('r', function(d) {
                    return r(d);
                })
                .attr('cx', function(d, i) {
                    return i * maxR * 2 + maxR;
                })
                .style('fill', function(d) {
                    return 'rgba(' + hexToRgb(countlyCommon.GRAPH_COLORS[0]) + ',' + c(d) / 100 + ')';
                }
                );

            var dotLabels = rows.selectAll('.dot-label')
                .data(function(d) {
                    return d.values;
                });


            var defs = chart.append("defs");
            var filter = defs.append("filter")
                .attr("id", "dropshadow");
            filter.append("feGaussianBlur")
                .attr("in", "SourceAlpha")
                .attr("stdDeviation", 2)
                .attr("result", "blur");

            filter.append("feOffset")
                .attr("in", "blur")
                .attr("dx", 0)
                .attr("dy", 0)
                .attr("result", "offsetBlur");

            filter.append("feFlood")
                .attr("in", "offsetBlur")
                .attr("flood-color", "#3d3d3d")
                .attr("flood-opacity", "0.4")
                .attr("result", "offsetColor");
            filter.append("feComposite")
                .attr("in", "offsetColor")
                .attr("in2", "offsetBlur")
                .attr("operator", "in")
                .attr("result", "offsetBlur");

            var feMerge = filter.append("feMerge");

            feMerge.append("feMergeNode")
                .attr("in", "offsetBlur");
            feMerge.append("feMergeNode")
                .attr("in", "SourceGraphic");

            var dotLabelEnter = dotLabels.enter().append('g')
                .data(function(d) {
                    return d.values.map(function(x, i) {
                        return { day: d.day, value: x, maxValue: d.maxValues[i], average: d.averages[i], minValue: d.minValues[i], label: d.label };
                    });
                })
                .attr('class', function() {
                    return 'dot-label';
                });

            dotLabelEnter.append('rect').style('opacity', 0);
            dotLabels.exit().remove();

            dotLabels
                .attr('transform', function(d, i) {
                    return 'translate(' + (i * maxR * 2) + ', ' + (-maxR) + ')';
                })
                .select('text')
                .text(function(d) {
                    return d;
                })
                .attr('y', maxR + 5)
                .attr('x', maxR);

            dotLabels
                .select('rect')
                .attr('x', 1)
                .attr('width', maxR * 2 - 1)
                .attr('height', maxR * 2 - 1);


            var xLabels = chart.selectAll('.xLabel')
                .data([].concat(labelsX, ["0"]));

            xLabels.enter().append('text')
                .attr('y', xLabelHeight)
                .attr('transform', 'translate(0,-6)')
                .attr('class', 'dp-punch-card-xlabel')
                .style('text-anchor', 'middle')
                .style('fill', '#777777')
                .style('fill-opacity', 0);

            xLabels.exit()
                .transition()
                .duration(duration)
                .style('fill-opacity', 0)
                .remove();

            xLabels.transition()
                .text(function(d) {
                    return d;
                })
                .duration(duration)
                .attr('x', function(d, i) {
                    return maxR * i * 2 + yLabelWidth;
                })
                .style('fill-opacity', 1);

            var yLabels = chart.selectAll('.yLabel')
                .data(data, function(d) {
                    return d.label;
                });

            yLabels.enter().append('text')
                .text(function(d) {
                    return d.label;
                })
                .attr('x', yLabelWidth)
                .attr('class', 'dp-punch-card-ylabel')
                .style('text-anchor', 'end')
                .style('fill-opacity', 0);

            yLabels.exit()
                .transition()
                .duration(duration)
                .style('fill-opacity', 0)
                .remove();

            yLabels.transition()
                .duration(duration)
                .attr('y', function(d, i) {
                    return maxR * i * 2 + maxR + xLabelHeight;
                })
                .attr('transform', 'translate(-15,' + maxR / 2.5 + ')')
                .style('fill', '#777777')
                .style('fill-opacity', 1);

            var vert = chart.selectAll('.vert')
                .data(labelsX);

            vert.enter().append('line')
                .attr('class', 'vert')
                .attr('y1', xLabelHeight + borderWidth / 2)
                .attr('stroke', '#D0D0D0')
                .attr('stroke-width', 1)
                .style('shape-rendering', 'crispEdges')
                .style('stroke-opacity', 0);

            vert.exit()
                .transition()
                .duration(duration)
                .style('stroke-opacity', 0)
                .remove();

            vert.transition()
                .duration(duration)
                .attr('x1', function(d, i) {
                    return maxR * i * 2 + yLabelWidth;
                })
                .attr('x2', function(d, i) {
                    return maxR * i * 2 + yLabelWidth;
                })
                .attr('y2', maxR * 2 * data.length + xLabelHeight - borderWidth / 2)
                .style('stroke-opacity', function(d, i) {
                    return i ? 1 : 0;
                });

            var horiz = chart.selectAll('.horiz').
                data(data, function(d) {
                    return d.label;
                });

            horiz.enter().append('line')
                .attr('class', 'horiz')
                .attr('x1', yLabelWidth + borderWidth / 2)
                .attr('stroke', '#D0D0D0')
                .attr('stroke-width', 1)
                .style('shape-rendering', 'crispEdges')
                .style('stroke-opacity', 0);

            horiz.exit()
                .transition()
                .duration(duration)
                .style('stroke-opacity', 0)
                .remove();

            horiz.transition()
                .duration(duration)
                .attr('x2', maxR * 2 * labelsX.length + yLabelWidth - borderWidth / 2)
                .attr('y1', function(d, i) {
                    return i * maxR * 2 + xLabelHeight;
                })
                .attr('y2', function(d, i) {
                    return i * maxR * 2 + xLabelHeight;
                })
                .style('stroke-opacity', function(d, i) {
                    return i ? 1 : 0;
                });

            border.transition()
                .duration(duration)
                .attr('width', maxR * 2 * labelsX.length)
                .attr('height', maxR * 2 * data.length);


            var boxSize = maxR * 2;
            var hoverBoxSize = boxSize * 1.1;
            var mouseOver = chart.append('g');

            var mouseOverRect = mouseOver
                .append('rect')
                .style('fill-opacity', 0)
                .style('fill', '#FFF')
                .attr("filter", "url(#dropshadow)")
                .attr('width', hoverBoxSize)
                .attr('height', hoverBoxSize);
            var mouseOverCircle = mouseOver.append('circle').style('fill', 'rgba(0,0,0,0)').attr('r', 16);
            var mouseOverText = mouseOver.append('text')
                .style('font-size', '14px')
                .style('display', 'block')
                .style('fill', '#353535')
                .attr('width', hoverBoxSize)
                .attr('height', hoverBoxSize);

            var mouseOverRectEvent = mouseOver.append('rect').style('fill-opacity', 0).style('cursor', 'pointer').attr('width', hoverBoxSize)
                .attr('height', hoverBoxSize).attr('id', 'mouseOverRectEvent');

            mouseOverRectEvent.on('mouseout', function() {
                d3.select(this).style('fill-opacity', 0);
                mouseOverRect.style('fill-opacity', 0);
                mouseOverText.style('fill-opacity', 0);
            });

            dotLabelEnter.on('mouseover', function(d) {

                var selection = d3.select(this);
                var rectPosition = selection.node().getBoundingClientRect();
                var svgPosition = d3.select('#tod-chart-area').node().getBoundingClientRect();

                var topPositionOrigin = xLabelHeight + rectPosition.top - svgPosition.top - ((hoverBoxSize - boxSize) / 2);
                // var leftPositionOrigin = rectPosition.left - svgPosition.left - ((hoverBoxSize - boxSize) / 2);
                var leftPositionOrigin = yLabelWidth + (rectPosition.left - svgPosition.left) - ((hoverBoxSize - boxSize) / 2);
                mouseOver.attr('transform', 'translate(' + leftPositionOrigin + ',' + topPositionOrigin + ')');
                mouseOverRect
                    .style('fill-opacity', 1);

                mouseOverCircle
                    .attr('cx', hoverBoxSize / 2)
                    .attr('cy', hoverBoxSize / 2)
                    .attr('r', r(d.value))
                    .style('fill', 'rgba(' + hexToRgb(countlyCommon.GRAPH_COLORS[0]) + ', ' + c(d.value) / 100 * 0.5 + ')');

                mouseOverText
                    .text(countlyCommon.getShortNumber(d.value))
                    .style('fill-opacity', 1)
                    .attr('y', function() {
                        var textHeight = d3.select(this).node().getBoundingClientRect().height;
                        return ((boxSize - textHeight) / 2) + 15;
                    })
                    .attr('x', function() {
                        var textWidth = d3.select(this).node().getBoundingClientRect().width;
                        return (hoverBoxSize - textWidth) / 2;
                    });

                var max = countlyCommon.formatNumber(d.maxValue);
                var min = countlyCommon.formatNumber(d.minValue);
                var avg = countlyCommon.formatNumber(d.average);
                var contentText = jQuery.i18n.prop('server-stats.data-points.punch-card-tooltip', max, min, avg);

                $('#mouseOverRectEvent').tooltipster('content', contentText);
            });
        }

    };

    /**
    * Returns a human readable name given application id.
    * @param {string} appId - Application Id
    * @returns {string} Returns a readable name
    **/
    function getAppName(appId) {
        if (appId === "all-apps") {
            return "(" + (jQuery.i18n.map["server-stats.all-datapoints"] || "All Datapoints") + ")";
        }
        else if (appId === "[CLY]_consolidated") {
            return "(" + (jQuery.i18n.map["server-stats.consolidated-datapoints"] || "Consolidated Datapoints") + ")";
        }
        else if (appId === "natural-dp") {
            return "(" + (jQuery.i18n.map["server-stats.natural-datapoints"] || "Natural Datapoints") + ")";
        }
        else if (countlyGlobal.apps[appId]) {
            return countlyGlobal.apps[appId].name;
        }
        else {
            return "Deleted app (" + appId + ")";
        }
    }

})(window.countlyDataPoints = window.countlyDataPoints || {}, jQuery);