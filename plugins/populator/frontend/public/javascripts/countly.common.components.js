/*global countlyVue, Vue, CV, CountlyHelpers */

(function() {
    Vue.component("cly-populator-left-container", countlyVue.components.BaseComponent.extend({
        mixins: [countlyVue.mixins.i18n],
        props: {
            data: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            activeColorCode: {
                type: String,
                default: '#0166D6'
            }
        },
        data: function() {
            return {
                steps: [],
                sectionThresholds: {
                    "section-0": 0,
                    "section-1": 0,
                    "section-2": 0,
                    "section-3": 0,
                    "section-4": 0
                },
            };
        },
        methods: {
            scrollToSection(index) {
                const sectionId = "section-" + index + '-title';
                const section = document.getElementById(sectionId);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    this.steps[index].isActive = true;
                    this.steps.map((item, i) => {
                        if (i !== index) {
                            item.isActive = false;
                        }
                    });
                }
            },
            handleScroll: function() {
                const headerHeight = 79;
                const windowHeight = window.innerHeight - headerHeight;
                const pageCenter = windowHeight / 2;

                for (let index = 0; index < Object.keys(this.sectionThresholds).length; index++) {
                    const elementId = Object.keys(this.sectionThresholds)[index];
                    const element = document.getElementById(elementId);

                    if (!element) {
                        return;
                    }

                    const elementDimension = element.getBoundingClientRect();
                    const elementTop = elementDimension.top;
                    const elementHeight = elementDimension.height;

                    if (elementTop <= pageCenter && elementTop + elementHeight >= pageCenter) {

                        this.steps[index].isActive = true;
                        this.steps.forEach((item, i) => {
                            if (i !== index) {
                                item.isActive = false;
                            }
                        });

                        return;
                    }
                }
            }
        },
        mounted: function() {
            window.addEventListener('mousewheel', this.handleScroll);
        },
        created: function() {
            this.steps = this.data;
        },
        destroyed: function() {
            window.removeEventListener('mousewheel', this.handleScroll);
        },
        template: '<div>\
                    <div v-for="(item, index) in this.steps">\
                        <div class="bu-is-flex bu-mb-4">\
                            <div class="bu-mr-3 populator-template__active-bar" :style="[item.isActive ? {\'background-color\': activeColorCode} : {}]"></div>\
                            <div>\
                                <div class="text-medium bu-has-text-weight-medium bu-mb-1" @click="scrollToSection(index)" :style="[item.isActive ? {\'color\': activeColorCode} : {\'cursor\': \'pointer\'}]">{{item.header}}</div>\
                                <div class="text-smallish color-cool-gray-50">{{i18n("populator-template.settings-of-your", item.header.toLowerCase())}}</div>\
                            </div>\
                        </div>\
                    </div>\
                </div>'
    }));

    Vue.component("cly-populator-number-selector", countlyVue.components.BaseComponent.extend({
        mixins: [countlyVue.mixins.i18n],
        props: {
            value: {
                type: Number,
                default: 100
            },
            items: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            activeColorCode: {
                type: String,
                default: '#0166D6'
            },
            testId: {
                type: String,
                required: false,
                default: 'cly-populator-number-selector-default-test-id'
            }
        },
        data: function() {
            return {
                selectedValue: 0
            };
        },
        methods: {
            numberChange: function(val) {
                this.selectedValue = val;
                this.$emit('input', this.selectedValue);
            }
        },
        created: function() {
            this.selectedValue = this.value || 0;
        },
        template: '<div>\
                        <div class="bu-is-flex populator-number-selector">\
                            <div v-for="(item, index) in items" :key="item.value" class="populator-number-selector__each-box-wrapper">\
                                <div :class="{ \'populator-number-selector__active \': item.value === selectedValue, \'populator-number-selector__first\' : index === 0, \'populator-number-selector__last\' : index === (items.length - 1) }" class="populator-number-selector__each" @click="numberChange(item.value)">\
                                    <span class="text-medium" :data-test-id="testId + \'-item-\' + item.text.toString().replaceAll(\' \', \'-\').toLowerCase()">{{ item.text }}</span>\
                                </div>\
                            </div>\
                        </div>\
                  </div>'
    }));

    Vue.component("cly-populator-condition-selector", countlyVue.components.BaseComponent.extend({
        mixins: [countlyVue.mixins.i18n],
        props: {
            value: {
                type: [Object, Array],
                default: function() {
                    return {};
                }
            },
            conditionProperties: {
                type: Array,
                default: function() {
                    return [];
                },
            },
            conditionPropertyValues: {
                type: Array,
                default: function() {
                    return [];
                },
            },
            disabled: {
                type: Boolean,
                default: false
            },
            type: {
                type: String,
                default: '',
                required: false
            }
        },
        data: function() {
            return {
                items: [
                    { value: 1, text: "is equal to" },
                    { value: -1, text: "is not equal to" }
                ],
                conditionType: 1,
                selectedValue: '',
                selectedProperty: '',
                conditionPropertyValueItems: []
            };
        },
        watch: {
            conditionPropertyValues: {
                handler: function(newValue) {
                    this.conditionPropertyValueItems = newValue;
                    this.conditionPropertyValueItems = this.conditionPropertyValueItems.map(item => (item === '' ? null : item));
                    if (this.conditionPropertyValueItems.length && this.conditionPropertyValueItems.indexOf(null) !== -1) {
                        const filteredArr = this.conditionPropertyValueItems.filter((item) => item !== null);
                        this.conditionPropertyValueItems = ['Empty/Unset', ...filteredArr];
                    }
                },
                deep: true
            }
        },
        methods: {
            close: function() {
                document.querySelector('[data-test-id="populator-template-form-header-title"]').click();
            },
            save: function() {
                if (this.value.length && this.value.filter(item => item.selectedKey === this.selectedProperty && item.selectedValue === this.selectedValue && item.conditionType === this.conditionType).length) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.condition-already-exists"),
                        type: "warning",
                    });
                    return;
                }
                let conditions = this.value.length ? this.value : [];
                const isBehaviorSection = this.$parent.$parent.behavior ? true : false;
                if (isBehaviorSection) {
                    this.$emit('save-condition', this.type, this.selectedProperty, this.selectedValue, this.conditionType);
                }
                else {
                    conditions.push({
                        selectedKey: this.selectedProperty,
                        selectedValue: this.selectedValue,
                        conditionType: this.conditionType,
                        values: [{key: "", probability: 0}]
                    });
                    this.$emit('input', conditions);
                }

                this.close();
            },
            onAddCondition: function() {
                if (this.conditionProperties.length === 1) {
                    this.selectedProperty = this.conditionProperties[0];
                }
                else {
                    this.selectedProperty = '';
                    this.conditionPropertyValueItems = [];
                }
                this.$emit('selected-key-change', this.selectedProperty);
                this.selectedValue = '';
            },
            onSelectedKeyChange: function() {
                this.$emit('selected-key-change', this.selectedProperty);
                this.selectedValue = "";
            }
        },
        template: '<div>\
                    <el-popover\
                        placement="bottom"\
                        width="288"\
                        popper-class="populator-condition-selector__popover"\
                        transition="stdt-fade"\
                        trigger="click">\
                        <template v-slot:default>\
                            <div class="bu-p-5">\
                                <div class="text-small bu-has-text-weight-medium bu-mb-2">{{i18n(\'populator-template.property\')}}</div>\
                                <el-select v-model="selectedProperty" @change="onSelectedKeyChange" style="width: 100%" :placeholder="i18n(\'populator.template.select-a-user-property\')">\
                                    <el-option\
                                        v-for="item in conditionProperties"\
                                        :key="item"\
                                        :label="item"\
                                        :value="item">\
                                    </el-option>\
                                </el-select>\
                                <cly-populator-number-selector class="bu-my-4" v-model="conditionType" :items="items"></cly-populator-number-selector>\
                                <div class="text-small bu-has-text-weight-medium bu-mb-2">{{i18n(\'populator-template.property-value\')}}</div>\
                                <el-select v-model="selectedValue" style="width: 100%" :placeholder="i18n(\'populator.template.select-a-user-property-value\')">\
                                    <el-option\
                                        v-for="item in conditionPropertyValueItems"\
                                        :key="item"\
                                        :label="item"\
                                        :value="item">\
                                    </el-option>\
                                </el-select>\
                                <div class="bu-mt-5 bu-is-flex bu-is-justify-content-flex-end">\
                                    <el-button class="el-button el-button--secondary el-button--small" @click="close">{{i18n(\'common.cancel\')}}</el-button>\
                                    <el-button class="el-button el-button--success el-button--small" :disabled="selectedValue.length ? false : true" @click="save">{{i18n(\'common.add\')}}</el-button>\
                                </div>\
                            </div>\
                        </template>\
                        <template v-slot:reference>\
                            <el-button :disabled="disabled" type="text" slot="reference" @click="onAddCondition" id="addConditionBtn" class="text-smallish font-weight-bold color-blue-100">\
                                <i class="fa fa-plus-circle bu-mr-1"></i>{{i18n(\'populator-template.add-condition\')}}\
                            </el-button>\
                        </template>\
                    </el-popover>\
                </div>'
    }));

    Vue.component("cly-populator-section-detail", countlyVue.components.BaseComponent.extend({
        mixins: [countlyVue.mixins.i18n],
        props: {
            title: {
                type: String,
                default: '',
                required: true
            },
            entity: {
                type: String,
                default: '',
                required: false
            }
        },
        template: '<div class="populator-template__main-container bu-py-3 bu-px-4">\
                    <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center">\
                        <div class="text-small text-uppercase populator-template--text-custom-detail">{{title}}</div>\
                        <div>\
                            <el-button type="text" class="el-button text-smallish bu-pr-1 bu-has-text-weight-medium populator-template--btn-delete el-button--text"  @click="$emit(\'remove\')"> <span v-if="entity"> Delete {{ entity }} </span> </el-button>\
                        </div>\
                    </div>\
                    <slot/>\
                </div>'
    }));

    const userSection = countlyVue.views.create({
        mixins: [countlyVue.mixins.i18n],
        props: {
            value: {
                type: [Object, Array],
                default: function() {
                    return [];
                }
            },
            parentData: {
                type: [Object, Array],
            }
        },
        data: function() {
            return {
                users: [],
                conditionPropertyValues: []
            };
        },
        created() {
            // set initial value from v-model
            this.users = this.value;
        },
        watch: {
            // watch users change, and emit input event
            users: {
                handler: function(newValue) {
                    this.onUserPropertiesChange(newValue);
                },
                deep: true
            }
        },
        methods: {
            onUserPropertiesChange: function(newValue) {
                this.$emit('input', newValue);
            },
            onRemoveUserProperty: function(index) {
                try {
                    const checkedConditionList = this.checkRemoveValue(this.users[index].key);
                    if (checkedConditionList.length) {
                        CountlyHelpers.notify({
                            title: CV.i18n("common.error"),
                            message: CV.i18n("populator-template.delete-warning-used-in-condition", checkedConditionList.join(", ")),
                            type: "warning",
                            sticky: true
                        });
                        return;
                    }
                    this.users.splice(index, 1);
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-removing-value"),
                        type: "error"
                    });
                }
            },
            onAddUserProperty: function() {
                this.users.push({
                    "key": "",
                    "values": [{key: "", probability: 0}],
                });
            },
            onAddAnotherValue: function(index) {
                this.users[index].values.push({key: "", probability: 0});
            },
            checkRemoveValue: function(key, value) {
                let usedProperties = [];
                this.users.forEach(function(item) {
                    // check if it is used in user section
                    if (item.conditions && item.conditions.length) {
                        item.conditions.forEach(function(condition) {
                            if (condition.selectedKey === key && (value === undefined || condition.selectedValue === value)) {
                                usedProperties.push("user");
                            }
                        });
                    }
                });
                // check if it is used in behavior section
                this.parentData.generalConditions.forEach(function(item) {
                    if (item.selectedKey === key && (value === undefined || item.selectedValue === value)) {
                        usedProperties.push("behavior");
                    }
                });
                this.parentData.sequenceConditions.forEach(function(item) {
                    if (item.selectedKey === key && (value === undefined || item.selectedValue === value)) {
                        usedProperties.push("behavior");
                    }
                });

                if (usedProperties.length) {
                    const occurrenceCount = usedProperties.reduce((acc, item) => {
                        acc[item] = (acc[item] || 0) + 1;
                        return acc;
                    }, {});

                    const checkedConditionResult = Object.entries(occurrenceCount).map(([k, v]) => `${v} times in "${k}"`);
                    return checkedConditionResult;
                }
                return "";
            },
            onRemoveValue: function(index, valueIndex) {
                const checkedConditionList = this.checkRemoveValue(this.users[index].key, this.users[index].values[valueIndex].key);
                if (checkedConditionList.length) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.delete-warning-used-in-condition", checkedConditionList.join(", ")),
                        type: "warning",
                        sticky: true
                    });
                    return;
                }
                if (this.users[index].values.length === 1) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.warning-while-removing-condition"),
                        type: "warning"
                    });
                    return;
                }
                try {
                    this.users[index].values.splice(valueIndex, 1);
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-removing-value"),
                        type: "error"
                    });
                }
            },
            onDeleteCondition: function(index, conditionIndex) {
                this.users[index].conditions.splice(conditionIndex, 1);
            },
            onRemoveConditionValue: function(index, valueIndex, conditionIndex) {
                try {
                    if (this.users[index].conditions[conditionIndex].values.length === 1) {
                        this.users[index].conditions.splice(conditionIndex, 1);
                    }
                    else {
                        this.users[index].conditions[conditionIndex].values.splice(valueIndex, 1);
                    }
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-removing-value"),
                        type: "error"
                    });
                }
            },
            onAddAnotherConditionValue: function(index, conditionIndex) {
                try {
                    this.users[index].conditions[conditionIndex].values.push({key: "", probability: 0});
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-adding-condition"),
                        type: "error"
                    });
                }
            },
            onConditionSelectedKeyChange: function(selectedConditionProp) {
                const item = this.users.find(user => user.key === selectedConditionProp);
                if (item) {
                    this.conditionPropertyValues = item.values.map(valueItem => valueItem.key || null);
                }
            }
        },
        template: CV.T("/populator/templates/sections/users.html")
    });

    const eventsSection = countlyVue.views.create({
        mixins: [countlyVue.mixins.i18n],
        props: {
            isOpen: {
                type: Boolean,
                default: false
            },
            value: {
                type: [Object, Array],
            },
            parentData: {
                type: [Object, Array],
            }
        },
        data: function() {
            return {
                events: [],
                conditionPropertyValues: []
            };
        },
        watch: {
            events: {
                handler: function(newValue) {
                    if (!newValue.length) {
                        this.$parent.isSectionActive = false;
                    }
                    this.$emit('input', newValue);
                },
                deep: true
            }
        },
        methods: {
            onAddEvent() {
                this.events.push({
                    "key": "",
                    "duration": { isActive: false, minDurationTime: 0, maxDurationTime: 0 },
                    "sum": { isActive: false, minSumValue: 0, maxSumValue: 0},
                    "segmentations": []
                });
            },
            onRemoveEvent(index) {
                const checkedConditionList = this.checkRemoveValue(this.events[index].key);
                if (checkedConditionList.length) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.delete-warning-used-in-condition", checkedConditionList.join(", ")),
                        type: "warning",
                        sticky: true
                    });
                    return;
                }
                this.events.splice(index, 1);
            },
            onAddEventSegmentation: function(index) {
                this.events[index].segmentations.push({
                    "key": "",
                    "values": [{key: "", probability: 0}],
                });
            },
            checkRemoveValue: function(key, value, index) {
                let usedProperties = [];
                if (this.value[index] && this.value[index].segmentations) {
                    this.value[index].segmentations.forEach(function(item) {
                        if (item.conditions && item.conditions.length) {
                            item.conditions.forEach(function(condition) {
                                if (condition.selectedKey === key && (value === undefined || condition.selectedValue === value)) {
                                    usedProperties.push("event");
                                }
                            });
                        }
                    });
                }

                // check if it is used in sequence section
                else if (index === undefined && value === undefined) {
                    for (const item of this.parentData) {
                        const steps = item.steps;
                        for (const step of steps) {
                            if (step.key === 'events' && step.value === key) {
                                usedProperties.push('sequence');
                                break;
                            }
                        }
                    }
                }
                if (usedProperties.length) {
                    const occurrenceCount = usedProperties.reduce((acc, item) => {
                        acc[item] = (acc[item] || 0) + 1;
                        return acc;
                    }, {});

                    const checkedConditionResult = Object.entries(occurrenceCount).map(([k, v]) => `${v} times in "${k}"`);
                    return checkedConditionResult;
                }
                return "";
            },
            onRemoveSegment: function(index, segmentIndex, valueIndex) {
                try {
                    const checkedConditionList = this.checkRemoveValue(this.events[index].segmentations[segmentIndex].key, this.events[index].segmentations[segmentIndex].values[valueIndex].key, index);
                    if (checkedConditionList.length) {
                        CountlyHelpers.notify({
                            title: CV.i18n("common.error"),
                            message: CV.i18n("populator-template.delete-warning-used-in-condition", checkedConditionList.join(", ")),
                            type: "warning",
                            sticky: true
                        });
                        return;
                    }
                    if (this.events[index].segmentations[segmentIndex].values.length === 1) {
                        this.events[index].segmentations.splice(segmentIndex, 1);
                        return;
                    }
                    this.events[index].segmentations[segmentIndex].values.splice(valueIndex, 1);
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-removing-value"),
                        type: "error"
                    });
                }
            },
            onAddAnotherValue: function(index, segmentIndex) {
                try {
                    this.events[index].segmentations[segmentIndex].values.push({key: "", probability: 0});
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-adding-condition"),
                        type: "error"
                    });
                }
            },
            onAddAnotherConditionValue: function(index, segmentIndex, conditionIndex) {
                this.events[index].segmentations[segmentIndex].conditions[conditionIndex].values.push({key: "", probability: 0});
            },
            onRemoveConditionValue: function(index, segmentIndex, valueIndex, conditionIndex) {
                try {
                    if (this.events[index].segmentations[segmentIndex].conditions[conditionIndex].values.length === 1) {
                        this.events[index].segmentations[segmentIndex].conditions.splice(conditionIndex, 1);
                    }
                    else {
                        this.events[index].segmentations[segmentIndex].conditions[conditionIndex].values.splice(valueIndex, 1);
                    }
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-removing-value"),
                        type: "error"
                    });
                }
            },
            onDeleteCondition: function(index, segmentIndex, conditionIndex) {
                this.events[index].segmentations[segmentIndex].conditions.splice(conditionIndex, 1);
            },
            onConditionSelectedKeyChange: function(selectedConditionProp, index) {
                const item = this.events[index].segmentations.find(segment => segment.key === selectedConditionProp);
                if (item) {
                    this.conditionPropertyValues = item.values.map(valueItem => valueItem.key || null);
                }
            }
        },
        created() {
            this.events = this.value;
            if (this.parentData && this.parentData.length) {
                this.parentData.forEach((item) => {
                    item.steps.forEach((step) => {
                        if (step.key === "events" && step.disabled) {
                            this.$parent.isSectionActive = false;
                        }
                    });
                });
            }
        },
        template: CV.T("/populator/templates/sections/events.html")
    });

    const viewsSection = countlyVue.views.create({
        mixins: [countlyVue.mixins.i18n],
        props: {
            isOpen: {
                type: Boolean,
                default: false
            },
            value: {
                type: [Object, Array],
            },
            parentData: {
                type: [Object, Array],
            }
        },
        data: function() {
            return {
                views: [],
                conditionPropertyValues: []
            };
        },
        watch: {
            views: {
                handler: function(newValue) {
                    if (!newValue.length) {
                        this.$parent.isSectionActive = false;
                    }
                    this.$emit('input', newValue);
                },
                deep: true
            }
        },
        methods: {
            onAddView: function() {
                this.views.push({
                    "key": "",
                    "duration": { isActive: false, minDurationTime: 0, maxDurationTime: 0 },
                    "segmentations": []
                });
            },
            checkRemoveValue: function(key, value, index) {
                let usedProperties = [];
                if (this.value[index] && this.value[index].segmentations) {
                    this.value[index].segmentations.forEach(function(item) {
                        if (item.conditions && item.conditions.length) {
                            item.conditions.forEach(function(condition) {
                                if (condition.selectedKey === key && (value === undefined || condition.selectedValue === value)) {
                                    usedProperties.push("views");
                                }
                            });
                        }
                    });
                }

                // check if it is used in sequence section
                else if (index === undefined && value === undefined) {
                    for (const item of this.parentData) {
                        const steps = item.steps;
                        for (const step of steps) {
                            if (step.key === 'views' && step.value === key) {
                                usedProperties.push('sequence');
                                break;
                            }
                        }
                    }
                }
                if (usedProperties.length) {
                    const occurrenceCount = usedProperties.reduce((acc, item) => {
                        acc[item] = (acc[item] || 0) + 1;
                        return acc;
                    }, {});

                    const checkedConditionResult = Object.entries(occurrenceCount).map(([k, v]) => `${v} times in "${k}"`);
                    return checkedConditionResult;
                }
                return "";
            },
            onRemoveView: function(index) {
                const checkedConditionList = this.checkRemoveValue(this.views[index].key);
                if (checkedConditionList.length) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.delete-warning-used-in-condition", checkedConditionList.join(", ")),
                        type: "warning",
                        sticky: true
                    });
                    return;
                }
                this.views.splice(index, 1);
            },
            onAddViewSegmentation: function(index) {
                this.views[index].segmentations.push({
                    "key": "",
                    "values": [{key: "", probability: 0}],
                });
            },
            onRemoveSegment: function(index, segmentIndex, valueIndex) {
                try {
                    const checkedConditionList = this.checkRemoveValue(this.views[index].segmentations[segmentIndex].key, this.views[index].segmentations[segmentIndex].values[valueIndex].key, index);
                    if (checkedConditionList.length) {
                        CountlyHelpers.notify({
                            title: CV.i18n("common.error"),
                            message: CV.i18n("populator-template.delete-warning-used-in-condition", checkedConditionList.join(", ")),
                            type: "warning",
                            sticky: true
                        });
                        return;
                    }
                    if (this.views[index].segmentations[segmentIndex].values.length === 1) {
                        this.views[index].segmentations.splice(segmentIndex, 1);
                        return;
                    }
                    this.views[index].segmentations[segmentIndex].values.splice(valueIndex, 1);
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-removing-value"),
                        type: "error"
                    });
                }
            },
            onAddAnotherValue: function(index, valueIndex) {
                try {
                    this.views[index].segmentations[valueIndex].values.push({key: "", probability: 0});
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-adding-condition"),
                        type: "error"
                    });
                }
            },
            onAddAnotherConditionValue: function(index, segmentIndex, conditionIndex) {
                this.views[index].segmentations[segmentIndex].conditions[conditionIndex].values.push({key: "", probability: 0});
            },
            onRemoveConditionValue: function(index, segmentIndex, valueIndex, conditionIndex) {
                try {
                    if (this.views[index].segmentations[segmentIndex].conditions[conditionIndex].values.length === 1) {
                        this.views[index].segmentations[segmentIndex].conditions.splice(conditionIndex, 1);
                    }
                    else {
                        this.views[index].segmentations[segmentIndex].conditions[conditionIndex].values.splice(valueIndex, 1);
                    }
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-removing-value"),
                        type: "error"
                    });
                }
            },
            onDeleteCondition: function(index, segmentIndex, conditionIndex) {
                this.views[index].segmentations[segmentIndex].conditions.splice(conditionIndex, 1);
            },
            onConditionSelectedKeyChange: function(selectedConditionProp, index) {
                const item = this.views[index].segmentations.find(segment => segment.key === selectedConditionProp);
                if (item) {
                    this.conditionPropertyValues = item.values.map(valueItem => valueItem.key || null);
                }
            }
        },
        created() {
            this.views = this.value;
            if (this.parentData && this.parentData.length) {
                this.parentData.forEach((item) => {
                    item.steps.forEach((step) => {
                        if (step.key === "views" && step.disabled) {
                            this.$parent.isSectionActive = false;
                        }
                    });
                });
            }
        },
        template: CV.T("/populator/templates/sections/views.html")
    });

    const sequencesSection = countlyVue.views.create({
        mixins: [countlyVue.mixins.i18n],
        props: {
            isOpen: {
                type: Boolean,
                default: false
            },
            value: {
                type: [Object, Array],
            },
            parentData: {
                type: [Object, Array],
            },
            sectionActivity: {
                type: Object
            }
        },
        data: function() {
            return {
                sequences: [],
                selectedProperty: '',
                selectedValue: '',
                sequenceStepProperties: [
                    {name: "Event", value: "events"},
                    {name: "View", value: "views"}
                ],
                sequenceStepValues: {},
                linkedSectionActivity: false
            };
        },
        watch: {
            "parentData": {
                deep: true,
                handler: function(newValue) {
                    const eventsHasValue = this.sectionActivity.events && newValue.events && newValue.events.length && newValue.events.filter(x => x.name).length;
                    const viewsHasValue = this.sectionActivity.views && newValue.views && newValue.views.length && newValue.views.filter(x => x.name).length;
                    if (newValue && eventsHasValue || viewsHasValue) {
                        this.linkedSectionActivity = true;
                    }
                    else {
                        this.linkedSectionActivity = false;
                    }
                    this.sequenceStepValues = newValue;
                }
            },
            "sectionActivity": {
                deep: true,
                handler: function(newValue) {
                    if (!newValue.events && !newValue.views) { // if both events and views are disabled
                        this.linkedSectionActivity = false;
                        this.sequences.forEach((sequence) => {
                            sequence.steps = sequence.steps.map(step => {
                                if (step.key === "events" || step.key === "views") {
                                    step.disabled = true;
                                }
                                return step;
                            });
                        });

                        this.sequenceStepProperties.map((item) => {
                            item.disabled = true;
                        });
                    }
                    if (newValue.events) {
                        this.sequenceStepProperties.map((item) => {
                            if (item.value === "events") {
                                delete item.disabled;
                            }
                        });
                    }
                    if (newValue.views) {
                        this.sequenceStepProperties.map((item) => {
                            if (item.value === "views") {
                                delete item.disabled;
                            }
                        });
                    }
                }
            },
            "sectionActivity.events": {
                deep: true,
                handler: function(newValue) {
                    if (!newValue) { // if disabled events section
                        this.sequences.forEach((sequence) => {
                            sequence.steps = sequence.steps.map(step => {
                                if (step.key === "events") {
                                    step.disabled = true;
                                }
                                return step;
                            });
                        });
                        this.sequenceStepProperties.map((item) => {
                            if (item.value === "events") {
                                item.disabled = true;
                            }
                        });
                    }
                    if (newValue && this.parentData.events.length) {
                        this.linkedSectionActivity = true;
                        this.sequences.forEach((sequence) => {
                            sequence.steps = sequence.steps.map(step => {
                                if (step.key === "events") {
                                    delete step.disabled;
                                }
                                return step;
                            });
                        });
                        this.sequenceStepProperties.map((item) => {
                            if (item.value === "events") {
                                delete item.disabled;
                            }
                        });
                    }
                }
            },
            "sectionActivity.views": {
                deep: true,
                handler: function(newValue) {
                    if (!newValue) { // if disabled views section
                        this.sequences.forEach((sequence) => {
                            sequence.steps = sequence.steps.map(step => {
                                if (step.key === "views") {
                                    step.disabled = true;
                                }
                                return step;
                            });
                        });
                        this.sequenceStepProperties.map((item) => {
                            if (item.value === "views") {
                                item.disabled = true;
                            }
                        });
                    }
                    if (newValue && this.parentData.views.length) {
                        this.linkedSectionActivity = true;
                        this.sequences.forEach((sequence) => {
                            sequence.steps = sequence.steps.map(step => {
                                if (step.key === "views") {
                                    delete step.disabled;
                                }
                                return step;
                            });
                        });
                        this.sequenceStepProperties.map((item) => {
                            if (item.value === "views") {
                                delete item.disabled;
                            }
                        });
                    }
                }
            },
            sequences: {
                handler: function(newValue) {
                    if (!newValue.length) {
                        this.$parent.isSectionActive = false;
                    }
                    this.$emit('input', newValue);
                },
                deep: true
            }
        },
        methods: {
            onAddSequence: function() {
                this.sequences.push({steps: [{"key": "session", value: "start", "probability": 100, "fixed": true}, {"key": "session", value: "end", "probability": 100, "fixed": true}]});
            },
            onRemoveSequence(index) {
                this.sequences.splice(index, 1);
                this.$emit('deleted-index', index);
            },
            onRemoveStep: function(index, stepIndex) {
                if (this.sequences[index].steps.length === 3 && this.sequences[index].steps.find(x => x.key === "session" && x.value === "end")) {
                    this.sequences[index].steps = this.sequences[index].steps.filter(x => !(x.key === "session" && x.value === "end"));
                }
                if (this.sequences[index].steps.length === 1) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.warning-while-removing-condition"),
                        type: "warning"
                    });
                    return;
                }
                try {
                    this.sequences[index].steps.splice(stepIndex, 1);
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-removing-value"),
                        type: "error"
                    });
                }
            },
            onAddStep: function() {
                this.selectedProperty = '';
                this.selectedValue = '';
            },
            onDragChange: function() {
            },
            onSaveStep: function(index) {
                this.sequences[index].steps = this.sequences[index].steps.filter(x => x.key !== "session");
                this.sequences[index].steps.push({key: this.selectedProperty, value: this.selectedValue, probability: 0});
                this.sequences[index].steps.unshift({key: "session", value: "start", probability: 100, fixed: true});
                this.sequences[index].steps.push({key: "session", value: "end", probability: 100, fixed: true});
                this.onClose();
            },
            onClose: function() {
                document.getElementById('populator-template-step').click();
            },
            checkMove: function(e) {
                return this.isDraggable(e.draggedContext);
            },
            isDraggable: function(context) {
                const { index, futureIndex } = context;
                return !(this.sequences[0].steps[index].fixed || this.sequences[0].steps[futureIndex].fixed);
            }
        },
        created: function() {
            if (this.value && Object.keys(this.value).length) {
                this.sequences = this.value;
                this.linkedSectionActivity = true;
            }
            else {
                this.$parent.isSectionActive = false;
                this.linkedSectionActivity = false;
            }
            this.sequenceStepValues = this.parentData;
            if (this.parentData && this.parentData.behavior && this.parentData.behavior.sequences && this.parentData.behavior.sequences.length) {
                this.parentData.behavior.sequences.forEach((item) => {
                    if (item && item.disabled) {
                        this.$parent.isSectionActive = false;
                    }
                });
            }
        },
        template: CV.T("/populator/templates/sections/sequences.html")
    });

    const behaviorSection = countlyVue.views.create({
        mixins: [countlyVue.mixins.i18n],
        props: {
            isOpen: {
                type: Boolean,
                default: false
            },
            value: {
                type: [Object, Array],
            },
            parentData: {
                type: [Object, Array],
            },
            deletedIndex: {
                type: String,
            },
            sectionActivity: {
                type: [Boolean, Object]
            }
        },
        watch: {
            "sectionActivity": {
                deep: true,
                handler: function(newValue) {
                    if (!newValue) { // if disabled sequences section
                        this.behavior.sequences.forEach((item, index) => {
                            if (item.key !== "random") {
                                this.behavior.sequences[index].disabled = true;
                            }
                        });
                        this.behavior.sequenceConditions.forEach((item, index) => {
                            item.values.forEach((valueItem, valueIndex) => {
                                if (valueItem.key !== "random") {
                                    this.behavior.sequenceConditions[index].values[valueIndex].disabled = true;
                                }
                            });
                        });
                    }
                    else { // if enabled sequences section
                        this.behavior.sequences.forEach((item, index) => {
                            if (item.key !== "random") {
                                delete this.behavior.sequences[index].disabled;
                            }
                        });
                        this.behavior.sequenceConditions.forEach((item, index) => {
                            item.values.forEach((valueItem, valueIndex) => {
                                if (valueItem.key !== "random") {
                                    delete this.behavior.sequenceConditions[index].values[valueIndex].disabled;
                                }
                            });
                        });
                    }
                }
            },
            behavior: {
                handler: function(newValue) {
                    this.$emit('input', newValue);
                },
                deep: true,
            },
            deletedIndex: function(newValue) {
                if (!newValue || !newValue.length) {
                    return;
                }
                const index = parseInt(newValue.split("_")[0], 10);
                this.behavior.sequences.splice(index, 1);
                this.behavior.sequenceConditions.forEach((item) => {
                    item.values.splice(index, 1);
                });
                if (!this.behavior.sequences.length) {
                    const indexToRemove = this.behavior.sequences.findIndex(item => item.key === "random");
                    if (indexToRemove !== -1) {
                        this.behavior.sequences.splice(indexToRemove, 1);
                        this.behavior.sequenceConditions.forEach((item) => {
                            item.values.splice(indexToRemove, 1);
                        });
                    }
                }
                // re-indexing the sequences after deletion
                this.behavior.sequences.filter(x=>x.key !== 'random').forEach((sequence, idx) => {
                    sequence.key = "Sequence_" + (idx + 1);
                });
                this.behavior.sequenceConditions.forEach((item) => {
                    item.values.filter(x=>x.key !== 'random').forEach((sequence, idx) => {
                        sequence.key = "Sequence_" + (idx + 1);
                    });
                });
            },
            "parentData": {
                deep: true,
                handler: function(newValue) {
                    const usersUndefinedOrEmpty = typeof newValue.users === 'undefined' || newValue.users.length === 0;

                    if (usersUndefinedOrEmpty) {
                        this.isConditionDisabled = true;
                    }
                    else {
                        this.isConditionDisabled = false;
                    }
                    if (newValue.sequences && newValue.sequences.length) {
                        // adding a new sequence
                        if (newValue.sequences.length > this.behavior.sequences.filter(obj => obj.key !== 'random').length) {
                            const indexToRemove = this.behavior.sequences.findIndex(item => item.key === "random");
                            if (indexToRemove !== -1) {
                                this.behavior.sequences.splice(indexToRemove, 1);
                                this.behavior.sequenceConditions.forEach((item) => {
                                    item.values.splice(indexToRemove, 1);
                                });
                            }
                            this.behavior.sequences.push({key: 'Sequence_' + (this.behavior.sequences.length + 1), probability: 0});
                            if (this.behavior.sequenceConditions.length) {
                                this.behavior.sequenceConditions.forEach((item) => {
                                    item.values.push({key: 'Sequence_' + this.behavior.sequences.length, probability: 0});
                                });
                            }
                        }
                        if (!this.behavior.sequences.find(item => item.key === 'random')) {
                            this.behavior.sequences.push({key: 'random', probability: 0});
                        }
                        if (this.behavior.sequenceConditions.length) {
                            this.behavior.sequenceConditions.forEach((item) => {
                                if (!item.values.find(valueItem => valueItem.key === 'random')) {
                                    item.values.push({key: 'random', probability: 0});
                                }
                            });
                        }
                    }
                },
            }
        },
        data: function() {
            return {
                behavior: {},
                behaviourSectionEnum: {
                    GENERAL: "general",
                    SEQUENCE: "sequence"
                },
                conditionPropertyValues: [],
                isConditionDisabled: false,
            };
        },
        methods: {
            onConditionSelectedKeyChange: function(selectedConditionProp) {
                const item = this.parentData.users.find(user => user.keys === selectedConditionProp);
                if (item) {
                    this.conditionPropertyValues = item.values.map(valueItem => valueItem.key || null);
                }
            },
            onRemoveConditionValue: function(type, index) {
                if (type === this.behaviourSectionEnum.GENERAL) {
                    this.behavior.generalConditions.splice(index, 1);
                }
                else {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-removing-value"),
                        type: "error"
                    });
                }
            },
            saveCondition: function(type, selectedProperty, selectedValue, conditionType) {
                if (type === this.behaviourSectionEnum.GENERAL) {
                    this.behavior.generalConditions.push({
                        selectedKey: selectedProperty,
                        selectedValue: selectedValue,
                        conditionType: conditionType,
                        values: [0, 0]
                    });
                }
                else if (type === this.behaviourSectionEnum.SEQUENCE) {
                    this.behavior.sequenceConditions.push({
                        selectedKey: selectedProperty,
                        selectedValue: selectedValue,
                        conditionType: conditionType,
                        values: JSON.parse(JSON.stringify(this.behavior.sequences)) // deep cloning to prevent the reference
                    });
                }
                else {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-adding-condition"),
                        type: "error"
                    });
                }
            },
            onDeleteCondition: function(index) {
                this.behavior.sequenceConditions.splice(index, 1);
            }
        },
        created: function() {
            if (this.value && Object.keys(this.value).length) {
                this.behavior = this.value;
            }
            else {
                this.behavior = {
                    "runningSession": [null, null],
                    "generalConditions": [],
                    "sequences": [{key: "random", probability: 100}],
                    "sequenceConditions": []
                };
            }
        },
        template: CV.T("/populator/templates/sections/behavior.html")
    });

    Vue.component("cly-populator-section", countlyVue.components.BaseComponent.extend({
        props: {
            type: {
                type: String,
                default: '',
                required: true
            },
            hasSwitch: {
                type: Boolean,
                default: false,
                required: false
            },
            sectionActivity: {
                type: [Object, Boolean],
                required: false
            },
            title: {
                type: String,
                default: '',
                required: true
            },
            value: {
                type: [Object, Array],
            },
            parentData: {
                type: [Object, Array],
            },
            deletedIndex: {
                type: String,
            },
        },
        data: function() {
            return {
                isSectionActive: true, // todo: will be turned to false as a default later 
                descriptionEnum: {
                    "userSection": "user",
                    "eventsSection": "event",
                    "viewsSection": "view",
                    "sequencesSection": "sequence",
                    "behaviorSection": "behavior",
                },
                description: '',
                userProperties: [],
                sectionIndex: -1,
            };
        },
        watch: {
            isSectionActive: {
                handler: function(newValue) {
                    if (this.hasSwitch) {
                        this.$emit('section-activity-change', newValue);
                    }
                }
            }
        },
        methods: {
            setDeletedIndex: function(index) {
                this.$emit('deleted-index', index);
            }
        },
        created: function() {
            this.description = CV.i18n('populator-template.select-settings', this.descriptionEnum[this.type], '');
            if (this.descriptionEnum[this.type] === 'sequence') {
                this.description = CV.i18n('populator-template.select-settings', this.descriptionEnum[this.type], CV.i18n('populator-template.select-settings-' + this.descriptionEnum[this.type]));
            }
            const keys = Object.keys(this.descriptionEnum);
            this.sectionIndex = keys.indexOf(this.type);
        },
        components: {
            userSection,
            eventsSection,
            sequencesSection,
            viewsSection,
            behaviorSection
        },
        template: '<div class="bu-is-flex bu-is-flex-direction-column">\
                    <div class="bu-mb-2">\
                        <el-switch v-if="hasSwitch" v-model="isSectionActive" class="bu-mr-2"></el-switch>\
                        <span class="text-big bu-has-text-weight-medium" :id="\'section-\' + sectionIndex + \'-title\'">{{title}}</span>\
                    </div>\
                    <div class="text-smallish color-cool-gray-50 bu-mb-4">{{description}}</div>\
                    <component :is-open="isSectionActive" v-model="value" :parent-data="parentData" @input="(payload) => { $emit(\'input\', payload) }" :is="type" @deleted-index="setDeletedIndex" :deleted-index="deletedIndex" :section-activity="sectionActivity" >\
                        <template slot="default">\
                            <slot name="default"></slot>\
                        </template>\
                    </component>\
                </div>'
    }));
})();