/* global Vue, CV */

(function(countlyVue) {

    Vue.component("cly-dialog", countlyVue.components.create({
        props: {
            title: {
                type: String,
                required: false,
                default: ''
            }
        },
        computed: {
            forwardedSlots: function() {
                var self = this;
                return Object.keys(this.$scopedSlots).reduce(function(slots, slotKey) {
                    slots[slotKey] = self.$scopedSlots[slotKey];
                    return slots;
                }, {});
            }
        },
        template: '<el-dialog class="cly-vue-dialog" v-on="$listeners" v-bind="$attrs" :title="title">\
                        <template v-slot:title><h3 class="color-cool-gray-100">{{title}}</h3></template>\
                        <template v-for="(_, name) in forwardedSlots" v-slot:[name]="slotData">\
                            <slot :name="name"/>\
                        </template>\
                    </el-dialog>'
    }));


    var _mixins = countlyVue.mixins;

    Vue.component("cly-form-dialog", countlyVue.components.create(
        // @vue/component
        {
            inheritAttrs: false,
            mixins: [
                _mixins.i18n,
                _mixins.MultiStepForm,
                _mixins.Modal
            ],
            props: {
                isOpened: {type: Boolean, required: true},
                name: {type: String, required: true},
                title: {type: String, required: true},
                saveButtonLabel: {type: String, required: true, default: ""},
                cancelButtonLabel: {type: String, required: false, default: CV.i18n("common.cancel")},
                closeFn: {type: Function},
                hasCancelButton: {type: Boolean, required: false, default: true},
                toggleTransition: {
                    type: String,
                    default: 'stdt-fade'
                },
            },
            computed: {
                rootClasses: function() {
                    return {
                        'is-mounted': this.isMounted,
                        'is-open': this.isOpened
                    };
                }
            },
            data: function() {
                return {
                    isToggleable: true
                };
            },
            watch: {
                isOpened: function(newState) {
                    if (!newState) {
                        this.reset();
                    }
                    else {
                        this.$emit("open");
                    }
                    this.setModalState(newState);
                }
            },
            methods: {
                doClose: function() {
                    this.$emit("close", this.name);
                    if (this.closeFn) {
                        this.closeFn();
                    }
                },
                onClickOutside: function() {
                    this.doClose();
                },
                escKeyEvent: function() {
                    this.doClose();
                },
                onViewEntered: function() {
                    this.$refs.rootEl.focus();
                }
            },
            template: CV.T('/javascripts/countly/vue/templates/formdialog.html')
        }
    ));

    // @vue/component
    var hasFormDialogsMixin = function(names) {
        if (!Array.isArray(names)) {
            names = [names];
        }

        return {
            data: function() {
                return {
                    formDialogs: names.reduce(function(acc, val) {
                        acc[val] = {
                            name: val,
                            isOpened: false,
                            initialEditedObject: {},
                        };

                        acc[val].closeFn = function() {
                            acc[val].isOpened = false;
                        };

                        return acc;
                    }, {})
                };
            },
            methods: {
                openFormDialog: function(name, initialEditedObject) {
                    if (this.formDialogs[name].isOpened) {
                        return;
                    }
                    this.loadFormDialog(name, initialEditedObject);
                    this.formDialogs[name].isOpened = true;
                },
                loadFormDialog: function(name, initialEditedObject) {
                    this.formDialogs[name].initialEditedObject = initialEditedObject || {};
                },
                closeFormDialog: function(name) {
                    this.formDialogs[name].isOpened = false;
                }
            }
        };
    };

    countlyVue.mixins.hasFormDialogs = hasFormDialogsMixin;


}(window.countlyVue = window.countlyVue || {}));
