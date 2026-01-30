<template>
    <div class="cly-in-page-notification text-medium bu-p-2" :class="dynamicClasses">
        <slot name="innerText">
            <span v-html="innerText"></span>
        </slot>
    </div>
</template>

<script>
export default {
    props: {
        text: { type: String, required: false },
        color: { type: String, required: false, default: "light-warning" }
    },
    computed: {
        innerText: function() {
            return this.text || "";
        },
        dynamicClasses: function() {
            return ["cly-in-page-notification--" + this.color];
        }
    }
};
</script>
