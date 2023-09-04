export default {
<<<<<<< HEAD
    SIDEBAR: '[data-test-id= dashboard-sidebar]',
    SIDEBAR_MENU_OPTIONS: '[data-test-id= sidebar-menu-options]',
=======
	SIDEBAR: '[data-test-id= dashboard-sidebar]',
	SIDEBAR_MENU_OPTIONS: '[data-test-id= sidebar-menu-options]',
	
	SIDEBAR_MENU_OPTIONS_LIST: {
		MAIN_MENU: '[data-test-id= sidebar-menuoptions-analytics]',
		DASHBOARDS: '[data-test-id= sidebar-menuoptions-dashboards]',
		MANAGEMENT: '[data-test-id= sidebar-menuoptions-management]',
		REPORT_MANAGER: '[data-test-id= sidebar-menuoptions-reportmanager]',
		HELP_CENTER: '[data-test-id= sidebar-menu-helpcenter]',
		MY_PROFILE: '[data-test-id= sidebar-menuoptions-myprofile]',
		LANGUAGE: '[data-test-id= language-menu]',
		TOGGLE: '[data-test-id=sidebar-menuoptions-toogleleft]'
	},
>>>>>>> 5329704f95 (Updated sidebar duplicate defines for lint)

    SIDEBAR_MENU_OPTIONS: {
        MAIN_MENU: '[data-test-id= sidebar-menuoptions-analytics]',
        DASHBOARDS: '[data-test-id= sidebar-menuoptions-dashboards]',
        MANAGEMENT: '[data-test-id= sidebar-menuoptions-management]',
        REPORT_MANAGER: '[data-test-id= sidebar-menuoptions-reportmanager]',
        HELP_CENTER: '[data-test-id= sidebar-menu-helpcenter]',
        MY_PROFILE: '[data-test-id= sidebar-menuoptions-myprofile]',
        LANGUAGE: '[data-test-id= language-menu]',
        TOGGLE: '[data-test-id=sidebar-menuoptions-toogleleft]'
    },

    SIDEBAR_MAIN_MENU_OPTIONS: {
        APP: '[data-test-id= sidebar-mainmenu-app]',
        APP_IMAGE: '[data-test-id= sidebar-mainmenu-app-image]',
        APP_NAME: '[data-test-id= sidebar-mainmenu-app-name]',
        HOME: '[data-test-id= sidebar-mainmenu-overview]',
        ANALYTICS: '[data-test-id= sidebar-mainmenu-analytics]',
        ANALYTICS_LIST: {
            VISITOR_ANALYTICS: '[data-test-id= sidebar-mainmenu-subitem-analytics-users]',
            VISITOR_LOYALTY: '[data-test-id= sidebar-mainmenu-subitem-analytics-loyalty]',
            SESSION_ANALYTICS: '[data-test-id= sidebar-mainmenu-subitem-analytics-sessions]',
            PAGE_VIEWS: '[data-test-id= sidebar-mainmenu-subitem-analytics-views]',
            HEATMAPS: '[data-test-id= sidebar-mainmenu-subitem-heatmaps]',
            ACQUISITION: '[data-test-id= sidebar-mainmenu-subitem-analytics-acquisition]',
            TECHNOLOGY: '[data-test-id= sidebar-mainmenu-subitem-analytics-technology]',
            GEO: '[data-test-id= sidebar-mainmenu-subitem-analytics-geo]',
        },
        RETENTION: '[data-test-id= sidebar-mainmenu-url-retention]',
        EVENTS: '[data-test-id= sidebar-mainmenu-events]',
        EVENTS_LIST: {
            OVERVIEW: '[data-test-id= sidebar-mainmenu-subitem-events-overview]',
            ALL_EVENTS: '[data-test-id= sidebar-mainmenu-subitem-all-events]',
        },
        REVENUE: '[data-test-id= sidebar-mainmenu-revenue]',
        VISITOR_PROFILES: '[data-test-id= sidebar-mainmenu-profiles]',
        COHORTS: '[data-test-id= sidebar-mainmenu-cohorts]',
        FUNNELS: '[data-test-id= sidebar-mainmenu-funnels]',
        FLOWS: '[data-test-id= sidebar-mainmenu-flows]',
        DRILL: '[data-test-id= sidebar-mainmenu-drill]',
        FORMULAS: '[data-test-id= sidebar-mainmenu-formulas]',
        FEEDBACK: '[data-test-id= sidebar-mainmenu-feedback]',
        FEEDBACK_LIST: {
            SURVEYS: '[data-test-id= sidebar-mainmenu-submenu-ias]',
            NPS: '[data-test-id= sidebar-mainmenu-submenu-nps]',
            RATINGS: '[data-test-id= sidebar-mainmenu-submenu-star-rating]',
        },
        ERRORS: '[data-test-id= sidebar-mainmenu-crashes]',
        ERRORS_LIST: {
            OVERVIEW: '[data-test-id= sidebar-mainmenu-submenu-crash]',
            MANAGE_SYMBOLS: '[data-test-id= sidebar-mainmenu-submenu-symbols]',
        },
        PERFORMANCE: '[data-test-id= sidebar-mainmenu-performance-monitoring]',
        REMOTE_CONFIG: '[data-test-id= sidebar-mainmenu-remote-config]',
        AB_TESTING: '[data-test-id= sidebar-mainmenu-ab-testing]',
        UTILITIES: '[data-test-id= sidebar-mainmenu-utilities]',
        UTILITIES_LIST: {
            DATA_MANAGER: '[data-test-id= sidebar-mainmenu-subitem-data-manager]',
            DATA_POPULATOR: '[data-test-id= sidebar-mainmenu-submenu-populate]',
            CONFIG_TRANSFER: '[data-test-id= sidebar-mainmenu-submenu-export]',
            INCOMING_DATA_LOGS: '[data-test-id= sidebar-mainmenu-submenu-logger]',
            SDK_MANAGER: '[data-test-id= sidebar-mainmenu-submenu-sdk]',
            COMPLIANCE_HUB: '[data-test-id= sidebar-mainmenu-submenu-compliance]',
            SYMBOLICATION_LOGS: '[data-test-id= sidebar-mainmenu-submenu-symbol_jobs]',
            FILTERING_LOGS: '[data-test-id= sidebar-mainmenu-submenu-blocks]',
        },
        VERSION: '[data-test-id="sidebar-menu-version]'
    },
};
