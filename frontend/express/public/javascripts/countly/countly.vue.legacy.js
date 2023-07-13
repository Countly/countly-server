/* global countlyCommon, moment, jQuery*/

(function(CountlyVueComponents, $) {

    /**
     * CLY Select list VueJS component. It supports big lists and search.
     */
    CountlyVueComponents.selectList = {
        template: '<div ref="selectList" class="cly-select text-align-left" v-bind:class="{\'big-list\' : isBigList, \'disabled\' : isDisabled}" > <div class="select-inner"> <div class="text-container"> <div v-if="selectedItem" class="text" style="width:80%" v-bind:data-value="selectedItem.value"><span v-text="selectedItem.text"></span></div><div v-if="!selectedItem" class="text" style="width:80%"><span class="text-light-gray" v-text="placeholder"></span></div></div><div class="right combo"></div></div><div class="select-items square" style="width:100%;" v-bind:style="customStyle"> <div class="warning" v-if="isBigList">' + jQuery.i18n.map['drill.big-list-warning'] + '</div><div v-for="item in items" v-on:click="itemOnSelect(item)" v-bind:class="{item: item.value, group : !item.value}"> <div v-if="!item.value"><span v-text="item.name"></span></div><div v-if="item.value" v-bind:data-value="item.value" ><span v-text="item.name"></span></div></div></div></div>',
        props: {
            placeholder: { type: String, default: '' },
            selectedItem: Object,
            items: { type: Array, default: [] },
            onSelectionChange: { type: Function, required: true },
            verticleAligned: { type: Boolean, default: false },
            isBigList: { type: Boolean, default: false },
            onSearch: { type: Function },
            isDisabled: { type: Boolean, default: false}
        },
        data: function() {
            return { searchKey: "" };
        },
        methods: {
            itemOnSelect: function(item) {
                if (item.value) {
                    this.onSelectionChange(item);
                }
            },
            selectOnClick: function(element) {
                if (this.isBigList && this.onSearch) {
                    var self = this;
                    setTimeout(function() {
                        var timeout = null;

                        $(element).find('input').val(self.searchKey);
                        $(element).find('input').unbind('keyup').bind('keyup', function() {
                            if (timeout) {
                                clearTimeout(timeout);
                                timeout = null;
                            }
                            var key = $(this).val();
                            timeout = setTimeout(function() {
                                $(element).find('.select-items').prepend("<div class='table-loader' style='top:-1px'></div>");
                                self.searchKey = key;
                                self.onSearch(key);
                            }, 1000);
                        });
                    });
                }
            }
        },
        updated: function() {
            var selectListDOM = $(this.$refs.selectList);
            selectListDOM.find('.table-loader').detach();
            if (this.selectedItem) {
                selectListDOM.clySelectSetSelection(this.selectedItem.value, this.selectedItem.name);
            }

            selectListDOM.unbind('click').bind("click", this.selectOnClick.bind(this, selectListDOM));

            //For move items to slimscroll area after search event;
            if (selectListDOM.find('.select-items').is(':visible') && selectListDOM.find('.warning').is(':visible')) {
                selectListDOM.find('.item').each(function() {
                    var item = $(this);
                    item.removeClass('hidden');
                    item.detach();
                    item.insertAfter(selectListDOM.find('.warning'));
                });
            }
        },
        mounted: function() {
            if (this.selectedItem) {
                $(this.$refs.selectList).clySelectSetSelection(this.selectedItem.value, this.selectedItem.name);
            }

            $(this.$refs.selectList).unbind('click').bind("click", this.selectOnClick.bind(this, $(this.$refs.selectList)));
        },
        computed: {
            customStyle: function() {
                if (this.verticleAligned) {
                    switch (this.items.length) {
                    case 0:
                    case 1:
                    case 2:
                        return { top: "-15px", minHeight: 'auto', position: "absolute" };
                    case 3:
                    case 4:
                        return { top: "-40px", minHeight: 'auto', position: "absolute" };
                    case 5:
                    case 6:
                        return { top: "-70px", minHeight: 'auto', position: "absolute" };
                    default:
                        return { top: "27px", minHeight: 'auto', position: "absolute" };
                    }
                }
                else {
                    return {};
                }
            }
        }
    };

    /**
     * CLY Input. (Text and number html input)
     */
    CountlyVueComponents.input = {
        template: '<input v-bind:type="inputType" v-bind:placeholder="placeholder" class="string-input disabled" v-bind:value="value" v-on:keyup="onChange">',
        props: { placeholder: { type: String, default: 'String' }, inputType: { type: String, default: 'text' }, value: { default: null }, onValueChanged: { type: Function } },
        methods: {
            onChange: function(e) {
                if (this.onValueChanged) {
                    this.onValueChanged({
                        value: this.inputType.toLowerCase() === "number" ? parseInt(e.target.value, 10) : e.target.value,
                        type: this.inputType.toLowerCase() === "number" ? "inputnumber" : "inputtext"
                    });
                }
            }
        }
    };


    /**
     * CLY Date Picker
     */
    CountlyVueComponents.datePicker = {
        template: '<div ref="datePicker" class="date-picker-component"><input type="text" placeholder="Date" class="string-input date-value" readonly v-on:click="onClick" v-bind:value="formatDate"><div class="date-picker" style="display:none"><div class="calendar-container calendar-light"><div class="calendar"></div></div></div></div>',
        props: { placeholder: { type: String, default: 'Date' }, value: { default: null }, onValueChanged: { type: Function, required: true }, maxDate: Date },
        computed: {
            formatDate: function() {
                if (this.value) {
                    return countlyCommon.formatDate(moment(this.value * 1000), "DD MMMM, YYYY");
                }
                else {
                    return null;
                }
            }
        },
        mounted: function() {

            var datePickerDOM = $(this.$refs.datePicker).find('.date-picker');

            var self = this;
            datePickerDOM.find(".calendar").datepicker({
                numberOfMonths: 1,
                showOtherMonths: true,
                onSelect: function(selectedDate) {
                    var instance = $(this).data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings),
                        currMoment = moment(date);

                    var selectedTimestamp = moment(currMoment.format("DD MMMM, YYYY"), "DD MMMM, YYYY").unix();
                    var tzCorr = countlyCommon.getOffsetCorrectionForTimestamp(selectedTimestamp);
                    var selectedValue = selectedTimestamp - tzCorr;

                    self.onValueChanged({
                        value: selectedValue,
                        type: 'datepicker'
                    });
                    $(".date-picker").hide();
                }
            });

            if (this.maxDate) {
                datePickerDOM.find(".calendar").datepicker('option', 'maxDate', this.maxDate);
            }

            $.datepicker.setDefaults($.datepicker.regional[""]);
            datePickerDOM.find(".calendar").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

            if (this.value) {
                datePickerDOM.find(".calendar").datepicker("setDate", moment(this.value * 1000).toDate());
            }

            datePickerDOM.click(function(e) {
                e.stopPropagation();
            });
        },
        updated: function() {
            var datePickerDOM = $(this.$refs.datePicker).find('.date-picker');
            if (this.value) {
                datePickerDOM.find(".calendar").datepicker("setDate", moment(this.value * 1000).toDate());
            }
            if (this.maxDate) {
                datePickerDOM.find(".calendar").datepicker('option', 'maxDate', this.maxDate);
            }
        },
        methods: {
            onClick: function(e) {
                $(".date-picker").hide();

                $(this.$refs.datePicker).find(".date-picker").show();

                e.stopPropagation();
            }
        }
    };


    /**
     * CLY Extended Date Picker
     */
    CountlyVueComponents.datePickerExtended = {
        template: '<div ref="datePicker" v-bind:class="[collapsible ? \'collapsible\' : \'\', \'date-picker-component\', \'extended\']"><input v-if="collapsible" type="text" placeholder="Date" class="string-input date-value" readonly v-on:click="onClick" v-bind:value="formatDate"><div class="date-picker-ext-wrapper"><div class="calendar-container calendar-dark"><div class="calendar"></div></div></div></div>',
        props: {
            placeholder: { type: String, default: 'Date' },
            value: Date,
            onValueChanged: { type: Function, required: true },
            maxDate: {type: Date, default: moment().subtract(1, 'days').toDate() },
            isRangePicker: { type: Boolean, default: false },
            isTextEditAllowed: { type: Boolean, default: false },
            hideOnSelect: { type: Boolean, default: true },
            collapsible: { type: Boolean, default: true },
            aborted: { type: Boolean, default: false },
        },
        computed: {
            formatDate: function() {
                if (Array.isArray(this.value)) {
                    return this.value.map(function(point) {
                        return countlyCommon.formatDate(moment(point), "DD MMMM, YYYY");
                    }).join(" - ");
                }
                else if (this.value) {
                    return countlyCommon.formatDate(moment(this.value), "DD MMMM, YYYY");
                }
                else {
                    return null;
                }
            }
        },
        mounted: function() {

            var datePickerDOM = $(this.$refs.datePicker).find('.date-picker-ext-wrapper');

            var self = this;
            var options = {
                numberOfMonths: 1,
                showOtherMonths: true,
                range: this.isRangePicker,
                textEdit: this.isTextEditAllowed,
            };

            if (this.isRangePicker) {
                options.onCommit = function(startDate, endDate) {
                    var currMoments = [moment(startDate), moment(endDate)];

                    var selectedRange = currMoments.map(function(currMoment) {
                        var selectedTimestamp = moment(currMoment.format("DD MMMM, YYYY"), "DD MMMM, YYYY").unix();
                        var tzCorr = countlyCommon.getOffsetCorrectionForTimestamp(selectedTimestamp);
                        var selectedValue = selectedTimestamp - tzCorr;
                        return selectedValue;
                    });

                    self.onValueChanged({
                        value: selectedRange,
                        type: 'datepicker'
                    });

                    if (self.hideOnSelect && self.collapsible) {
                        $(".date-picker-ext-wrapper").hide();
                    }
                };
            }
            else {
                options.onSelect = function(selectedDate) {
                    var instance = $(this).data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings),
                        currMoment = moment(date);

                    var selectedTimestamp = moment(currMoment.format("DD MMMM, YYYY"), "DD MMMM, YYYY").unix();
                    var tzCorr = countlyCommon.getOffsetCorrectionForTimestamp(selectedTimestamp);
                    var selectedValue = selectedTimestamp - tzCorr;

                    self.onValueChanged({
                        value: selectedValue,
                        type: 'datepicker'
                    });

                    if (self.hideOnSelect && self.collapsible) {
                        $(".date-picker-ext-wrapper").hide();
                    }
                };
            }

            datePickerDOM.find(".calendar").datepickerExtended(options);

            if (this.maxDate) {
                datePickerDOM.find(".calendar").datepicker('option', 'maxDate', this.maxDate);
            }

            $.datepicker.setDefaults($.datepicker.regional[""]);
            datePickerDOM.find(".calendar").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

            this.refreshValues();

            datePickerDOM.click(function(e) {
                e.stopPropagation();
            });
        },
        watch: {
            value: function() {
                this.refreshValues();
            },
            maxDate: function() {
                var datePickerDOM = $(this.$refs.datePicker).find('.date-picker-ext-wrapper');
                if (this.maxDate) {
                    datePickerDOM.find(".calendar").datepicker('option', 'maxDate', this.maxDate);
                }
            },
            aborted: function(value) {
                if (value === true) {
                    this.abort();
                }
            }
        },
        methods: {
            onClick: function(e) {
                $(".date-picker-ext-wrapper").hide();

                $(this.$refs.datePicker).find(".date-picker-ext-wrapper").show();

                e.stopPropagation();
            },
            abort: function() {
                var datePickerDOM = $(this.$refs.datePicker).find('.date-picker-ext-wrapper');
                datePickerDOM.find(".calendar").datepickerExtended("abortRangePicking");
            },
            refreshValues: function() {

                var datePickerDOM = $(this.$refs.datePicker).find('.date-picker-ext-wrapper');
                if (Array.isArray(this.value)) {
                    datePickerDOM.find(".calendar").datepickerExtended("setRange", this.value);
                }
                else if (this.value) { //&& !Array.isArray(this.value)
                    datePickerDOM.find(".calendar").datepickerExtended("setDate", this.value);
                }
            }
        }
    };


    /**
    * CLY Simple menu
    */
    CountlyVueComponents.menu = {
        template: '<div v-bind:class="[\'cly-menu-component\', isShown ? \'shown\' : \'hidden\', isEmpty ? \'empty\' : \'\']"><div class="menu-toggler" v-on:click="toggle"><div class="label-wrapper"><div class="text">{{label}}</div></div><div class="right combo"></div></div><div class="menu-content" v-show="isShown"><slot></slot></div></div>',
        props: {
            label: { type: String, default: '' },
            isShown: { type: Boolean, default: false },
            isEmpty: { type: Boolean, default: true }
        },
        mounted: function() {
        },
        updated: function() {
        },
        methods: {
            toggle: function() {
                this.$emit('toggler-clicked');
            }
        }
    };

}(window.CountlyVueComponents = window.CountlyVueComponents || {}, jQuery));
