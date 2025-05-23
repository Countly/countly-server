import { defineStore } from 'pinia';
import { type MenuItem, AppTypes, MenuCategories, MenuSegments } from '@/types/MenuItem';
import type { AppInfo } from '@/types/AppInfo';

export interface SidebarStoreState {
    menu: {
        [MenuSegments.CATEGORIES]: MenuItem[];
        [MenuSegments.CATEGORIZED_MENUS]: {
            [key in MenuCategories]: MenuItem[];
        };
        [MenuSegments.CATEGORIZED_SUBMENUS]: {
            [key in MenuCategories]: MenuItem[];
        };
    };
    appInfo: AppInfo;
}

// Create Pinia store for sidebar menu
export const useSidebarStore = defineStore('sidebar', {
    state: () : SidebarStoreState => {
        return {
            menu: {
                [MenuSegments.CATEGORIES]: [
                    {
                        "name": "understand",
                        "priority": 10,
                        "title": "Understand",
                        "node": {
                            "priority": 10
                        }
                    },
                ],
                [MenuSegments.CATEGORIZED_MENUS]: {
                    [MenuCategories.UNDERSTAND]: [
                        {
                            "app_type": AppTypes.WEB,
                            "category": MenuCategories.UNDERSTAND,
                            "name": "overview",
                            "priority": 10,
                            "title": "Home",
                            "url": "#/",
                            "icon": "<div class=\"logo dashboard ion-speedometer\"></div>",
                            "permission": "core",
                            "node": {
                                "code": "overview",
                                "permission": "core",
                                "url": "#/",
                                "text": "sidebar.home",
                                "icon": "<div class=\"logo dashboard ion-speedometer\"></div>",
                                "priority": 10,
                                "bottom": 20
                            }
                        },
                    ],
                    [MenuCategories.DASHBOARD]: [],
                    [MenuCategories.EVENTS]: [],
                    [MenuCategories.ROOT]: []
                },
                [MenuSegments.CATEGORIZED_SUBMENUS]: {
                    [MenuCategories.EVENTS]: [
                        {
                            "app_type": AppTypes.WEB,
                            "parent_code": MenuCategories.EVENTS,
                            "name": "events-overview",
                            "priority": 10,
                            "title": "Overview",
                            "url": "#/analytics/events/overview",
                            "permission": "events",
                            "node": {
                                "code": "events-overview",
                                "permission": "events",
                                "url": "#/analytics/events/overview",
                                "text": "sidebar.events.overview",
                                "priority": 10
                            }
                        }
                    ],
                    [MenuCategories.DASHBOARD]: [],
                    [MenuCategories.UNDERSTAND]: [],
                    [MenuCategories.ROOT]: []
                },
            },
            appInfo: {
                name: "empty",
                type: "Web",
                image: "/appimages/657984294c3287b7df6c220f.png"
            },
        }
    },
    actions: {
        registerMenuItem(segment: MenuSegments, category: MenuCategories, item: MenuItem) {
            if (category === MenuCategories.ROOT && segment === MenuSegments.CATEGORIES) {
                this.menu[segment].push(item);
            } else if (category !== MenuCategories.ROOT && segment !== MenuSegments.CATEGORIES) {
                this.menu[segment][category].push(item);
            } else {
                console.info("Invalid menu item");
            }
        }
    }
});