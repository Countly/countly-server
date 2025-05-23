<template>
    <div class="sidebar">
        <div class="left-sidebar"></div>
        <div style="width: 100%;" class="cly-vue-sidebar">
            <div class="menu-selected-application">
                <div class="menu-selected-application-image" :style="'background-image: url(' + sidebarStore.appInfo.image + ');'"></div>
                <div class="menu-selected-application-info">
                    <div class="menu-app-name">
                        <span>{{ sidebarStore.appInfo.name }}</span>
                    </div>
                    <div class="menu-app-type">
                        <span>{{ sidebarStore.appInfo.type }}</span>
                    </div>
                </div>
                <div>
                    <span class="arrow">▼</span>
                </div>
            </div>

            <div v-for="(category, cat_idx) in sidebarStore.menu[MenuSegments.CATEGORIES]" :key="cat_idx" :data-category="category.name" style="margin-bottom: 40px">
                <ul>
                    <li v-for="(menu, menu_idx) in sidebarStore.menu[MenuSegments.CATEGORIZED_MENUS][category.name as MenuCategories]" :key="menu_idx" class="cly-vue-sidebar__items" :style="menu.node && menu.node.bottom ? {'marginBottom': menu.node.bottom + 'px'} : {}">
                        <div v-if="sidebarStore.menu[MenuSegments.CATEGORIZED_SUBMENUS][menu.name as MenuCategories] && sidebarStore.menu[MenuSegments.CATEGORIZED_SUBMENUS][menu.name as MenuCategories].length">
                            <el-collapse v-model="selectedAnalyticsMenu" accordion>
                                <el-collapse-item :title="menu.title" :name="menu.name">
                                    <ul>
                                        <li v-for="(submenu, sub_idx) in sidebarStore.menu[MenuSegments.CATEGORIZED_SUBMENUS][menu.name as MenuCategories]" :key="submenu.name">
                                            <a :href="getSubmenuUrl(submenu)" style="text-decoration: none;">
                                                <div
                                                    style="width: calc(100% - 44px);"
                                                    :style="submenu.title === 'Boards' ? { backgroundColor: '#DF7E2E !important', borderRadius: '4px' } : {}"
                                                    :class="['cly-vue-sidebar__submenu-items has-ellipsis']"
                                                >
                                                    {{ submenu.title }}
                                                </div>
                                            </a>
                                        </li>
                                    </ul>
                                </el-collapse-item>
                            </el-collapse>
                        </div>
                        
                        <a v-else-if="menu.url" :href="getSubmenuUrl(menu)" style="text-decoration: none;">
                            <div
                                style="width: calc(100% - 24px);"
                                :style="menu.title === 'Boards' ? { backgroundColor: '#DF7E2E !important', borderRadius: '4px' } : {}"
                                :class="['cly-vue-sidebar__menu-items has-ellipsis']"
                            >
                                {{ menu.title }}
                            </div>
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { type MenuItem, MenuCategories, MenuSegments } from "@/types/MenuItem";
import { useSidebarStore } from "@/stores/sidebar";

const selectedAnalyticsMenu = ref<string | null>(null);
const sidebarStore = useSidebarStore();
// @ts-ignore
sidebarStore.menu = JSON.parse(localStorage.getItem("common_menu_storage"));

const getSubmenuUrl = (menu: MenuItem): string => {
    const urlPrefix = menu.next ? '/next#/' : '/dashboard#/';
    return urlPrefix + "631ed5f207ea6c7953c3d113" + menu?.url?.replace(/#/g, '') || "";
};
</script>

<style>
    html, body {
        font-family: 'Inter', sans-serif;
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
    }
    
    .cly-vue-sidebar__menu-options {
        width: 224px;
        height: 100%;
        overflow: auto;
        color: #A7AEB8;
        z-index: 2005;
        background-color: #191c20;
        
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .cly-vue-sidebar__menu-option {
        &__menu-option {
            width: 48px;
            margin-top: 24px;
            font-size: 20px;
            cursor: pointer;
            /* bu-is-flex bu-is-justify-content-center bu-is-align-items-center */
            display: flex;
            justify-content: center;
            align-items: center;
        }
    }

    .cly-vue-sidebar__menu-items, .cly-vue-sidebar__menu-items, .cly-vue-sidebar__submenu-items, .cly-vue-sidebar .el-collapse-item__header {
        line-height: 20px;
        height: 20px;
        background-color: #24292e !important;
        color: #d6d6d6 !important;
        border: none;
        font-size: 14px;
        padding: 0;
        font-weight: 400;
        font-family: Inter;
        padding: 6px 12px;
    }

    .cly-vue-sidebar__items {
        padding-left: 12px;
        padding-right: 12px;
        cursor: pointer;
        margin-bottom: 8px;
    }
    
    .sidebar {
    width: 248px;
    background-color: #24292e;
    padding: 1rem;
    color: #ccc;
    height: 100vh;
    overflow-y: auto;
    display: flex;
    }

    .left-sidebar {
        width: 48px;
        height: 100%;
        background-color: #191c20;
        margin: -16 16 -16 -16px;
    }

    .menu-item {
        margin-bottom: 1rem;
        line-height: 20px;
        height: 20px;
        color: #d6d6d6;
        border: none;
        font-size: 14px;
        font-weight: 400;
        font-family: Inter;
        padding: 2px 0px;
    }

    .menu-item .link,
    .menu-item span {
    display: block;
    padding: 0.5rem 1rem;
    cursor: pointer;
    color: #ccc;
    text-decoration: none;
    }

    .menu-item .link:hover,
    .menu-item span:hover {
    background-color: #333;
    }

    .submenu {
    padding-left: 1rem;
    }

    .submenu-item {
    display: block;
    padding: 0.4rem 1rem;
    color: #999;
    text-decoration: none;
    }

    .submenu-item:hover {
    background-color: #2a2a2a;
    }

    .clickable {
    cursor: pointer;
    }

    .menu-selected-application {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: 1px solid #424243;
        box-sizing: border-box;
        box-shadow: 0px 11px 14px rgba(0, 0, 0, .371635);
        border-radius: 4px;
        height: 50px;
        padding: 12px;
        margin-bottom: 12px;
    }
    .menu-selected-application-info {
        margin-right: 75px;
        display: flex;
        flex-direction: column;
    }

    .menu-selected-application-image {
        width: 26px;
        height: 26px;
        background-size: 26px 26px;
        border-radius: 4px;
        background-position: center;
        display: inline-block;
    }

    .menu-app-name {
        font-size: 14px;
        font-weight: 400;
        line-height: 12px;
    }

    .menu-app-type {
        font-size: 10px;
        font-weight: 400;
        line-height: 12px;
        margin-top: 2px;
    }

    .arrow {
    float: right;
    margin-top: -8px;
    font-size: 8px;
    }

    .sidebar ul {
    list-style: none;
    padding: 0;
    margin: 0;
    }

    .cly-vue-sidebar .el-collapse-item__wrap {
        border-bottom: 1px solid #424243;
        background-color: #24292e;
        box-shadow: 0px 1px 0px rgba(0, 0, 0, .4);
    }

    .cly-vue-sidebar .el-collapse-item__header {
        background-color: #24292e !important;
        color: #d6d6d6 !important;
        margin-top: -1px;
        margin-bottom: -2px;
        font-size: 14px;
        padding: 0;
        font-weight: 400;
        font-family: Inter;
        padding: 6px 12px;
    }
</style>