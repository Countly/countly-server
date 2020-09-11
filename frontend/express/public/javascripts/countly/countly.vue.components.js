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

    Vue.use(window.vuelidate.default);
    window.VTooltip.VTooltip.options.defaultClass = 'cly-vue-tooltip';

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

    var createModule = function(name, emptyStateFn, moduleObj) {

        moduleObj = moduleObj || {};

        var mutations = moduleObj.mutations || {},
            actions = moduleObj.actions || {};

        if (!mutations.resetState) {
            mutations.resetState = function(state) {
                Object.assign(state, emptyStateFn());
            };
        }

        if (!actions.reset) {
            actions.reset = function(context) {
                context.commit("resetState");
            };
        }

        return {
            name: name,
            module: {
                namespaced: true,
                state: emptyStateFn(),
                getters: moduleObj.getters || {},
                mutations: mutations,
                actions: actions
            }
        };
    };

    var _vuex = {
        createModule: createModule,
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

    var _components = {
        BaseDrawer: countlyBaseComponent.extend(
            // @vue/component
            {
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
                        saveButtonLabel: this.i18n("common.drawer.confirm"),
                        editedObject: this.copyOfEdited(),
                        currentStepIndex: 0,
                        stepContents: [],
                        constants: {}
                    };
                },
                computed: {
                    activeContentId: function() {
                        if (this.activeContent) {
                            return this.activeContent.tId;
                        }
                        return null;
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
                    }
                },
                watch: {
                    initialEditedObject: function() {
                        this.editedObject = this.copyOfEdited();
                        this.afterEditedObjectChanged(this.editedObject);
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
                        return child.isContent;
                    });
                    this.setStep(this.stepContents[0].tId);
                },
                methods: {
                    tryClosing: function() {
                        this.$emit("close", this.name);
                    },
                    copyOfEdited: function() {
                        return JSON.parse(JSON.stringify(this.initialEditedObject));
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
                        if (this.isCurrentStepValid) {
                            this.setStep(this.currentStepIndex + 1);
                        }
                    },
                    reset: function() {
                        this.$v.$reset();
                        this.setStep(0);
                    },
                    submit: function() {
                        if (!this.$v.$invalid) {
                            this.$emit("submit", JSON.parse(JSON.stringify(this.editedObject)));
                            this.tryClosing();
                        }
                    },
                    afterEditedObjectChanged: function() { },
                },
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
                                <div class="details" v-bind:class="{\'multi-step\':isMultiStep}">\
                                    <slot :editedObject="editedObject" :$v="$v" :constants="constants"></slot>\
                                </div>\
                                <div class="buttons multi-step" v-if="isMultiStep">\
                                    <cly-button @click="nextStep" v-if="!isLastStep" v-bind:disabled="!isCurrentStepValid" skin="green" v-bind:label="i18n(\'common.drawer.next-step\')"></cly-button>\
                                    <cly-button @click="submit" v-if="isLastStep" v-bind:disabled="$v.$invalid" skin="green" v-bind:label="saveButtonLabel"></cly-button>\
                                    <cly-button @click="prevStep" v-if="currentStepIndex > 0" skin="light" v-bind:label="i18n(\'common.drawer.previous-step\')"></cly-button>\
                                </div>\
                                <div class="buttons single-step" v-if="!isMultiStep">\
                                    <cly-button @click="submit" v-bind:disabled="$v.$invalid" skin="green" v-bind:label="saveButtonLabel"></cly-button>\
                                </div>\
                            </div>'
            }
        )
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
            template: '<div class="cly-vue-datatable-w" ref="wrapper">\
                            <div ref="buttonMenu" class="cly-button-menu" tabindex="1" v-if="hasOptions">\
                                <a class="item" @click="optionEvent(optionItem.action)" v-for="(optionItem, j) in optionItems" :key="j"><i :class="optionItem.icon"></i><span>{{optionItem.label}}</span></a>\
                            </div>\
                            <table ref="dtable" cellpadding="0" cellspacing="0" class="d-table-vue-wrapper"></table>\
                        </div>'
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
            template: '<div class="cly-vue-tabs" v-bind:class="[skinClass]">\
                            <ul class="cly-vue-tabs-list" v-bind:class="[numberOfTabsClass]">\
                                <li @click="setTab(tab.tId)" v-for="(tab, i) in tabs" :key="i" :class="{\'is-active\': tab.isActive}">\
                                    <a v-html="tab.tName"></a>\
                                </li>\
                            </ul>\
                            <div class="cly-vue-tabs-container">\
                                <slot/>\
                            </div>\
                        </div>'
        }
    ));

    Vue.component("cly-content", countlyBaseComponent.extend(
        // @vue/component
        {
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
                };
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
                },
                elementId: function() {
                    return this.componentId + "-" + this.id;
                }
            },
            template: '<div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">\
                            <div v-show="isActive"><slot/></div>\
                        </div>'
        }
    ));

    Vue.component("cly-panel", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                title: { type: String, required: true },
                dateSelector: { type: Boolean, required: false, default: true },
            },
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
                        </div>'
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
            template: '<div class="cly-vue-time-graph-w">\
                            <div ref="container" class="graph-container"></div>\
                            <div class="cly-vue-graph-no-data" v-if="!hasData">\
                                <div class="inner">\
                                    <div class="icon"></div>\
                                    <div class="text">{{i18n("common.graph.no-data")}}</div>\
                                </div>\
                            </div>\
                        </div>'
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
            template: '<div class="cly-vue-graph-w">\
                            <div ref="container" class="graph-container"></div>\
                            <div class="cly-vue-graph-no-data" v-if="!hasData">\
                                <div class="inner">\
                                    <div class="icon"></div>\
                                    <div class="text">{{i18n("common.graph.no-data")}}</div>\
                                </div>\
                            </div>\
                        </div>'
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
                }
            },
            methods: {
                setValue: function(e) {
                    this.$emit('input', e);
                }
            },
            template: '<div class="cly-vue-radio">\
                            <div class="radio-wrapper">\
                                <div @click="setValue(item.value)" v-for="(item, i) in items" :key="i" :class="{\'selected\': value == item.value}" class="radio-button">\
                                    <div class="box"></div>\
                                    <div class="text">{{item.label}}</div>\
                                    <div class="description">{{item.description}}</div>\
                                </div>\
                            </div>\
                        </div>'
        }
    ));

    Vue.component("cly-text-field", countlyBaseComponent.extend(
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
            template: '<input type="text" class="cly-vue-text-field input" v-bind="$attrs" v-bind:value="value" v-on:input="setValue($event.target.value)">'
        }
    ));

    Vue.component("cly-check", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                value: {default: false, type: Boolean},
                label: {type: String, default: ''},
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
            },
            template: '<div class="cly-vue-check" v-bind:class="[skinClass]">\
                            <div class="check-wrapper">\
                                <input type="checkbox" class="check-checkbox" :checked="value">\
                                <div v-bind:class="labelClass" @click="setValue(!value)"></div>\
                                <span class="check-text" @click="setValue(!value)">{{label}}</span>\
                            </div>\
                        </div>'
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
            template: '<div class="cly-vue-check-list">\
                        <cly-check v-for="(item, i) in items" :key="i" v-bind:skin="skin" v-bind:label="item.label" v-bind:value="uncompressed[i]" v-on:input="setValue(item.value, $event)">\
                        </cly-check>\
                    </div>'
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
                    if (["green", "light"].indexOf(this.skin) > -1) {
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
            template: '<textarea class="cly-vue-text-area"\
                            v-bind="$attrs"\
                            :value="value"\
                            @input="setValue($event.target.value)">\
                        </textarea>'
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
                    type: Object,
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
                    waitingItems: false
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
                    var index = [];
                    var currentGroup = -1;
                    this.items.forEach(function(item, idx) {
                        if (!Object.prototype.hasOwnProperty.call(item, "value")) {
                            currentGroup = idx;
                            index.push(-1);
                        }
                        else {
                            index.push(currentGroup);
                        }
                    });
                    return index;
                }
            },
            methods: {
                setItem: function(item) {
                    if (item.value) {
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
                }
            },
            watch: {
                opened: function(newValue) {
                    if (!newValue) {
                        this.tempSearchQuery = "";
                        this.searchQuery = "";
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
                }
            },
            template: '<div class="cly-vue-select" v-bind:class="containerClasses" v-click-outside="close">\
                            <div class="select-inner" @click="toggle">\
                                <div class="text-container">\
                                    <div v-if="selectedItem" class="text" style="width:80%">\
                                        <span>{{selectedItem.name}}</span>\
                                    </div>\
                                    <div v-if="!selectedItem" class="text" style="width:80%">\
                                        <span class="text-light-gray">{{placeholder}}</span>\
                                    </div>\
                                </div>\
                                <div class="right combo"></div>\
                            </div>\
                            <div class="search" v-if="searchable" v-show="opened">\
                                <div class="inner">\
                                <input type="search" v-model="tempSearchQuery"/>\<i class="fa fa-search"></i>\
                                </div>\
                            </div>\
                            <div class="items-list square" style="width:100%;" v-show="opened">\
                                <div ref="scrollable" class="scrollable">\
                                    <div class="warning" v-if="dynamicItems">{{ i18n("drill.big-list-warning") }}</div>\
                                    <div v-for="(item, i) in visibleItems" :key="i" v-on:click="setItem(item)" v-bind:class="{item: item.value, group : !item.value}">\
                                        <div v-if="!item.value">\
                                            <span v-text="item.name"></span>\
                                        </div>\
                                        <div v-if="item.value" v-bind:data-value="item.value">\
                                            <span v-text="item.name"></span>\
                                        </div>\
                                    </div>\
                                </div>\
                            </div>\
                        </div>'
        }
    ));


    var clyDataTableControls = countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        template: '<div class="cly-vgt-custom-controls">\
                        <div class="cly-vgt-custom-search">\
                            <div class="magnifier-wrapper" @click="toggleSearch">\
                                <i class="fa fa-search"></i>\
                            </div>\
                            <input type="text" ref="searchInput" v-show="searchVisible" class="vgt-input" :placeholder="i18n(\'common.search\')" v-bind:value="searchQuery" @input="queryChanged($event.target.value)"/>\
                        </div>\
                        <div class="cly-vgt-custom-paginator">\
                            <div class="display-items">\
                                <label>{{ i18n("common.show-items") }} <input type="number" v-model.number="displayItems"></label>\
                            </div>\
                            <div class="buttons">\
                                <span :class="{disabled: !prevAvailable}" @click="goToFirstPage"><i class="fa fa-angle-double-left"></i></span>\
                                <span :class="{disabled: !prevAvailable}" @click="goToPrevPage"><i class="fa fa-angle-left"></i></span>\
                                <span :class="{disabled: !nextAvailable}" @click="goToNextPage"><i class="fa fa-angle-right"></i></span>\
                                <span :class="{disabled: !nextAvailable}" @click="goToLastPage"><i class="fa fa-angle-double-right"></i></span>\
                            </div>\
                        </div>\
                    </div>',
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
        },
        data: function() {
            return {
                firstPage: 1,
                currentPage: 1,
                perPage: 10,
                searchVisible: false,
                displayItems: 10
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
            this.updatePerPage();
            this.goToFirstPage();
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
            }
        }
    });

    Vue.component("cly-datatable", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        inheritAttrs: false,
        components: {
            "custom-controls": clyDataTableControls
        },
        props: {
            rows: {
                type: Array
            },
            columns: {
                type: Array
            }
        },
        computed: {
            notFilteredTotal: function() {
                if (!this.rows) {
                    return 0;
                }
                return this.rows.length;
            },
            extendedColumns: function() {
                var extended = this.columns.map(function(col) {
                    if (col.type === "cly-options") {
                        var newCol = JSON.parse(JSON.stringify(col));
                        newCol.field = "cly-options";
                        newCol.sortable = false;
                        delete newCol.type;
                        return newCol;
                    }
                    return col;
                });
                return extended;
            }
        },
        data: function() {
            return {
                pageInfo: '',
                searchQuery: '',
                optionsOpened: false,
                optionsItems: [],
                optionsPosition: {
                    left: '0',
                    top: '0'
                }
            };
        },
        methods: {
            onInfoChanged: function(text) {
                this.pageInfo = text;
            },
            showRowOptions: function(event, items, row) {
                this.optionsItems = items;
                this.optionsOpened = true;
                var rect = event.target.getBoundingClientRect();

                this.optionsPosition = {
                    //right: rect.right + "px",
                    top: rect.top + "px"
                };

                this.optionsRowData = row;
            },
            onSearch: function(params) {
                if (params.searchTerm) {
                    this.$refs.controls.goToFirstPage();
                }
            },
            addTableEvents: function(propsObj) {
                var newProps = {
                    props: propsObj,
                    events: {
                        showRowOptions: this.showRowOptions
                    }
                };
                return newProps;
            }
        },
        template: '<div>\
                        <cly-row-options\
                            :items="optionsItems"\
                            :pos="optionsPosition"\
                            :opened="optionsOpened"\
                            :rowData="optionsRowData">\
                        </cly-row-options>\
                        <vue-good-table\
                            v-bind="$attrs"\
                            v-bind:rows="rows"\
                            v-bind:columns="extendedColumns"\
                            v-on="$listeners"\
                            :pagination-options="{\
                                enabled: true,\
                                mode: \'records\',\
                                position: \'top\'\
                            }"\
                            :search-options="{\
                                enabled: true,\
                                externalQuery: searchQuery\
                            }"\
                            @on-search="onSearch"\
                            styleClass="cly-vgt-table striped">\
                                <template slot="pagination-top" slot-scope="props">\
                                    <custom-controls\
                                    @infoChanged="onInfoChanged"\
                                    @queryChanged="searchQuery = $event"\
                                    ref="controls"\
                                    :search-query="searchQuery"\
                                    :total="props.total"\
                                    :notFilteredTotal="notFilteredTotal"\
                                    :pageChanged="props.pageChanged"\
                                    :perPageChanged="props.perPageChanged">\
                                    </custom-controls>\
                                </template>\
                                <template v-for="(_, name) in $scopedSlots" :slot="name" slot-scope="slotData">\
                                    <slot :name="name" v-bind="addTableEvents(slotData)" />\
                                </template>\
                                <div slot="table-actions-bottom">\
                                    {{pageInfo}}\
                                </div>\
                                <div slot="emptystate">\
                                    {{ i18n("common.table.no-data") }}\
                                </div>\
                        </vue-good-table>\
                    </div>'
    }));

    Vue.component("cly-row-options", countlyBaseComponent.extend({
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
        template: '<div class="cly-row-options">\
                        <div ref="menu" v-bind:style="{ right: pos.right, top: pos.top, opacity: opened ? 1:0 }" class="menu" tabindex="1">\
                            <a v-for="(item, index) in items" class="item" :key="index"><i :class="item.icon"></i><span>{{ item.label }}</span></a>\
                        </div>\
                    </div>'
    }));

}(window.CountlyVueComponents = window.CountlyVueComponents || {}, jQuery));
