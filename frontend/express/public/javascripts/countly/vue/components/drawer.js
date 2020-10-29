/* global */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var BaseDrawer = countlyBaseComponent.extend(
        // @vue/component
        {
            inheritAttrs: false,
            mixins: [
                _mixins.i18n
            ],
            props: {
                isOpened: {type: Boolean, required: true},
                initialEditedObject: {
                    type: Object,
                    default: function() {
                        return {};
                    }
                },
                name: {type: String, required: true}
            },
            data: function() {
                return {
                    title: '',
                    saveButtonLabel: this.i18n("common.confirm"),
                    editedObject: this.copyOfEdited(),
                    currentStepIndex: 0,
                    stepContents: [],
                    sidecarContents: [],
                    constants: {},
                    localState: this.getInitialLocalState(),
                    inScope: [],
                    isMounted: false
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
                    if (!this.stepValidations || !Object.prototype.hasOwnProperty.call(this.stepValidations, this.activeContentId)) {
                        // No validation scenario defined
                        return true;
                    }
                    return this.stepValidations[this.activeContentId];
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
                    var defaultKeys = ["editedObject", "$v", "constants", "localState"],
                        self = this;

                    var passed = defaultKeys.reduce(function(acc, val) {
                        acc[val] = self[val];
                        return acc;
                    }, {});

                    if (this.inScopeReadOnly) {
                        passed.readOnly = this.inScopeReadOnly.reduce(function(acc, val) {
                            acc[val] = self[val];
                            return acc;
                        }, {});
                    }

                    return passed;
                }
            },
            watch: {
                initialEditedObject: function() {
                    this.editedObject = this.afterObjectCopy(this.copyOfEdited());
                    this.reset();
                },
                isOpened: function(newState) {
                    if (!newState) {
                        this.reset();
                    }
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
                tryClosing: function() {
                    this.$emit("close", this.name);
                },
                copyOfEdited: function() {
                    var copied = JSON.parse(JSON.stringify(this.initialEditedObject));
                    return this.beforeObjectCopy(copied);
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
                    this.$v.$reset();
                    this.resetLocalState();
                    this.setStep(0);
                },
                submit: function() {
                    this.beforeLeavingStep();
                    if (!this.$v.$invalid) {
                        this.$emit("submit", this.beforeSubmit(JSON.parse(JSON.stringify(this.editedObject))));
                        this.tryClosing();
                    }
                },
                afterObjectCopy: function(newState) {
                    return newState;
                },
                beforeObjectCopy: function(newState) {
                    return newState;
                },
                beforeSubmit: function(editedObject) {
                    return editedObject;
                },
                getInitialLocalState: function() {
                    return {};
                },
                resetLocalState: function() {
                    this.localState = this.getInitialLocalState();
                },
                beforeLeavingStep: function() { }
            },
            template: '<div class="cly-vue-drawer"\n' +
                            'v-bind:class="{mounted: isMounted, open: isOpened, \'has-sidecars\': hasSidecars}">\n' +
                            '<div class="title">\n' +
                                '<span>{{title}}</span>\n' +
                                '<span class="close" v-on:click="tryClosing">\n' +
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
                                    '<cly-button @click="submit" v-if="isLastStep" v-bind:disabled="$v.$invalid" skin="green" v-bind:label="saveButtonLabel"></cly-button>\n' +
                                    '<cly-button @click="prevStep" v-if="currentStepIndex > 0" skin="light" v-bind:label="i18n(\'common.drawer.previous-step\')"></cly-button>\n' +
                                '</div>\n' +
                                '<div class="buttons single-step" v-if="!isMultiStep">\n' +
                                    '<cly-button @click="submit" v-bind:disabled="$v.$invalid" skin="green" v-bind:label="saveButtonLabel"></cly-button>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    );

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
                            initialEditedObject: {}
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

    countlyVue.components.BaseDrawer = BaseDrawer;
    countlyVue.mixins.hasDrawers = hasDrawersMixin;


}(window.countlyVue = window.countlyVue || {}));
