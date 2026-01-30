<template>
    <div class="bu-is-flex bu-is-flex-wrap-wrap bu-is-align-items-center">
        <div class="cly-vue-color-tag__color-tag-wrapper" v-for="(tag, idx) in tags" :key="idx">
            <div v-if="tag.value == selectedTag.value"
                @click="click(tag)"
                :data-test-id="`color-tag-${idx}`"
                class="cly-vue-color-tag__color-tag cly-vue-color-tag__color-tag__selected bu-is-flex bu-is-align-items-center bu-is-justify-content-center"
                :style="{backgroundColor: tag.label}">
                <i class="ion-checkmark cly-vue-color-tag__checkmark"></i>
            </div>
            <div v-else
                @click="click(tag)"
                :data-test-id="`color-tag-${idx}`"
                class="cly-vue-color-tag__color-tag bu-is-flex bu-is-align-items-center bu-is-justify-content-center"
                :style="{backgroundColor: tag.label}">
            </div>
        </div>
    </div>
</template>

<script>
export default {
    data: function() {
        return {
            selectedTag: this.defaultTag
        };
    },
    methods: {
        click: function(tag) {
            this.selectedTag = tag;
            this.$emit("input", tag);
        }
    },
    props: {
        value: Object,
        tags: {
            type: Array,
            default: function() {
                return [];
            }
        },
        defaultTag: {
            type: Object,
            default: function() {
                return {};
            }
        }
    }
};
</script>
