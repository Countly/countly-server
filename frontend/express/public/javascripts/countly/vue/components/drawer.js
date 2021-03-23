/* global Vue */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var BufferedFormMixin = {
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
            }
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
    }

    Vue.component("cly-drawer", countlyBaseComponent.extend(
        // @vue/component
        {
            inheritAttrs: false,
            mixins: [
                _mixins.i18n,
                BufferedFormMixin
            ],
            props: {
                isOpened: {type: Boolean, required: true},
                name: {type: String, required: true},
                title: {type: String, required: true},
                saveButtonLabel: {type: String, required: true, default: ""},
                closeFn: {type: Function}
            },
            data: function() {
                return {
                    currentStepIndex: 0,
                    stepContents: [],
                    sidecarContents: [],
                    inScope: [],
                    isMounted: false,
                    isSubmissionAllowed: false
                };
            },
            computed: {
                activeContentId: function() {
                    if (this.activeContent) {
                        return this.activeContent.tId;
                    }
                    return null;
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
                hasSidecars: function() {
                    return this.sidecarContents.length > 0;
                },
                passedScope: function() {
                    var defaultKeys = ["editedObject", "currentStepId"],
                        self = this;

                    var passed = defaultKeys.reduce(function(acc, val) {
                        acc[val] = self[val];
                        return acc;
                    }, {});

                    return passed;
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
                }
            },
            watch: {
                isOpened: function(newState) {
                    if (!newState) {
                        this.reset();
                    }
                },
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
                this.sidecarContents = this.$children.filter(function(child) {
                    return child.isContent && child.role === "sidecar";
                });
                this.isMounted = true;
            },
            methods: {
                doClose: function() {
                    this.$emit("close", this.name);
                    if (this.closeFn) {
                        this.closeFn();
                    }
                },
                setStep: function(newIndex) {
                    if (newIndex >= 0 && newIndex < this.stepContents.length) {
                        this.currentStepIndex = newIndex;
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
                submit: function() {
                    this.beforeLeavingStep();
                    if (this.isSubmissionAllowed) {
                        this.$emit("submit", JSON.parse(JSON.stringify(this.editedObject)));
                        this.doClose();
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
            },
            template: '<div class="cly-vue-drawer"\n' +
                            'v-bind:class="{mounted: isMounted, open: isOpened, \'has-sidecars\': hasSidecars}">\n' +
                            '<div class="title">\n' +
                                '<span>{{title}}</span>\n' +
                                '<span class="close" v-on:click="doClose">\n' +
                                    '<i class="ion-ios-close-empty"></i>\n' +
                                '</span>\n' +
                            '</div>\n' +
                            '<div class="sidecars-view" v-show="hasSidecars">\n' +
                                '<slot name="sidecars"\n' +
                                    'v-bind="passedScope">\n' +
                                '</slot>\n' +
                            '</div>\n' +
                            '<div class="steps-view">\n' +
                                '<div class="steps-header" v-show="isMultiStep">\n' +
                                    '<div class="label" v-bind:class="{active: i === currentStepIndex,  passed: i < currentStepIndex}" v-for="(currentContent, i) in stepContents" :key="i">\n' +
                                        '<div class="wrapper">\n' +
                                            '<span class="index">{{i + 1}}</span>\n' +
                                            '<span class="done-icon"><i class="fa fa-check"></i></span>\n' +
                                            '<span class="text">{{currentContent.name}}</span>\n' +
                                        '</div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                                '<div class="details" v-bind:class="{\'multi-step\':isMultiStep}">\n' +
                                    '<slot name="default"\n' +
                                        'v-bind="passedScope">\n' +
                                    '</slot>\n' +
                                '</div>\n' +
                                '<div class="buttons multi-step" v-if="isMultiStep">\n' +
                                    '<div class="controls-left-container">\n' +
                                        '<slot name="controls-left"\n' +
                                            'v-bind="passedScope">\n' +
                                        '</slot>\n' +
                                    '</div>\n' +
                                    '<cly-button @click="nextStep" v-if="!isLastStep" v-bind:disabled="!isCurrentStepValid" skin="green" v-bind:label="i18n(\'common.drawer.next-step\')"></cly-button>\n' +
                                    '<cly-button @click="submit" v-if="isLastStep" v-bind:disabled="!isSubmissionAllowed" skin="green" v-bind:label="saveButtonLabel"></cly-button>\n' +
                                    '<cly-button @click="prevStep" v-if="currentStepIndex > 0" skin="light" v-bind:label="i18n(\'common.drawer.previous-step\')"></cly-button>\n' +
                                '</div>\n' +
                                '<div class="buttons single-step" v-if="!isMultiStep">\n' +
                                    '<cly-button @click="submit" v-bind:disabled="!isSubmissionAllowed" skin="green" v-bind:label="saveButtonLabel"></cly-button>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    // @vue/component
    var hasDrawersMixin = function(names) {
        if (!Array.isArray(names)) {
            names = [names];
        }

        return {
            data: function() {
                return {
                    drawers: names.reduce(function(acc, val) {
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
                openDrawer: function(name, initialEditedObject) {
                    if (this.drawers[name].isOpened) {
                        return;
                    }
                    this.loadDrawer(name, initialEditedObject);
                    this.drawers[name].isOpened = true;
                },
                loadDrawer: function(name, initialEditedObject) {
                    this.drawers[name].initialEditedObject = initialEditedObject || {};
                },
                closeDrawer: function(name) {
                    this.drawers[name].isOpened = false;
                }
            }
        };
    };

    countlyVue.mixins.hasDrawers = hasDrawersMixin;


}(window.countlyVue = window.countlyVue || {}));
