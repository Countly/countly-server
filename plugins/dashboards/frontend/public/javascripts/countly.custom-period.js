/*global Vue, jQuery, CountlyVueComponents, moment, $, countlyCommon */

(function(DashbaordsCustomPeriod) {
    var customPeriodSelect = {
        template: '#cly-dashbaords-custom-period-template',
        components: {
            'cly-select': CountlyVueComponents.selectList,
            'cly-datepicker-ext': CountlyVueComponents.datePickerExtended,
            'cly-menu': CountlyVueComponents.menu
        },
        props: {
            onChanged: { type: Function, required: true },
            selectedPeriod: { required: true },
        },
        data: function() {
            var rangeTypes = [
                {name: jQuery.i18n.map["common.yesterday"], value: "yesterday"},
                {name: jQuery.i18n.map["common.today"], value: "hour"},
                {name: jQuery.i18n.prop('common.time-period-select.last-n'), value: "last-n"},
                {name: jQuery.i18n.prop('common.time-period-select.range'), value: "range"},
                {name: moment().format("MMMM, YYYY"), value: "day"},
                {name: moment().year(), value: "month"},
            ];

            var levels = [
                {name: jQuery.i18n.prop('common.buckets.days'), value: "days"},
            ];

            return {
                isMenuShown: false,
                currentType: rangeTypes[0],
                currentLevel: levels[0],
                currentNumber: 2,
                currentDate: moment().subtract(1, "day").toDate(),
                currentRange: [moment().subtract(8, "days").toDate(), moment().subtract(1, "day").toDate()],
                currentUnixRange: [],
                rangeTypes: rangeTypes,
                levels: levels,
                aborted: false
            };
        },
        mounted: function() {
            this.loadState(this.selectedPeriod);
        },
        computed: {
            label: function() {
                if (!this.selectedPeriod) {
                    return jQuery.i18n.map["dashboards.custom-period.select-date-range"];
                }
                return this.selectedPeriod.name;
            },
            isEmpty: function() {
                return !this.selectedPeriod;
            }
        },
        methods: {
            align: function() {
                var $toggler = $(this.$refs["cly-time-period"]).find(".menu-toggler");
                var $rightMostCmp = $toggler.find(".right.combo");
                var right = parseFloat($rightMostCmp.css("right")) - parseFloat($rightMostCmp.css("width")) / 2;
                if (!Number.isNaN(right)) {
                    var $content = $(this.$refs["cly-time-period"]).find(".menu-content");
                    $content.css("right", right + "px");
                }
            },
            changeMenuState: function(newState) {
                if (newState === true && this.isMenuShown === false) {
                    this.beforeOpen();
                }
                if (newState === false && this.isMenuShown === true) {
                    this.beforeClose();
                }
                this.isMenuShown = newState;
            },
            abortEditing: function() {
                this.changeMenuState(false);
                this.loadState(this.selectedPeriod);
                this.aborted = true;
            },
            beforeOpen: function() {
                this.loadState(this.selectedPeriod);
                var $content = $(this.$refs["cly-time-period"]).find(".menu-content");
                $content.find(".date-picker-ext-wrapper").show();
                //this.align();
                this.aborted = false;
            },
            beforeClose: function() {},
            loadState: function(original) {
                var period = original || {
                        type: "last-n",
                        value: 2,
                        level: "days"
                    },
                    type = period.type,
                    value = period.value,
                    level = period.level;

                this.currentType = this.rangeTypes.filter(function(otherType) {
                    return type === otherType.value;
                })[0];

                this.currentLevel = this.levels.filter(function(otherLevel) {
                    return level === otherLevel.value;
                })[0];

                if (this.currentType.value === "range") {
                    this.currentUnixRange = value;
                    this.currentRange = value.map(function(point) {
                        return moment(point * 1000).toDate();
                    });
                }
                else if (this.currentType.value === "last-n") {
                    this.currentNumber = value;
                }
            },
            commit: function() {
                var obj = {
                    type: this.currentType.value,
                    level: this.currentLevel.value
                };

                if (obj.type === "range") {
                    obj.value = this.currentUnixRange;
                }
                else {
                    if (this.currentNumber <= 1) {
                        this.currentNumber = 2;
                    }
                    obj.value = Math.min(Math.max(this.currentNumber, 1), 1000);
                }

                var descriptions = countlyCommon.getTimePeriodDescriptions(obj);

                obj.valueAsString = descriptions.valueAsString;
                obj.name = obj.longName = descriptions.name;

                this.onChanged(obj);
                this.changeMenuState(false);
            },
            onTogglerClicked: function() {
                var newState = !this.isMenuShown;
                if (newState) {
                    this.changeMenuState(true);
                }
                else {
                    this.abortEditing();
                }
            },
            onTypeChanged: function(selectedType) {
                this.currentType = selectedType;
            },
            onLevelChanged: function(selectedLevel) {
                this.currentLevel = selectedLevel;
            },
            onRangeChanged: function(wrapper) {
                this.currentUnixRange = wrapper.value;
                this.currentRange = wrapper.value.map(function(point) {
                    return moment(point * 1000).toDate();
                });
            }
        }
    };

    DashbaordsCustomPeriod.init = function() {
        var customPeriod = {
            el: "#custom-period-selector-block",
            data: {
                selectedPeriod: null
            },
            components: {
                'cly-dashbaords-custom-period': customPeriodSelect,
            },
            methods: {
                onTimePeriodChanged: function(period) {
                    this.selectedPeriod = period;
                    $("#widget-drawer").trigger("cly-widget-section-complete");
                }
            }
        };

        this.customPeriodPicker = new Vue(customPeriod);
    };

}(window.DashbaordsCustomPeriod = window.DashbaordsCustomPeriod || {}, jQuery));