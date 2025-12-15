var plugins = require('../plugins/pluginManager.js');
const countlyConfig = require('./config');
/**
 * Set Plugins APIs Config
 */
plugins.setConfigs("api", {
    domain: "",
    safe: false,
    session_duration_limit: 86400,
    country_data: true,
    city_data: true,
    event_limit: 500,
    event_segmentation_limit: 100,
    event_segmentation_value_limit: 1000,
    array_list_limit: 10,
    metric_limit: 1000,
    sync_plugins: false,
    session_cooldown: 15,
    request_threshold: 30,
    total_users: true,
    export_limit: 10000,
    prevent_duplicate_requests: true,
    metric_changes: true,
    offline_mode: false,
    reports_regenerate_interval: 3600,
    send_test_email: "",
    //data_retention_period: 0,
    batch_processing: true,
    //batch_on_master: false,
    batch_period: 10,
    batch_read_processing: true,
    //batch_read_on_master: false,
    batch_read_ttl: 600,
    batch_read_period: 60,
    user_merge_paralel: 1,
    trim_trailing_ending_spaces: false
});

/**
 * Set Plugins APPs Config
 */
plugins.setConfigs("apps", {
    country: "TR",
    timezone: "Europe/Istanbul",
    category: "6"
});

/**
 * Set Plugins Security Config
 */
plugins.setConfigs("security", {
    login_tries: 3,
    login_wait: 5 * 60,
    password_min: 8,
    password_char: true,
    password_number: true,
    password_symbol: true,
    password_expiration: 0,
    password_rotation: 3,
    password_autocomplete: true,
    robotstxt: "User-agent: *\nDisallow: /",
    dashboard_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000; includeSubDomains; preload\nX-Content-Type-Options: nosniff",
    api_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000; includeSubDomains; preload\nAccess-Control-Allow-Origin:*",
    dashboard_rate_limit_window: 60,
    dashboard_rate_limit_requests: 500,
    proxy_hostname: "",
    proxy_port: "",
    proxy_username: "",
    proxy_password: "",
    proxy_type: "https"
});

/**
 * Set Plugins Logs Config
 */
plugins.setConfigs('logs',
    {
        debug: (countlyConfig.logging && countlyConfig.logging.debug) ? countlyConfig.logging.debug.join(', ') : '',
        info: (countlyConfig.logging && countlyConfig.logging.info) ? countlyConfig.logging.info.join(', ') : '',
        warn: (countlyConfig.logging && countlyConfig.logging.warn) ? countlyConfig.logging.warn.join(', ') : '',
        error: (countlyConfig.logging && countlyConfig.logging.error) ? countlyConfig.logging.error.join(', ') : '',
        default: (countlyConfig.logging && countlyConfig.logging.default) ? countlyConfig.logging.default : 'warn',
    },
    undefined,
    function() {
        const cfg = plugins.getConfig('logs'), msg = {
            cmd: 'log',
            config: cfg
        };
        require('./utils/log.js').updateConfig(msg);
    }
);

/**
 * Set tracking config
 */
plugins.setConfigs("tracking", {
    self_tracking_app: "",
    self_tracking_url: "",
    self_tracking_app_key: "",
    self_tracking_id_policy: "_id",
    self_tracking_sessions: true,
    self_tracking_events: true,
    self_tracking_views: true,
    self_tracking_feedback: true,
    self_tracking_user_details: true,
    server_sessions: true,
    server_events: true,
    server_crashes: true,
    server_views: true,
    server_feedback: true,
    server_user_details: true,
});

plugins.setConfigs("frontend", {
    production: true,
    theme: "",
    session_timeout: 30,
    use_google: true,
    code: true,
    offline_mode: false
});

plugins.setUserConfigs("frontend", {
    production: false,
    theme: false,
    session_timeout: false,
    use_google: false,
    code: false,
});