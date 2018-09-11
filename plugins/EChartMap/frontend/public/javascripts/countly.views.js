/*global
    countlyView,
    countlyCommon, 
    countlyGlobal,
    store,
    $,
    pinyinUtil,
    Handlebars,
    countlySession,
    countlyCity,
    countlyTotalUsers,
    countlyCommon,
    countlyLocation,
    app,
    echarts,
    CountlyHelpers,
    jQuery
 */


window.ChinaView = countlyView.extend({
    cityView: (store.get("countly_location_city")) ? store.get("countly_active_app") : false,
    initialize: function() {
        this.curMap = "map-list-sessions";
        var self = this;
        $.get(countlyGlobal.path + '/EChartMap/map/chinaCity.json', function(src) {
            self.chinaCity = src;
            self.chinaCityAlphabet = {};
            for (var city in self.chinaCity) {
                var alphabet = pinyinUtil.getPinyin(city, "");
                if (alphabet.indexOf("shi") + 3 === alphabet.length) {
                    alphabet = alphabet.substring(0, alphabet.length - 3);
                }
                self.chinaCityAlphabet[alphabet] = {zh: city, coord: self.chinaCity[city]};
            }
        });
        return $.when(
            $.get(countlyGlobal.path + '/EChartMap/templates/index.html', function(src) {
                self.template = Handlebars.compile(src);
            })
        ).then(function() {
        });
    },

    beforeRender: function() {
        this.maps = {
            "map-list-sessions": {
                id: 'total',
                label: jQuery.i18n.map["sidebar.analytics.sessions"],
                type: 'number',
                metric: "t"
            },
            "map-list-users": {id: 'total', label: jQuery.i18n.map["sidebar.analytics.users"], type: 'number', metric: "u"},
            "map-list-new": {id: 'total', label: jQuery.i18n.map["common.table.new-users"], type: 'number', metric: "n"}
        };

        return $.when(
            countlySession.initialize(),
            countlyCity.initialize(),
            countlyTotalUsers.initialize("countries"),
            countlyTotalUsers.initialize("cities"),
            countlyTotalUsers.initialize("users")
        ).then(function() {
        });
    },

    drawTable: function() {
        var tableFirstColTitle = (this.cityView) ? jQuery.i18n.map["countries.table.city"] : jQuery.i18n.map["countries.table.country"],
            locationData,
            firstCollData = "country_flag";

        if (this.cityView) {
            locationData = countlyCity.getLocationData();
            firstCollData = "cities";
        }
        else {
            locationData = countlyLocation.getLocationData();
        }

        this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": locationData,
            "aoColumns": [
                {"mData": firstCollData, "sTitle": tableFirstColTitle},
                {
                    "mData": "t",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    },
                    "sTitle": jQuery.i18n.map["common.table.total-sessions"]
                },
                {
                    "mData": "u",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    },
                    "sTitle": jQuery.i18n.map["common.table.total-users"]
                },
                {
                    "mData": "n",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    },
                    "sTitle": jQuery.i18n.map["common.table.new-users"]
                }
            ]
        }));

        //$(".d-table").stickyTableHeaders();
    },


    renderCommon: function(isRefresh) {
        var sessionData = countlySession.getSessionData();

        this.templateData = {
            "page-title": jQuery.i18n.map["EChart.plugin-title"],
            "logo-class": "countries",
            "big-numbers": {
                "count": 3,
                "items": [
                    {
                        "title": jQuery.i18n.map["common.total-sessions"],
                        "total": sessionData.usage["total-sessions"].total,
                        "trend": sessionData.usage["total-sessions"].trend,
                        "help": "countries.total-sessions",
                        "radio-button-id": "map-list-sessions",
                        "radio-button-class": (this.curMap === "map-list-sessions") ? "selected" : ""
                    },
                    {
                        "title": jQuery.i18n.map["common.total-users"],
                        "total": sessionData.usage["total-users"].total,
                        "trend": sessionData.usage["total-users"].trend,
                        "help": "countries.total-users",
                        "radio-button-id": "map-list-users",
                        "radio-button-class": (this.curMap === "map-list-users") ? "selected" : ""
                    },
                    {
                        "title": jQuery.i18n.map["common.new-users"],
                        "total": sessionData.usage["new-users"].total,
                        "trend": sessionData.usage["new-users"].trend,
                        "help": "countries.new-users",
                        "radio-button-id": "map-list-new",
                        "radio-button-class": (this.curMap === "map-list-new") ? "selected" : ""
                    }
                ]
            },
            "chart-helper": "countries.chart",
            "table-helper": "countries.table"
        };

        var self = this;
        $(document).unbind('selectMapCountry').bind('selectMapCountry', function() {
            $("#country-toggle").trigger("click");
        });

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));


            this.drawGeoChart();

            //$(".widget").addClass("google-disabled");


            this.drawTable();

            if (countlyCommon.CITY_DATA === false) {
                store.set("countly_location_city", false);
            }

            $("#country-toggle").on('click', function() {
                var dom = document.getElementById("geo-chart-china");
                dom.innerHTML = "";
                if ($(this).hasClass("country_selected")) {
                    self.cityView = false;
                    $(this).removeClass("country_selected");
                    store.set("countly_location_city", false);
                    $(this).text(jQuery.i18n.map["common.show"] + " " + countlyLocation.getCountryName('CN'));
                }
                else {
                    self.cityView = true;
                    $(this).addClass("country_selected");
                    store.set("countly_location_city", true);
                    $(this).html('<i class="fa fa-chevron-left" aria-hidden="true"></i>' + jQuery.i18n.map["countries.back-to-list"]);
                }
                self.refresh(true);
            });

            if (self.cityView) {
                $("#country-toggle").html('<i class="fa fa-chevron-left" aria-hidden="true"></i>' + jQuery.i18n.map["countries.back-to-list"]).addClass("country_selected");
            }
            else {
                $("#country-toggle").text(jQuery.i18n.map["common.show"] + " " + countlyLocation.getCountryName('CN'));
            }

            $(".geo-switch").on("click", ".radio", function() {
                $(".geo-switch").find(".radio").removeClass("selected");
                $(this).addClass("selected");
                self.curMap = $(this).data("id");

                self.drawGeoChart();

            });
        }
    },
    refresh: function(isToggle) {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
            var newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));
            if (isToggle) {
                self.drawGeoChart();
                self.drawTable();
            }
            //CountlyHelpers.refreshTable(self.dtable, locationData);

            app.localize();
        });
    },

    drawGeoChart: function() {
        if (this.cityView) {
            var chartData = countlyCity.getLocationData();
        }
        else {
            chartData = countlyLocation.getLocationData();
        }

        var self = this;
        var dom = document.getElementById("geo-chart-china");
        this.myChart = echarts.init(dom);

        option = null;
        var metric = self.maps[self.curMap].metric;
        var mapType = this.cityView ? 'china' : 'world';
        var maxValue = 0;
        var convertCityData = function(data) {
            var res = [];
            var dict = {};
            for (var i = 0; i < data.length; i++) {
                var geoCoord = self.chinaCityAlphabet[data[i].cities.toLowerCase()];
                if (geoCoord) {
                    maxValue = data[i][metric] > maxValue ? data[i][metric] : maxValue;
                    if (!dict[geoCoord.zh]) {
                        dict[geoCoord.zh] = geoCoord.coord.concat(0);
                    }
                    dict[geoCoord.zh][2] += parseInt(data[i][metric]);
                }
                else {
                    for (var cityPinyin in self.chinaCityAlphabet) {
                        // original data is Chinese character
                        if (self.chinaCityAlphabet[cityPinyin].zh === data[i].cities) {
                            if (!dict[self.chinaCityAlphabet[cityPinyin].zh]) {
                                dict[self.chinaCityAlphabet[cityPinyin].zh] = self.chinaCityAlphabet[cityPinyin].coord.concat(0);
                            }
                            dict[self.chinaCityAlphabet[cityPinyin].zh][2] += parseInt(data[i][metric]);
                        }
                    }
                }
            }
            for (var key in dict) {
                res.push({
                    name: key,
                    value: dict[key]
                });
            }
            return res;
        };

        var convertCountryData = function(data) {
            var res = [];
            metric = self.maps[self.curMap].metric;

            for (var i = 0; i < data.length; i++) {
                data[i].country = window.EChartMapPlugin.getEnglishCountryName(data[i].code);
                if (data[i].country === 'United States') {
                    data[i].country = 'United States of America';
                }
                maxValue = data[i][metric] > maxValue ? data[i][metric] : maxValue;
                res.push({
                    name: data[i].country,
                    value: data[i][metric]
                });
            }
            return res;
        };

        var seriesData = {};
        if (this.cityView) {
            seriesData = {
                name: 'Sessions',
                type: 'scatter',
                coordinateSystem: 'geo',
                label: {
                    normal: {
                        show: false
                    },
                    emphasis: {
                        show: true
                    }
                },
                data: convertCityData(chartData)
            };
        }
        else {
            seriesData = {
                name: 'Sessions',
                type: 'map',
                mapType: 'world',
                label: {
                    normal: {
                        show: false
                    },
                    emphasis: {
                        show: false
                    }
                },
                itemStyle: {
                    //emphasis: {label: {show: true}}
                    color: 'transparent'
                },
                data: convertCountryData(chartData)
            };

        }
        var visualMap = {
            min: 0,
            max: maxValue,
            show: false,
            calculable: false,
            inRange: {
                color: ['#a4c3fd', '#568ff9', '#005aff']
            },
            textStyle: {
                color: '#fff'
            }
        };

        var option = {
            title: {
                text: '地理分布',
                subtext: self.maps[self.curMap].label,
                left: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    if (params.value) {
                        return params.name + ' : ' + (params.value.length >= 3 ? params.value[2] : params.value);
                    }
                    return null;
                }
            },
            visualMap: seriesData.data.length > 0 ? visualMap : null,
            geo: {
                map: mapType,
                label: {
                    emphasis: {
                        show: false
                    }
                },
                zoom: 1.0,
                scaleLimitL: {
                    min: 0.8,
                    max: 1.5
                }

            },

            series: [
                seriesData
            ]
        };
        if (option && typeof option === "object") {
            this.myChart.setOption(option, true);
        }
    },


});


app.ChinaView = new window.ChinaView();
if (countlyGlobal.member.global_admin || countlyGlobal.member.admin_of.length) {
    app.route('/analytics/EChartMap', 'EChartMap', function() {
        if (window.echarts) {
            this.renderWhenReady(this.ChinaView);
        }
        else {
            var self = this;
            CountlyHelpers.loadJS("EChartMap/map/echarts-all-3.js", function() {
                $.when(
                    CountlyHelpers.loadJS("EChartMap/map/china.js"),
                    CountlyHelpers.loadJS("EChartMap/map/world.js")
                ).then(function() {
                    self.renderWhenReady(self.ChinaView);
                });
            });
        }
    });
}

$(document).ready(function() {
    //menu = '<a href="#/analytics/EChartMap" class="item">' +
    //	'<div class="logo country"></div>' +
    //	'<div class="text" data-localize="sidebar.analytics.countries"></div>' +
    //	'</a>';
    //$('#default-type #analytics-submenu').append(menu);
    //$('#mobile-type #analytics-submenu').append(menu);
    //$('#web-type #analytics-submenu').append(menu);
    var countryNode = $("a[href$='#/analytics/countries']");
    for (var i = 0; i < countryNode.length; i++) {
        countryNode[i].href = '#/analytics/EChartMap';
    }
});