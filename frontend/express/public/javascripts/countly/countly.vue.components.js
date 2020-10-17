/* global countlyCommon, moment, jQuery, Vue, Vuex, T, countlyView, CountlyHelpers, _, app */

(function(CountlyVueComponents, countlyVue, $) {

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

    Vue.use(window.vuelidate.default);
    window.VTooltip.VTooltip.options.defaultClass = 'cly-vue-tooltip';
    window.VTooltip.VTooltip.options.defaultBoundariesElement = 'window';

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

    // @vue/component
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

    // @vue/component
    var i18nMixin = {
        methods: {
            i18n: function() {
                return jQuery.i18n.prop.apply(null, arguments);
            }
        }
    };

    // @vue/component
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

    // @vue/component
    var hasDrawersMixin = function(names) {
        if (!Array.isArray(names)) {
            names = [names];
        }

        return {
            data: function() {
                return {
                    drawers: names.reduce(function(acc, val) {
                        acc[val] = {
                            name: val,
                            isOpened: false,
                            initialEditedObject: {}
                        };
                        return acc;
                    }, {})
                };
            },
            methods: {
                openDrawer: function(name, initialEditedObject) {
                    if (this.drawers[name].isOpened) {
                        return;
                    }
                    this.loadDrawer(name, initialEditedObject);
                    this.drawers[name].isOpened = true;
                },
                loadDrawer: function(name, initialEditedObject) {
                    this.drawers[name].initialEditedObject = initialEditedObject || {};
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

    var VuexModule = function(name, options) {

        options = options || {};

        var mutations = options.mutations || {},
            actions = options.actions || {};

        if (!mutations.resetState) {
            mutations.resetState = function(state) {
                Object.assign(state, options.resetFn());
            };
        }

        if (!actions.reset) {
            actions.reset = function(context) {
                context.commit("resetState");
            };
        }

        var module = {
            namespaced: true,
            state: options.resetFn(),
            getters: options.getters || {},
            mutations: mutations,
            actions: actions
        };

        if (options.submodules) {
            module.modules = {};
            options.submodules.forEach(function(submodule) {
                module.modules[submodule.name] = submodule.module;
            });
        }

        return {
            name: name,
            module: module
        };
    };

    var VuexDataTable = function(name, options) {
        var resetFn = function() {
            return {
                trackedFields: options.trackedFields || [],
                patches: {}
            };
        };

        var keyFn = function(row, dontStringify) {
            if (dontStringify) {
                return options.keyFn(row);
            }
            return JSON.stringify(options.keyFn(row));
        };

        var tableGetters = {
            sourceRows: options.sourceRows,
            diff: function(state, getters) {
                if (state.trackedFields.length === 0 || Object.keys(state.patches).length === 0) {
                    return [];
                }
                var diff = [];
                getters.sourceRows.forEach(function(row) {
                    var rowKey = keyFn(row);
                    if (state.patches[rowKey]) {
                        var originalKey = keyFn(row, true);
                        state.trackedFields.forEach(function(fieldName) {
                            if (Object.prototype.hasOwnProperty.call(state.patches[rowKey], fieldName) && row[fieldName] !== state.patches[rowKey][fieldName]) {
                                diff.push({
                                    key: originalKey,
                                    field: fieldName,
                                    newValue: state.patches[rowKey][fieldName],
                                    oldValue: row[fieldName]
                                });
                            }
                        });
                    }
                });
                return diff;
            },
            rows: function(state, getters) {
                if (Object.keys(state.patches).length === 0) {
                    return getters.sourceRows;
                }
                return getters.sourceRows.map(function(row) {
                    var rowKey = keyFn(row);
                    if (state.patches[rowKey]) {
                        return Object.assign({}, row, state.patches[rowKey]);
                    }
                    return row;
                });
            }
        };

        var mutations = {
            patch: function(state, obj) {
                var row = obj.row,
                    fields = obj.fields;

                var rowKey = keyFn(row);
                var currentPatch = Object.assign({}, state.patches[rowKey], fields);

                Vue.set(state.patches, rowKey, currentPatch);
            },
            unpatch: function(state, obj) {
                var row = obj.row,
                    fields = obj.fields;

                var rowKeys = null;
                if (!row) {
                    rowKeys = Object.keys(state.patches);
                }
                else {
                    rowKeys = [keyFn(row)];
                }

                rowKeys.forEach(function(rowKey) {
                    if (!state.patches[rowKey]) {
                        return;
                    }

                    if (!fields) {
                        Vue.delete(state.patches, rowKey);
                    }
                    else {
                        fields.forEach(function(fieldName) {
                            Vue.delete(state.patches[rowKey], fieldName);
                        });
                        if (Object.keys(state.patches[rowKey]).length === 0) {
                            Vue.delete(state.patches, rowKey);
                        }
                    }
                });

            }
        };
        return VuexModule(name, {
            resetFn: resetFn,
            getters: tableGetters,
            mutations: mutations
        });
    };

    var _vuex = {
        getGlobalStore: function() {
            return _globalVuexStore;
        },
        registerGlobally: function(wrapper, force) {
            var store = _globalVuexStore;
            if (!store.hasModule(wrapper.name) || force) {
                store.registerModule(wrapper.name, wrapper.module);
            }
        },
        Module: VuexModule,
        DataTable: VuexDataTable
    };

    var BackboneRouteAdapter = function() {};

    Vue.prototype.$route = new BackboneRouteAdapter();

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

            var getDeferred = function(fName, elId) {
                if (!elId) {
                    return T.get(fName, function(src) {
                        self.elementsToBeRendered.push(src);
                    });
                }
                else {
                    return T.get(fName, function(src) {
                        self.elementsToBeRendered.push("<script type='text/x-template' id='" + elId + "'>" + src + "</script>");
                    });
                }
            };

            if (this.templates) {
                var templatesDeferred = [];
                this.templates.forEach(function(item) {
                    if (typeof item === "string") {
                        templatesDeferred.push(getDeferred(item));
                        return;
                    }
                    for (var name in item.mapping) {
                        var fileName = item.mapping[name];
                        var elementId = item.namespace + "-" + name;
                        templatesDeferred.push(getDeferred(fileName, elementId));
                    }
                });

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
                beforeCreate: function() {
                    this.$route.params = self.params;
                },
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
        computed: {
            componentId: function() {
                return "cly-cmp-" + _uniqueComponentId;
            }
        },
        beforeCreate: function() {
            this.ucid = _uniqueComponentId.toString();
            _uniqueComponentId += 1;
        }
    });

    var countlyBaseView = countlyBaseComponent.extend(
        // @vue/component
        {
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
        }
    );

    /**
     * Simple implementation for abortable delayed actions.
     * Primarily used for table undo events.
     *
     * @param {String} message Action description
     * @param {Function} actionFn Delayed action
     * @param {Function} abortFn Callback will be called on abort
     * @param {Number} timeout Delay amount in ms
     */
    function DelayedAction(message, actionFn, abortFn, timeout) {
        this.message = message;
        this.timeout = setTimeout(actionFn, timeout || 2000);
        this.abortFn = abortFn;
    }

    DelayedAction.prototype.abort = function() {
        clearTimeout(this.timeout);
        this.abortFn();
    };

    var DataTable = {
        toLegacyRequest: function(requestParams, cols) {
            var convertedParams = {};
            convertedParams.iDisplayStart = (requestParams.page - 1) * requestParams.perPage;
            convertedParams.iDisplayLength = requestParams.perPage;
            if (cols && requestParams.sort && requestParams.sort.length > 0) {
                var sorter = requestParams.sort[0];
                var sortFieldIndex = cols.indexOf(sorter.field);
                if (sortFieldIndex > -1) {
                    convertedParams.iSortCol_0 = sortFieldIndex;
                    convertedParams.sSortDir_0 = sorter.type;
                }
            }
            if (requestParams.searchQuery) {
                convertedParams.sSearch = requestParams.searchQuery;
            }
            return convertedParams;
        },
        toStandardResponse: function(response) {
            response = response || {};
            var fields = {
                rows: response.aaData || [],
                totalRows: response.iTotalDisplayRecords || 0,
                notFilteredTotalRows: response.iTotalRecords || 0
            };
            if (Object.prototype.hasOwnProperty.call(response, "sEcho")) {
                fields.echo = parseInt(response.sEcho);
            }
            return fields;
        }
    };

    var _helpers = {
        DelayedAction: DelayedAction,
        DataTable: DataTable
    };

    var _components = {
        BaseComponent: countlyBaseComponent,
        BaseDrawer: countlyBaseComponent.extend(
            // @vue/component
            {
                inheritAttrs: false,
                mixins: [
                    _mixins.i18n
                ],
                props: {
                    isOpened: {type: Boolean, required: true},
                    initialEditedObject: {
                        type: Object,
                        default: function() {
                            return {};
                        }
                    },
                    name: {type: String, required: true}
                },
                data: function() {
                    return {
                        title: '',
                        saveButtonLabel: this.i18n("common.confirm"),
                        editedObject: this.copyOfEdited(),
                        currentStepIndex: 0,
                        stepContents: [],
                        sidecarContents: [],
                        constants: {},
                        localState: this.getInitialLocalState(),
                        inScope: [],
                        isMounted: false
                    };
                },
                computed: {
                    activeContentId: function() {
                        if (this.activeContent) {
                            return this.activeContent.tId;
                        }
                        return null;
                    },
                    currentStepId: function() {
                        return this.activeContentId;
                    },
                    isCurrentStepValid: function() {
                        if (!this.stepValidations || !Object.prototype.hasOwnProperty.call(this.stepValidations, this.activeContentId)) {
                            // No validation scenario defined
                            return true;
                        }
                        return this.stepValidations[this.activeContentId];
                    },
                    isLastStep: function() {
                        return this.stepContents.length > 1 && this.currentStepIndex === this.stepContents.length - 1;
                    },
                    activeContent: function() {
                        if (this.currentStepIndex > this.stepContents.length - 1) {
                            return null;
                        }
                        return this.stepContents[this.currentStepIndex];
                    },
                    isMultiStep: function() {
                        return this.stepContents.length > 1;
                    },
                    hasSidecars: function() {
                        return this.sidecarContents.length > 0;
                    },
                    passedScope: function() {
                        var defaultKeys = ["editedObject", "$v", "constants", "localState"],
                            self = this;

                        var passed = defaultKeys.reduce(function(acc, val) {
                            acc[val] = self[val];
                            return acc;
                        }, {});

                        if (this.inScopeReadOnly) {
                            passed.readOnly = this.inScopeReadOnly.reduce(function(acc, val) {
                                acc[val] = self[val];
                                return acc;
                            }, {});
                        }

                        return passed;
                    }
                },
                watch: {
                    initialEditedObject: function() {
                        this.editedObject = this.afterObjectCopy(this.copyOfEdited());
                        this.reset();
                    },
                    isOpened: function(newState) {
                        if (!newState) {
                            this.reset();
                        }
                    }
                },
                mounted: function() {
                    this.stepContents = this.$children.filter(function(child) {
                        return child.isContent && child.role === "default";
                    });
                    this.sidecarContents = this.$children.filter(function(child) {
                        return child.isContent && child.role === "sidecar";
                    });
                    this.isMounted = true;
                },
                methods: {
                    tryClosing: function() {
                        this.$emit("close", this.name);
                    },
                    copyOfEdited: function() {
                        var copied = JSON.parse(JSON.stringify(this.initialEditedObject));
                        return this.beforeObjectCopy(copied);
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
                        this.beforeLeavingStep();
                        if (this.isCurrentStepValid) {
                            this.setStep(this.currentStepIndex + 1);
                        }
                    },
                    reset: function() {
                        this.$v.$reset();
                        this.resetLocalState();
                        this.setStep(0);
                    },
                    submit: function() {
                        this.beforeLeavingStep();
                        if (!this.$v.$invalid) {
                            this.$emit("submit", this.beforeSubmit(JSON.parse(JSON.stringify(this.editedObject))));
                            this.tryClosing();
                        }
                    },
                    afterObjectCopy: function(newState) {
                        return newState;
                    },
                    beforeObjectCopy: function(newState) {
                        return newState;
                    },
                    beforeSubmit: function(editedObject) {
                        return editedObject;
                    },
                    getInitialLocalState: function() {
                        return {};
                    },
                    resetLocalState: function() {
                        this.localState = this.getInitialLocalState();
                    },
                    beforeLeavingStep: function() { }
                },
                template: '<div class="cly-vue-drawer"\n' +
                                'v-bind:class="{mounted: isMounted, open: isOpened, \'has-sidecars\': hasSidecars}">\n' +
                                '<div class="title">\n' +
                                    '<span>{{title}}</span>\n' +
                                    '<span class="close" v-on:click="tryClosing">\n' +
                                        '<i class="ion-ios-close-empty"></i>\n' +
                                    '</span>\n' +
                                '</div>\n' +
                                '<div class="sidecars-view" v-show="hasSidecars">\n' +
                                    '<slot name="sidecars"\n' +
                                        'v-bind="passedScope">\n' +
                                    '</slot>\n' +
                                '</div>\n' +
                                '<div class="steps-view">\n' +
                                    '<div class="steps-header" v-show="isMultiStep">\n' +
                                        '<div class="label" v-bind:class="{active: i === currentStepIndex,  passed: i < currentStepIndex}" v-for="(currentContent, i) in stepContents" :key="i">\n' +
                                            '<div class="wrapper">\n' +
                                                '<span class="index">{{i + 1}}</span>\n' +
                                                '<span class="done-icon"><i class="fa fa-check"></i></span>\n' +
                                                '<span class="text">{{currentContent.name}}</span>\n' +
                                            '</div>\n' +
                                        '</div>\n' +
                                    '</div>\n' +
                                    '<div class="details" v-bind:class="{\'multi-step\':isMultiStep}">\n' +
                                        '<slot name="default"\n' +
                                            'v-bind="passedScope">\n' +
                                        '</slot>\n' +
                                    '</div>\n' +
                                    '<div class="buttons multi-step" v-if="isMultiStep">\n' +
                                        '<div class="controls-left-container">\n' +
                                            '<slot name="controls-left"\n' +
                                                'v-bind="passedScope">\n' +
                                            '</slot>\n' +
                                        '</div>\n' +
                                        '<cly-button @click="nextStep" v-if="!isLastStep" v-bind:disabled="!isCurrentStepValid" skin="green" v-bind:label="i18n(\'common.drawer.next-step\')"></cly-button>\n' +
                                        '<cly-button @click="submit" v-if="isLastStep" v-bind:disabled="$v.$invalid" skin="green" v-bind:label="saveButtonLabel"></cly-button>\n' +
                                        '<cly-button @click="prevStep" v-if="currentStepIndex > 0" skin="light" v-bind:label="i18n(\'common.drawer.previous-step\')"></cly-button>\n' +
                                    '</div>\n' +
                                    '<div class="buttons single-step" v-if="!isMultiStep">\n' +
                                        '<cly-button @click="submit" v-bind:disabled="$v.$invalid" skin="green" v-bind:label="saveButtonLabel"></cly-button>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                            '</div>'
            }
        )
    };

    var _views = {
        BackboneWrapper: countlyVueWrapperView,
        BaseView: countlyBaseView
    };

    var rootElements = {
        mixins: _mixins,
        vuex: _vuex,
        views: _views,
        components: _components,
        helpers: _helpers
    };

    for (var key in rootElements) {
        countlyVue[key] = rootElements[key];
    }

    // New components

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
                    '<div @click="open">\n' +
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

    Vue.component("cly-datatable-w", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                rows: {
                    type: Array,
                    default: function() {
                        return [];
                    }
                },
                columns: {
                    type: Array,
                    default: function() {
                        return [];
                    }
                },
                keyFn: { type: Function, default: null}
            },
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
            template: '<div class="cly-vue-datatable-w" ref="wrapper">\n' +
                            '<div ref="buttonMenu" class="cly-button-menu" tabindex="1" v-if="hasOptions">\n' +
                                '<a class="item" @click="optionEvent(optionItem.action)" v-for="(optionItem, j) in optionItems" :key="j"><i :class="optionItem.icon"></i><span>{{optionItem.label}}</span></a>\n' +
                            '</div>\n' +
                            '<table ref="dtable" cellpadding="0" cellspacing="0" class="d-table-vue-wrapper"></table>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-tabs", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                value: { default: null, type: String },
                skin: { default: "main", type: String}
            },
            data: function() {
                return {
                    tabs: []
                };
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
            mounted: function() {
                this.tabs = this.$children;
                if (!this.value) {
                    this.$emit("input", this.tabs[0].tId);
                }
            },
            methods: {
                setTab: function(tId) {
                    this.$emit("input", tId);
                }
            },
            template: '<div class="cly-vue-tabs" v-bind:class="[skinClass]">\n' +
                            '<ul class="cly-vue-tabs-list" v-bind:class="[numberOfTabsClass]">\n' +
                                '<li @click="setTab(tab.tId)" v-for="(tab, i) in tabs" :key="i" :class="{\'is-active\': tab.isActive}">\n' +
                                    '<a v-html="tab.tName"></a>\n' +
                                '</li>\n' +
                            '</ul>\n' +
                            '<div class="cly-vue-tabs-container">\n' +
                                '<slot/>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-content", countlyBaseComponent.extend(
        // @vue/component
        {
            inheritAttrs: false,
            mixins: [
                _mixins.i18n
            ],
            props: {
                name: { type: String, default: null},
                id: { type: String, default: null },
                alwaysMounted: { type: Boolean, default: true },
                alwaysActive: { type: Boolean, default: false },
                role: { type: String, default: "default" }
            },
            data: function() {
                return {
                    isContent: true
                };
            },
            computed: {
                isActive: function() {
                    return this.alwaysActive || (this.role === "default" && this.$parent.activeContentId === this.id);
                },
                tName: function() {
                    return this.name;
                },
                tId: function() {
                    return this.id;
                },
                elementId: function() {
                    return this.componentId + "-" + this.id;
                }
            },
            template: '<div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">\n' +
                            '<div v-show="isActive"><slot/></div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-panel", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                title: { type: String, required: false },
                dateSelector: { type: Boolean, required: false, default: true },
                hasLeftBottom: { type: Boolean, required: false, default: false },
                onlyHead: { type: Boolean, required: false, default: false }
            },
            template: '<div class="cly-vue-panel widget">\n' +
                            '<div class="widget-header">\n' +
                                '<div class="left">\n' +
                                    '<div style="margin-left: 3px;">\n' +
                                        '<slot name="left-top">\n' +
                                            '<div class="title" :class="{small: hasLeftBottom}">{{title}}</div>\n' +
                                        '</slot>\n' +
                                        '<div v-if="hasLeftBottom">\n' +
                                            '<slot name="left-bottom"></slot>\n' +
                                        '</div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                                '<div class="right">\n' +
                                    '<slot name="right-top">\n' +
                                        '<cly-global-date-selector-w v-once v-if="dateSelector"></cly-global-date-selector-w>\n' +
                                    '</slot>\n' +
                                '</div>\n' +
                            '</div>\n' +
                            '<div class="widget-content help-zone-vb" :class="{\'no-border\': onlyHead}">\n' +
                                '<slot/>\n' +
                            '</div>\n' +
                        '</div>',
        }
    ));

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

    Vue.component("cly-time-graph-w", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                dataPoints: {
                    required: true,
                    type: Array,
                    default: function() {
                        return [];
                    }
                },
                bucket: { required: false, default: null, type: Object },
                overrideBucket: { required: false, default: null, type: Object },
                frozen: {default: false, type: Boolean},
                configPaths: { required: true, type: Array },
                configSmall: { required: false, default: false, type: Boolean },
                configOptions: { required: false, default: null, type: Object }
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
            watch: {
                dataPoints: function() {
                    this.refresh();
                },
                frozen: function(newValue) {
                    if (!newValue) {
                        this.refresh();
                    }
                }
            },
            mounted: function() {
                this.refresh();
            },
            beforeDestroy: function() {
                this.unbindResizer();
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
            template: '<div class="cly-vue-time-graph-w">\n' +
                            '<div ref="container" class="graph-container"></div>\n' +
                            '<div class="cly-vue-graph-no-data" v-if="!hasData">\n' +
                                '<div class="inner">\n' +
                                    '<div class="icon"></div>\n' +
                                    '<div class="text">{{i18n("common.graph.no-data")}}</div>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-graph-w", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                dataPoints: {
                    required: true,
                    type: Object,
                    default: function() {
                        return {};
                    }
                },
                graphType: { required: false, type: String, default: "bar" },
                frozen: {default: false, type: Boolean},
                configOptions: { required: false, default: null, type: Object }
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
            template: '<div class="cly-vue-graph-w">\n' +
                            '<div ref="container" class="graph-container"></div>\n' +
                            '<div class="cly-vue-graph-no-data" v-if="!hasData">\n' +
                                '<div class="inner">\n' +
                                    '<div class="icon"></div>\n' +
                                    '<div class="text">{{i18n("common.graph.no-data")}}</div>\n' +
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
                skin: { default: "main", type: String}
            },
            computed: {
                skinClass: function() {
                    if (["main", "light"].indexOf(this.skin) > -1) {
                        return "radio-" + this.skin + "-skin";
                    }
                    return "radio-main-skin";
                }
            },
            methods: {
                setValue: function(e) {
                    this.$emit('input', e);
                }
            },
            template: '<div class="cly-vue-radio" v-bind:class="[skinClass]">\n' +
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
                    if (["switch", "tick"].indexOf(this.skin) > -1) {
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
                    return classes;
                }
            },
            template: '<div class="cly-vue-check" v-bind:class="topClasses">\n' +
                            '<div class="check-wrapper">\n' +
                                '<input type="checkbox" class="check-checkbox" :checked="value">\n' +
                                '<div v-bind:class="labelClass" @click="setValue(!value)"></div>\n' +
                                '<span v-if="label" class="check-text" @click="setValue(!value)">{{label}}</span>\n' +
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
                                '<div class="drop combo"></div>\n' +
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

    Vue.component("cly-back-link", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                title: {type: String, required: false},
                link: {type: String, required: false}
            },
            methods: {
                back: function() {
                    if (this.link) {
                        app.back(this.link);
                    }
                    else {
                        app.back();
                    }
                }
            },
            computed: {
                innerTitle: function() {
                    if (this.title) {
                        return this.title;
                    }
                    return this.i18n("common.back");
                }
            },
            template: '<a @click="back" class="cly-vue-back-link"> \n' +
                            '<span>{{innerTitle}}</span>\n' +
                        '</a>'
        }
    ));

    var clyDataTableControls = countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        template: '<div class="cly-vgt-custom-controls">\n' +
                        '<div class="cly-vgt-custom-search">\n' +
                            '<div class="magnifier-wrapper" @click="toggleSearch">\n' +
                                '<i class="fa fa-search"></i>\n' +
                            '</div>\n' +
                            '<input type="text" ref="searchInput" v-show="searchVisible" class="vgt-input" :placeholder="i18n(\'common.search\')" v-bind:value="searchQuery" @input="queryChanged($event.target.value)"/>\n' +
                        '</div>\n' +
                        '<div class="cly-vgt-custom-paginator">\n' +
                            '<div class="display-items">\n' +
                                '<label>{{ i18n("common.show-items") }} <input type="number" v-model.number="displayItems"></label>\n' +
                            '</div>\n' +
                            '<div class="buttons">\n' +
                                '<span :class="{disabled: !prevAvailable}" @click="goToFirstPage"><i class="fa fa-angle-double-left"></i></span>\n' +
                                '<span :class="{disabled: !prevAvailable}" @click="goToPrevPage"><i class="fa fa-angle-left"></i></span>\n' +
                                '<span :class="{disabled: !nextAvailable}" @click="goToNextPage"><i class="fa fa-angle-right"></i></span>\n' +
                                '<span :class="{disabled: !nextAvailable}" @click="goToLastPage"><i class="fa fa-angle-double-right"></i></span>\n' +
                            '</div>\n' +
                        '</div>\n' +
                    '</div>',
        props: {
            searchQuery: {
                type: String
            },
            pageChanged: {
                type: Function,
            },
            perPageChanged: {
                type: Function,
            },
            total: {
                type: Number
            },
            notFilteredTotal: {
                type: Number
            },
            initialPaging: {
                type: Object
            }
        },
        data: function() {
            return {
                firstPage: 1,
                currentPage: this.initialPaging.page,
                perPage: this.initialPaging.perPage,
                searchVisible: !!this.searchQuery,
                displayItems: this.initialPaging.perPage
            };
        },
        computed: {
            totalPages: function() {
                return Math.ceil(this.total / this.perPage);
            },
            lastPage: function() {
                return this.totalPages;
            },
            prevAvailable: function() {
                return this.currentPage > this.firstPage;
            },
            nextAvailable: function() {
                return this.currentPage < this.lastPage;
            }
        },
        mounted: function() {
            // this.updatePerPage();
            // this.goToFirstPage();
            this.updateInfo();
        },
        methods: {
            queryChanged: function(newSearchQuery) {
                var self = this;
                this.$emit("queryChanged", newSearchQuery);
                this.$nextTick(function() {
                    self.updateInfo();
                });
            },
            toggleSearch: function() {
                var self = this;
                this.searchVisible = !this.searchVisible;
                this.$nextTick(function() {
                    if (self.searchVisible) {
                        self.$refs.searchInput.focus();
                    }
                });
            },
            updateInfo: function() {
                var startEntries = (this.currentPage - 1) * this.perPage + 1,
                    endEntries = Math.min(startEntries + this.perPage - 1, this.total),
                    totalEntries = this.total,
                    info = this.i18n("common.table.no-data");

                if (totalEntries > 0) {
                    info = this.i18n("common.showing")
                        .replace("_START_", startEntries)
                        .replace("_END_", endEntries)
                        .replace("_TOTAL_", totalEntries);
                }

                if (this.searchQuery) {
                    info += " " + this.i18n("common.filtered").replace("_MAX_", this.notFilteredTotal);
                }

                this.$emit("infoChanged", info);
            },
            updateCurrentPage: function() {
                var self = this;
                this.pageChanged({currentPage: this.currentPage});
                this.$nextTick(function() {
                    self.updateInfo();
                });
            },
            updatePerPage: function() {
                var self = this;
                this.perPageChanged({currentPerPage: this.perPage});
                this.$nextTick(function() {
                    self.updateInfo();
                });
            },
            goToFirstPage: function() {
                this.currentPage = this.firstPage;
            },
            goToLastPage: function() {
                this.currentPage = this.lastPage;
            },
            goToPrevPage: function() {
                if (this.prevAvailable) {
                    this.currentPage--;
                }
            },
            goToNextPage: function() {
                if (this.nextAvailable) {
                    this.currentPage++;
                }
            }
        },
        watch: {
            displayItems: function(newValue) {
                if (newValue > 0) {
                    this.perPage = newValue;
                }
            },
            perPage: function() {
                this.updatePerPage();
            },
            currentPage: function() {
                this.updateCurrentPage();
            },
            totalPages: function(newTotal) {
                if (this.currentPage > newTotal) {
                    this.goToFirstPage();
                }
            },
            total: function() {
                this.updateInfo();
            }
        }
    });

    var clyDataTableRowOptions = countlyBaseComponent.extend({
        props: {
            items: {
                type: Array
            },
            opened: {
                type: Boolean
            },
            pos: {
                type: Object
            },
            rowData: {
                type: Object
            }
        },
        computed: {
            availableItems: function() {
                return this.items.filter(function(item) {
                    return !item.disabled;
                });
            }
        },
        methods: {
            tryClosing: function() {
                if (this.opened) {
                    this.$emit("close");
                }
            },
            fireEvent: function(eventKey) {
                this.$emit(eventKey, this.rowData);
                this.tryClosing();
            }
        },
        template: '<div class="cly-vue-row-options" v-click-outside="tryClosing">\n' +
                        '<div ref="menu" v-bind:style="{ right: pos.right, top: pos.top}" :class="{active: opened}" class="menu" tabindex="1">\n' +
                            '<a @click="fireEvent(item.event)" v-for="(item, index) in availableItems" class="item" :key="index"><i :class="item.icon"></i><span>{{ item.label }}</span></a>\n' +
                        '</div>\n' +
                    '</div>'
    });

    Vue.component("cly-datatable", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        inheritAttrs: false,
        components: {
            "custom-controls": clyDataTableControls,
            'row-options': clyDataTableRowOptions
        },
        props: {
            rows: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            columns: {
                type: Array
            },
            mode: {
                type: String,
                default: null
            },
            totalRows: {
                type: Number,
                default: 0
            },
            notFilteredTotalRows: {
                type: Number,
                default: 0
            },
            persistKey: {
                type: String,
                default: null
            },
            striped: {
                type: Boolean,
                default: true
            }
        },
        computed: {
            innerStyles: function() {
                var styles = ['cly-vgt-table'];
                if (this.striped) {
                    styles.push("striped");
                }
                return styles.join(" ");
            },
            notFilteredTotal: function() {
                if (this.isRemote) {
                    return this.notFilteredTotalRows;
                }
                else if (!this.rows) {
                    return 0;
                }
                return this.rows.length;
            },
            extendedColumns: function() {
                var extended = this.columns.map(function(col) {
                    var newCol;
                    if (col.type === "cly-options") {
                        newCol = JSON.parse(JSON.stringify(col));
                        newCol.field = "cly-options";
                        newCol.sortable = false;
                        delete newCol.type;
                        return newCol;
                    }
                    if (col.type === "cly-detail-toggler") {
                        newCol = JSON.parse(JSON.stringify(col));
                        newCol.field = "cly-detail-toggler";
                        newCol.sortable = false;
                        delete newCol.type;
                        return newCol;
                    }
                    return col;
                });
                return extended;
            },
            isRemote: function() {
                return this.internalMode === "remote";
            },
            internalTotalRows: function() {
                if (this.isRemote) {
                    return this.totalRows;
                }
                else {
                    // vgt-table should determine itself.
                    return;
                }
            }
        },
        created: function() {
            if (this.isRemote) {
                this.$emit("remote-params-change", this.currentParams);
            }
        },
        data: function() {
            var persisted = this.getPersistedParams();
            return {
                pageInfo: '',
                searchQuery: persisted.searchQuery,
                optionsOpened: false,
                optionsRowData: {},
                optionsItems: [],
                optionsPosition: {
                    right: '37px',
                    top: '0'
                },
                isLoading: false,
                internalMode: this.mode,
                initialPaging: {
                    page: persisted.page,
                    perPage: persisted.perPage
                },
                currentParams: persisted
            };
        },
        methods: {
            getPersistedParams: function() {
                var loadedState = localStorage.getItem(this.persistKey);
                var defaultState = {
                    page: 1,
                    perPage: 10,
                    searchQuery: '',
                    sort: []
                };
                try {
                    if (loadedState) {
                        return JSON.parse(loadedState);
                    }
                    return defaultState;
                }
                catch (ex) {
                    return defaultState;
                }
            },
            persistParams: function() {
                if (this.persistKey) {
                    localStorage.setItem(this.persistKey, JSON.stringify(this.currentParams));
                }
            },
            onInfoChanged: function(text) {
                this.pageInfo = text;
            },
            setRowData: function(row, fields) {
                this.$emit("set-row-data", row, fields);
            },
            showRowOptions: function(event, items, row) {
                var rect = $(event.target).offset(),
                    self = this;

                this.optionsPosition = {
                    right: '37px',
                    top: (rect.top + 25) + "px"
                };
                this.optionsItems = items;
                this.optionsRowData = row;

                self.$nextTick(function() {
                    self.optionsOpened = true;
                });
            },
            addTableFns: function(propsObj) {
                var newProps = {
                    props: propsObj,
                    fns: {
                        showRowOptions: this.showRowOptions,
                        setRowData: this.setRowData
                    }
                };
                return newProps;
            },
            updateParams: function(props) {
                this.currentParams = Object.assign({}, this.currentParams, props);
                if (this.isRemote) {
                    this.$emit("remote-params-change", this.currentParams);
                }
                this.persistParams();
            },
            onPageChange: function(params) {
                this.updateParams({page: params.currentPage});
            },
            onSortChange: function(params) {
                this.updateParams({sort: params});
            },
            onRowClick: function(params) {
                this.$emit("row-click", params);
            },
            onRowMouseover: function(params) {
                this.$emit("row-mouseover", params);
            },
            onRowMouseleave: function(params) {
                this.$emit("row-mouseleave", params);
            },
            onPerPageChange: _.debounce(function(params) {
                this.updateParams({perPage: params.currentPerPage});
            }, 500)
        },
        watch: {
            searchQuery: _.debounce(function(newVal) {
                this.updateParams({searchQuery: newVal});
                if (this.isRemote) {
                    this.isLoading = true;
                }
            }, 500)
        },
        template: '<div>\n' +
                        '<row-options\n' +
                            ':items="optionsItems"\n' +
                            ':pos="optionsPosition"\n' +
                            ':opened="optionsOpened"\n' +
                            ':rowData="optionsRowData"\n' +
                            '@close="optionsOpened=false"\n' +
                            'v-on="$listeners">\n' +
                        '</row-options>\n' +
                        '<vue-good-table\n' +
                            'v-bind="$attrs"\n' +
                            'v-bind:rows="rows"\n' +
                            'v-bind:columns="extendedColumns"\n' +
                            'v-on="$listeners"\n' +
                            ':pagination-options="{\n' +
                                'enabled: true,\n' +
                                'mode: \'records\',\n' +
                                'position: \'top\'\n' +
                            '}"\n' +
                            ':search-options="{\n' +
                                'enabled: true,\n' +
                                'externalQuery: searchQuery\n' +
                            '}"\n' +
                            '@on-page-change="onPageChange"\n' +
                            '@on-sort-change="onSortChange"\n' +
                            '@on-per-page-change="onPerPageChange"\n' +
                            '@on-row-mouseenter="onRowMouseover"\n' +
                            '@on-row-mouseleave="onRowMouseleave"\n' +
                            '@on-row-click="onRowClick"\n' +
                            ':mode="internalMode"\n' +
                            ':totalRows="internalTotalRows"\n' +
                            ':isLoading.sync="isLoading"\n' +
                            ':styleClass="innerStyles">\n' +
                                '<template slot="pagination-top" slot-scope="props">\n' +
                                    '<custom-controls\n' +
                                    '@infoChanged="onInfoChanged"\n' +
                                    '@queryChanged="searchQuery = $event"\n' +
                                    'ref="controls"\n' +
                                    ':initial-paging="initialPaging"\n' +
                                    ':search-query="searchQuery"\n' +
                                    ':total="props.total"\n' +
                                    ':notFilteredTotal="notFilteredTotal"\n' +
                                    ':pageChanged="props.pageChanged"\n' +
                                    ':perPageChanged="props.perPageChanged">\n' +
                                    '</custom-controls>\n' +
                                '</template>\n' +
                                '<template v-for="(_, name) in $scopedSlots" :slot="name" slot-scope="slotData">\n' +
                                    '<slot :name="name" v-bind="addTableFns(slotData)" />\n' +
                                '</template>\n' +
                                '<div slot="table-actions-bottom">\n' +
                                    '{{pageInfo}}\n' +
                                '</div>\n' +
                                '<div slot="emptystate">\n' +
                                    '{{ i18n("common.table.no-data") }}\n' +
                                '</div>\n' +
                                '<div slot="loadingContent">\n' +
                                '</div>\n' +
                        '</vue-good-table>\n' +
                    '</div>'
    }));

    Vue.component("cly-datatable-detail-toggler", countlyBaseComponent.extend({
        props: {
            scope: {
                type: Object
            }
        },
        template: '<div class="cly-vue-dt-detail-toggler">\n' +
                        '<div @click="scope.fns.setRowData(scope.props.row, {isDetailRowShown: !scope.props.row.isDetailRowShown})">\n' +
                            '<div v-if="!scope.props.row.isDetailRowShown">\n' +
                                '<i class="material-icons expand-row-icon">keyboard_arrow_down</i>\n' +
                            '</div>\n' +
                            '<div v-else>\n' +
                               '<i class="material-icons expand-row-icon">keyboard_arrow_up</i>\n' +
                            '</div>\n' +
                        '</div>\n' +
                   '</div>'
    }));

    Vue.component("cly-datatable-options", countlyBaseComponent.extend({
        props: {
            scope: {
                type: Object
            }
        },
        template: '<div class="cly-vue-dt-options">\n' +
                        '<div v-if="scope.props.row._delayedDelete" class="undo-row">\n' +
                            '{{ scope.props.row._delayedDelete.message }}\n' +
                            '<a @click="scope.props.row._delayedDelete.abort()">Undo.</a>\n' +
                        '</div>\n' +
                        '<span>\n' +
                            '<a class="cly-row-options-trigger" @click="scope.fns.showRowOptions($event, scope.props.column.items, scope.props.row)"></a>\n' +
                        '</span>\n' +
                    '</div>'
    }));

    Vue.component("cly-diff-helper", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        props: {
            diff: {
                type: Array
            },
        },
        computed: {
            hasDiff: function() {
                return this.diff.length > 0;
            },
            madeChanges: function() {
                return this.i18n("common.diff-helper.changes", this.diff.length);
            }
        },
        methods: {
            save: function() {
                this.$emit("save");
            },
            discard: function() {
                this.$emit("discard");
            }
        },
        template: '<div class="cly-vue-diff-helper" v-if="hasDiff">\n' +
                        '<div class="message">\n' +
                            '<span class="text-dark">{{madeChanges}}</span>\n' +
                            '<span class="text-light">{{ i18n("common.diff-helper.keep") }}</span>\n' +
                        '</div>\n' +
                        '<div class="buttons">\n' +
                            '<cly-button :label="i18n(\'common.discard-changes\')" skin="light" class="discard-btn" @click="discard"></cly-button>\n' +
                           '<cly-button :label="i18n(\'common.save-changes\')" skin="green" class="save-btn" @click="save"></cly-button>\n' +
                        '</div>\n' +
                    '</div>'
    }));

    Vue.component("cly-menubox", countlyBaseComponent.extend({
        template: '<div class="cly-vue-menubox menubox-default-skin" v-click-outside="close">\n' +
                        '<div class="menu-toggler" :class="{active: isOpened}" @click="toggle">\n' +
                            '<div class="text-container">\n' +
                                '<div class="text">{{label}}</div>\n' +
                            '</div>\n' +
                            '<div class="arrows-wrapper">\n' +
                                '<div class="down ion-chevron-down"></div>\n' +
                                '<div class="up ion-chevron-up"></div>\n' +
                            '</div>\n' +
                        '</div>\n' +
                        '<div class="menu-body" v-show="isOpened">\n' +
                            '<slot></slot>\n' +
                        '</div>\n' +
                    '</div>',
        props: {
            label: { type: String, default: '' },
            isOpened: { type: Boolean, default: false }
        },
        methods: {
            toggle: function() {
                this.setStatus(!this.isOpened);
            },
            close: function() {
                this.setStatus(false);
            },
            setStatus: function(targetState) {
                this.$emit('status-changed', targetState);
            }
        }
    }));

    Vue.component("cly-button-menu", countlyBaseComponent.extend({
        template: '<div class="cly-vue-button-menu" :class="[skinClass]" v-click-outside="close">\n' +
                        '<div class="toggler" @click="toggle"></div>\n' +
                        '<div class="menu-body" :class="{active: opened}">\n' +
                            '<a @click="fireEvent(item.event)" class="item" v-for="(item, i) in items" :key="i">\n' +
                                '<i :class="item.icon"></i>\n' +
                                '<span>{{item.label}}</span>\n' +
                            '</a>\n' +
                        '</div>\n' +
                    '</div>',
        props: {
            items: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            skin: { default: "default", type: String}
        },
        computed: {
            skinClass: function() {
                if (["default", "single"].indexOf(this.skin) > -1) {
                    return "button-menu-" + this.skin + "-skin";
                }
                return "button-menu-default-skin";
            },
        },
        data: function() {
            return {
                opened: false
            };
        },
        methods: {
            toggle: function() {
                this.opened = !this.opened;
            },
            close: function() {
                this.opened = false;
            },
            fireEvent: function(eventKey) {
                this.$emit(eventKey);
                this.close();
            }
        }
    }));

    Vue.component("cly-dropzone", window.vue2Dropzone);

}(window.CountlyVueComponents = window.CountlyVueComponents || {}, window.countlyVue = window.countlyVue || {}, jQuery));
