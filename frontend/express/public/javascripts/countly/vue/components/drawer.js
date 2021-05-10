/* global Vue */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    Vue.component("cly-drawer", countlyBaseComponent.extend(
        // @vue/component
        {
            inheritAttrs: false,
            mixins: [
                _mixins.i18n,
                _mixins.MultiStepForm
            ],
            props: {
                isOpened: {type: Boolean, required: true},
                name: {type: String, required: true},
                title: {type: String, required: true},
                saveButtonLabel: {type: String, required: true, default: ""},
                closeFn: {type: Function},
                width: {type: String, default: "1000px"}
            },
            data: function() {
                return {
                    sidecarContents: []
                };
            },
            computed: {
                hasSidecars: function() {
                    return this.sidecarContents.length > 0;
                }
            },
            watch: {
                isOpened: function(newState) {
                    if (!newState) {
                        this.reset();
                    }
                }
            },
            mounted: function() {
                this.sidecarContents = this.$children.filter(function(child) {
                    return child.isContent && child.role === "sidecar";
                });
            },
            methods: {
                doClose: function() {
                    this.$emit("close", this.name);
                    if (this.closeFn) {
                        this.closeFn();
                    }
                }
            },
            template: '<div class="cly-vue-drawer"\n' +
                            ':class="{mounted: isMounted, open: isOpened, \'has-sidecars\': hasSidecars}"\n' +
                            ':style="{width: width}">\n' +
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
