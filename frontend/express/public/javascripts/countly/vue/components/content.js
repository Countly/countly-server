/* global Vue, CV */
(function(countlyVue) {
    Vue.component("cly-content-layout", countlyVue.components.create({
        props: {
            // meta: {
            //     type: Object,
            //     required: true,
            //     default: function() {
            //         return {};
            //     },
            //     validator(prop) {
            //         return prop.title && prop.version && prop.createdBy;
            //     }
            // }
        },
        data: function() {
            return {
                currentTab: this.meta?.tabs[0]?.value || null,
                isActive: false
            };
        },
        computed: {
        },
        template: CV.T('/javascripts/countly/vue/templates/content/content.html'),
        methods: {
        }
    }));

    Vue.component("cly-content-header", countlyVue.components.create({
        props: {
            title: {
                type: String,
                required: true,
                default: null
            },
            version: {
                type: String,
                required: true,
                default: null
            },
            createdBy: {
                type: String,
                required: true,
                default: null
            },
            toggle: {
                type: Boolean,
                required: false,
                default: false
            },
            closeButton: {
                type: Boolean,
                required: false,
                default: true
            },
            tabs: {
                type: Array,
                required: false,
                default: function() {
                    return [];
                }
            },
            status: {
                type: String,
                required: false,
                default: null
            },
            saveButtonLabel: {
                type: String,
                required: false,
                default: CV.i18n('common.save')
            },
            topDropdownOptions: {
                type: Array,
                required: false,
                default: function() {
                    return [];
                }
            },
            hideSaveButton: {
                type: Boolean,
                required: false,
                default: false
            }
        },
        data: function() {
            return {
                currentTab: this.tabs[0]?.value || null
            };
        },
        watch: {
            currentTab: function(newVal) {
                this.$emit('tab-change', newVal);
            }
        },
        methods: {
            close: function() {
                this.$emit('close');
            },
            save: function() {
                this.$emit('save');
            },
            handleCommand: function(event) {
                this.$emit('handle-command', event);
            }
        },
        template: CV.T('/javascripts/countly/vue/templates/content/content-header.html')
    }));

    Vue.component("cly-content-body", countlyVue.components.create({
        props: {
            currentTab: {
                type: String,
                required: false,
                default: null
            },
            hideLeftSidebar: {
                type: Boolean,
                required: false,
                default: false
            },
            hideRightSidebar: {
                type: Boolean,
                required: false,
                default: false
            },
            collapsible: {
                type: Boolean,
                required: false,
                default: false
            }
        },
        data: function() {
            return {
                toggleTransition: 'stdt-slide-right',
                isLeftSidebarHidden: this.hideLeftSidebar
            };
        },
        computed: {
        },
        template: CV.T('/javascripts/countly/vue/templates/content/content-body.html'),
        methods: {
            collapseBar: function(position) {
                if (position === 'left') {
                    this.isLeftSidebarHidden = !this.isLeftSidebarHidden;
                }
            },
            onViewEntered: function() { //?
                this.$refs.rootEl.focus();
            }
        },
        created: function() {
        }
    }));

    Vue.component("cly-status-badge", countlyVue.components.create({
        props: {
            label: {
                type: String,
                required: false,
                default: 'Status'
            },
            color: {
                type: String,
                required: false,
                default: 'gray'
            },
            icon: {
                type: String,
                required: false,
                default: 'cly-is cly-is-status'
            },
            iconSize: {
                type: String,
                required: false,
                default: '8'
            },
            width: {
                type: String,
                required: false,
                default: '55'
            },
            height: {
                type: String,
                required: false,
                default: '16'
            },
            radius: {
                type: String,
                required: false,
                default: '8'
            },
            fontClass: {
                type: String,
                required: false,
                default: 'text-small'
            }
        },
        data: function() {
            return {
                colorEnum: {
                    'gray': {background: '#E2E4E8', icon: '#81868D'},
                    // add more colors when needed
                }
            };
        },
        computed: {
            badgeStyles() {
                return {
                    width: `${this.width}px`,
                    height: `${this.height}px`,
                    borderRadius: `${this.radius}px`,
                    backgroundColor: this.colorEnum[this.color]?.background || this.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 8px',
                };
            },
            iconStyles() {
                return {
                    color: this.colorEnum[this.color]?.icon || this.color,
                    fontSize: `${this.iconSize}px`,
                    marginRight: '4px',
                };
            },
            fontStyles() {
                return {
                    color: this.colorEnum[this.color]?.icon || this.color,
                };
            }
        },
        template: `<div :style="badgeStyles">
                        <i :class="icon" :style="iconStyles"></i>
                        <span :class="fontClass" :style="fontStyles">{{ label }}</span>
                    </div>`,
    }));

}(window.countlyVue = window.countlyVue || {}));
