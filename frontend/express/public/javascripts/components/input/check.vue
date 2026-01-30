<template>
    <div class="cly-vue-check" :class="topClasses">
        <div class="check-wrapper text-clickable">
            <input type="checkbox" class="check-checkbox" :checked="value">
            <i
                :class="labelClass"
                @mouseover="mouseOver"
                @mouseleave="mouseOver"
                @click.stop="setValue(!value)"
            ></i>
            <span v-if="label" class="check-text" @click.stop="setValue(!value)">{{ label }}</span>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        value: {
            type: Boolean,
            default: false
        },
        label: {
            type: String,
            default: ''
        },
        skin: {
            type: String,
            default: "switch"
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    data: function() {
        return {
            active: this.value
        };
    },
    computed: {
        topClasses: function() {
            var classes = [];
            if (["switch", "tick", "star"].indexOf(this.skin) > -1) {
                classes.push("check-" + this.skin + "-skin");
            }
            else {
                classes.push("check-switch-skin");
            }
            if (this.disabled) {
                classes.push("disabled");
            }
            return classes;
        },
        labelClass: function() {
            return this.getClass(this.value);
        }
    },
    methods: {
        setValue: function(e) {
            if (!this.disabled) {
                this.$emit('input', e);
            }
        },
        getClass: function(value) {
            var classes = ["check-label"];
            if (this.skin === "tick") {
                classes.push("fa");
                if (value) {
                    classes.push("fa-check-square");
                }
                else {
                    classes.push("fa-square-o");
                }
            }
            else if (this.skin === "star") {
                classes.push("fa");
                if (value || this.active) {
                    classes.push("fa-star color-yellow-100");
                }
                else {
                    classes.push("fa-star-o color-cool-gray-50");
                }
            }
            return classes;
        },
        mouseOver: function() {
            if (!this.disabled) {
                this.active = !this.active;
            }
        }
    }
};
</script>
