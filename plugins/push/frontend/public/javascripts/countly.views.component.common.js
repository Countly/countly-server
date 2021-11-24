/*global CV,countlyVue,countlyPushNotification,countlyGlobal,countlyCommon,moment,Promise*/
(function(countlyPushNotificationComponent) {
    countlyPushNotificationComponent.LargeRadioButtonWithDescription = countlyVue.views.create({
        props: {
            value: {
                type: [String, Boolean],
                required: true
            },
            label: {
                type: [String, Boolean],
                required: true,
            },
            title: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                required: false,
            },
            hasTopMargin: {
                type: Boolean,
                required: false,
                default: false,
            }
        },
        data: function() {
            return {};
        },
        computed: {
            innerValue: {
                get: function() {
                    return this.value;
                },
                set: function(value) {
                    this.$emit('input', value);
                }
            },
            hasDefaultSlot: function() {
                return Boolean(this.$slots.default);
            }
        },
        template: "#large-radio-button-with-description"
    });

    countlyPushNotificationComponent.LineRadioButtonWithDescription = countlyVue.views.create({
        props: {
            value: {
                type: String,
                required: true
            },
            label: {
                type: String,
                required: true,
            },
            title: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                required: false,
            },
            border: {
                type: Boolean,
                required: false,
                default: false,
            }
        },
        data: function() {
            return {};
        },
        computed: {
            innerValue: {
                get: function() {
                    return this.value;
                },
                set: function(value) {
                    this.$emit('input', value);
                }
            },
            hasDefaultSlot: function() {
                return Boolean(this.$slots.default);
            }
        },
        template: "#line-radio-button-with-description"
    });

    countlyPushNotificationComponent.MessageSettingElement = countlyVue.views.create({
        props: {
            input: {
                type: String,
                default: "",
                required: false
            },
            toggle: {
                type: Boolean,
                default: false,
                required: true,
            },
            label: {
                type: String,
                default: "",
                required: true
            },
            placeholder: {
                type: String,
                default: "",
                required: false,
            },
            description: {
                type: String,
                default: "",
                required: false,
            },
            rules: {
                type: [String, Object],
                default: null,
                required: false,
            }
        },
        data: function() {
            return {
            };
        },
        computed: {
            hasDefaultSlot: function() {
                return Boolean(this.$slots.default);
            }
        },
        methods: {
            onToggle: function(value) {
                this.$emit("onToggle", value);
            },
            onInput: function(value) {
                this.$emit("onChange", value);
            }
        },
        template: "#message-setting-element",
    });

    countlyPushNotificationComponent.ReviewSectionRow = countlyVue.views.create({
        props: {
            value: {
                type: [String, Number],
                default: ""
            },
            label: {
                type: String,
                default: ""
            },
        },
        computed: {
            hasDefaultSlot: function() {
                return Boolean(this.$slots.default);
            }
        },
        template: "#review-section-row",
    });

    countlyPushNotificationComponent.AddUserPropertyPopover = countlyVue.views.create({
        props: {
            userProperty: {
                type: Object,
                default: function() {
                    return {
                        value: "",
                        fallback: "",
                        isUppercase: false,
                    };
                }
            },
            isOpen: {
                type: Boolean,
                default: false
            },
            id: {
                required: true,
            },
            container: {
                type: String,
                required: true
            },
            width: {
                type: Number,
                required: true,
                default: 350
            },
            position: {
                type: Object,
                required: true,
                default: function() {
                    return {top: 0, left: 0};
                }
            },
            options: {
                type: Array,
                required: true,
                default: function() {
                    return [];
                }
            }
        },
        data: function() {
            return {};
        },
        computed: {
            getStyleObject: function() {
                var result = {};
                var topOffset = 30;
                result.width = this.width + 'px';
                result.top = (this.position.top + topOffset) + 'px';
                result.left = (this.position.left - (this.width / 2)) + 'px';
                return result;
            },
        },
        methods: {
            findOptionLabelByValue: function(value) {
                for (var property in this.options) {
                    if (this.options[property].value === value) {
                        return this.options[property].label;
                    }
                }
                return "";
            },
            onSelect: function(value) {
                this.$emit('select', {id: this.id, container: this.container, value: value, label: this.findOptionLabelByValue(value)});
            },
            onUppercase: function(value) {
                this.$emit('check', {id: this.id, container: this.container, value: value});
            },
            onFallback: function(value) {
                this.$emit('input', {id: this.id, container: this.container, value: value});
            },
            onRemove: function() {
                this.$emit('remove', {id: this.id, container: this.container});
            },
            onClose: function() {
                var self = this;
                this.$refs.validationObserver.validate().then(function(isValidated) {
                    if (isValidated) {
                        self.$emit('close');
                    }
                });
            },
        },
        mounted: function() {
            document.body.appendChild(this.$el);
        },
        destroyed: function() {
            document.body.removeChild(this.$el);
        },
        template: "#add-user-property-popover"
    });

    countlyPushNotificationComponent.UserPropertyTextPreview = countlyVue.views.create({
        template: '<span>{{value}}</span>',
        props: {
            value: {
                type: String,
                required: true
            }
        }
    });

    countlyPushNotificationComponent.UserPropertyPreview = countlyVue.views.create({
        template: '<span v-tooltip.bottom.center="description" class="cly-vue-push-notification-mobile-preview__user-property">{{fallback}}</span>',
        props: {
            value: {
                type: Object,
                required: true,
            },
        },
        computed: {
            userProperty: function() {
                return this.value.userProperty;
            },
            fallback: function() {
                return this.value.fallback;
            },
            description: function() {
                return "User's \"" + this.userProperty + "\" property which falls back to " + this.fallback;
            }
        }
    });

    countlyPushNotificationComponent.MobileMessagePreview = countlyVue.views.create({
        template: "#mobile-message-preview",
        data: function() {
            return {
                selectedPlatform: this.findInitialSelectedPlatform(),
                PlatformEnum: countlyPushNotification.service.PlatformEnum,
                MediaTypeEnum: countlyPushNotification.service.MediaTypeEnum,
                appName: countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name || CV.i18n('push-notification.mobile-preview-default-app-name')
            };
        },
        props: {
            platforms: {
                type: Array,
                default: []
            },
            title: {
                type: String,
                default: CV.i18n('push-notification.mobile-preview-default-title')
            },
            content: {
                type: String,
                default: CV.i18n('push-notification.mobile-preview-default-content'),
            },
            buttons: {
                type: Array,
                default: []
            },
            media: {
                type: Object,
                required: true,
            },
        },
        computed: {
            isAndroidPlatformSelected: function() {
                return this.selectedPlatform === this.PlatformEnum.ANDROID;
            },
            isIOSPlatformSelected: function() {
                return this.selectedPlatform === this.PlatformEnum.IOS;
            },
            titlePreviewComponentsList: function() {
                return countlyPushNotification.helper.getPreviewMessageComponentsList(this.title);
            },
            contentPreviewComponentsList: function() {
                return countlyPushNotification.helper.getPreviewMessageComponentsList(this.content);
            },
            mediaPreview: function() {
                var result = {};
                result[this.PlatformEnum.ANDROID] = this.media[this.PlatformEnum.ANDROID] || {};
                result[this.PlatformEnum.IOS] = this.media[this.PlatformEnum.IOS] || {};
                result[this.PlatformEnum.ALL] = this.media[this.PlatformEnum.ALL] || {};
                return result;
            },
            hasAndroidPlatform: function() {
                return this.isPlatformFound(countlyPushNotification.service.PlatformEnum.ANDROID);
            },
            hasIOSPlatform: function() {
                return this.isPlatformFound(countlyPushNotification.service.PlatformEnum.IOS);
            },
        },
        watch: {
            platforms: function() {
                if (!this.selectedPlatform) {
                    this.selectedPlatform = this.findInitialSelectedPlatform();
                }
            }
        },
        methods: {
            timeNow: function() {
                return moment().format("H:mm");
            },
            isPlatformFound: function(platformName) {
                return this.platforms.filter(function(propPlatformItem) {
                    return propPlatformItem === platformName;
                }).length > 0;
            },
            findInitialSelectedPlatform: function() {
                if (this.isPlatformFound(countlyPushNotification.service.PlatformEnum.IOS)) {
                    return countlyPushNotification.service.PlatformEnum.IOS;
                }
                if (this.isPlatformFound(countlyPushNotification.service.PlatformEnum.ANDROID)) {
                    return countlyPushNotification.service.PlatformEnum.ANDROID;
                }
                return null;
            },
            setSelectedPlatform: function(value) {
                this.selectedPlatform = value;
            }
        },
        components: {
            'user-property-preview': countlyPushNotificationComponent.UserPropertyPreview,
            'user-property-text-preview': countlyPushNotificationComponent.UserPropertyTextPreview
        }
    });

    countlyPushNotificationComponent.EmojiPicker = countlyVue.views.create({
        props: {
            search: {
                type: String,
                required: false,
                default: '',
            },
            emojiTable: {
                type: Object,
                required: false,
                default: function() {
                    return countlyPushNotification.emojis;
                },
            },
        },
        data: function() {
            return {
                display: {
                    x: 0,
                    y: 0,
                    visible: false,
                },
            };
        },
        computed: {
            emojis: function() {
                if (this.search) {
                    var obj = {};
                    for (var category in this.emojiTable) {
                        obj[category] = {};
                        for (var emoji in this.emojiTable[category]) {
                            if (new RegExp(".*" + this.escapeRegExp(this.search) + ".*").test(emoji)) {
                                obj[category][emoji] = this.emojiTable[category][emoji];
                            }
                        }
                        if (Object.keys(obj[category]).length === 0) {
                            delete obj[category];
                        }
                    }
                    return obj;
                }
                return this.emojiTable;
            },
        },
        methods: {
            insert: function(emoji) {
                this.$emit('emoji', emoji);
                this.hide();
            },
            toggle: function(e) {
                this.display.visible = !this.display.visible;
                this.display.x = e.clientX;
                this.display.y = e.clientY;
            },
            hide: function() {
                this.display.visible = false;
            },
            escape: function(e) {
                if (this.display.visible === true && e.keyCode === 27) {
                    this.display.visible = false;
                }
            },
            escapeRegExp: function(s) {
                return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
        },
        mounted: function() {
            document.addEventListener('keyup', this.escape);
        },
        destroyed: function() {
            document.removeEventListener('keyup', this.escape);
        },
        template: "#emoji-picker"
    });

    countlyPushNotificationComponent.MessageEditorWithEmojiPicker = countlyVue.views.create({
        template: "#message-editor-with-emoji-picker",
        props: {
            id: {
                type: String,
                required: true
            },
            container: {
                type: String,
                required: true,
            },
            type: {
                type: String,
                required: false,
                default: "text"
            },
            isDefaultLocalizationActive: {
                type: Boolean,
                required: false,
                default: false
            },
            placeholder: {
                type: String,
                required: false,
                default: ""
            },
            isRequired: {
                type: Boolean,
                required: false,
                default: false
            },
        },
        data: function() {
            return {
                search: "",
                defaultLabelValue: "Select property",
                defaultLabelPreview: "Select property|",
                defaultLocalizationValidationErrors: [],
                selectionRange: null,
                mutationObserver: null,
            };
        },
        computed: {
            hasDefaultSlot: function() {
                return Boolean(this.$slots.default);
            },
            hasValidationErrors: function() {
                return this.isDefaultLocalizationActive && this.hasDefaultLocalizationValidationErrors;
            },
            hasDefaultLocalizationValidationErrors: function() {
                return Boolean(this.defaultLocalizationValidationErrors.length);
            },
        },
        watch: {
            isDefaultLocalizationActive: function() {
                this.validate();
            }
        },
        methods: {
            onUserPropertyClick: function(id, element) {
                var elementBound = element.getBoundingClientRect();
                var leftCoordinate = elementBound.left + (elementBound.width / 2);
                this.$emit("click", {id: id, container: this.container, position: {left: leftCoordinate, top: elementBound.top }});
            },
            getOnUserPropertyClickEventListener: function(id) {
                var self = this;
                return function(event) {
                    self.onUserPropertyClick(id, event.target);
                };
            },
            isEmpty: function() {
                return this.$refs.element.childNodes.length === 0;
            },
            isSelected: function() {
                return window.getSelection().containsNode(this.$refs.element, true);
            },
            insertNodeWhenSelected: function(node) {
                var selection = window.getSelection();
                var range = this.selectionRange || selection.getRangeAt(0);
                range.insertNode(node);
                range.setStartAfter(node);
                selection.removeAllRanges();
                selection.addRange(range);
            },
            insertNodeWhenNotSelected: function(node) {
                var selection = window.getSelection();
                var range = document.createRange();
                range.selectNodeContents(this.$refs.element);
                if (!this.isEmpty()) {
                    range.setStartAfter(this.$refs.element.lastChild, 0);
                }
                range.insertNode(node);
                range.setStartAfter(node);
                selection.removeAllRanges();
                selection.addRange(range);
            },
            insertNodeAtCaretPosition: function(node) {
                if (this.isSelected()) {
                    this.insertNodeWhenSelected(node);
                }
                else {
                    this.insertNodeWhenNotSelected(node);
                }
            },
            insertEmojiAtCaretPosition: function(node) {
                if (this.selectionRange) {
                    this.insertNodeWhenSelected(node);
                }
                else {
                    this.insertNodeWhenNotSelected(node);
                }
            },
            saveSelectionRange: function() {
                var sel = window.getSelection();
                this.selectionRange = sel.getRangeAt(0);
            },
            addEmptyUserProperty: function(id) {
                var newElement = document.createElement("span");
                newElement.setAttribute("id", "id-" + id);
                newElement.setAttribute("contentEditable", false);
                newElement.setAttribute("class", "cly-vue-push-notification-message-editor-with-emoji-picker__user-property");
                newElement.setAttribute("data-user-property-label", this.defaultLabelValue);
                newElement.setAttribute("data-user-property-value", "");
                newElement.setAttribute("data-user-property-fallback", "");
                newElement.innerText = this.defaultLabelPreview;
                newElement.onclick = this.getOnUserPropertyClickEventListener(id);
                this.insertNodeAtCaretPosition(newElement);
                this.$emit('change', this.$refs.element.innerHTML);
                this.onUserPropertyClick(id, newElement);
                this.saveSelectionRange();
            },
            removeUserProperty: function(id) {
                var userProperty = this.$refs.element.querySelector("#id-" + id);
                if (userProperty) {
                    userProperty.remove();
                    this.$emit('change', this.$refs.element.innerHTML);
                    this.validate();
                }
            },
            getHTMLContent: function() {
                return this.$refs.element.innerHTML;
            },
            getLabelValueFromPreview: function(previewValue) {
                var labelValue = previewValue.split("|")[0];
                if (labelValue === this.defaultLabelValue) {
                    labelValue = "";
                }
                return labelValue;
            },
            setUserPropertyValue: function(id, previewValue, value) {
                var element = this.$refs.element.querySelector("#id-" + id);
                element.innerText = previewValue;
                element.setAttribute("data-user-property-value", value);
                element.setAttribute("data-user-property-label", this.getLabelValueFromPreview(previewValue));
                this.$emit('change', this.$refs.element.innerHTML);
                this.validate();
            },
            setUserPropertyFallbackValue: function(id, previewValue, fallback) {
                var element = this.$refs.element.querySelector("#id-" + id);
                element.setAttribute("data-user-property-fallback", fallback);
                element.innerText = previewValue;
                this.$emit('change', this.$refs.element.innerHTML);
            },
            addEventListeners: function(ids) {
                var self = this;
                ids.forEach(function(id) {
                    document.querySelector("#id-" + id).onclick = self.getOnUserPropertyClickEventListener(id);
                });
            },
            reset: function(htmlContent, ids) {
                this.disconnectMutationObserver();
                this.$refs.element.innerHTML = htmlContent;
                this.addEventListeners(ids);
                this.startMutationObserver();
            },
            appendEmoji: function(emoji) {
                this.insertEmojiAtCaretPosition(document.createTextNode(emoji));
                this.$emit('change', this.$refs.element.innerHTML);
                this.validate();
                this.saveSelectionRange();
            },
            validate: function(value) {
                var self = this;
                return new Promise(function(resolve) {
                    if (!value) {
                        value = self.$refs.element.innerHTML;
                    }
                    if (self.isDefaultLocalizationActive) {
                        self.$refs.defaultLocalizationValidationProvider.validate(value).then(function(result) {
                            self.defaultLocalizationValidationErrors = result.errors;
                            resolve(result.valid);
                        });
                    }
                    else {
                        return resolve(true);
                    }
                });
            },
            onInput: function(newValue) {
                this.$emit('change', newValue);
                this.validate(newValue);
                this.saveSelectionRange();
            },
            onClick: function() {
                this.saveSelectionRange();
            },
            onDelete: function(nodesList) {
                var self = this;
                nodesList.forEach(function(removedNode) {
                    if (removedNode.id) {
                        var idValue = removedNode.id.split('-')[1];
                        self.$emit('delete', {id: idValue, container: self.container});
                    }
                });
            },
            onMutation: function(mutationsList) {
                var self = this;
                mutationsList.forEach(function(mutation) {
                    if (mutation.removedNodes.length) {
                        self.onDelete(mutation.removedNodes);
                    }
                });
            },
            onPaste: function(event) {
                event.preventDefault();
                if (event.clipboardData) {
                    var textContent = event.clipboardData.getData('text');
                    this.insertNodeAtCaretPosition(document.createTextNode(textContent));
                    this.onInput(this.$refs.element.innerHTML);
                }
            },
            createMutationObserverIfNotFound: function(callback) {
                if (!this.mutationObserver) {
                    this.mutationObserver = new MutationObserver(callback);
                }
            },
            startMutationObserver: function() {
                var config = {childList: true};
                this.mutationObserver.observe(this.$refs.element, config);
            },
            disconnectMutationObserver: function() {
                this.mutationObserver.disconnect();
            },
            addPasteEventListener: function(callback) {
                this.$refs.element.addEventListener('paste', callback);
            },
            removePasteEventListener: function(callback) {
                this.$refs.element.removeEventListener('paste', callback);
            }
        },
        mounted: function() {
            var isIE11 = !!window.MSInputMethodContext && !!document.documentMode;
            if (isIE11) {
                var element = document.querySelector('#' + this.id);
                element.addEventListener('textinput', function(event) {
                    var inputEvent = document.createEvent('Event');
                    inputEvent.initEvent('input', true, true);
                    element.dispatchEvent(event);
                });
            }
            this.createMutationObserverIfNotFound(this.onMutation);
            this.startMutationObserver();
            this.addPasteEventListener(this.onPaste);
        },
        beforeDestroy: function() {
            //TODO-LA: remove all user properties elements' event listeners
            this.disconnectMutationObserver();
            this.removePasteEventListener(this.onPaste);
        },
        components: {
            'emoji-picker': countlyPushNotificationComponent.EmojiPicker
        },
    });

    countlyPushNotification.DetailsTabRow = countlyVue.views.create({
        template: '#details-tab-row',
        props: {
            value: {
                type: [String, Number],
                default: ""
            },
            label: {
                type: String,
                default: ""
            },
        },
        computed: {
            hasDefaultSlot: function() {
                return Boolean(this.$slots.default);
            }
        },
    });

    countlyPushNotificationComponent.DetailsMessageTab = countlyVue.views.create({
        template: '#details-message-tab',
        data: function() {
            return {
                selectedLocalization: countlyPushNotification.service.DEFAULT_LOCALIZATION_VALUE,
                PlatformEnum: countlyPushNotification.service.PlatformEnum,
            };
        },
        computed: {
            pushNotification: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification;
            },
            message: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification.message[this.selectedLocalization];
            },
            localizations: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification.localizations;
            },
            previewMessageTitle: function() {
                return countlyPushNotification.helper.getPreviewMessageComponentsList(this.message.title);
            },
            previewMessageContent: function() {
                return countlyPushNotification.helper.getPreviewMessageComponentsList(this.message.content);
            },
            previewAndroidMedia: function() {
                var result = "";
                if (this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL) {
                    result = this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL;
                }
                if (this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaURL) {
                    result = this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaURL;
                }
                return result;
            },
            previewIOSMedia: function() {
                var result = "";
                if (this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL) {
                    result = this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL;
                }
                if (this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL) {
                    result = this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL;
                }
                return result;
            }
        },
        components: {
            'user-property-preview': countlyPushNotificationComponent.UserPropertyPreview,
            'user-property-text-preview': countlyPushNotificationComponent.UserPropertyTextPreview,
            'details-tab-row': countlyPushNotification.DetailsTabRow
        }
    });

    countlyPushNotificationComponent.DetailsTargetingTab = countlyVue.views.create({
        template: '#details-targeting-tab',
        data: function() {
            return {
                DAY_TO_MS_RATIO: 86400 * 1000,
                TypeEnum: countlyPushNotification.service.TypeEnum,
                TargetingEnum: countlyPushNotification.service.TargetingEnum,
                TriggerEnum: countlyPushNotification.service.TriggerEnum,
                startDateOptions: countlyPushNotification.service.startDateOptions,
                targetingOptions: countlyPushNotification.service.targetingOptions,
                audienceSelectionOptions: countlyPushNotification.service.audienceSelectionOptions,
                triggerOptions: countlyPushNotification.service.triggerOptions,
                triggerNotMetOptions: countlyPushNotification.service.triggerNotMetOptions,
                deliveryDateCalculationOptions: countlyPushNotification.service.deliveryDateCalculationOptions,
                deliveryMethodOptions: countlyPushNotification.service.deliveryMethodOptions,
            };
        },
        computed: {
            pushNotification: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification;
            },
            previewCohorts: function() {
                return this.pushNotification.cohorts.map(function(cohortItem) {
                    return cohortItem.name;
                });
            },
        },
        methods: {
            convertDaysInMsToDays: function(daysInMs) {
                return daysInMs / this.DAY_TO_MS_RATIO;
            }
        },
        components: {
            'details-tab-row': countlyPushNotification.DetailsTabRow
        }
    });

    countlyPushNotificationComponent.DetailsErrorsTab = countlyVue.views.create({
        template: '#details-errors-tab',
        computed: {
            errors: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification.errors;
            },
        },
        methods: {
            hasErrors: function() {
                return this.$store.state.countlyPushNotification.details.pushNotification.failed > 0;
            }
        }
    });

})(window.countlyPushNotificationComponent = window.countlyPushNotificationComponent || {});