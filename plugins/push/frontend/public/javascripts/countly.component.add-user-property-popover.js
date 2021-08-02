/*global CV, countlyVue*/
(function(countlyPushNotificationComponent){
    countlyPushNotificationComponent.AddUserPropertyPopover = countlyVue.views.create({
        props:{
            userProperty: {
                type: Object,
                default: function(){
                    return {                     
                        value: "",
                        fallback: "",
                        isUppercase: false,
                    }
                }
            },
            isOpen:{
                type: Boolean,
                default: false
            },
            id: {
                required: true,
            },
            element: {
                type: String,
                required: true
            },
            options:{
                type: Array,
                default: function(){
                    return [{label:"Browser",value:"br"},{label:"App version", value:"av"}]
                }
            },
        },
        data: function(){
            return {
            }
        },
        methods: {
            onSelect: function(value){
                this.$emit('select',this.userProperty.id,this.element,value)
            },
            onUppercase: function(value){
                this.$emit('check',this.userProperty.id,this.element,value)
            },
            onFallback: function(value){
                this.$emit('input',this.userProperty.id,this.element,value)
            },
            onRemove: function(){
                this.$emit('remove',id,this.element);
            },
            onClose: function(){
                this.$emit('close');
            }
        },
        template: CV.T("/push/templates/add-user-property-popover.html")
    });

})(window.countlyPushNotificationComponent = window.countlyPushNotificationComponent || {})