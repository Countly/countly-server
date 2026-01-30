<template>
    <div>
        <component :is="comp" v-for="(comp, index) in children" :key="index"
            v-bind="$attrs"
            v-on="$listeners">
        </component>
    </div>
</template>

<script>
export default {
    props: {
        children: {
            type: Array,
            default: function() {
                return [];
            }
        }
    }
};
</script>
