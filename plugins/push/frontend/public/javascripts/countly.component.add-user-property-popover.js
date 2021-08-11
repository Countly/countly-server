/*global CV, countlyVue*/
(function(countlyPushNotificationComponent) {
    countlyPushNotificationComponent.AddUserPropertyPopover = countlyVue.views.create({
        props: {
            userProperty: {
                type: Object,
                default: function() {
                    return {
                        value: "",
                        fallback: "",
                        isUppercase: false,
                    };
                }
            },
            isOpen: {
                type: Boolean,
                default: false
            },
            id: {
                required: true,
            },
            container: {
                type: String,
                required: true
            },
            width: {
                type: Number,
                required: true,
                default: 350
            },
            position: {
                type: Object,
                required: true,
                default: function() {
                    return {top: 0, left: 0};
                }
            },
            options: {
                type: Array,
                required: true,
                default: [],
            }
        },
        data: function() {
            return {};
        },
        computed: {
            getStyleObject: function() {
                var result = {};
                var topOffset = 30;
                result.width = this.width + 'px';
                result.top = (this.position.top + topOffset) + 'px';
                result.left = (this.position.left - (this.width / 2)) + 'px';
                return result;
            },
        },
        methods: {
            findOptionLabelByValue: function(value) {
                for (var property in this.options) {
                    if (this.options[property].value === value) {
                        return this.options[property].label;
                    }
                }
                return "";
            },
            onSelect: function(value) {
                this.$emit('select', this.id, this.container, value, this.findOptionLabelByValue(value));
            },
            onUppercase: function(value) {
                this.$emit('check', this.id, this.container, value);
            },
            onFallback: function(value) {
                this.$emit('input', this.id, this.container, value);
            },
            onRemove: function() {
                this.$emit('remove', this.id, this.container);
            },
            onClose: function() {
                this.$emit('close');
            },
        },
        mounted: function() {
            document.body.appendChild(this.$el);
        },
        destroyed: function() {
            document.body.removeChild(this.$el);
        },
        template: CV.T("/push/templates/add-user-property-popover.html")
    });

})(window.countlyPushNotificationComponent = window.countlyPushNotificationComponent || {});