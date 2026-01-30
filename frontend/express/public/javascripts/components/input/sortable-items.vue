<template>
    <div class="cly-vue-draggable" :class="rootClasses">
        <draggable
            handle=".drag-icon"
            :value="value"
            @input="handleInput"
        >
            <div
                class="cly-vue-draggable-item bu-p-3 bu-mb-1"
                :key="idx"
                v-for="(item, idx) in value"
            >
                <img class="drag-icon" :src="'images/drill/drag-icon.svg'">
                <slot :item="item" :idx="idx"></slot>
                <a @click="removeAt(idx)" class="ion-backspace"></a>
            </div>
        </draggable>
    </div>
</template>

<script>
export default {
    props: {
        value: {
            type: Array
        },
        skin: {
            type: String,
            default: 'jumbo-lines'
        }
    },
    computed: {
        rootClasses: function() {
            return ["cly-vue-draggable--" + this.skin];
        }
    },
    methods: {
        handleInput: function(value) {
            this.$emit("input", value);
        },
        removeAt: function(idx) {
            var copy = this.value.slice();
            copy.splice(idx, 1);
            this.handleInput(copy);
        }
    }
};
</script>
