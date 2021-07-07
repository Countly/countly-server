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
                saveButtonLabel: {type: String, required: true, default: ""},
                cancelButtonLabel: {type: String, required: false, default: CV.i18n("common.cancel")},
                closeFn: {type: Function},
                hasCancelButton: {type: Boolean, required: false, default: true},
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
            },
            data: function() {
                return {
                    isToggleable: true,
                    sidecarContents: []
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
