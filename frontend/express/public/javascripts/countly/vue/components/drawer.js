/* global Vue, CV */

(function(countlyVue) {

    var _mixins = countlyVue.mixins;

    Vue.component("cly-drawer", countlyVue.components.create(
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
                saveButtonLabel: {type: String, required: false, default: ""},
                cancelButtonLabel: {type: String, required: false, default: CV.i18n("common.cancel")},
                closeFn: {type: Function},
                hasCancelButton: {type: Boolean, required: false, default: true},
                hasBackLink: {
                    type: [Object, Boolean],
                    default: false,
                    required: false
                },
                toggleTransition: {
                    type: String,
                    default: 'stdt-slide-right'
                },
                size: {
                    type: Number,
                    default: 6,
                    validator: function(value) {
                        return value >= 1 && value <= 12;
                    }
                },
                testId: {
                    type: String,
                    default: "drawer-test-id",
                }
            },
            data: function() {
                return {
                    isToggleable: true,
                    sidecarContents: [],
                    disableAutoClose: false,
                };
            },
            computed: {
                hasSidecars: function() {
                    return this.sidecarContents.length > 0;
                },
                rootClasses: function() {
                    var classes = {
                        'is-mounted': this.isMounted,
                        'is-open': this.isOpened,
                        'has-sidecars': this.hasSidecars
                    };
                    classes["cly-vue-drawer--" + this.currentScreenMode + "-screen"] = true;
                    if (this.currentScreenMode === 'half') {
                        classes["cly-vue-drawer--half-screen-" + this.size] = true;
                    }
                    return classes;
                }
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
            mounted: function() {
                this.sidecarContents = this.$children.filter(function(child) {
                    return child.isContent && child.role === "sidecar";
                });
            },
            methods: {
                doClose: function() {
                    if (this.disableAutoClose) {
                        this.disableAutoClose = false;
                        return;
                    }
                    this.$emit("close", this.name);
                    if (this.closeFn) {
                        this.closeFn();
                    }
                },
                escKeyEvent: function() {
                    this.doClose();
                },
                onViewEntered: function() {
                    this.$refs.rootEl.focus();
                }
            },
            template: CV.T('/javascripts/countly/vue/templates/drawer.html')
        }
    ));

    var hasDrawersMethodsMixin = function() {
        return {
            methods: {
                openDrawer: function(name, initialEditedObject) {
                    /**
                     * Delete the hover key as its set by the data table on hovering a row
                     * and we don't want to pass it to the drawer.
                     */
                    delete initialEditedObject.hover;
                    if (this.drawers[name].isOpened) {
                        return;
                    }
                    this.loadDrawer(name, initialEditedObject);
                    this.drawers[name].isOpened = true;
                },
                loadDrawer: function(name, initialEditedObject) {
                    /**
                     * Delete the hover key as its set by the data table on hovering a row
                     * and we don't want to pass it to the drawer.
                     */
                    delete initialEditedObject.hover;
                    this.drawers[name].initialEditedObject = initialEditedObject || {};
                },
                closeDrawer: function(name) {
                    this.drawers[name].isOpened = false;
                },
                hasOpenDrawer: function() {
                    for (var drawer in this.drawers) {
                        if (this.drawers[drawer].isOpened) {
                            return true;
                        }
                    }
                    return false;
                }
            }
        };
    };

    // @vue/component
    var hasDrawersMixin = function(names) {
        if (!Array.isArray(names)) {
            names = [names];
        }

        var result = {
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
        };
        Object.assign(result, hasDrawersMethodsMixin());
        return result;
    };


    countlyVue.mixins.hasDrawers = hasDrawersMixin;
    countlyVue.mixins.hasDrawersMethods = hasDrawersMethodsMixin;

}(window.countlyVue = window.countlyVue || {}));
