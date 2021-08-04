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
            options: {
                type: Array,
                default: function() {
                    return [{label: "Browser", value: "br"}, {label: "App version", value: "av"}];
                }
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
            }
        },
        data: function() {
            return {
            };
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
            onSelect: function(value) {
                this.$emit('select', this.id, this.container, value);
            },
            onUppercase: function(value) {
                this.$emit('check', this.id, this.container, value);
            },
            onFallback: function(value) {
                this.$emit('input', this.id, this.container, value);
            },
            onRemove: function(id) {
                this.$emit('remove', id, this.container);
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