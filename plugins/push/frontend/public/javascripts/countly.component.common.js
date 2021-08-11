/*global countlyVue*/
(function(countlyPushNotificationComponent) {
    countlyPushNotificationComponent.LargeRadioButtonWithDescription = countlyVue.views.create({
        props: {
            value: {
                type: String,
                required: true
            },
            label: {
                type: String,
                required: true,
            },
            title: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                required: false,
            },
            hasTopMargin: {
                type: Boolean,
                required: false,
                default: false,
            }
        },
        data: function() {
            return {};
        },
        computed: {
            innerValue: {
                get: function() {
                    return this.value;
                },
                set: function(value) {
                    this.$emit('input', value);
                }
            },
            hasDefaultSlot: function() {
                return Boolean(this.$slots.default);
            }
        },
        template: "#large-radio-button-with-description"
    });

    countlyPushNotificationComponent.LineRadioButtonWithDescription = countlyVue.views.create({
        props: {
            value: {
                type: String,
                required: true
            },
            label: {
                type: String,
                required: true,
            },
            title: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                required: false,
            },
            border: {
                type: Boolean,
                required: false,
                default: false,
            }
        },
        data: function() {
            return {};
        },
        computed: {
            innerValue: {
                get: function() {
                    return this.value;
                },
                set: function(value) {
                    this.$emit('input', value);
                }
            },
            hasDefaultSlot: function() {
                return Boolean(this.$slots.default);
            }
        },
        template: "#line-radio-button-with-description"
    });

    countlyPushNotificationComponent.MessageSettingElement = countlyVue.views.create({
        props: {
            input: {
                type: String,
                default: "",
                required: false
            },
            toggle: {
                type: Boolean,
                default: false,
                required: true,
            },
            label: {
                type: String,
                default: "",
                required: true
            },
            placeholder: {
                type: String,
                default: "",
                required: false,
            },
            description: {
                type: String,
                default: "",
                required: false,
            },
            rules: {
                type: Array,
                default: function() {
                    return [];
                },
                required: false,
            }
        },
        data: function() {
            return {
                innerInput: "",
                innerToggle: false
            };
        },
        computed: {
            hasDefaultSlot: function() {
                return Boolean(this.$slots.default);
            }
        },
        watch: {
            input: function(value) {
                this.innerInput = value;
            },
            toggle: function(value) {
                this.innerToggle = value;
            }
        },
        methods: {
            onToggle: function(value) {
                this.$emit("onToggle", value);
            },
            onInput: function(value) {
                this.$emit("onChange", value);
            }
        },
        template: "#message-setting-element",
    });

    countlyPushNotificationComponent.ReviewSectionRow = countlyVue.views.create({
        props: {
            value: {
                type: String,
                required: true,
                default: ""
            },
            label: {
                type: String,
                required: true,
            },
        },
        template: "#review-section-row",
    });

})(window.countlyPushNotificationComponent = window.countlyPushNotificationComponent || {});