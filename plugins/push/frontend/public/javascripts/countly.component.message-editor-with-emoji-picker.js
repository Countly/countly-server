/*global CV,countlyVue*/
(function(countlyPushNotificationComponent) {
    countlyPushNotificationComponent.MessageEditorWithEmojiPicker = countlyVue.views.create({
        template: CV.T("/push/templates/message-editor-with-emoji-picker.html"),
        props: {
            placeholder: {
                type: String,
                required: false,
                default: ""
            },
            type: {
                type: String,
                required: false,
                default: "text"
            },
            id: {
                type: String,
                required: true
            }
        },
        data: function() {
            return {
                search: "",
            };
        },
        computed: {
            hasDefaultSlot: function() {
                return Boolean(this.$slots.default);
            },
        },
        methods: {
            appendZeroWidthSpace: function() {
                this.$refs.element.appendChild(document.createTextNode('\u200B'));
            },
            setCursorAtEnd: function() {
                var selection = window.getSelection();
                var textRange = document.createRange();
                selection.removeAllRanges();
                textRange.selectNodeContents(this.$refs.element);
                textRange.collapse(false);
                selection.addRange(textRange);
                this.$refs.element.focus();
            },
            onUserPropertyClick: function(id, container, element) {
                var elementBound = element.getBoundingClientRect();
                var leftCoordinate = elementBound.left + (elementBound.width / 2);
                this.$emit("click", id, container, {left: leftCoordinate, top: elementBound.top });
            },
            getOnUserPropertyClickEventListener: function(id, name) {
                var self = this;
                return function(event) {
                    self.onUserPropertyClick(id, name, event.target);
                };
            },
            addEmptyUserProperty: function(id, container) {
                var value = "Select property|";
                var newElement = document.createElement("span");
                newElement.setAttribute("id", "id-" + id);
                newElement.setAttribute("contentEditable", false);
                newElement.setAttribute("class", "cly-vue-push-notification-message-editor-with-emoji-picker__user-property");
                newElement.setAttribute("data-user-property-label", "Select property");
                newElement.setAttribute("data-user-property-value", value);
                newElement.setAttribute("data-user-property-fallback", "");
                newElement.innerText = value;
                newElement.onclick = this.getOnUserPropertyClickEventListener(id, container);
                this.$refs.element.appendChild(newElement);
                this.appendZeroWidthSpace();
                this.$emit('change', this.$refs.element.innerHTML);
                this.onUserPropertyClick(id, container, newElement);
            },
            removeUserProperty: function(id) {
                this.$refs.element.querySelector("#id-" + id).remove();
            },
            getHTMLContent: function() {
                return this.$refs.element.innerHTML;
            },
            setUserPropertyValue: function(id, previewValue, value) {
                var element = this.$refs.element.querySelector("#id-" + id);
                element.innerText = previewValue;
                element.setAttribute("data-user-property-value", value);
                this.$emit('change', this.$refs.element.innerHTML);
            },
            setUserPropertyFallbackValue: function(id, previewValue, fallback) {
                var element = this.$refs.element.querySelector("#id-" + id);
                element.setAttribute("data-user-property-fallback", fallback);
                element.innerText = previewValue;
                this.$emit('change', this.$refs.element.innerHTML);
            },
            addEventListeners: function(ids, container) {
                var self = this;
                ids.forEach(function(id) {
                    document.querySelector("#id-" + id).onclick = self.getOnUserPropertyClickEventListener(id, container);
                });
            },
            reset: function(htmlContent, ids, container) {
                this.$refs.element.innerHTML = htmlContent;
                this.addEventListeners(ids, container);
            },
            appendEmoji: function(emoji) {
                this.$refs.element.appendChild(document.createTextNode(emoji));
                this.setCursorAtEnd();
                this.$emit('change', this.$refs.element.innerHTML);
            },
            onInput: function(newValue) {
                this.$emit('change', newValue);
            },
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
        },
        beforeDestroy: function() {
            //TODO: remove all user properties elements' event listeners
        },
        components: {
            'emoji-picker': countlyPushNotificationComponent.EmojiPicker
        },
    });

})(window.countlyPushNotificationComponent = window.countlyPushNotificationComponent || {});