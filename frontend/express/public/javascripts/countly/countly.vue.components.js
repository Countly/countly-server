/* global countlyCommon, moment, jQuery, Vue, Vuex, T, countlyView, CountlyHelpers, _ */

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
                        value: this.inputType.toLowerCase() === "number" ? parseInt(e.target.value) : e.target.value,
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

    Vue.directive('click-outside', {
        bind: function(el, binding, vnode) {
            el.clickOutsideEvent = function(event) {
                if (!(el === event.target || el.contains(event.target))) {
                    vnode.context[binding.expression](event);
                }
            };
            document.body.addEventListener('click', el.clickOutsideEvent);
        },
        unbind: function(el) {
            document.body.removeEventListener('click', el.clickOutsideEvent);
        }
    });

    /*
        Countly + Vue.js
    */

    var autoRefreshMixin = {
        mounted: function() {
            var self = this;
            this.$root.$on("cly-refresh", function() {
                self.refresh();
            });
        },
        methods: {
            refresh: function() {}
        }
    };

    var i18nMixin = {
        methods: {
            i18n: function() {
                return jQuery.i18n.prop.apply(null, arguments);
            }
        }
    };

    var refreshOnParentActiveMixin = {
        watch: {
            isParentActive: function(newState) {
                if (newState) {
                    this.refresh();
                }
            }
        },
        methods: {
            refresh: function() {}
        }
    };

    var hasDrawersMixin = function(names) {
        return {
            data: function() {
                return {
                    drawers: names.reduce(function(acc, val) {
                        acc[val] = {
                            isOpened: false,
                            editedObject: {}
                        };
                        return acc;
                    }, {})
                };
            },
            methods: {
                openDrawer: function(name, editedObject) {
                    this.loadDrawer(name, editedObject);
                    this.drawers[name].isOpened = true;
                },
                loadDrawer: function(name, editedObject) {
                    this.drawers[name].editedObject = editedObject || {};
                },
                closeDrawer: function(name) {
                    this.drawers[name].isOpened = false;
                }
            }
        };
    };

    var _mixins = {
        'autoRefresh': autoRefreshMixin,
        'refreshOnParentActive': refreshOnParentActiveMixin,
        'i18n': i18nMixin,
        'hasDrawers': hasDrawersMixin
    };

    var _globalVuexStore = new Vuex.Store({
        modules: {
            countlyCommon: {
                namespaced: true,
                state: {
                    period: countlyCommon.getPeriod(),
                    periodLabel: countlyCommon.getDateRangeForCalendar()
                },
                getters: {
                    period: function(state) {
                        return state.period;
                    },
                    periodLabel: function(state) {
                        return state.periodLabel;
                    }
                },
                mutations: {
                    setPeriod: function(state, period) {
                        state.period = period;
                    },
                    setPeriodLabel: function(state, periodLabel) {
                        state.periodLabel = periodLabel;
                    }
                },
                actions: {
                    updatePeriod: function(context, obj) {
                        context.commit("setPeriod", obj.period);
                        context.commit("setPeriodLabel", obj.label);
                    }
                }
            }
        }
    });

    var _vuex = {
        getGlobalStore: function() {
            return _globalVuexStore;
        },
        registerGlobally: function(wrapper, force) {
            var store = _globalVuexStore;
            if (!store.hasModule(wrapper.name) || force) {
                store.registerModule(wrapper.name, wrapper.module);
            }
        }
    };

    var countlyVueWrapperView = countlyView.extend({
        constructor: function(opts) {
            this.component = opts.component;
            this.defaultArgs = opts.defaultArgs;
            this.vuex = opts.vuex;
            this.templates = opts.templates;
            this.elementsToBeRendered = [];
        },
        beforeRender: function() {
            var self = this;
            if (this.templates) {
                var templatesDeferred = [];
                for (var name in this.templates.mapping) {
                    var fileName = this.templates.mapping[name];
                    var elementId = self.templates.namespace + "-" + name;
                    templatesDeferred.push(function(fName, elId) {
                        return T.get(fName, function(src) {
                            self.elementsToBeRendered.push("<script type='text/x-template' id='" + elId + "'>" + src + "</script>");
                        });
                    }(fileName, elementId));
                }
                return $.when.apply(null, templatesDeferred);
            }
            return true;
        },
        renderCommon: function(isRefresh) {
            if (!isRefresh) {
                $(this.el).html("<div class='cly-vue-theme-clydef'><div class='vue-wrapper'></div><div id='vue-templates'></div></div>");
                this.elementsToBeRendered.forEach(function(el) {
                    $("#vue-templates").append(el);
                });
            }
        },
        refresh: function() {
            var self = this;
            if (self.vm) {
                self.vm.$emit("cly-refresh");
            }
        },
        afterRender: function() {
            var el = $(this.el).find('.vue-wrapper').get(0),
                self = this;

            if (self.vuex) {
                self.vuex.forEach(function(item) {
                    _vuex.registerGlobally(item.clyModel.getVuexModule());
                });
            }

            self.vm = new Vue({
                el: el,
                store: _vuex.getGlobalStore(),
                render: function(h) {
                    if (self.defaultArgs) {
                        return h(self.component, { attrs: self.defaultArgs });
                    }
                    else {
                        return h(self.component);
                    }
                }
            });

            self.vm.$on("cly-date-change", function() {
                self.vm.$emit("cly-refresh");
            });
        },
        destroy: function() {
            var self = this;
            self.elementsToBeRendered = [];
            if (self.vm) {
                self.vm.$destroy();
            }
        }
    });

    var _uniqueComponentId = 0;

    var countlyBaseComponent = Vue.extend({
        beforeCreate: function() {
            this.ucid = _uniqueComponentId.toString();
            _uniqueComponentId += 1;
        },
        computed: {
            componentId: function() {
                return "cly-cmp-" + _uniqueComponentId;
            }
        }
    });

    var countlyBaseView = countlyBaseComponent.extend({
        mixins: [
            _mixins.autoRefresh,
            _mixins.i18n
        ],
        props: {
            name: { type: String, default: null},
            id: { type: String, default: null }
        },
        computed: {
            isParentActive: function() {
                return this.$parent.isActive !== false;
            },
            vName: function() {
                return this.name;
            },
            vId: function() {
                return this.id;
            }
        }
    });

    var _components = {
        BaseDrawer: countlyBaseComponent.extend({
            template: '<div class="cly-vue-drawer" v-bind:class="{open: isOpened}">\
                            <div class="title">\
                                <span>{{title}}</span>\
                                <div class="close" v-on:click="tryClosing">\
                                    <i class="ion-ios-close-empty"></i>\
                                </div>\
                            </div>\
                            <div class="steps-header" v-if="isMultiStep">\
                                <div class="label" v-bind:class="{active: i === currentStepIndex,  passed: i < currentStepIndex}" v-for="(currentContent, i) in stepContents" :key="i">\
                                    <div class="wrapper">\
                                        <span class="index">{{i + 1}}</span>\
                                        <span class="done-icon"><i class="fa fa-check"></i></span>\
                                        <span class="text">{{currentContent.name}}</span>\
                                    </div>\
                                </div>\
                            </div>\
                            <div class="details">\
                                <slot></slot>\
                            </div>\
                            <div class="buttons multi-step" v-if="isMultiStep">\
                                <cly-button @click="nextStep" skin="green" label="Next step"></cly-button>\
                                <cly-button @click="prevStep" v-if="currentStepIndex > 0" skin="light" label="Previous step"></cly-button>\
                            </div>\
                            <div class="buttons single-step" v-if="!isMultiStep">\
                                <cly-button @click="nextStep" skin="green" label="Save changes"></cly-button>\
                            </div>\
                        </div>',
            props: {
                isOpened: {type: Boolean, required: true},
                editedObject: {type: Object}
            },
            data: function() {
                return {
                    title: '',
                    internalEdited: this.copyOfEdited(),
                    currentStepIndex: 0,
                    stepContents: []
                };
            },
            computed: {
                activeContentId: function() {
                    if (this.activeContent) {
                        return this.activeContent.tId;
                    }
                    return null;
                },
                activeContent: function() {
                    if (this.currentStepIndex > this.stepContents.length - 1) {
                        return null;
                    }
                    return this.stepContents[this.currentStepIndex];
                },
                isMultiStep: function() {
                    return this.stepContents.length > 1;
                }
            },
            methods: {
                tryClosing: function() {
                    this.$emit("close");
                },
                copyOfEdited: function() {
                    return JSON.parse(JSON.stringify(this.editedObject));
                },
                setStep: function(newIndex) {
                    if (newIndex >= 0 && newIndex < this.stepContents.length) {
                        this.currentStepIndex = newIndex;
                    }
                },
                prevStep: function() {
                    this.setStep(this.currentStepIndex - 1);
                },
                nextStep: function() {
                    this.setStep(this.currentStepIndex + 1);
                },
                afterEditedObjectChanged: function() { },
            },
            mounted: function() {
                this.stepContents = this.$children.filter(function(child) {
                    return child.isContent;
                });
                this.setStep(this.stepContents[0].tId);
            },
            watch: {
                editedObject: function() {
                    this.internalEdited = this.copyOfEdited();
                    this.afterEditedObjectChanged(this.internalEdited);
                }
            }
        })
    };

    var _views = {
        BackboneWrapper: countlyVueWrapperView,
        BaseView: countlyBaseView
    };

    window.countlyVue = {
        mixins: _mixins,
        vuex: _vuex,
        views: _views,
        components: _components
    };

    // New components

    Vue.component("cly-datatable-w", countlyBaseComponent.extend({
        template: '<div class="cly-vue-datatable-w" ref="wrapper">\
                        <div ref="buttonMenu" class="cly-button-menu" tabindex="1" v-if="hasOptions">\
                            <a class="item" @click="optionEvent(optionItem.action)" v-for="(optionItem, j) in optionItems" :key="j"><i :class="optionItem.icon"></i><span>{{optionItem.label}}</span></a>\
                        </div>\
                        <table ref="dtable" cellpadding="0" cellspacing="0" class="d-table-vue-wrapper"></table>\
                    </div>',
        data: function() {
            return {
                isInitialized: false,
                pendingInit: false,
                nLocks: 0,
                tableInstance: null,
                optionItems: [],
                focusedRow: null,
                customActions: null,
                lastCol: 0,
                finalizedNativeColumns: null
            };
        },
        computed: {
            hasOptions: function() {
                return this.optionItems.length > 0;
            },
            isLocked: function() {
                return this.nLocks > 0;
            }
        },
        props: {
            rows: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            columns: { type: Array },
            keyFn: { type: Function, default: null}
        },
        methods: {
            initialize: function() {
                this.pendingInit = true;

                var self = this,
                    nativeColumns = [];

                self.customActions = [];

                this.columns.forEach(function(column) {
                    var nativeColumn = null;
                    if (!column.type) {
                        return;
                    }
                    else if (column.type === "field") {
                        nativeColumn = {
                            "mData": function(row) {
                                return row[column.fieldKey];
                            }
                        };
                    }
                    else if (column.type === "options") {
                        if (self.hasOptions) {
                            //disallow multiple options
                            return;
                        }
                        var checkedItems = (column.items || []).filter(function(item) {
                            return !item.disabled;
                        });
                        if (checkedItems.length === 0) {
                            //ignore empty lists;
                            return;
                        }
                        self.optionItems = checkedItems;
                        nativeColumn = {
                            "mData": function() {
                                return '<a class="cly-list-options"></a>';
                            },
                            "sType": "string",
                            "sClass": "shrink center",
                            "bSortable": false
                        };
                    }
                    else if (column.type === "checkbox") {
                        nativeColumn = {
                            "mData": function(row, type) {
                                if (type === "display") {
                                    var stringBuffer = ['<div class="on-off-switch">'];
                                    var rowId = self.componentId + "-row-" + self.keyFn(row);
                                    if (row[column.fieldKey]) {
                                        stringBuffer.push('<input type="checkbox" class="on-off-switch-checkbox" id="' + rowId + '" checked>');
                                    }
                                    else {
                                        stringBuffer.push('<input type="checkbox" class="on-off-switch-checkbox" id="' + rowId + '">');
                                    }
                                    stringBuffer.push('<label class="on-off-switch-label" for="' + rowId + '"></label>');
                                    stringBuffer.push('</div>');
                                    return stringBuffer.join('');
                                }
                                else {
                                    return row[column.fieldKey];
                                }
                            },
                            "sType": "string",
                            "sClass": "shrink",
                            "bSortable": false
                        };
                        if (column.onChange) {
                            self.customActions.push({
                                "selector": ".on-off-switch-checkbox",
                                "event": "change",
                                "_columnSelector": ".cly-dt-col-" + self.lastCol,
                                "_handlerFn": function() {
                                    var rowEl = $(this).parents("tr");
                                    var cbx = $(this);
                                    var newValue = $(this).is(":checked");
                                    column.onChange(newValue, rowEl.data("cly-row-data"), function(revert) {
                                        if (revert) {
                                            cbx.prop("checked", !newValue);
                                        }
                                    });
                                }
                            });
                        }
                    }
                    else if (column.type === "raw") {
                        nativeColumn = {
                            "mData": column.viewFn
                        };
                        if (column.customActions) {
                            column.customActions.forEach(function(customAction) {
                                self.customActions.push({
                                    "selector": customAction.selector,
                                    "event": customAction.event,
                                    "_columnSelector": ".cly-dt-col-" + self.lastCol,
                                    "_handlerFn": function() {
                                        var rowEl = $(this).parents("tr");
                                        var rowData = rowEl.data("cly-row-data");
                                        self.$emit(customAction.action.event, rowData, function(options) {
                                            if (options.undo) {
                                                self.softAction(rowData, options.undo.message, {
                                                    commit: function() {
                                                        self.$emit(options.undo.commit, rowData);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            });
                        }
                    }

                    if (column.options) {
                        // default mappings to dt
                        if (column.options.dataType) {
                            nativeColumn.sType = column.options.dataType;
                        }
                        if (column.options.title) {
                            nativeColumn.sTitle = column.options.title;
                        }
                    }

                    if (column.dt) {
                        _.extend(nativeColumn, column.dt);
                    }

                    if (!nativeColumn.sClass) {
                        nativeColumn.sClass = "";
                    }
                    nativeColumn.sClass += " cly-dt-col cly-dt-col-" + self.lastCol;
                    self.lastCol++;
                    nativeColumns.push(nativeColumn);
                });

                this.finalizedNativeColumns = nativeColumns;

                this.tableInstance = $(this.$refs.dtable).dataTable($.extend({}, $.fn.dataTable.defaults, {
                    "aaData": this.rows,
                    "aoColumns": nativeColumns,
                    "fnInitComplete": function(oSettings, json) {
                        $.fn.dataTable.defaults.fnInitComplete(oSettings, json);
                        self.$nextTick(function() {
                            CountlyHelpers.initializeTableOptions($(self.$refs.wrapper));
                            self.initializeEventAdapter();
                        });

                        self.isInitialized = true;
                        self.pendingInit = false;
                    },
                    "fnRowCallback": function(nRow, aData) {
                        var rowEl = $(nRow);
                        rowEl.attr("data-cly-row-id", self.keyFn(aData));
                        rowEl.data("cly-row-data", aData);
                    },
                }));

                this.tableInstance.stickyTableHeaders();
            },
            initializeEventAdapter: function() {
                var self = this;

                if (self.hasOptions) {
                    $(self.$refs.buttonMenu).on("cly-list.click", function(event, data) {
                        var rowData = $(data.target).parents("tr").data("cly-row-data");
                        self.focusedRow = rowData;
                    });
                }
                self.customActions.forEach(function(customAction) {
                    $(self.$refs.dtable).find("tbody").on(
                        customAction.event,
                        customAction._columnSelector + " " + customAction.selector,
                        customAction._handlerFn);
                });
            },
            refresh: function() {
                if (this.isLocked) {
                    // for pending undo operations
                    return;
                }
                if (this.isInitialized && !this.pendingInit) {
                    CountlyHelpers.refreshTable(this.tableInstance, this.rows);
                }
                else if (!this.isInitialized && !this.pendingInit) {
                    this.initialize();
                }
            },
            softAction: function(row, message, callbacks) {
                var self = this;
                self.nLocks++;
                var undoRow = $("<tr><td class='undo-row' colspan='" + self.finalizedNativeColumns.length + "'>" + message + "&nbsp;<a>" + jQuery.i18n.map["common.undo"] + "</a></td></tr>");
                var triggeringRow = $(self.tableInstance).find('tbody tr[data-cly-row-id=' + self.keyFn(row) + ']');
                triggeringRow.after(undoRow);
                triggeringRow.hide();
                var commitWrapped = function() {
                    undoRow.remove();
                    self.nLocks--;
                    callbacks.commit();
                    self.refresh();
                };
                var commitTimeout = setTimeout(commitWrapped, 2000);
                undoRow.find('a').click(function() {
                    clearTimeout(commitTimeout);
                    undoRow.remove();
                    self.nLocks--;
                    triggeringRow.show();
                    if (callbacks.undo) {
                        callbacks.undo();
                    }
                });
            },
            optionEvent: function(action) {
                var self = this,
                    focusedRef = this.focusedRow;

                this.$emit(action.event, focusedRef, function(options) {
                    if (options.undo) {
                        self.softAction(focusedRef, options.undo.message, {
                            commit: function() {
                                self.$emit(options.undo.commit, focusedRef);
                            }
                        });
                    }
                });
            }
        },
        watch: {
            rows: function() {
                this.refresh();
            }
        },
        mounted: function() {
            this.initialize();
        },
        beforeDestroy: function() {
            this.tableInstance.fnDestroy();
        }
    }));

    Vue.component("cly-tabs", countlyBaseComponent.extend({
        template: '<div class="cly-vue-tabs" v-bind:class="[skinClass]">\
                        <ul class="cly-vue-tabs-list" v-bind:class="[numberOfTabsClass]">\
                            <li @click="setTab(tab.tId)" v-for="(tab, i) in tabs" :key="i" :class="{\'is-active\': tab.isActive}">\
                                <a v-html="tab.tName"></a>\
                            </li>\
                        </ul>\
                        <div class="cly-vue-tabs-container">\
                            <slot/>\
                        </div>\
                    </div>',
        mixins: [
            _mixins.i18n
        ],
        data: function() {
            return {
                tabs: []
            };
        },
        props: {
            value: { default: null },
            skin: { default: "main", type: String}
        },
        computed: {
            skinClass: function() {
                if (["main", "graphs"].indexOf(this.skin) > -1) {
                    return "tabs-" + this.skin + "-skin";
                }
                return "tabs-main-skin";
            },
            numberOfTabsClass: function() {
                return "tabs-" + this.tabs.length;
            },
            activeContentId: function() {
                return this.value;
            }
        },
        methods: {
            setTab: function(tId) {
                this.$emit("input", tId);
            }
        },
        mounted: function() {
            this.tabs = this.$children;
            if (!this.value) {
                this.$emit("input", this.tabs[0].tId);
            }
        }
    }));

    Vue.component("cly-content", countlyBaseComponent.extend({
        template: '<div class="cly-vue-content" v-if="isActive || alwaysMounted">\
                        <div v-show="isActive"><slot/></div>\
                    </div>',
        mixins: [
            _mixins.i18n
        ],
        props: {
            name: { type: String, default: null},
            id: { type: String, default: null },
            alwaysMounted: { type: Boolean, default: true }
        },
        data: function() {
            return {
                isContent: true
            }
        },
        computed: {
            isActive: function() {
                return this.$parent.activeContentId === this.id;
            },
            tName: function() {
                return this.name;
            },
            tId: function() {
                return this.id;
            }
        }
    }));

    Vue.component("cly-panel", countlyBaseComponent.extend({
        template: '<div class="cly-vue-panel widget">\
                        <div class="widget-header">\
                            <div class="left">\
                                <div>\
                                    <slot name="left-top">\
                                        <div class="title">{{title}}</div>\
                                    </slot>\
                                </div>\
                            </div>\
                            <div class="right">\
                                <slot name="right-top">\
                                    <cly-global-date-selector-w v-once v-if="dateSelector"></cly-global-date-selector-w>\
                                </slot>\
                            </div>\
                        </div>\
                        <div class="widget-content help-zone-vb">\
                            <slot/>\
                        </div>\
                    </div>',
        props: {
            title: { type: String, required: true },
            dateSelector: { type: Boolean, required: false, default: true },
        },
    }));

    Vue.component("cly-global-date-selector-w", countlyBaseComponent.extend({
        template: '<div class="cly-vue-global-date-selector-w help-zone-vs">\
                        <div class="calendar inst-date-picker-button" @click="toggle" v-bind:class="{active: isOpened}" >\
                            <i class="material-icons">date_range</i>\
                            <span class="inst-selected-date">{{currentPeriodLabel}}</span>\
                            <span class="down ion-chevron-down"></span>\
                            <span class="up ion-chevron-up"></span>\
                        </div>\
                        <div class="inst-date-picker" v-show="isOpened">\
                            <div class="date-selector-buttons">\
                                <div class="button date-selector" v-for="item in fixedPeriods" :key="item.value" v-bind:class="{active: currentPeriod == item.value}" @click="setPeriod(item.value)">{{item.name}}</div>\
                                <div class="button-container">\
                                    <div class="icon-button green inst-date-submit" @click="setCustomPeriod()">{{i18n("common.apply")}}</div>\
                                    <div class="icon-button inst-date-cancel" @click="cancel()">{{i18n("common.cancel")}}</div>\
                                </div>\
                            </div>\
                            <div class="calendar-container">\
                                <table>\
                                    <tr>\
                                        <td class="calendar-block">\
                                            <div class="calendar inst-date-from" ref="instDateFrom"></div>\
                                        </td>\
                                        <td class="calendar-block">\
                                            <div class="calendar inst-date-to" ref="instDateTo"></div>\
                                        </td>\
                                    </tr>\
                                    <tr>\
                                        <td class="calendar-block">\
                                            <input type="text" class="calendar-input-field inst-date-from-input" v-model="dateFromLabel" @keyup.enter="dateFromInputSubmit"></input><span class="date-input-label">{{i18n("common.from")}}</span>\
                                        </td>\
                                        <td class="calendar-block">\
                                            <input type="text" class="calendar-input-field inst-date-to-input" v-model="dateToLabel" @keyup.enter="dateToInputSubmit"></input><span class="date-input-label">{{i18n("common.to")}}</span>\
                                        </td>\
                                    </tr>\
                                </table>\
                            </div>\
                        </div>\
                    </div>',
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
        beforeDestroy: function() {
            this.dateTo.datepicker('hide').datepicker('destroy');
            this.dateFrom.datepicker('hide').datepicker('destroy');
        }
    }));

    Vue.component("cly-time-graph-w", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        template: '<div class="cly-vue-time-graph-w">\
                        <div ref="container" class="graph-container"></div>\
                        <div class="cly-vue-graph-no-data" v-if="!hasData">\
                            <div class="inner">\
                                <div class="icon"></div>\
                                <div class="text">{{i18n("common.graph.no-data")}}</div>\
                            </div>\
                        </div>\
                    </div>',
        props: {
            dataPoints: {
                required: true,
                type: Array,
                default: function() {
                    return [];
                }
            },
            bucket: { required: false, default: null },
            overrideBucket: { required: false, default: null },
            frozen: {default: false, type: Boolean},
            configPaths: { required: true },
            configSmall: { required: false, default: false },
            configOptions: { required: false, default: null }
        },
        data: function() {
            return {
                options: JSON.parse(JSON.stringify(this.configOptions)),
                paths: JSON.parse(JSON.stringify(this.configPaths)),
                small: JSON.parse(JSON.stringify(this.configSmall))
            };
        },
        computed: {
            hasData: function() {
                if (this.dataPoints.length === 0) {
                    return false;
                }
                if (this.dataPoints[0].length === 0) {
                    return false;
                }
                return true;
            }
        },
        mounted: function() {
            this.refresh();
        },
        methods: {
            refresh: function() {

                if (this.frozen || $(this.$refs.container).is(":hidden") || !this.hasData) {
                    // no need to refresh if hidden
                    return;
                }

                var self = this;

                var points = this.dataPoints.map(function(path, pathIdx) {
                    var series = path.map(function(val, idx) {
                        return [idx + 1, val];
                    });
                    var pathCopy = _.extend({}, self.paths[pathIdx]);
                    pathCopy.data = series;
                    return pathCopy;
                });

                this.unbindResizer();

                countlyCommon.drawTimeGraph(points,
                    $(this.$refs.container),
                    this.bucket, this.overrideBucket,
                    this.small, null,
                    this.options);

                setTimeout(function() {
                    self.initializeResizer();
                }, 0);
            },
            initializeResizer: function() {
                var plot = $(this.$refs.container).data("plot");
                plot.getPlaceholder().resize(this._onResize);
            },
            unbindResizer: function() {
                var plot = $(this.$refs.container).data("plot");
                if (plot) {
                    plot.getPlaceholder().unbind("resize", this._onResize);
                }
            },
            _onResize: function() {
                var self = this,
                    plot = $(this.$refs.container).data("plot"),
                    placeholder = plot.getPlaceholder();

                if (placeholder.width() === 0 || placeholder.height() === 0) {
                    return;
                }

                // plot.resize();
                // plot.setupGrid();
                // plot.draw();

                var graphWidth = plot.width();

                $(self.$refs.container).find(".graph-key-event-label").each(function() {
                    var o = plot.pointOffset({x: $(this).data("points")[0], y: $(this).data("points")[1]});

                    if (o.left <= 15) {
                        o.left = 15;
                    }

                    if (o.left >= (graphWidth - 15)) {
                        o.left = (graphWidth - 15);
                    }

                    $(this).css({
                        left: o.left
                    });
                });

                $(self.$refs.container).find(".graph-note-label").each(function() {
                    var o = plot.pointOffset({x: $(this).data("points")[0], y: $(this).data("points")[1]});

                    $(this).css({
                        left: o.left
                    });
                });
            }
        },
        beforeDestroy: function() {
            this.unbindResizer();
        },
        watch: {
            dataPoints: function() {
                this.refresh();
            },
            frozen: function(newValue) {
                if (!newValue) {
                    this.refresh();
                }
            }
        }
    }));

    Vue.component("cly-graph-w", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        template: '<div class="cly-vue-graph-w">\
                        <div ref="container" class="graph-container"></div>\
                        <div class="cly-vue-graph-no-data" v-if="!hasData">\
                            <div class="inner">\
                                <div class="icon"></div>\
                                <div class="text">{{i18n("common.graph.no-data")}}</div>\
                            </div>\
                        </div>\
                    </div>',
        props: {
            dataPoints: {
                required: true,
                type: Array,
                default: function() {
                    return [];
                }
            },
            graphType: { required: false, type: String, default: "bar" },
            frozen: {default: false, type: Boolean},
            configOptions: { required: false, default: null }
        },
        data: function() {
            return {
                options: JSON.parse(JSON.stringify(this.configOptions))
            };
        },
        computed: {
            hasData: function() {
                return !!this.dataPoints;
            }
        },
        mounted: function() {
            this.refresh();
        },
        methods: {
            refresh: function() {

                if (this.frozen || $(this.$refs.container).is(":hidden") || !this.hasData) {
                    // no need to refresh if hidden
                    return;
                }

                countlyCommon.drawGraph(this.dataPoints,
                    $(this.$refs.container),
                    this.graphType,
                    this.options);
            }
        },
        watch: {
            dataPoints: function() {
                this.refresh();
            },
            graphType: function() {
                this.refresh();
            },
            frozen: function(newValue) {
                if (!newValue) {
                    this.refresh();
                }
            }
        }
    }));

    Vue.component("cly-radio", countlyBaseComponent.extend({
        template: '<div class="cly-vue-radio">\
                        <div class="radio-wrapper">\
                            <div @click="setValue(item.value)" v-for="(item, i) in items" :key="i" :class="{\'selected\': value == item.value}" class="radio-button">\
                                <div class="box"></div>\
                                <div class="text">{{item.label}}</div>\
                                <div class="description">{{item.description}}</div>\
                            </div>\
                        </div>\
                   </div>',
        props: {
            value: {required: true},
            items: {required: true}
        },
        methods: {
            setValue: function(e) {
                this.$emit('input', e);
            }
        }
    }));

    Vue.component("cly-text-field", countlyBaseComponent.extend({
        template: '<input type="text" class="cly-vue-text-field input" v-bind:value="value" v-on:input="setValue($event.target.value)">',
        props: {
            value: {required: true}
        },
        methods: {
            setValue: function(e) {
                this.$emit('input', e);
            }
        }
    }));

    Vue.component("cly-check", countlyBaseComponent.extend({
        template: '<div class="cly-vue-check" v-bind:class="[skinClass]">\
                        <div class="check-wrapper">\
                            <input type="checkbox" class="check-checkbox" v-bind:id="componentId + \'-cb\'" :checked="value" v-on:input="setValue($event.target.checked)">\
                            <label v-bind:class="labelClass" v-bind:for="componentId + \'-cb\'"></label>\
                            <span class="check-text" @click="setValue(!value)">{{label}}</span>\
                        </div>\
                    </div>',
        props: {
            value: {required: true, type: Boolean},
            label: {type: String},
            skin: { default: "switch", type: String}
        },
        computed: {
            skinClass: function() {
                if (["switch", "tick"].indexOf(this.skin) > -1) {
                    return "check-" + this.skin + "-skin";
                }
                return "check-switch-skin";
            },
            labelClass: function() {
                return this.getClass(this.value);
            }
        },
        methods: {
            setValue: function(e) {
                this.$emit('input', e);
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
                return classes;
            }
        }
    }));

    Vue.component("cly-check-list", countlyBaseComponent.extend({
        template: '<div class="cly-vue-check-list">\
                      <cly-check v-for="(item, i) in items" :key="i" v-bind:skin="skin" v-bind:label="item.label" v-bind:value="uncompressed[i]" v-on:input="setValue(item.value, $event)">\
                      </cly-check>\
                  </div>',
        props: {
            value: {required: true},
            items: {required: true},
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
        }
    }));

    Vue.component("cly-button", countlyBaseComponent.extend({
        template: '<div class="cly-vue-button" v-on="$listeners" v-bind:class="[skinClass]">{{label}}</div>',
        props: {
            label: {type: String},
            skin: { default: "green", type: String}
        },
        computed: {
            skinClass: function() {
                if (["green", "light"].indexOf(this.skin) > -1) {
                    return "button-" + this.skin + "-skin";
                }
                return "button-light-skin";
            }
        }
    }));

}(window.CountlyVueComponents = window.CountlyVueComponents || {}, jQuery));
