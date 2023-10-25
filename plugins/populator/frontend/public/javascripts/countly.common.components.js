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
        template: '<div>\
                    <div v-for="item in this.data">\
                        <div class="bu-is-flex bu-mb-4">\
                            <div class="bu-mr-3 populator-template__active-bar" :style="[item.isActive ? {\'background-color\': activeColorCode} : {}]"></div>\
                            <div>\
                                <div class="text-medium bu-has-text-weight-medium bu-mb-1" :style="[item.isActive ? {\'color\': activeColorCode} : {}]">{{item.header}}</div>\
                                <div class="text-smallish color-cool-gray-50">{{i18n("populator-template.settings-of-your-users")}}</div>\
                            </div>\
                        </div>\
                    </div>\
                </div>'
    }));

    Vue.component("cly-populator-number-selector", countlyVue.components.BaseComponent.extend({
        mixins: [countlyVue.mixins.i18n],
        props: {
            items: {
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
                selectedValue: this.items[0].value || 0
            };
        },
        methods: {
            numberChange: function(val) {
                this.selectedValue = val;
                this.$emit('input', this.selectedValue);
            }
        },
        template: '<div>\
                        <div class="bu-is-flex populator-number-selector">\
                            <div v-for="(item, index) in items" :key="item.value" class="populator-number-selector__each-box-wrapper">\
                                <div :class="{ \'populator-number-selector__active \': item.value === selectedValue, \'populator-number-selector__first\' : index === 0, \'populator-number-selector__last\' : index === (items.length - 1) }" class="populator-number-selector__each" @click="numberChange(item.value)">\
                                    <span class="text-medium">{{ item.text }}</span>\
                                </div>\
                            </div>\
                        </div>\
                  </div>'
    }));

    Vue.component("cly-populator-condition-selector", countlyVue.components.BaseComponent.extend({
        mixins: [countlyVue.mixins.i18n],
        props: {
            userProperties: {
                type: Array,
                default: function() {
                    return [];
                },
            },
            userPropertyValues: {
                type: Array,
                default: function() {
                    return [];
                },
            },
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
            };
        },
        methods: {
            close: function() {
                document.getElementById('addConditionBtn').click();
            },
            save: function() {
                this.$emit('input', {selectedKey: this.selectedProperty, selectedValue: this.selectedValue, conditionType: this.conditionType, values: [{key: "", probability: 0}]});
                this.close();
            }
        },
        template: '<div>\
                    <el-popover\
                        placement="bottom"\
                        width="288"\
                        popper-class="populator-condition-selector__popover"\
                        trigger="click">\
                        <template v-slot:default>\
                            <div class="bu-p-5">\
                                <div class="text-small bu-has-text-weight-medium bu-mb-2">{{i18n(\'populator-template.property\')}}</div>\
                                <el-select v-model="selectedProperty" style="width: 100%" :placeholder="i18n(\'populator.template.select-a-user-property\')">\
                                    <el-option\
                                    v-for="item in userProperties"\
                                    :key="item"\
                                    :label="item"\
                                    :value="item">\
                                    </el-option>\
                                </el-select>\
                                <cly-populator-number-selector class="bu-my-4" v-model="conditionType" :items="items"></cly-populator-number-selector>\
                                <div class="text-small bu-has-text-weight-medium bu-mb-2">{{i18n(\'populator-template.property-value\')}}</div>\
                                <el-select v-model="selectedValue" style="width: 100%" :placeholder="i18n(\'populator.template.select-a-user-property-value\')">\
                                    <el-option\
                                    v-for="item in userPropertyValues"\
                                    :key="item"\
                                    :label="item"\
                                    :value="item">\
                                    </el-option>\
                                </el-select>\
                                <div class="bu-mt-5 bu-is-flex bu-is-justify-content-flex-end">\
                                    <el-button class="el-button el-button--secondary el-button--small" @click="close">{{i18n(\'common.cancel\')}}</el-button>\
                                    <el-button class="el-button el-button--success el-button--small" @click="save">{{i18n(\'common.add\')}}</el-button>\
                                </div>\
                            </div>\
                        </template>\
                        <template v-slot:reference>\
                            <el-button type="text" slot="reference" id="addConditionBtn" class="text-smallish font-weight-bold color-blue-100">\
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
        template: '<div class="populator-template-drawer__main-container bu-py-3 bu-px-4">\
                    <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center">\
                        <div class="text-small text-uppercase populator-template-drawer__text-custom-detail">{{title}}</div>\
                        <div>\
                            <el-button type="text" class="el-button text-smallish bu-pr-1 bu-has-text-weight-medium populator-template-drawer__btn-delete el-button--text"  @click="$emit(\'remove\')"> Delete {{ entity }} </el-button>\
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
            }
        },
        data: function() {
            return {
                users: [],
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
            onRemoveValue: function(index, valueIndex) {
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
            onDeleteCondition: function(index) {
                this.users[index].condition = undefined;
            },
            onRemoveConditionValue: function(index, valueIndex) {
                try {
                    if (this.users[index].condition.values.length === 1) {
                        CountlyHelpers.notify({
                            title: CV.i18n("common.error"),
                            message: CV.i18n("populator-template.warning-while-removing-condition"),
                            type: "warning"
                        });
                        return;
                    }
                    this.users[index].condition.values.splice(valueIndex, 1);
                }
                catch (error) {
                    CountlyHelpers.notify({
                        title: CV.i18n("common.error"),
                        message: CV.i18n("populator-template.error-while-removing-value"),
                        type: "error"
                    });
                }
            },
            onAddAnotherConditionValue: function(index) {
                this.users[index].condition.values.push({key: "", probability: 0});
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
            }
        },
        data: function() {
            return {
                // Dummy data
                events: []
            };
        },
        watch: {
            events: {
                handler: function(newValue) {
                    this.$emit('input', newValue);
                },
                deep: true
            }
        },
        methods: {
            addEvent() {
                this.events.push({
                    "name": "New Event"
                });
            },
            removeEvent(index) {
                this.events.splice(index, 1);
            }
        },
        created() {
            this.events = this.value;
        },
        template: '<div>\
                    <div v-if="isOpen">\
                        <cly-populator-section-detail title="EVENT DETAILS" entity="Event" @remove="() => removeEvent(index)" :key="index" v-for="(event, index) in events" style="margin-bottom: 16px">\
                            <input type="text" v-model="events[index].name" />\
                        </cly-populator-section-detail>\
                    </div>\
                    <el-button :disabled="!isOpen" @click="addEvent">+ Add event</el-button>\
                </div>'
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
            title: {
                type: String,
                default: '',
                required: true
            },
            value: {
                type: [Object, Array],
            }
        },
        data: function() {
            return {
                isSectionActive: true,
                descriptionEnum: {
                    "userSection": "user",
                    "eventsSection": "event",
                    "viewsSection": "view",
                    "sequencesSection": "sequence",
                    "behaviorSection": "behavior",
                },
                description: '',
                userProperties: []
            };
        },
        created: function() {
            this.description = CV.i18n('populator-template.select-settings', this.descriptionEnum[this.type]);
        },
        components: {
            userSection,
            eventsSection
        },
        template: '<div class="bu-is-flex bu-is-flex-direction-column">\
                    <div class="bu-mb-2">\
                        <el-switch v-if="hasSwitch" v-model="isSectionActive" class="bu-mr-2"></el-switch>\
                        <span class="text-big bu-has-text-weight-medium">{{title}}</span>\
                    </div>\
                    <div class="text-smallish color-cool-gray-50 bu-mb-5">{{description}}</div>\
                    <component :is-open="isSectionActive" v-model="value" @input="(payload) => { $emit(\'input\', payload) }" :is="type">\
                        <template slot="default">\
                            <slot name="default"></slot>\
                        </template>\
                    </component>\
                </div>'
    }));
})();