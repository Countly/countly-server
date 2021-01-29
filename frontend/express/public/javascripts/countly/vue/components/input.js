/* global jQuery, Vue, moment, countlyCommon, _, VeeValidate */

(function(countlyVue, $) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    Vue.use(VeeValidate);
    Vue.component('validation-provider', VeeValidate.ValidationProvider);
    Vue.component('validation-observer', VeeValidate.ValidationObserver);

    VeeValidate.extend('arrmin', {
        validate: function(value, args) {
            return value.length >= args.length;
        },
        params: ['length']
    });

    VeeValidate.extend('arrmax', {
        validate: function(value, args) {
            return value.length <= args.length;
        },
        params: ['length']
    });

    var objectWithoutProperties = function(obj, excluded) {
        if (!obj || !excluded || excluded.length === 0) {
            return obj;
        }
        return Object.keys(obj).reduce(function(acc, val) {
            if (excluded.indexOf(val) === -1) {
                acc[val] = obj[val];
            }
            return acc;
        }, {});
    };

    var HEX_COLOR_REGEX = new RegExp('^#([0-9a-f]{3}|[0-9a-f]{6})$', 'i');

    Vue.component("cly-colorpicker", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        props: {
            value: {type: [String, Object], default: "#FFFFFF"},
            resetValue: { type: [String, Object], default: "#FFFFFF"}
        },
        data: function() {
            return {
                isOpened: false
            };
        },
        computed: {
            previewStyle: function() {
                return {
                    "background-color": this.value
                };
            },
            localValue: {
                get: function() {
                    return this.value.replace("#", "");
                },
                set: function(value) {
                    var colorValue = "#" + value.replace("#", "");
                    if (colorValue.match(HEX_COLOR_REGEX)) {
                        this.setColor({hex: colorValue});
                    }
                }
            }
        },
        methods: {
            setColor: function(color) {
                this.$emit("input", color.hex);
            },
            reset: function() {
                this.setColor({hex: this.resetValue});
            },
            open: function() {
                this.isOpened = true;
            },
            close: function() {
                this.isOpened = false;
            }
        },
        components: {
            picker: window.VueColor.Sketch
        },
        template: '<div class="cly-vue-colorpicker">\n' +
                    '<div @click.stop="open">\n' +
                        '<div class="preview-box" :style="previewStyle"></div>\n' +
                        '<input class="preview-input" type="text" v-model="localValue" />\n' +
                    '</div>\n' +
                    '<div class="picker-body" v-if="isOpened" v-click-outside="close">\n' +
                        '<picker :preset-colors="[]" :value="value" @input="setColor"></picker>\n' +
                        '<div class="button-controls">\n' +
                            '<cly-button :label="i18n(\'common.reset\')" @click="reset" skin="light"></cly-button>\n' +
                            '<cly-button :label="i18n(\'common.cancel\')" @click="close" skin="light"></cly-button>\n' +
                            '<cly-button :label="i18n(\'common.confirm\')" @click="close" skin="green"></cly-button>\n' +
                        '</div>\n' +
                    '</div>\n' +
                  '</div>'
    }));

    Vue.component("cly-global-date-selector-w", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            data: function() {
                return {
                    // UI state
                    isOpened: false,

                    // UI constants
                    fixedPeriods: [
                        {name: moment().subtract(1, "days").format("Do"), value: "yesterday"},
                        {name: this.i18n("common.today"), value: "hour"},
                        {name: this.i18n("taskmanager.last-7days"), value: "7days"},
                        {name: this.i18n("taskmanager.last-30days"), value: "30days"},
                        {name: this.i18n("taskmanager.last-60days"), value: "60days"},
                        {name: moment().format("MMMM, YYYY"), value: "day"},
                        {name: moment().year(), value: "month"},
                    ],

                    // Datepicker handles
                    dateTo: null,
                    dateFrom: null,

                    // Picked values
                    dateToSelected: null,
                    dateFromSelected: null,

                    // Labels
                    dateFromLabel: '',
                    dateToLabel: '',
                };
            },
            computed: {
                currentPeriod: function() {
                    return this.$store.getters["countlyCommon/period"];
                },
                currentPeriodLabel: function() {
                    return this.$store.getters["countlyCommon/periodLabel"];
                },
                toInternal: function() {
                    return this.dateToSelected;
                },
                fromInternal: function() {
                    return this.dateFromSelected;
                }
            },
            watch: {
                dateFromSelected: function(newValue) {
                    var date = new Date(newValue),
                        self = this;
                    if (newValue > self.dateToSelected) {
                        self.dateToSelected = newValue;
                    }
                    self.dateTo.datepicker("option", "minDate", date);
                    self.dateFrom.datepicker("setDate", date);
                    self.dateFromLabel = moment(newValue).format("MM/DD/YYYY");
                },
                dateToSelected: function(newValue) {
                    var date = new Date(newValue),
                        self = this;
                    if (newValue < self.dateFromSelected) {
                        self.dateFromSelected = newValue;
                    }
                    self.dateFrom.datepicker("option", "maxDate", date);
                    self.dateTo.datepicker("setDate", date);
                    self.dateToLabel = moment(newValue).format("MM/DD/YYYY");
                },
                isOpened: function() {
                    var self = this;
                    self.dateTo.datepicker("refresh");
                    self.dateFrom.datepicker("refresh");
                }
            },
            mounted: function() {
                this._initPickers();

                var periodObj = countlyCommon.getPeriod(),
                    self = this;

                if (Object.prototype.toString.call(periodObj) === '[object Array]' && periodObj.length === 2) {
                    self.dateFromSelected = parseInt(periodObj[0], 10) + countlyCommon.getOffsetCorrectionForTimestamp(parseInt(periodObj[0], 10));
                    self.dateToSelected = parseInt(periodObj[1], 10) + countlyCommon.getOffsetCorrectionForTimestamp(parseInt(periodObj[1], 10)) - 24 * 60 * 60 * 1000 + 1;
                }
                else {
                    var date = new Date();
                    date.setHours(0, 0, 0, 0);
                    self.dateToSelected = date.getTime();
                    var extendDate = moment(self.dateTo.datepicker("getDate"), "MM-DD-YYYY").subtract(30, 'days').toDate();
                    extendDate.setHours(0, 0, 0, 0);
                    self.dateFromSelected = extendDate.getTime();
                }
            },
            beforeDestroy: function() {
                this.dateTo.datepicker('hide').datepicker('destroy');
                this.dateFrom.datepicker('hide').datepicker('destroy');
            },
            methods: {
                _initPickers: function() {
                    var self = this;

                    var _onSelect = function(instance, selectedDate) {
                        var date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);
                        date.setHours(0, 0, 0, 0);
                        return date.getTime();
                    };

                    var _beforeShowDay = function(date, testFn) {
                        var ts = date.getTime();
                        if (testFn(ts)) {
                            return [true, "in-range", ""];
                        }
                        else {
                            return [true, "", ""];
                        }
                    };

                    self.dateTo = $(this.$refs.instDateTo).datepicker({
                        numberOfMonths: 1,
                        showOtherMonths: true,
                        maxDate: moment().toDate(),
                        onSelect: function(selectedDate) {
                            self.dateToSelected = _onSelect($(this).data("datepicker"), selectedDate);
                        },
                        beforeShowDay: function(date) {
                            return _beforeShowDay(date, function(ts) {
                                return ts < self.toInternal && ts >= self.fromInternal;
                            });
                        }
                    });

                    self.dateFrom = $(this.$refs.instDateFrom).datepicker({
                        numberOfMonths: 1,
                        showOtherMonths: true,
                        maxDate: moment().subtract(1, 'days').toDate(),
                        onSelect: function(selectedDate) {
                            self.dateFromSelected = _onSelect($(this).data("datepicker"), selectedDate);
                        },
                        beforeShowDay: function(date) {
                            return _beforeShowDay(date, function(ts) {
                                return ts <= self.toInternal && ts > self.fromInternal;
                            });
                        }
                    });

                    $.datepicker.setDefaults($.datepicker.regional[""]);
                    self.dateTo.datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);
                    self.dateFrom.datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);
                },
                toggle: function() {
                    this.isOpened = !this.isOpened;
                },
                cancel: function() {
                    this.isOpened = false;
                },
                setCustomPeriod: function() {
                    var self = this;
                    if (!self.dateFromSelected && !self.dateToSelected) {
                        return false;
                    }
                    this.setPeriod([
                        self.dateFromSelected - countlyCommon.getOffsetCorrectionForTimestamp(self.dateFromSelected),
                        self.dateToSelected - countlyCommon.getOffsetCorrectionForTimestamp(self.dateToSelected) + 24 * 60 * 60 * 1000 - 1
                    ]);
                },
                setPeriod: function(newPeriod) {
                    countlyCommon.setPeriod(newPeriod);
                    this.$root.$emit("cly-date-change");
                    this.isOpened = false;
                },
                dateFromInputSubmit: function() {
                    var date = moment(this.dateFromLabel, "MM/DD/YYYY");
                    if (date.format("MM/DD/YYYY") === this.dateFromLabel) {
                        this.dateFromSelected = date.valueOf();
                    }
                    else {
                        this.dateFromLabel = moment(this.dateFromSelected).format("MM/DD/YYYY");
                    }
                },
                dateToInputSubmit: function() {
                    var date = moment(this.dateToLabel, "MM/DD/YYYY");
                    if (date.format("MM/DD/YYYY") === this.dateToLabel) {
                        this.dateToSelected = date.valueOf();
                    }
                    else {
                        this.dateToLabel = moment(this.dateToSelected).format("MM/DD/YYYY");
                    }
                }
            },
            template: '<div class="cly-vue-global-date-selector-w help-zone-vs">\n' +
                            '<div class="calendar inst-date-picker-button" @click="toggle" v-bind:class="{active: isOpened}" >\n' +
                                '<i class="material-icons">date_range</i>\n' +
                                '<span class="inst-selected-date">{{currentPeriodLabel}}</span>\n' +
                                '<span class="down ion-chevron-down"></span>\n' +
                                '<span class="up ion-chevron-up"></span>\n' +
                            '</div>\n' +
                            '<div class="inst-date-picker" v-show="isOpened">\n' +
                                '<div class="date-selector-buttons">\n' +
                                    '<div class="button date-selector" v-for="item in fixedPeriods" :key="item.value" v-bind:class="{active: currentPeriod == item.value}" @click="setPeriod(item.value)">{{item.name}}</div>\n' +
                                    '<div class="button-container">\n' +
                                        '<div class="icon-button green inst-date-submit" @click="setCustomPeriod()">{{i18n("common.apply")}}</div>\n' +
                                        '<div class="icon-button inst-date-cancel" @click="cancel()">{{i18n("common.cancel")}}</div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                                '<div class="calendar-container">\n' +
                                    '<table>\n' +
                                        '<tr>\n' +
                                            '<td class="calendar-block">\n' +
                                                '<div class="calendar inst-date-from" ref="instDateFrom"></div>\n' +
                                            '</td>\n' +
                                            '<td class="calendar-block">\n' +
                                                '<div class="calendar inst-date-to" ref="instDateTo"></div>\n' +
                                            '</td>\n' +
                                        '</tr>\n' +
                                        '<tr>\n' +
                                            '<td class="calendar-block">\n' +
                                                '<input type="text" class="calendar-input-field inst-date-from-input" v-model="dateFromLabel" @keyup.enter="dateFromInputSubmit"></input><span class="date-input-label">{{i18n("common.from")}}</span>\n' +
                                            '</td>\n' +
                                            '<td class="calendar-block">\n' +
                                                '<input type="text" class="calendar-input-field inst-date-to-input" v-model="dateToLabel" @keyup.enter="dateToInputSubmit"></input><span class="date-input-label">{{i18n("common.to")}}</span>\n' +
                                            '</td>\n' +
                                        '</tr>\n' +
                                    '</table>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-radio", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                value: {required: true, default: -1, type: [ String, Number ]},
                items: {
                    required: true,
                    type: Array,
                    default: function() {
                        return [];
                    }
                },
                skin: { default: "main", type: String},
                disabled: {type: Boolean, default: false}
            },
            computed: {
                topClasses: function() {
                    var classes = [];
                    if (["main", "light"].indexOf(this.skin) > -1) {
                        classes.push("radio-" + this.skin + "-skin");
                    }
                    else {
                        classes.push("radio-main-skin");
                    }
                    if (this.disabled) {
                        classes.push("disabled");
                    }
                    return classes;
                }
            },
            methods: {
                setValue: function(e) {
                    if (!this.disabled) {
                        this.$emit('input', e);
                    }
                }
            },
            template: '<div class="cly-vue-radio" v-bind:class="topClasses">\n' +
                            '<div class="radio-wrapper">\n' +
                                '<div @click="setValue(item.value)" v-for="(item, i) in items" :key="i" :class="{\'selected\': value == item.value}" class="radio-button">\n' +
                                    '<div class="box"></div>\n' +
                                    '<div class="text">{{item.label}}</div>\n' +
                                    '<div class="description">{{item.description}}</div>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-generic-radio", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                value: {required: true, default: -1, type: [ String, Number ]},
                items: {
                    required: true,
                    type: Array,
                    default: function() {
                        return [];
                    }
                },
                skin: { default: "main", type: String},
            },
            computed: {
                skinClass: function() {
                    if (["main", "light"].indexOf(this.skin) > -1) {
                        return "generic-radio-" + this.skin + "-skin";
                    }
                    return "generic-radio-main-skin";
                }
            },
            methods: {
                setValue: function(e) {
                    this.$emit('input', e);
                }
            },
            template: '<div class="cly-vue-generic-radio" v-bind:class="[skinClass]">\n' +
                            '<div class="generic-radio-wrapper">\n' +
                                '<div @click="setValue(item.value)" v-for="(item, i) in items" :key="i" :class="{\'selected\': value == item.value}">\n' +
                                    '<div class="button-area">\n' +
                                        '<div class="component"><component :is="item.cmp" /></div>\n' +
                                        '<div class="text">{{item.label}}</div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-text-field", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                value: {required: true, type: [ String, Number ], default: ''},
                removable: {type: Boolean, default: false},
                removeText: {type: String, default: ''},
                disabled: {type: Boolean, default: false}
            },
            methods: {
                setValue: function(e) {
                    this.$emit('input', e);
                },
                removeMe: function() {
                    this.$emit('remove-me');
                }
            },
            computed: {
                defaultListeners: function() {
                    return objectWithoutProperties(this.$listeners, ["input"]);
                },
                innerRemoveText: function() {
                    if (this.removeText) {
                        return this.removeText;
                    }
                    return this.i18n("common.remove");
                }
            },
            template: '<div class="cly-vue-text-field">\n' +
                            '<div class="remove-button"\n' +
                                'v-if="removable && !disabled"\n' +
                                '@click="removeMe">\n' +
                                '{{innerRemoveText}}\n' +
                            '</div>\n' +
                            '<input type="text" class="input"\n' +
                                'v-on="defaultListeners" v-bind="$attrs"\n' +
                                'v-bind:value="value"\n' +
                                'v-bind:disabled="disabled"\n' +
                                'v-on:input="setValue($event.target.value)">\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-check", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                value: {default: false, type: Boolean},
                label: {type: String, default: ''},
                skin: { default: "switch", type: String},
                disabled: {type: Boolean, default: false}
            },
            computed: {
                topClasses: function() {
                    var classes = [];
                    if (["switch", "tick", "star"].indexOf(this.skin) > -1) {
                        classes.push("check-" + this.skin + "-skin");
                    }
                    else {
                        classes.push("check-switch-skin");
                    }
                    if (this.disabled) {
                        classes.push("disabled");
                    }
                    return classes;
                },
                labelClass: function() {
                    return this.getClass(this.value);
                }
            },
            methods: {
                setValue: function(e) {
                    if (!this.disabled) {
                        this.$emit('input', e);
                    }
                },
                getClass: function(value) {
                    var classes = ["check-label"];
                    if (this.skin === "tick") {
                        classes.push("fa");
                        if (value) {
                            classes.push("fa-check-square");
                        }
                        else {
                            classes.push("fa-square-o");
                        }
                    }
                    else if (this.skin === "star") {
                        classes.push("ion-icons");
                        if (value) {
                            classes.push("ion-android-star");
                        }
                        else {
                            classes.push("ion-android-star-outline");
                        }
                    }
                    return classes;
                }
            },
            template: '<div class="cly-vue-check" v-bind:class="topClasses">\n' +
                            '<div class="check-wrapper">\n' +
                                '<input type="checkbox" class="check-checkbox" :checked="value">\n' +
                                '<div v-bind:class="labelClass" @click.stop="setValue(!value)"></div>\n' +
                                '<span v-if="label" class="check-text" @click.stop="setValue(!value)">{{label}}</span>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-check-list", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                value: {
                    default: function() {
                        return [];
                    },
                    type: Array
                },
                items: {
                    default: function() {
                        return [];
                    },
                    type: Array
                },
                skin: { default: "switch", type: String}
            },
            computed: {
                uncompressed: function() {
                    return this.getUncompressed();
                }
            },
            methods: {
                getUncompressed: function() {
                    var self = this;
                    return this.items.map(function(item) {
                        return self.value.indexOf(item.value) > -1;
                    });
                },
                setValue: function(value, status) {
                    var self = this;
                    var newArray = null;
                    if (status && self.value.indexOf(value) === -1) {
                        newArray = self.value.slice();
                        newArray.push(value);
                    }
                    else if (!status && self.value.indexOf(value) > -1) {
                        newArray = self.value.slice().filter(function(item) {
                            return item !== value;
                        });
                    }
                    if (newArray) {
                        this.$emit('input', newArray);
                    }
                }
            },
            template: '<div class="cly-vue-check-list">\n' +
                            '<cly-check v-for="(item, i) in items" :key="i" v-bind:skin="skin" v-bind:label="item.label" v-bind:value="uncompressed[i]" v-on:input="setValue(item.value, $event)">\n' +
                            '</cly-check>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-button", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                label: {type: String, default: ''},
                skin: { default: "green", type: String},
                disabled: {type: Boolean, default: false}
            },
            computed: {
                activeClasses: function() {
                    var classes = [this.skinClass];
                    if (this.disabled) {
                        classes.push("disabled");
                    }
                    return classes;
                },
                skinClass: function() {
                    if (["green", "light", "orange"].indexOf(this.skin) > -1) {
                        return "button-" + this.skin + "-skin";
                    }
                    return "button-light-skin";
                }
            },
            template: '<div class="cly-vue-button" v-bind:class="activeClasses" v-on="$listeners">{{label}}</div>'
        }
    ));

    Vue.component("cly-text-area", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                value: {required: true, type: [ String, Number ], default: ''}
            },
            methods: {
                setValue: function(e) {
                    this.$emit('input', e);
                }
            },
            computed: {
                defaultListeners: function() {
                    return objectWithoutProperties(this.$listeners, ["input"]);
                }
            },
            template: '<textarea class="cly-vue-text-area"\n' +
                            'v-bind="$attrs"\n' +
                            'v-on="defaultListeners"\n' +
                            ':value="value"\n' +
                            '@input="setValue($event.target.value)">\n' +
                        '</textarea>'
        }
    ));

    Vue.component("cly-select-n", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                value: {
                    type: [Object, String, Number, Boolean],
                    default: function() {
                        return { name: "", value: null };
                    }
                },
                items: {
                    type: Array,
                    default: function() {
                        return [];
                    }
                },
                placeholder: { type: String, default: '' },
                dynamicItems: { type: Boolean, default: false },
                disabled: { type: Boolean, default: false },
                aligned: { type: String, default: "left" },
                skin: { type: String, default: 'default' },
                listDelayWarning: {type: String, default: null}
            },
            mounted: function() {
                $(this.$refs.scrollable).slimScroll({
                    height: '100%',
                    start: 'top',
                    wheelStep: 10,
                    position: 'right',
                    disableFadeOut: true
                });
            },
            data: function() {
                return {
                    tempSearchQuery: "", // in-sync search query value
                    searchQuery: "", // debounced search query value
                    navigatedIndex: null,
                    opened: false,
                    waitingItems: false,
                    hasFocus: false,
                    scroller: null
                };
            },
            computed: {
                selectedItem: function() {
                    return this.value;
                },
                searchable: function() {
                    return this.items.length > 10 || this.dynamicItems;
                },
                containerClasses: function() {
                    var classes = [];
                    if (this.opened) {
                        classes.push("active");
                    }
                    if (this.dynamicItems) {
                        classes.push("dynamic-items");
                    }
                    if (this.disabled) {
                        classes.push("disabled");
                    }
                    if (["default", "slim"].indexOf(this.skin) > -1) {
                        classes.push("select-" + this.skin + "-skin");
                    }
                    else {
                        classes.push("select-default-skin");
                    }
                    if (["left", "center", "right"].indexOf(this.aligned) > -1) {
                        classes.push("select-aligned-" + this.aligned);
                    }
                    else {
                        classes.push("select-aligned-left");
                    }
                    return classes;
                },
                dropClasses: function() {
                    var classes = ["drop"];
                    if (this.skin !== "slim") {
                        classes.push("combo");
                    }

                    return classes;
                },
                visibleItems: function() {
                    var self = this;
                    if (!this.dynamicItems && this.tempSearchQuery && this.tempSearchQuery !== "") {
                        var visible = this.items.map(function() {
                            return false;
                        });
                        var loweredQuery = self.tempSearchQuery.toLowerCase();
                        this.items.forEach(function(item, idx) {
                            if (Object.prototype.hasOwnProperty.call(item, "value")) {
                                if (item.name.toLowerCase().indexOf(loweredQuery) > -1) {
                                    visible[idx] = true;
                                    if (self.groupIndex[idx] > -1) {
                                        visible[self.groupIndex[idx]] = true;
                                    }
                                }
                            }
                        });
                        return this.items.filter(function(item, idx) {
                            return visible[idx];
                        });
                    }
                    else if (this.dynamicItems && this.waitingItems) {
                        // blocked for search event to complete
                        return [];
                    }
                    else {
                        return this.items;
                    }
                },
                groupIndex: function() {
                    var index = [],
                        currentGroup = -1,
                        self = this;

                    this.items.forEach(function(item, idx) {
                        if (self.isItemGroup(item)) {
                            currentGroup = idx;
                            index.push(-1);
                        }
                        else {
                            index.push(currentGroup);
                        }
                    });
                    return index;
                },
                isKeyboardNavAvailable: function() {
                    return this.opened && this.hasFocus;
                }
            },
            methods: {
                setItem: function(item) {
                    if (!this.isItemGroup(item)) {
                        this.$emit("input", item);
                        this.opened = false;
                    }
                },
                close: function() {
                    this.opened = false;
                },
                fireDynamicSearch: function() {
                    if (this.dynamicItems) {
                        this.waitingItems = true;
                        this.$emit("search", this.searchQuery);
                    }
                },
                toggle: function() {
                    if (!this.disabled) {
                        this.opened = !this.opened;
                    }
                },
                findItemByValue: function(value) {
                    var found = this.items.filter(function(item) {
                        return item.value === value;
                    });
                    if (found.length > 0) {
                        return found[0];
                    }
                    return null;
                },
                selectNavigatedElement: function() {
                    if (this.navigatedIndex !== null && this.navigatedIndex < this.visibleItems.length) {
                        this.setItem(this.visibleItems[this.navigatedIndex]);
                    }
                },
                setNavigatedIndex: function(navigatedIndex) {
                    this.navigatedIndex = navigatedIndex;
                },
                scrollToNavigatedIndex: function() {
                    var self = this,
                        $scrollable = $(self.$refs.scrollable);

                    if (self.navigatedIndex !== null && $scrollable) {
                        var y = ($scrollable.scrollTop() + $(self.$refs["tmpItemRef_" + self.navigatedIndex]).position().top) + "px";
                        $scrollable.slimScroll({scrollTo: y});
                    }
                },
                isItemGroup: function(element) {
                    if (!Object.prototype.hasOwnProperty.call(element, "value")) {
                        return true;
                    }
                    if (element.group) {
                        return true;
                    }
                    return false;
                },
                getNextNonGroupIndex: function(startFrom, direction) {
                    for (var offset = 0; offset < this.visibleItems.length; offset++) {
                        var current = (direction * offset + startFrom);
                        if (current < 0) {
                            current = this.visibleItems.length + current;
                        }
                        current = current % this.visibleItems.length;
                        if (!this.isItemGroup(this.visibleItems[current])) {
                            return current;
                        }
                    }
                },
                upKeyEvent: function() {
                    if (!this.isKeyboardNavAvailable) {
                        return;
                    }

                    if (this.navigatedIndex === null) {
                        this.navigatedIndex = this.visibleItems.length - 1;
                    }
                    else {
                        this.navigatedIndex = this.getNextNonGroupIndex(this.navigatedIndex - 1, -1);
                    }

                    this.scrollToNavigatedIndex();
                },
                downKeyEvent: function() {
                    if (!this.isKeyboardNavAvailable) {
                        return;
                    }

                    if (this.navigatedIndex === null) {
                        this.navigatedIndex = 0;
                    }
                    else {
                        this.navigatedIndex = this.getNextNonGroupIndex(this.navigatedIndex + 1, 1);
                    }

                    this.scrollToNavigatedIndex();
                },
                escKeyEvent: function() {
                    if (this.navigatedIndex === null && this.opened) {
                        this.close();
                        return;
                    }
                    else if (this.navigatedIndex !== null) {
                        this.navigatedIndex = null;
                    }
                },
                enterKeyEvent: function() {
                    if (this.navigatedIndex === null) {
                        return;
                    }

                    this.selectNavigatedElement();
                }
            },
            watch: {
                value: {
                    immediate: true,
                    handler: function(passedValue) {
                        if (typeof passedValue !== 'object') {
                            var item = this.findItemByValue(passedValue);
                            if (item) {
                                this.setItem(item);
                            }
                            else {
                                this.setItem({name: passedValue, value: passedValue});
                            }
                        }
                    }
                },
                opened: function(newValue) {
                    if (!newValue) {
                        this.tempSearchQuery = "";
                        this.searchQuery = "";
                        this.navigatedIndex = null;
                    }
                },
                tempSearchQuery: _.debounce(function(newVal) {
                    this.searchQuery = newVal;
                }, 500),
                searchQuery: function() {
                    this.fireDynamicSearch();
                },
                items: {
                    immediate: true,
                    handler: function() {
                        this.waitingItems = false;
                    }
                },
                visibleItems: function() {
                    this.navigatedIndex = null; // reset navigation on visible items change
                }
            },
            template: '<div class="cly-vue-select"\n' +
                            'v-bind:class="containerClasses"\n' +
                            'v-click-outside="close"\n' +
                            '@keydown.up.prevent="upKeyEvent"\n' +
                            '@keydown.down.prevent="downKeyEvent"\n' +
                            '@keydown.esc="escKeyEvent"\n' +
                            '@keydown.enter="enterKeyEvent">\n' +
                            '<div class="select-inner" @click="toggle">\n' +
                                '<div class="text-container">\n' +
                                    '<div v-if="selectedItem" class="text">\n' +
                                        '<span>{{selectedItem.name}}</span>\n' +
                                    '</div>\n' +
                                    '<div v-if="!selectedItem" class="text">\n' +
                                        '<span class="text-light-gray">{{placeholder}}</span>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                                '<div :class="dropClasses"></div>\n' +
                            '</div>\n' +
                            '<div class="search" v-if="searchable" v-show="opened">\n' +
                                '<div class="inner">\n' +
                                '<input type="search"\n' +
                                    '@focus="hasFocus = true"\n' +
                                    'v-model="tempSearchQuery"/>\n' +
                                '<i class="fa fa-search"></i>\n' +
                                '</div>\n' +
                            '</div>\n' +
                            '<div class="items-list square" v-show="opened">\n' +
                                '<div ref="scrollable" class="scrollable">\n' +
                                    '<div class="warning" v-if="dynamicItems && listDelayWarning">{{ listDelayWarning }}</div>\n' +
                                    '<div v-for="(item, i) in visibleItems" :key="i"\n' +
                                        '@mouseover="setNavigatedIndex(i)"\n' +
                                        '@mouseleave="setNavigatedIndex(null)"\n' +
                                        '@click="setItem(item)"\n' +
                                        ':ref="\'tmpItemRef_\' + i"\n' +
                                        ':class="{item: !isItemGroup(item), group : isItemGroup(item), navigated: i === navigatedIndex}">\n' +
                                        '<div v-if="isItemGroup(item)">\n' +
                                            '<span v-text="item.name"></span>\n' +
                                        '</div>\n' +
                                        '<div v-else v-bind:data-value="item.value">\n' +
                                            '<span v-text="item.name"></span>\n' +
                                        '</div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-dropzone", window.vue2Dropzone);

    var AbstractListBox = countlyVue.components.BaseComponent.extend({
        props: {
            options: {type: Array},
            bordered: {type: Boolean, default: true}
        },
        methods: {
            navigateOptions: function() {
                if (!this.visible) {
                    this.visible = true;
                }
            },
            handleItemClick: function(option) {
                this.$emit("input", option.value);
                this.$emit("change", option.value);
            },
            handleItemHover: function(option) {
                this.hovered = option.value;
            },
            handleBlur: function() {
                this.hovered = this.value;
                this.focused = false;
            },
            handleHover: function() {
                this.focused = true;
            }
        },
        data: function() {
            return {
                hovered: null,
                focused: false
            };
        }
    });

    Vue.component("cly-listbox", AbstractListBox.extend({
        props: {
            value: { type: [String, Number] }
        },
        template: '<div\
                    class="cly-vue-listbox"\
                    tabindex="0"\
                    :class="{ \'is-focus\': focused, \'cly-vue-listbox--bordered\': bordered }"\
                    @mouseenter="handleHover"\
                    @mouseleave="handleBlur"\
                    @focus="handleHover"\
                    @blur="handleBlur">\
                    <el-scrollbar\
                        v-if="options.length > 0"\
                        tag="ul"\
                        wrap-class="el-select-dropdown__wrap"\
                        view-class="el-select-dropdown__list">\
                        <li\
                            tabindex="0"\
                            class="el-select-dropdown__item"\
                            :class="{\'selected\': value === option.value, \'hover\': hovered === option.value}"\
                            :key="option.value"\
                            @focus="handleItemHover(option)"\
                            @mouseenter="handleItemHover(option)"\
                            @keyup.enter="handleItemClick(option)"\
                            @click.stop="handleItemClick(option)"\
                            v-for="option in options">\
                            <span>{{option.label}}</span>\
                        </li>\
                    </el-scrollbar>\
                    <div v-else class="cly-vue-listbox__no-data">\
                        No data\
                    </div>\
                </div>'
    }));

    Vue.component("cly-checklistbox", AbstractListBox.extend({
        props: {
            value: {
                type: Array,
                default: function() {
                    return [];
                }
            }
        },
        computed: {
            innerValue: {
                get: function() {
                    return this.value;
                },
                set: function(newVal) {
                    this.$emit("input", newVal);
                    this.$emit("change", newVal);
                }
            }
        },
        template: '<div\
                    class="cly-vue-listbox"\
                    tabindex="0"\
                    :class="{ \'is-focus\': focused, \'cly-vue-listbox--bordered\': bordered }"\
                    @mouseenter="handleHover"\
                    @mouseleave="handleBlur"\
                    @focus="handleHover"\
                    @blur="handleBlur">\
                    <el-scrollbar\
                        v-if="options.length > 0"\
                        tag="ul"\
                        wrap-class="el-select-dropdown__wrap"\
                        view-class="el-select-dropdown__list">\
                        <el-checkbox-group\
                            v-model="innerValue">\
                            <li\
                                class="el-select-dropdown__item"\
                                :key="option.value"\
                                v-for="option in options">\
                                <el-checkbox :label="option.value" :key="option.value">{{option.label}}</el-checkbox>\
                            </li>\
                        </el-checkbox-group>\
                    </el-scrollbar>\
                    <div v-else class="cly-vue-listbox__no-data">\
                        No data\
                    </div>\
                </div>'
    }));

    var TabbedOptionsMixin = {
        props: {
            options: {type: Array},
            hideDefaultTabs: {type: Boolean, default: false},
            allPlaceholder: {type: String, default: 'All'},
        },
        data: function() {
            return {
                activeTabId: ''
            };
        },
        computed: {
            hasTabs: function() {
                if (!this.options || !this.options.length) {
                    return false;
                }
                return !!this.options[0].options;
            },
            publicTabs: function() {
                if (this.hasTabs && !this.hideAllOptions) {
                    var allOptions = {
                        name: "__all",
                        label: this.allPlaceholder,
                        options: this.flatOptions
                    };
                    return [allOptions].concat(this.options);
                }
                else if (this.hasTabs) {
                    return this.options;
                }
                return [{
                    name: "__root",
                    label: "__root",
                    options: this.options
                }];
            },
            flatOptions: function() {
                if (!this.hasTabs || !this.options.length) {
                    return this.options;
                }
                return this.options.reduce(function(items, tab) {
                    return items.concat(tab.options);
                }, []);
            },
            val2tab: function() {
                if (!this.publicTabs.length) {
                    return {};
                }
                return this.publicTabs.reduce(function(items, tab) {
                    tab.options.forEach(function(opt) {
                        items[opt.value] = tab.name;
                    });
                    return items;
                }, {});
            },
            selectedOptions: function() {
                if (!this.flatOptions.length) {
                    return {};
                }
                var self = this;
                if (Array.isArray(this.value)) {
                    return this.flatOptions.filter(function(item) {
                        return self.value.indexOf(item.value) > -1;
                    });
                }
                else {
                    var matching = this.flatOptions.filter(function(item) {
                        return item.value === self.value;
                    });
                    if (matching.length) {
                        return matching[0];
                    }
                }
                return {};
            }
        },
        methods: {
            updateTabFn: function(tabId) {
                this.activeTabId = tabId;
            },
            determineActiveTabId: function() {
                var self = this;
                this.$nextTick(function() {
                    if (!self.hasTabs) {
                        self.activeTabId = "__root";
                    }
                    else if (self.value && self.val2tab[self.value]) {
                        self.activeTabId = self.val2tab[self.value];
                    }
                    else {
                        self.activeTabId = "__all";
                    }
                });
            },
        }
    };

    var SearchableOptionsMixin = {
        props: {
            searchDisabled: {type: Boolean, default: false},
            searchPlaceholder: {type: String, default: 'Search'}
        },
        data: function() {
            return {
                searchQuery: ''
            };
        },
        methods: {
            getMatching: function(options) {
                if (!this.searchQuery || this.searchDisabled) {
                    return options;
                }
                var self = this;
                var query = self.searchQuery.toLowerCase();
                return options.filter(function(option) {
                    return option.label.toLowerCase().indexOf(query) > -1;
                });
            }
        }
    };

    Vue.component("cly-select-x", countlyVue.components.BaseComponent.extend({
        mixins: [TabbedOptionsMixin, SearchableOptionsMixin],
        template: '<cly-input-dropdown\
                        class="cly-vue-select-x"\
                        ref="dropdown"\
                        :placeholder="placeholder"\
                        @show="focusOnSearch"\
                        v-bind="$attrs"\
                        :selected-options="selectedOptions">\
                        <div class="cly-vue-select-x__pop" :class="{\'cly-vue-select-x__pop--hidden-tabs\': hideDefaultTabs || !hasTabs }">\
                            <div class="cly-vue-select-x__header">\
                                <div class="cly-vue-select-x__title" v-if="title">{{title}}</div>\
                                <div class="cly-vue-select-x__header-slot" v-if="!!$scopedSlots.header">\
                                    <slot name="header" :active-tab-id="activeTabId" :tabs="publicTabs" :update-tab="updateTabFn"></slot>\
                                </div>\
                                <el-input\
                                    v-if="!searchDisabled"\
                                    ref="searchBox"\
                                    v-model="searchQuery"\
                                    @keydown.native.esc.stop.prevent="doClose" \
                                    :placeholder="searchPlaceholder">\
                                    <i slot="prefix" class="el-input__icon el-icon-search"></i>\
                                </el-input>\
                            </div>\
                            <el-tabs\
                                v-model="activeTabId"\
                                @keydown.native.esc.stop.prevent="doClose">\
                                <el-tab-pane :name="tab.name" :key="tab.name" v-for="tab in publicTabs">\
                                    <span slot="label">\
                                        {{tab.label}}\
                                    </span>\
                                    <cly-listbox\
                                        v-if="mode === \'single-list\'"\
                                        :bordered="false"\
                                        :options="getMatching(tab.options)"\
                                        @change="handleValueChange"\
                                        v-model="innerValue">\
                                    </cly-listbox>\
                                    <cly-checklistbox\
                                        v-if="mode === \'multi-check\'"\
                                        :bordered="false"\
                                        :options="getMatching(tab.options)"\
                                        @change="handleValueChange"\
                                        v-model="innerValue">\
                                    </cly-checklistbox>\
                                </el-tab-pane>\
                            </el-tabs>\
                        </div>\
                    </cly-input-dropdown>',
        props: {
            title: {type: String, default: ''},
            placeholder: {type: String, default: 'Select'},
            value: { type: [String, Number, Array] },
            mode: {type: String, default: 'single-list'} // multi-check
        },
        computed: {
            innerValue: {
                get: function() {
                    return this.value;
                },
                set: function(newVal) {
                    this.$emit("input", newVal);
                }
            }
        },
        mounted: function() {
            this.determineActiveTabId();
        },
        methods: {
            handleValueChange: function() {
                if (this.mode === 'single-list') {
                    this.doClose();
                }
            },
            doClose: function() {
                this.determineActiveTabId();
                this.$refs.dropdown.handleClose();
            },
            updateDropdown: function() {
                this.$refs.dropdown.updateDropdown();
            },
            focusOnSearch: function() {
                var self = this;
                this.$nextTick(function() {
                    self.$refs.searchBox.focus();
                });
            }
        },
        watch: {
            searchQuery: function() {
                this.updateDropdown();
            },
            activeTabId: function() {
                this.updateDropdown();
            }
        }
    }));

}(window.countlyVue = window.countlyVue || {}, jQuery));
