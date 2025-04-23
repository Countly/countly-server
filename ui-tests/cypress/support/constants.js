module.exports.FEEDBACK_TYPES = {
    SURVEYS: 'ias',
    NPS: 'nps',
    RATINGS: 'ratings',
};

module.exports.RATING_SYMBOLS = {
    EMOJIS: 'Emojis',
    THUMBS: 'Thumbs',
    STARS: 'Stars',
};

module.exports.FEEDBACK_ADD_STEPS = {
    SETTINGS: 'Settings',
    APPEARANCE: 'Widget appearance',
    DEVICES_TARGETING: 'Devices & Targeting',
};

module.exports.BEHAVIOUR_TYPES = {
    SESSIONS: 'Sessions',
    EVENTS: 'Events',
    VIEW: 'View',
    FEEDBACK: 'Feedback',
    CRASH: 'Crash',
    PUSH: 'Push'
};

module.exports.COMPARISON_OPTIONS = {
    AT_LEAST: 'At least',
    EQUAL_TO: 'Equal to',
    AT_MOST: 'At most',
    IS_BETWEEN: 'is between',
    IS: 'is',
    IS_NOT: 'is not',
    CONTAINS: 'contains',
    DOES_NOT_CONTAIN: 'doesn\'t contain',
    IS_SET: 'is set',
    BEGINS_WITH: 'begins with',
    GREATER_THAN: 'greater than',
    LESS_THAN: 'less than',
    IN_THE_LAST: 'in the last'
};

module.exports.TIME_PHRASES = {
    IN_BETWEEN: 'In Between',
    BEFORE: 'Before',
    SINCE: 'Since',
    IN_THE_LAST: 'In the Last',
    ALL_TIME: 'All time'
};

module.exports.TIME_UNITS = {
    DAYS: 'days',
    WEEKS: 'weeks',
    MONTHS: 'months',
    YEARS: 'years',
    HOUR: 'hour',
    DAY: 'day',
    MONTH: 'month',
};

module.exports.LOGICAL_OPERATORS = {
    AND: 'And',
    OR: 'Or'
};

module.exports.YES_NO_OPTIONS = {
    YES: 'Yes',
    NO: 'No'
};

module.exports.APP_TYPE = {
    MOBILE: 'Mobile',
    WEB: 'Web',
    DESKTOP: 'Desktop'
};

module.exports.DATA_TYPE = {
    ENTERTAINMENT: 'Entertainment',
    FINANCE: 'Finance',
    B2BSAAS: 'B2B SaaS',
    HEALTHCARE: 'Healthcare',
    ECOMMERCE: 'E-commerce',
    SOCIAL: 'Social',
};

module.exports.FEATURE_TYPE = {
    CORE: 'Core',
    API: 'Api',
    FRONTEND: 'Frontend',
    LOGS: 'Logs',
    SECURITY: 'Security',
    FEATURE_MANAGEMENT: 'Feature Management',
    CRASHES: 'Crashes',
    DASHBOARDS: 'Dashboards',
    HOOKS: 'Hooks',
    INCOMING_DATA_LOGS: 'Incoming Data Logs',
    PUSH_NOTIFICATIONS: 'Push Notifications',
    REMOTE_CONFIG: 'Remote Config',
    EMAIL_REPORTS: 'Email Reports',
    SLIPPING_AWAY: 'Slipping Away',
    SOURCES: 'Sources',
    AUDIT_LOGS: 'Audit Logs',
    VIEWS: 'Views',
    FEEDBACK: 'Feedback',
    PROFILE_GROUPS: 'Profile Groups',
    DATA_POINTS: 'Data Points',
    EVENTS: 'Events',
    RATING: 'Rating',
    SESSIONS: 'Sessions',
    USERS: 'Users'
};

module.exports.SETTINGS = {

    API: {
        BATCH_PROCESSING: {
            BATCH_PROCESSING: 'Batch Processing',
            BATCH_PERIOD: 'Batch Period',
            USER_MERGE_PARALEL: 'User Merge Paralel',
        },

        CACHE_MANAGEMENT: {
            CACHE_MANAGEMENT: 'Cache Management',
            BATCH_READ_PROCESSING: 'Batch Read Processing',
            BATCH_READ_PERIOD: 'Batch Read Period',
            BATCH_READ_TIME_TO_LIVE: 'Batch Read Ttl',
        },

        DATA_LIMITS: {
            DATA_LIMITS: 'Data Limits',
            EVENT_LIMIT: 'Event Limit',
            EVENT_SEGMENTATION_LIMIT: 'Event Segmentation Limit',
            EVENT_SEGMENTATION_VALUE_LIMIT: 'Event Segmentation Value Limit',
            METRIC_LIMIT: 'Metric Limit',
            SESSION_DURATION_LIMIT: 'Session Duration Limit',
            ARRAY_LIST_LIMIT: 'Array List Limit',
        },

        OTHER_API_SETTINGS: {
            OTHER_API_SETTINGS: 'Other API Settings',
            SAFE: 'Safe',
            DOMAIN: 'Domain',
            EXPORT_LIMIT: 'Export Limit',
            OFFLINE_MODE: 'Offline Mode',
            REPORTS_REGENERATE_INTERVAL: 'Reports Regenerate Interval',
            REQUEST_THRESHOLD: 'Request Threshold',
            SYNC_PLUGINS: 'Sync Plugins',
            SEND_TEST_EMAIL: 'Send Test Email',
            CITY_DATA: 'City Data',
            COUNTRY_DATA: 'Country Data',
            SESSION_COOLDOWN: 'Session Cooldown',
            TOTAL_USERS: 'Total Users',
            PREVENT_DUPLICATE_REQUESTS: 'Prevent Duplicate Requests',
            METRIC_CHANGES: 'Metric Changes',
            TRIM_TRAILING_ENDING_SPACES: 'Trim Trailing Ending Spaces',
        }
    },

    FRONTED: {
        CODE: 'Code',
        COUNTLY_TRACKING: 'Countly Tracking',
        OFFLINE_MODE: 'Offline Mode',
        PRODUCTION: 'Production',
        SESSION_TIMEOUT: 'Session Timeout',
        THEME: 'Theme',
        USER: '--User',
    },

    LOGS: {
        LOGGING_FOR_SEPARATE_FEATURES: {
            LOGGING_FOR_SEPARATE_FEATURES: 'Logging for separate features',
            DEBUG: 'Debug',
            WARNING_LEVEL: 'Warn',
            INFO_LEVEL: 'Info',
            ERROR_LEVEL: 'Error',
        },

        DEFAULT_LOG_LEVEL_FOR_THE_REST: {
            DEFAULT_LOG_LEVEL_FOR_THE_REST: 'Default Log Level for the rest',
            DEFAULT_LEVEL: 'Default',
        },
    },

    SECURITY: {
        API_ADDITIONAL_HEADERS: 'Api additional headers',
        DASHBOARD_ADDITIONAL_HEADERS: 'Dashboard additional headers',
        DASHBOARD_RATE_LIMIT_REQUESTS: 'Dashboard Rate Limit Requests',
        DASHBOARD_RATE_LIMIT_WINDOW: 'Dashboard Rate Limit Window',
        LOGIN_TRIES: 'Login Tries',
        LOGIN_WAIT: 'Login Wait',
        PASSWORD_AUTOCOMPLATE: 'Password Autocomplete',
        PASSWORD_CHAR: 'Password Char',
        PASSWORD_EXPIRATION: 'Password Expiration',
        PASSWORD_MIN: 'Password Min',
        PASSWORD_NUMBER: 'Password Number',
        PASSWORD_ROTATION: 'Password Rotation',
        PASSWORD_SYMBOL: 'Password Symbol',
        ROBOTS_TXT: 'Robotstxt',
        PROXY_HOSTNAME: 'Proxy Hostname',
        PROXY_PASSWORD: 'Proxy Password',
        PROXY_PORT: 'Proxy Port',
        PROXY_TYPE: 'Proxy Type',
        PROXY_USERNAME: 'Proxy Username',
    },

    CRASHES: {
        ACTIVATE_CUSTOM_FIELD_CLEANUP_JOB: 'Activate Custom Field Cleanup Job',
        GROUPING_STRATEGY: 'Grouping Strategy',
        MAX_CUSTOM_FIELD_KEYS: 'Max Custom Field Keys',
        REPORT_LIMIT: 'Report limit',
        LATEST_CRASH_UPDATE: 'Same App Version Crash Update',
        SMART_PREPROCESSING: 'Smart Preprocessing',
        SMART_REGEXES: 'Smart Regexes',
    },

    DASHBOARD: {
        ALLOW_DASHBOARD_SHARING: 'Sharing Status',
    },

    HOOKS: {
        ACTION_BATCH_PROCESING_SIZE: 'Batchactionsize',
        ACTION_PIPELINE_INTERVAL: 'Pipelineinterval',
        REFRESH_RULES_PERIOD: 'Refreshrulesperiod',
        REQUEST_LIMIT: 'Requestlimit',
        TIME_WINDOW_FOR_REQUEST_LIMIT: 'Timewindowforrequestlimit',
    },

    INCOMING_DATA_LOGS: {
        DATA_LOGGING_LIMIT: 'Limit',
        DATA_LOGGING_STATE: 'State',
    },

    PUSH_NOTIFICATIONS: {
        CONNECTION_FACTOR: 'Connection Factor',
        CONNECTION_RETRIES: 'Connection Retries',
        NO_DUPLICATE: 'Deduplicate',
        DEFAULT_CONTENT_AVAILABLE: 'Default Content Available',
        MESSAGE_TIMEOUT: 'Message Timeout',
        POOL_BYTES: 'Pool Bytes',
        POOL_CONCURRENCY: 'Pool Concurrency',
        POOL_POOLS: 'Pool Pools',
        POOL_PUSHES: 'Pool Pushes',
        PROXY_HOST: 'Proxyhost',
        PROXY_PASS: 'Proxypass',
        PROXY_PORT: 'Proxyport',
        PROXY_UNAUTHORIZED: 'Proxyunauthorized',
        PROXY_USER: 'Proxyuser',
        SEND_A_HEAD: 'Sendahead',
    },

    REMOTE_CONFIG: {
        MAXIMUM_NUMBER_OF_CONDITIONS: 'Conditions Per Paramaeters',
        MAXIMUM_NUMBER_OF_PARAMETERS: 'Maximum Allowed Parameters',
    },

    EMAIL_REPORTS: {
        SECRET_KEY_FOR_UNSUBSCRIBE_LINK: 'Secretkey',
    },

    SLIPPING_AWAY: {
        FIRST_THRESHOLD: 'p1',
        SECOND_THRESHOLD: 'p2',
        THIRD_THRESHOLD: 'p3',
        FOURTH_THRESHOLD: 'p4',
        FIFTH_THRESHOLD: 'p5',
    },

    SOURCES: {
        SOURCES_LENGTH_LIMIT: 'Sources Length Limit',
    },

    AUDIT_LOGS: {
        DISABLE_IP_TRACKING: 'Preventiptracking',
    },

    VIEWS: {
        VIEW_SEGMENT_LIMIT: 'Segment Limit',
        VIEW_SEGMENT_VALUE_LIMIT: 'Segment Value Limit',
        VIEW_LIMIT: 'View Limit',
        VIEW_NAME_LENGTH_LIMIT: 'View Name Limit',
    },

    FEEDBACK: {
        LOGO: 'Feedback Logo',
        FONT_COLOR: 'Font Color',
        MAIN_COLOR: 'Main Color'
    }
};

module.exports.EMAIL_NOTIFICATION_TYPE = {
    TO_SPECIFIC_ADDRESS: 'To specific address',
    TO_USERS_IN_A_GROUP: 'To users in a group',
    DO_NOT_SEND_FOR_THIS_ALERT: 'Don\'t send for this alert'
};

module.exports.TRIGGER_METRICS = {
    //CRASHES
    OF_CRASHES_ERRORS: '# of crashes/errors',
    NON_FATAL_CRASHES_ERRORS_PER_SESSION: 'non-fatal crashes/errors per session',
    FATAL_CRASHES_ERRORS_PER_SESSION: 'fatal crashes/errors per session',
    NEW_CRASH_ERROR: 'new crash/error',
    //PROFILE GROUPS
    OF_USERS_IN_THE_PROFILE_GROUP: '# of users in the profile group',
    //DATA POINTS
    TOTAL_DATA_POINTS: 'total data points',
    //EVENTS
    COUNT: 'count',
    SUM: 'sum',
    DURATION: 'duration',
    AVERAGE_SUM: 'average sum',
    AVERAGE_DURATION: 'average duration',
    //RATING
    OF_RESPONSES: '# of responses',
    NEW_RATING_RESPONSE: 'new rating response',
    //SESSIONS
    AVERAGE_SESSION_DURATION: 'average session duration',
    OF_SESSIONS: '# of sessions',
    //USERS
    OF_USERS: '# of users',
    OF_NEW_USERS: '# of new users',
    //VIEWS
    BOUNCE_RATE: 'bounce rate',
    OF_PAGE_VIEWS: '# of page views',
};

module.exports.TRIGGER_VARIABLE = {
    INCREASED: 'increased',
    DECREASED: 'decreased',
    MORE: 'more'
};

module.exports.USER_TYPE = {
    USER: 'User',
    ADMIN: 'Admin',
    GLOBAL_USER: 'Global Admin',
};