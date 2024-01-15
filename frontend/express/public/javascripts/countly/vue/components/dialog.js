/* global Vue, CV */

(function(countlyVue) {

    Vue.component("cly-dialog", countlyVue.components.create({
        props: {
            title: {
                type: String,
                required: false,
                default: ''
            },
            autoCentered: {
                type: Boolean,
                required: false,
                default: false
            },
            testId: {
                type: String,
                default: 'cly-vue-dialog-test-id',
                required: false,
            }
        },
        computed: {
            forwardedSlots: function() {
                var self = this;
                return Object.keys(this.$scopedSlots).reduce(function(slots, slotKey) {
                    slots[slotKey] = self.$scopedSlots[slotKey];
                    return slots;
                }, {});
            },
            topClasses: function() {
                if (this.autoCentered) {
                    return "is-auto-centered";
                }
            }
        },
        template: '<el-dialog :destroy-on-close="true" class="cly-vue-dialog" :class="topClasses" v-on="$listeners" v-bind="$attrs" :title="title" :append-to-body="true">\
                        <template v-slot:title><h3 :data-test-id="testId + \'-cly-dialog-title-label\'" class="color-cool-gray-100">{{title}}</h3></template>\
                        <template v-for="(_, name) in forwardedSlots" v-slot:[name]="slotData">\
                            <slot :name="name"/>\
                        </template>\
                    </el-dialog>'
    }));


    Vue.component("cly-confirm-dialog", countlyVue.components.create({
        props: {
            title: {type: String, required: true},
            saveButtonLabel: {type: String, required: false, default: CV.i18n("common.save")},
            cancelButtonLabel: {type: String, required: false, default: CV.i18n("common.cancel")},
            dialogType: {type: String, required: false, default: "success"},
            testId: {type: String, default: 'cly-vue-confirm-dialog-test-id', required: false}
        },
        computed: {
            forwardedSlots: function() {
                var self = this;
                return Object.keys(this.$scopedSlots).reduce(function(slots, slotKey) {
                    slots[slotKey] = self.$scopedSlots[slotKey];
                    return slots;
                }, {});
            },
            saveLabel: function() {
                return this.$attrs.saveButtonLabel || this.saveButtonLabel;
            },
            cancelLabel: function() {
                return this.$attrs.cancelButtonLabel || this.cancelButtonLabel;
            },
            confirmStyle: function() {
                if (this.dialogType === "success" || this.dialogType === "danger" || this.dialogType === "warning") {
                    return this.dialogType;
                }
                return "success";
            }
        },
        methods: {
            confirmClicked: function() {
                this.$emit("confirm");
            },
            cancelClicked: function() {
                this.$emit("cancel");
            }
        },
        template: '<el-dialog destroyOnClose class="cly-vue-confirm-dialog" v-on="$listeners" v-bind="$attrs" :title="title">\
                        <template v-slot:title><h3 :data-test-id="testId + \'-cly-confirm-dialog-title-label\'" class="color-cool-gray-100">{{title}}</h3></template>\
                        <template v-for="(_, name) in forwardedSlots" v-slot:[name]="slotData">\
                            <slot :name="name"/>\
                        </template>\
						<template v-slot:footer><div class="cly-vue-formdialog__buttons is-single-step bu-is-justify-content-flex-end bu-is-flex">\
							<el-button size="small" :data-test-id="testId + \'-cly-confirm-dialog-cancel-button\'" @click="cancelClicked"  type="secondary" >{{cancelLabel}}</el-button>\
							<el-button size="small" :data-test-id="testId + \'-cly-confirm-dialog-save-button\'" @click="confirmClicked" type="success" v-if="confirmStyle==\'success\'" >{{saveLabel}}</el-button>\
                            <el-button size="small" :data-test-id="testId + \'-cly-confirm-dialog-warning-button\'" @click="confirmClicked" type="warning" v-else-if="confirmStyle==\'warning\'" >{{saveLabel}}</el-button>\
							<el-button size="small" :data-test-id="testId + \'-cly-confirm-dialog-danger-button\'" @click="confirmClicked" type="danger" v-else >{{saveLabel}}</el-button>\
						</div></template>\
                    </el-dialog>'
    }));


    Vue.component("cly-message-dialog", countlyVue.components.create({
        props: {
            title: {type: String, required: true},
            confirmButtonLabel: {type: String, required: false, default: CV.i18n("common.confirm")},
            dialogType: {type: String, required: false, default: "secondary"}
        },
        computed: {
            forwardedSlots: function() {
                var self = this;
                return Object.keys(this.$scopedSlots).reduce(function(slots, slotKey) {
                    slots[slotKey] = self.$scopedSlots[slotKey];
                    return slots;
                }, {});
            },
            buttonStyle: function() {
                if (this.dialogType === "success" || this.dialogType === "secondary") {
                    return this.dialogType;
                }
                return "success";
            }
        },
        methods: {
            confirmClicked: function() {
                this.$emit("confirm");
            }
        },
        template: '<el-dialog destroyOnClose class="cly-vue-message-dialog" v-on="$listeners" v-bind="$attrs" :title="title">\
                        <template v-slot:title>\
                            <h3 class="color-cool-gray-100">{{title}}</h3>\
                        </template>\
                        <template v-for="(_, name) in forwardedSlots" v-slot:[name]="slotData">\
                            <slot :name="name"/>\
                        </template>\
                        <template v-slot:footer>\
                            <div class="cly-vue-formdialog__buttons is-single-step bu-is-justify-content-flex-end bu-is-flex">\
                                <el-button size="small" @click="confirmClicked" :type="buttonStyle">{{confirmButtonLabel}}</el-button>\
                            </div>\
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
                testId: {
                    type: String,
                    default: 'cly-vue-formdialog-test-id',
                    required: false,
                }
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
