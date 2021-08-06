/*global CV, countlyVue, countlySegmentation*/
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
            }
        },
        data: function() {
            return {
                userPropertiesOptions: []
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
            findUserPropertyLabelByValue: function(value) {
                for (var property in this.userPropertiesOptions) {
                    if (this.userPropertiesOptions[property].value === value) {
                        return this.userPropertiesOptions[property].label;
                    }
                }
                return "";
            },
            onSelect: function(value) {
                this.$emit('select', this.id, this.container, value, this.findUserPropertyLabelByValue(value));
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
            setUserPropertiesOptions: function(userPropertiesOptionsDto) {
                this.userPropertiesOptions = userPropertiesOptionsDto.reduce(function(allUserPropertyOptions, userPropertyOptionDto) {
                    if (userPropertyOptionDto.id) {
                        allUserPropertyOptions.push({label: userPropertyOptionDto.name, value: userPropertyOptionDto.id});
                    }
                    return allUserPropertyOptions;
                }, []);
            },
            fetchUserPropertiesOptions: function() {
                var self = this;
                countlySegmentation.initialize("").then(function() {
                    self.setUserPropertiesOptions(countlySegmentation.getFilters());
                });
            }
        },
        mounted: function() {
            document.body.appendChild(this.$el);
            this.fetchUserPropertiesOptions();
        },
        destroyed: function() {
            document.body.removeChild(this.$el);
        },
        template: CV.T("/push/templates/add-user-property-popover.html")
    });

})(window.countlyPushNotificationComponent = window.countlyPushNotificationComponent || {});