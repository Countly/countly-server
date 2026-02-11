<template>
    <div>
        <slot name="emoji-invoker" :events="{ click: function(e){toggle(e)} }"></slot>
        <div v-if="display.visible" v-click-outside="hide">
            <slot name="emoji-picker" :emojis="emojis" :insert="insert" :display="display"></slot>
        </div>
    </div>
</template>

<script>
import countlyPushNotification from '../../store/index.js';

export default {
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
    }
};
</script>
