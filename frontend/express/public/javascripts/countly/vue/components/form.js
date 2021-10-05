/* global Vue, app, Promise */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var BufferedObjectMixin = {
        props: {
            initialEditedObject: {
                type: Object,
                default: function() {
                    return {};
                }
            },
            beforeCopyFn: {type: Function}
        },
        data: function() {
            return {
                editedObject: this.copyOfEdited()
            };
        },
        watch: {
            initialEditedObject: function() {
                this.editedObject = this.copyOfEdited();
                this.reset();
                this.$emit("copy", this.editedObject);
            }
        },
        methods: {
            copyOfEdited: function() {
                var copied = JSON.parse(JSON.stringify(this.initialEditedObject));
                if (this.beforeCopyFn) {
                    return this.beforeCopyFn(copied);
                }
                else {
                    return copied;
                }
            }
        }
    };

    var MultiStepFormMixin = {
        mixins: [BufferedObjectMixin],
        props: {
            requiresAsyncSubmit: {type: Boolean, default: false, required: false},
            setStepCallbackFn: {type: Function, default: null, required: false}
        },
        data: function() {
            return {
                currentStepIndex: 0,
                stepContents: [],
                isMounted: false,
                isSubmissionAllowed: true,
                isSubmitPending: false
            };
        },
        computed: {
            lastValidIndex: function() {
                if (!this.isMounted) {
                    return -1;
                }
                for (var i = 0; i < this.stepContents.length; i++) {
                    if (this.stepContents[i].isStep && !this.stepContents[i].isValid) {
                        return i;
                    }
                }
                return i;
            },
            activeContentId: function() {
                if (this.activeContent) {
                    return this.activeContent.tId;
                }
                return null;
            },
            currentScreenMode: function() {
                if (this.activeContent && this.activeContent.screen) {
                    return this.activeContent.screen;
                }
                return "half";
            },
            currentStepId: function() {
                return this.activeContentId;
            },
            isCurrentStepValid: function() {
                if (this.activeContent.isStep) {
                    return this.activeContent.isValid;
                }
                return true;
            },
            isLastStep: function() {
                return this.stepContents.length > 1 && this.currentStepIndex === this.stepContents.length - 1;
            },
            activeContent: function() {
                if (this.currentStepIndex > this.stepContents.length - 1) {
                    return null;
                }
                return this.stepContents[this.currentStepIndex];
            },
            isMultiStep: function() {
                return this.stepContents.length > 1;
            },
            isValid: function() {
                if (!this.isMounted) {
                    return true;
                }
                return this.stepContents.reduce(function(item, current) {
                    if (current.isStep) {
                        return item && current.isValid;
                    }
                    return item;
                }, true);
            },
            passedScope: function() {
                var defaultKeys = ["editedObject", "currentStepId", "isSubmissionAllowed", "submit", "reset", "validate"],
                    self = this;

                var passed = defaultKeys.reduce(function(acc, val) {
                    acc[val] = self[val];
                    return acc;
                }, {});

                return passed;
            }
        },
        watch: {
            isValid: function(newValue) {
                var self = this;
                this.$nextTick(function() {
                    self.isSubmissionAllowed = newValue;
                });
            }
        },
        mounted: function() {
            this.stepContents = this.$children.filter(function(child) {
                return child.isContent && child.role === "default";
            });
            this.isMounted = true;
        },
        methods: {
            setStep: function(newIndex, originator, internalValidationFailed) {
                var self = this;
                var defaultAction = function() {
                    if (!internalValidationFailed && newIndex >= 0 && newIndex < self.stepContents.length) {
                        self.currentStepIndex = newIndex;
                    }
                };
                if (this.setStepCallbackFn) {
                    // .resolve() handles non-Promise return values as well
                    Promise.resolve(this.setStepCallbackFn(newIndex, self.currentStepIndex, originator))
                        .then(function(value) {
                            if (value) {
                                defaultAction();
                            }
                        })
                        .catch(function(err) {
                            if (app && app.activeView && app.activeView.onError) {
                                app.activeView.onError(err);
                            }
                        });
                }
                else {
                    defaultAction();
                }
            },
            setStepSafe: function(newIndex, originator) {
                this.beforeLeavingStep();
                this.setStep(newIndex, originator, newIndex > this.lastValidIndex);
            },
            prevStep: function() {
                this.setStep(this.currentStepIndex - 1, 'prev');
            },
            nextStep: function() {
                this.beforeLeavingStep();
                this.setStep(this.currentStepIndex + 1, 'next', !this.isCurrentStepValid);
            },
            reset: function() {
                this.callValidators("reset");
                this.setStep(0, 'reset');
            },
            submit: function(force) {
                this.beforeLeavingStep();
                if (this.isSubmissionAllowed || force === true) {
                    if (this.requiresAsyncSubmit) {
                        this.isSubmitPending = true;
                        var self = this;
                        var callback = function(err) {
                            self.isSubmitPending = false;
                            if (!err && self.doClose) {
                                self.doClose();
                            }
                        };
                        this.$emit("submit", JSON.parse(JSON.stringify(this.editedObject)), callback);
                    }
                    else {
                        this.$emit("submit", JSON.parse(JSON.stringify(this.editedObject)));
                        if (this.doClose) {
                            this.doClose();
                        }
                    }
                }
            },
            validate: function() {
                this.callValidators("touch");
            },
            beforeLeavingStep: function() {
                this.callValidators("touch");
                this.$emit("before-leaving-step");
            },
            callValidators: function(command) {
                this.stepContents.forEach(function(current) {
                    if (current[command]) {
                        current[command]();
                    }
                });
            }
        }
    };

    var BaseStep = _mixins.BaseContent.extend({
        data: function() {
            return {
                isValid: true,
                isStep: true
            };
        }
    });

    Vue.component("cly-form", countlyBaseComponent.extend({
        mixins: [MultiStepFormMixin],
        template: '<div class="cly-vue-form"><slot name="default"\n' +
                    'v-bind="passedScope">\n' +
                '</slot></div>\n'
    }));

    Vue.component("cly-form-step", BaseStep.extend({
        props: {
            validatorFn: {type: Function},
            id: { type: String, required: true },
            screen: {
                type: String,
                default: "half",
                validator: function(value) {
                    return ['half', 'full'].indexOf(value) !== -1;
                }
            }
        },
        data: function() {
            return {
                watchHandle: null
            };
        },
        mounted: function() {
            var self = this;
            this.watchHandle = this.$watch(function() {
                return self.$refs.observer.flags.valid;
            },
            function(newVal) {
                self.isValid = newVal;
            });
        },
        methods: {
            reset: function() {
                this.$refs.observer.reset();
            },
            touch: function() {
                this.$refs.observer.validate();
            }
        },
        computed: {
            isParentReady: function() {
                if (this.$parent.isToggleable) {
                    return this.$parent.isOpened;
                }
                return true;
            }
        },
        beforeDestroy: function() {
            this.watchHandle(); // unwatch
        },
        template: '<div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">\n' +
                    '<validation-observer ref="observer" v-slot="v">\n' +
                        '<div v-show="isActive" v-if="isParentReady">\n' +
                            '<slot/>\n' +
                        '</div>\n' +
                    '</validation-observer>\n' +
                '</div>'
    }));


    Vue.component("cly-form-field", countlyBaseComponent.extend({
        props: {
            label: String
        },
        template: '<div class="cly-vue-form-field cly-vue-form-step__section">\
                        <div class="text-small text-heading">{{label}}</div>\
                        <validation-provider v-bind="$attrs" v-on="$listeners" v-slot="validation">\
                            <div class="cly-vue-form-field__inner el-form-item" :class="{\'is-error\': validation.errors.length > 0}">\
                                <slot v-bind="validation"/>\
                            </div>\
                        </validation-provider>\
                  </div>'
    }));

    Vue.component("cly-inline-form-field", countlyVue.components.BaseComponent.extend({
        props: {
            label: String,
            help: String,
        },
        template: '<div class="cly-vue-form-field cly-vue-form-step__section bu-columns bu-is-vcentered bu-px-1 bu-mx-1">\
                        <div class="bu-column bu-is-4 bu-p-0">\
                            <p class="bu-has-text-weight-medium">{{label}} <span v-if="$attrs.rules && $attrs.rules.indexOf(\'required\') !== -1">*</span></p>\
                            <p v-if="help" v-html="help"></p>\
                        </div>\
                        <div class="bu-column bu-is-8 bu-has-text-left bu-p-0">\
                            <validation-provider v-if="$attrs.rules" :name="label" v-bind="$attrs" v-on="$listeners" v-slot="validation">\
                                <div class="cly-vue-form-field__inner el-form-item el-form-item__content" :class="{\'is-error\': validation.errors.length > 0}">\
                                    <slot v-bind="validation"/>\
                                    <div v-if="validation.errors.length" class="el-form-item__error">{{validation.errors[0]}}</div>\
                                </div>\
                            </validation-provider>\
                            <div v-else class="cly-vue-form-field__inner el-form-item el-form-item__content">\
                                <slot/>\
                            </div>\
                        </div>\
                  </div>'
    }));

    countlyVue.mixins.MultiStepForm = MultiStepFormMixin;

}(window.countlyVue = window.countlyVue || {}));
