/* global Vue */

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
            beforeCopyFn: {type: Function},
            requiresAsyncSubmit: {type: Boolean, default: false}
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
                var defaultKeys = ["editedObject", "currentStepId", "isSubmissionAllowed", "submit"],
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
            setStep: function(newIndex) {
                if (newIndex >= 0 && newIndex < this.stepContents.length) {
                    this.currentStepIndex = newIndex;
                }
            },
            setStepSafe: function(newIndex) {
                if (newIndex <= this.lastValidIndex) {
                    this.setStep(newIndex);
                }
            },
            prevStep: function() {
                this.setStep(this.currentStepIndex - 1);
            },
            nextStep: function() {
                this.beforeLeavingStep();
                if (this.isCurrentStepValid) {
                    this.setStep(this.currentStepIndex + 1);
                }
            },
            reset: function() {
                this.callValidators("reset");
                this.setStep(0);
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
            screen: {
                type: String,
                default: "half",
                validator: function(value) {
                    return ['half', 'full'].indexOf(value) !== -1;
                }
            }
        },
        mounted: function() {
            var self = this;
            this.$watch(function() {
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
        template: '<div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">\n' +
                    '<validation-observer ref="observer" v-slot="v">\n' +
                        '<div v-show="isActive" v-if="isParentReady">\n' +
                            '<slot/>\n' +
                        '</div>\n' +
                    '</validation-observer>\n' +
                '</div>'
    }));

    countlyVue.mixins.MultiStepForm = MultiStepFormMixin;

}(window.countlyVue = window.countlyVue || {}));
