<template>
    <div class="cly-vue-push-notification-emoji-wrapper" style="position:relative;">
        <validation-provider ref="defaultLocalizationValidationProvider" v-slot="validation" :rules="isRequired?'required':null"> </validation-provider>
        <div :class="['el-input',hasValidationErrors?'is-error':null]" style="display:block;" @click="onClick">
            <component
                is="div"
                :class="['el-input__inner',container==='title'?'cly-vue-push-notification-message-editor-with-emoji-picker__title':'cly-vue-push-notification-message-editor-with-emoji-picker__content']"
                v-bind:id="id"
                contenteditable="true"
                ref="element"
                @input="onInput($event.target.innerHTML)"
                @keydown.enter.prevent>
            </component>
        </div>
        <add-user-property-popover
            :width="350"
            :isOpen="isOpen"
            :container="container"
            :userProperty="userProperty"
            :options="options"
            :position="position"
            @select="onSelectUserProperty"
            @input="onInputUserProperty"
            @fallback="onInputFallbackUserProperty"
            @uppercase="onCheckUppercaseUserProperty"
            @remove="onRemoveUserProperty"
            @close="closeAddUserPropertyPopover"
        >
        </add-user-property-popover>
        <emoji-picker @emoji="appendEmoji" :search="search">
            <template  v-slot:emoji-invoker ="{ events: { click: clickEvent } }">
                <div class="emoji-invoker" @click.stop="clickEvent">
                    <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0h24v24H0z" fill="none"/>
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                    </svg>
                </div>
            </template>
            <template v-slot:emoji-picker="{ emojis, insert, display }">
                <div class="emoji-picker">
                    <div class="emoji-picker__search">
                        <input type="text" v-model="search">
                    </div>
                    <div>
                        <div v-for="(emojiGroup, category) in emojis" :key="category">
                            <h5>{{ category }}</h5>
                            <div class="emojis">
                                <span
                                    v-for="(emoji, emojiName) in emojiGroup"
                                    :key="emojiName"
                                    @click="insert(emoji)"
                                    :title="emojiName"
                                >{{ emoji }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </emoji-picker>
    </div>
</template>

<script>
import countlyPushNotification from '../../store/index.js';
import EmojiPicker from './EmojiPicker.vue';
import AddUserPropertyPopover from './AddUserPropertyPopover.vue';

export default {
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
        'emoji-picker': EmojiPicker,
        'add-user-property-popover': AddUserPropertyPopover,
    },
};
</script>
