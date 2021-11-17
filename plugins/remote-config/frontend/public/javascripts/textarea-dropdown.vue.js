(function(RemoteConfigComponents, $) {
    var dropdown = {
        template: "#cly-single-select",
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
            }
        },
        data: function() {
            return {
                opened: false,
                placeholder: jQuery.i18n.map["placeholder.set-default-value"]
            }
        },
        computed: {},
        methods: {
            toggle: function() {
                if (!this.items.length) {
                    return;
                }

                this.opened = !this.opened;
            },
            setItem: function(item) {
                this.$emit("input", item);
                this.opened = false;
                //Following is a very stupid thing to do, but no other option because
                //Remote config is not yet a vue instance :/
                $("#rc-parameter-drawer").trigger("cly-rc-parameter-complete");
            },
            onInput: function(event) {
                this.setItem({name: event.target.value, value: event.target.value});
            },
            resizeTextarea: function(event) {
                event.target.style.height = "28px";
                event.target.style.height = event.target.scrollHeight + "px";

                if(this.opened) {
                    this.toggle();
                }
            },
            close: function(e) {
                if (!this.$el.contains(e.target)) {
                    this.opened = false
                }
            }
        },
        mounted: function() {
            this.$refs.write.addEventListener("input", this.resizeTextarea);
            this.$refs.write.addEventListener("keyup", this.resizeTextarea);
            this.$refs.write.addEventListener("keydown", this.resizeTextarea);
            this.$refs.write.addEventListener("change", this.resizeTextarea);
            document.addEventListener('click', this.close);
        },
        beforeDestroy: function() {
            document.removeEventListener('click', this.close)
        },
        watch: {
            value: {
                immediate: true,
                handler: function() {
                    this.$nextTick(function() {
                        this.$refs.write.dispatchEvent(new Event("change"));
                    });
                }
            }
        }
    };

    var sortableTable = {
        template: '#cly-rc-condition-sortable-table',
        props: {
            items: {type: Array, default: []},
            conditions: { type: Array, default: [] }
        },
        components: {
            "cly-textarea-drop": dropdown
        }
    }

    RemoteConfigComponents.init = function() {
        var rc = {
            el: "#remote-config",
            data: {
                items: [],
                defaultValue: {},
                conditions: []
            },
            components: {
                "cly-textarea-drop": dropdown,
                "condition-sortable-table": sortableTable
            }
        }
    
        RemoteConfigComponents.clyTextDrop = new Vue(rc);
    };

}(window.RemoteConfigComponents = window.RemoteConfigComponents || {}, jQuery));