/*global countlyVue, Vue, CV */

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
        template: '<div style="background-color: #F8FAFD; padding: 16px; width: 100%; ">\
                    <div style="display: flex; justify-content: space-between; align-items: center;">\
                        <div>{{title}}</div>\
                        <div><button @click="$emit(\'remove\')">Delete {{ entity }} </button></div>\
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
                users: []
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
            }
        },
        template: '<div>\
                    <div style="width:703px;height:169px; border:1px solid">\
                        User Component will be modified...\
                    </div>\
                </div>'
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
                    <component :is-open="isSectionActive" v-model="value" @input="(payload) => { $emit(\'input\', payload) }" :is="type"></component>\
                </div>'
    }));
})();