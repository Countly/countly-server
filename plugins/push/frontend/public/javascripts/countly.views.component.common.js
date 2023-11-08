/* eslint-disable no-console */
/*global CV,countlyVue,countlyPushNotification,countlyGlobal,countlyCommon,moment*/
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
            tooltip: {
                type: String,
                required: false,
            },
            size: {
                type: String,
                default: 'medium',
                required: false
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
            },
            calculatedHeight() {
                if (this.size === 'small') {
                    return '60px';
                }
                else if (this.size === 'large') {
                    return '110px';
                }
                else {
                    return '97px';
                }
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
            },
            disabled: {
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
            usePre: {
                type: Boolean,
                default: false
            }
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
                        id: "",
                        value: "",
                        fallback: "",
                        isUppercase: false,
                        type: countlyPushNotification.service.UserPropertyTypeEnum.USER
                    };
                }
            },
            isOpen: {
                type: Boolean,
                default: false
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
                    return {top: 0, left: 0, width: 0};
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
            return {
                selectedPropertyCategory: "internal",
                UserPropertyTypeEnum: countlyPushNotification.service.UserPropertyTypeEnum,
                propertyCategoryOptions: [
                    {label: CV.i18n('push-notification.internal-properties'), value: "internal"},
                    {label: CV.i18n('push-notification.external-properties'), value: "external"}
                ]
            };
        },
        computed: {
            getStyleObject: function() {
                var editorWith = this.$refs.addUserPropertyPopover.offsetWidth;
                var topOffset = 25;
                var result = {
                    width: this.width + 'px',
                    top: this.position.top + topOffset + 'px',
                };
                if (this.position.left + this.width > editorWith) {
                    result.right = 0;
                }
                else {
                    result.left = this.position.left + "px";
                }
                return result;
            },
        },
        watch: {
            userProperty: function(value) {
                if (value.type === this.UserPropertyTypeEnum.API) {
                    this.selectedPropertyCategory = "external";
                    return;
                }
                this.selectedPropertyCategory = "internal";
            }
        },
        methods: {
            findCategoryOptionByValue: function(value, categoryOptions) {
                return categoryOptions.find(function(item) {
                    return item.value === value;
                });
            },
            findOptionByValue: function(value) {
                for (var index in this.options) {
                    var item = this.findCategoryOptionByValue(value, this.options[index].options);
                    if (item) {
                        return item;
                    }
                }
                throw new Error('Unable to find user property option by value:' + value);
            },
            onSelect: function(value) {
                var optionItem = this.findOptionByValue(value);
                this.$emit('select', {id: this.userProperty.id, container: this.container, value: value, label: optionItem.label, type: optionItem.type});
            },
            onUppercase: function(value) {
                this.$emit('uppercase', {id: this.userProperty.id, container: this.container, value: value});
            },
            onFallback: function(value) {
                this.$emit('fallback', {id: this.userProperty.id, container: this.container, value: value});
            },
            onInput: function(value) {
                this.$emit('input', {id: this.userProperty.id, container: this.container, value: value});
            },
            onRemove: function() {
                this.$emit('remove', {id: this.userProperty.id, container: this.container});
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
                return CV.i18n('push-notification-fallback-value-description', this.userProperty, this.fallback);
            }
        }
    });

    countlyPushNotificationComponent.MobileMessagePreview = countlyVue.views.create({
        template: "#mobile-message-preview",
        data: function() {
            return {
                selectedPlatform: this.findInitialSelectedPlatform(),
                PlatformEnum: countlyPushNotification.service.PlatformEnum,
                appName: countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name || CV.i18n('push-notification.mobile-preview-default-app-name'),
                videoRegex: new RegExp('video/*'),
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
            subtitle: {
                type: String,
                default: ""
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
                this.$emit('select', this.selectedPlatform);
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
            isVideo: function(mime) {
                return this.videoRegex.test(mime);
            },
            setSelectedPlatform: function(value) {
                this.selectedPlatform = value;
            },
            onPlatformChange: function() {
                this.$emit('select', this.selectedPlatform);
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
            userProperty: {
                type: Object,
                default: function() {
                    return {
                        id: "",
                        value: "",
                        fallback: "",
                        isUppercase: false,
                        type: countlyPushNotification.service.UserPropertyTypeEnum.USER
                    };
                }
            },
            isOpen: {
                type: Boolean,
                default: false
            },
            options: {
                type: Array,
                required: true,
                default: function() {
                    return [];
                }
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
                defaultLabelValue: "Add user property",
                defaultLabelPreview: "Add user property|",
                defaultLocalizationValidationErrors: [],
                selectionRange: null,
                mutationObserver: null,
                userPropertyEvents: new Map(),
                UserPropertyTypeEnum: countlyPushNotification.service.UserPropertyTypeEnum,
                position: {
                    top: 0,
                    left: 0,
                }
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
                this.position = {
                    top: element.offsetTop,
                    left: element.offsetLeft,
                };
                this.$emit("click", {id: id, container: this.container});
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
                newElement.setAttribute("data-user-property-type", this.UserPropertyTypeEnum.USER);
                newElement.setAttribute("data-user-property-fallback", "");
                newElement.innerText = this.defaultLabelPreview;
                var onClickListener = this.getOnUserPropertyClickEventListener(id);
                this.userPropertyEvents.set(id, onClickListener);
                newElement.onclick = onClickListener;
                this.insertNodeAtCaretPosition(newElement);
                this.$emit('change', this.$refs.element.innerHTML);
                this.onUserPropertyClick(id, newElement);
                this.saveSelectionRange();
            },
            removeUserProperty: function(id) {
                var userProperty = this.$refs.element.querySelector("#id-" + id);
                if (userProperty) {
                    userProperty.removeEventListener('click', this.userPropertyEvents.get(id));
                    userProperty.remove();
                    this.userPropertyEvents.delete(id);
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
            setUserPropertyValue: function(id, previewValue, value, type) {
                var element = this.$refs.element.querySelector("#id-" + id);
                element.innerText = previewValue;
                element.setAttribute("data-user-property-value", value);
                element.setAttribute("data-user-property-label", this.getLabelValueFromPreview(previewValue));
                element.setAttribute("data-user-property-type", type);
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
                    var elementEvent = self.userPropertyEvents.get(id);
                    if (elementEvent) {
                        document.querySelector("#id-" + id).onclick = elementEvent;
                    }
                    else {
                        var newElementEvent = self.getOnUserPropertyClickEventListener(id);
                        self.userPropertyEvents.set(id, newElementEvent);
                        document.querySelector("#id-" + id).onclick = newElementEvent;
                    }
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
                        removedNode.removeEventListener('click', self.userPropertyEvents.get(idValue));
                        self.userPropertyEvents.delete(idValue);
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
            },
            removeUserPropertyEventListeners: function() {
                var self = this;
                this.userPropertyEvents.forEach(function(value, key) {
                    var userProperty = self.$refs.element.querySelector("#id-" + key);
                    if (userProperty) {
                        userProperty.removeEventListener('click', value);
                    }
                });
                this.userPropertyEvents.clear();
            },
            onSelectUserProperty: function(value) {
                this.$emit('select', value);
            },
            onInputUserProperty: function(value) {
                this.$emit('input', value);
            },
            onInputFallbackUserProperty: function(value) {
                this.$emit('fallback', value);
            },
            onCheckUppercaseUserProperty: function(value) {
                this.$emit('uppercase', value);
            },
            onRemoveUserProperty: function(value) {
                this.$emit('remove', value);
            },
            closeAddUserPropertyPopover: function() {
                this.$emit('close', this.container);
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
            this.removeUserPropertyEventListeners();
            this.disconnectMutationObserver();
            this.removePasteEventListener(this.onPaste);
        },
        components: {
            'emoji-picker': countlyPushNotificationComponent.EmojiPicker,
            'add-user-property-popover': countlyPushNotificationComponent.AddUserPropertyPopover,
        },
    });

    countlyPushNotificationComponent.DetailsTabRow = countlyVue.views.create({
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
            usePre: {
                type: Boolean,
                default: false,
            }
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
                PlatformEnum: countlyPushNotification.service.PlatformEnum,
                MessageTypeEnum: countlyPushNotification.service.MessageTypeEnum,
                platformsForSummary: ["ios", "android"]
            };
        },
        computed: {
            pushNotification: function() {
                return this.$store.state.countlyPushNotificationDetails.pushNotification;
            },
            selectedMessageLocale: {
                get: function() {
                    return this.$store.state.countlyPushNotificationDetails.messageLocaleFilter;
                },
                set: function(value) {
                    this.$store.dispatch("countlyPushNotificationDetails/onSetMessageLocaleFilter", value);
                }
            },
            message: function() {
                return this.$store.state.countlyPushNotificationDetails.pushNotification.message[this.selectedMessageLocale];
            },
            localizations: function() {
                return this.$store.state.countlyPushNotificationDetails.pushNotification.localizations;
            },
            previewMessageTitle: function() {
                if (this.message.title) {
                    return countlyPushNotification.helper.getPreviewMessageComponentsList(this.message.title);
                }
                return "";
            },
            previewMessageContent: function() {
                if (this.message.content) {
                    return countlyPushNotification.helper.getPreviewMessageComponentsList(this.message.content);
                }
                return "";
            },
            previewAndroidMedia: function() {
                var result = "-";
                if (this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL) {
                    result = this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL;
                }
                if (this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaURL) {
                    result = this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaURL;
                }
                return result;
            },
            previewIOSMedia: function() {
                var result = "-";
                if (this.pushNotification.settings[this.PlatformEnum.ALL].mediaURL) {
                    result = this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL;
                }
                if (this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL) {
                    result = this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL;
                }
                return result;
            },
            hasAllPlatformMediaOnly: function() {
                return !this.pushNotification.settings[this.PlatformEnum.IOS].mediaURL && !this.pushNotification.settings[this.PlatformEnum.ANDROID].mediaURL;
            },
            subtitle: function() {
                return this.pushNotification.settings[this.PlatformEnum.IOS].subtitle;
            },
            selectedMobileMessagePlatform: function() {
                return this.$store.state.countlyPushNotificationDetails.mobileMessagePlatform;
            }
        },
        methods: {
            prettifyJSON: function(value) {
                return countlyPushNotification.helper.prettifyJSON(value, 2);
            }
        },
        components: {
            'user-property-preview': countlyPushNotificationComponent.UserPropertyPreview,
            'user-property-text-preview': countlyPushNotificationComponent.UserPropertyTextPreview,
            'details-tab-row': countlyPushNotificationComponent.DetailsTabRow
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
                cohorts: [],
                locations: [],
                isFetchLocationsLoading: false,
                isFetchCohortsLoading: false,
            };
        },
        computed: {
            pushNotification: function() {
                return this.$store.state.countlyPushNotificationDetails.pushNotification;
            },
            previewCohorts: function() {
                return this.cohorts.map(function(cohortItem) {
                    return cohortItem.name;
                });
            },
            previewLocations: function() {
                return this.locations.map(function(locationItem) {
                    return locationItem.name;
                });
            }
        },
        methods: {
            convertDaysInMsToDays: function(daysInMs) {
                return daysInMs / this.DAY_TO_MS_RATIO;
            },
            formatDateAndTime: function(date, isMultiple) {
                if (isMultiple) {
                    const dates = date.map(function(eachDate) {
                        return countlyPushNotification.helper.formatDateTime(eachDate, 'MMMM Do YYYY h:mm a').toString();
                    });
                    return dates.join(", ");
                }
                return countlyPushNotification.helper.formatDateTime(date, 'MMMM Do, YYYY, h:mm a');
            },
            formatDateTime: function(dateTime, format) {
                return countlyPushNotification.helper.formatDateTime(dateTime, format);
            },
            formatRepetitionDays: function(repetitionDays) {
                const days = this.weeklyRepetitionOptions.map(option => option.label);
                const selectedDays = repetitionDays.map(day => days[day - 1]);
                return selectedDays.join(', ');
            },
            calculateDeliveryDates: function(prev, last) {
                var nextDeliveryDates = [];
                if (prev && prev > Date.now()) {
                    nextDeliveryDates.push(this.formatDateTime(prev, 'DD MMMM YYYY'));
                }
                if (last && last > Date.now() && last !== prev) {
                    nextDeliveryDates.push(this.formatDateTime(last, 'DD MMMM YYYY'));
                }
                return nextDeliveryDates.join(', ');
            },
            setCohorts: function(cohorts) {
                this.cohorts = cohorts;
            },
            setLocations: function(locations) {
                this.locations = locations;
            },
            fetchCohorts: function() {
                var self = this;
                if (this.pushNotification.type === this.TypeEnum.TRANSACTIONAL) {
                    return;
                }
                this.isFetchCohortsLoading = true;
                var cohortsList = [];
                if (this.pushNotification.type === this.TypeEnum.ONE_TIME) {
                    cohortsList = this.pushNotification.cohorts;
                }
                if (this.pushNotification.type === this.TypeEnum.AUTOMATIC) {
                    cohortsList = this.pushNotification.automatic.cohorts;
                }
                countlyPushNotification.service.fetchCohorts(cohortsList, false)
                    .then(function(cohorts) {
                        self.setCohorts(cohorts);
                    }).catch(function(error) {
                        console.error(error);
                        self.setCohorts([]);
                    }).finally(function() {
                        self.isFetchCohortsLoading = false;
                    });
            },
            fetchLocations: function() {
                var self = this;
                if (this.pushNotification.type === this.TypeEnum.TRANSACTIONAL) {
                    return;
                }
                this.isFetchLocationsLoading = true;
                countlyPushNotification.service.fetchLocations(this.pushNotification.locations, false)
                    .then(function(locations) {
                        self.setLocations(locations);
                    }).catch(function(error) {
                        console.error(error);
                        self.setLocations([]);
                    }).finally(function() {
                        self.isFetchLocationsLoading = false;
                    });
            },
        },
        mounted: function() {
            this.fetchCohorts();
            this.fetchLocations();
        },
        components: {
            'details-tab-row': countlyPushNotificationComponent.DetailsTabRow
        }
    });

    countlyPushNotificationComponent.DetailsErrorsTab = countlyVue.views.create({
        template: '#details-errors-tab',
        computed: {
            globalError: function() {
                return this.$store.state.countlyPushNotificationDetails.pushNotification.error;
            },
            errors: function() {
                if (this.globalError) {
                    var allErrors = this.$store.state.countlyPushNotificationDetails.pushNotification.errors;
                    var copyErrors = allErrors.concat([]);
                    copyErrors.unshift(this.globalError);
                    return copyErrors;
                }
                return this.$store.state.countlyPushNotificationDetails.pushNotification.errors;
            },
        }
    });

})(window.countlyPushNotificationComponent = window.countlyPushNotificationComponent || {});