export enum AppTypes {
    WEB = 'web',
    DESKTOP = 'desktop',
    MOBILE = 'mobile',
}

export enum MenuSegments {
    CATEGORIES = "categories",
    CATEGORIZED_MENUS = "categorizedMenus",
    CATEGORIZED_SUBMENUS = "categorizedSubmenus"
}

export enum MenuCategories {
    UNDERSTAND = "understand",
    EVENTS = "events",
    DASHBOARD = "dashboard",
    ROOT = "root"
}

export interface MenuItem {
    name: string;
    app_type?: AppTypes;
    category?: MenuCategories;
    parent_code?: MenuCategories;
    path?: string;
    expanded?: boolean;
    children?: MenuItem[];
    priority?: number;
    title?: string;
    icon?: string;
    permission?: string;
    url?: string;
    text?: string;
    next?: boolean;
    code?: string;
    bottom?: number;
    app?: string;
    node?: {
        priority: number;
        code?: string;
        permission?: string;
        url?: string;
        text?: string;
        icon?: string;
        bottom?: number;
    }
}