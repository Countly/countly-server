<template>
<div>
    <h5>Hello, <span v-html="message"></span> </h5>
    <br>
    <el-space direction="vertical" size="large">
        <el-button type="primary">Button 1</el-button>
        <el-button type="success">Button 2</el-button>
        <el-button type="warning">Button 3</el-button>
    </el-space>
    <br>
    <div v-if="ACTIVE_APP_ID">
        {{ ACTIVE_APP_ID }}
    </div>
</div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from "vue";
import { useSidebarStore } from "@/stores/sidebar"
import { MenuSegments } from "@/types/MenuItem";
import { MenuCategories } from "@/types/MenuItem";
import { AppTypes } from "@/types/MenuItem";
import { useCountlyCommon } from "@/composables/useCountlyCommon";

const sidebarStore = useSidebarStore()
const { ACTIVE_APP_ID } = useCountlyCommon();

const message = ref("This is the <em> boards </em> plugin redirected by the vue-router");

onMounted(() => {
    sidebarStore.registerMenuItem(
        MenuSegments.CATEGORIZED_MENUS,
        MenuCategories.UNDERSTAND,
        {
            "app_type": AppTypes.WEB,
            "category": MenuCategories.UNDERSTAND,
            "name": "Boards2",
            "priority": 11,
            "title": "Boards2",
            "url": "#/boards-next",
            "permission": "core",
            "next": true,
            "node": {
                "code": "overview",
                "permission": "core",
                "url": "#/boards-next",
                "text": "Boards2",
                "priority": 3
            }
        }
    )
})
</script>