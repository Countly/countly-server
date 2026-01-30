<template>
    <div class="bu-level cly-breadcrumbs bu-mb-5">
        <div v-for="(crumb, index) in crumbs"
            :key="index"
            :class="['bu-level-item text-medium bu-mr-0',
                    {'bu-ml-2': (index !== 0)},
                    {'color-cool-gray-40': (index === (crumbs.length - 1))}]">
            <a :href="crumb.url">{{crumb.label}}</a>
            <span class="bu-ml-2" v-if="index !== (crumbs.length - 1)">></span>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        crumbs: {
            type: Array,
            default: function() {
                return [];
            }
        }
    }
};
</script>
