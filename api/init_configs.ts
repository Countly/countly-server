/**
 * Initialize plugin configurations for the Countly API
 * @module api/init_configs
 */

import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const plugins = require('../plugins/pluginManager.js');
const countlyConfig = require('./config.js');
const countlyConfigApp = require('../frontend/express/config.js');

/**
 * API configuration interface
 */
interface ApiConfig {
    domain: string;
    safe: boolean;
    session_duration_limit: number;
    country_data: boolean;
    city_data: boolean;
    event_limit: number;
    event_segmentation_limit: number;
    event_segmentation_value_limit: number;
    array_list_limit: number;
    metric_limit: number;
    sync_plugins: boolean;
    session_cooldown: number;
    request_threshold: number;
    total_users: boolean;
    export_limit: number;
    prevent_duplicate_requests: boolean;
    metric_changes: boolean;
    offline_mode: boolean;
    reports_regenerate_interval: number;
    send_test_email: string;
    batch_processing: boolean;
    batch_period: number;
    batch_read_processing: boolean;
    batch_read_ttl: number;
    batch_read_period: number;
    user_merge_paralel: number;
    trim_trailing_ending_spaces: boolean;
}

/**
 * Apps configuration interface
 */
interface AppsConfig {
    country: string;
    timezone: string;
    category: string;
}

/**
 * Security configuration interface
 */
interface SecurityConfig {
    login_tries: number;
    login_wait: number;
    password_min: number;
    password_char: boolean;
    password_number: boolean;
    password_symbol: boolean;
    password_expiration: number;
    password_rotation: number;
    password_autocomplete: boolean;
    robotstxt: string;
    dashboard_additional_headers: string;
    api_additional_headers: string;
    dashboard_rate_limit_window: number;
    dashboard_rate_limit_requests: number;
    api_rate_limit_window: number;
    api_rate_limit_requests: number;
    proxy_hostname: string;
    proxy_port: string;
    proxy_username: string;
    proxy_password: string;
    proxy_type: string;
}

/**
 * Logs configuration interface
 */
interface LogsConfig {
    debug: string;
    info: string;
    warn: string;
    error: string;
    default: string;
}

/**
 * Tracking configuration interface
 */
interface TrackingConfig {
    self_tracking_app: string;
    self_tracking_url: string;
    self_tracking_app_key: string;
    self_tracking_id_policy: string;
    self_tracking_sessions: boolean;
    self_tracking_events: boolean;
    self_tracking_views: boolean;
    self_tracking_feedback: boolean;
    self_tracking_user_details: boolean;
    server_sessions: boolean;
    server_events: boolean;
    server_crashes: boolean;
    server_views: boolean;
    server_feedback: boolean;
    server_user_details: boolean;
}

/**
 * Frontend configuration interface
 */
interface FrontendConfig {
    production: boolean;
    theme: string;
    session_timeout: number;
    use_google: boolean;
    code: boolean;
    offline_mode: boolean;
}

/**
 * User configurable frontend options
 */
interface FrontendUserConfig {
    production: boolean;
    theme: boolean;
    session_timeout: boolean;
    use_google: boolean;
    code: boolean;
}

/**
 * Set Plugins APIs Config
 */
const apiConfig: ApiConfig = {
    domain: '',
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
    send_test_email: '',
    batch_processing: true,
    batch_period: 10,
    batch_read_processing: true,
    batch_read_ttl: 600,
    batch_read_period: 60,
    user_merge_paralel: 1,
    trim_trailing_ending_spaces: false
};
plugins.setConfigs('api', apiConfig);

/**
 * Set Plugins APPs Config
 */
const appsConfig: AppsConfig = {
    country: 'TR',
    timezone: 'Europe/Istanbul',
    category: '6'
};
plugins.setConfigs('apps', appsConfig);

/**
 * Set Plugins Security Config
 */
const securityConfig: SecurityConfig = {
    login_tries: 3,
    login_wait: 5 * 60,
    password_min: 8,
    password_char: true,
    password_number: true,
    password_symbol: true,
    password_expiration: 0,
    password_rotation: 3,
    password_autocomplete: true,
    robotstxt: 'User-agent: *\nDisallow: /',
    dashboard_additional_headers: 'X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000; includeSubDomains; preload\nX-Content-Type-Options: nosniff',
    api_additional_headers: 'X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000; includeSubDomains; preload\nAccess-Control-Allow-Origin:*',
    dashboard_rate_limit_window: 60,
    dashboard_rate_limit_requests: 500,
    api_rate_limit_window: 0,
    api_rate_limit_requests: 0,
    proxy_hostname: '',
    proxy_port: '',
    proxy_username: '',
    proxy_password: '',
    proxy_type: 'https'
};
plugins.setConfigs('security', securityConfig);

/**
 * Set Plugins Logs Config
 */
const logsConfig: LogsConfig = {
    debug: (countlyConfig.logging && countlyConfig.logging.debug) ? countlyConfig.logging.debug.join(', ') : '',
    info: (countlyConfig.logging && countlyConfig.logging.info) ? countlyConfig.logging.info.join(', ') : '',
    warn: (countlyConfig.logging && countlyConfig.logging.warn) ? countlyConfig.logging.warn.join(', ') : '',
    error: (countlyConfig.logging && countlyConfig.logging.error) ? countlyConfig.logging.error.join(', ') : '',
    default: (countlyConfig.logging && countlyConfig.logging.default) ? countlyConfig.logging.default : 'warn',
};

plugins.setConfigs('logs',
    logsConfig,
    undefined,
    function() {
        const cfg = plugins.getConfig('logs');
        const msg = {
            cmd: 'log',
            config: cfg
        };
        require('./utils/log.js').updateConfig(msg);
    }
);

/**
 * Set tracking config
 */
const trackingConfig: TrackingConfig = {
    self_tracking_app: '',
    self_tracking_url: '',
    self_tracking_app_key: '',
    self_tracking_id_policy: '_id',
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
};
plugins.setConfigs('tracking', trackingConfig);

/**
 * Set frontend config
 */
const frontendConfig: FrontendConfig = {
    production: true,
    theme: (countlyConfigApp.web && countlyConfigApp.web.theme) ? countlyConfigApp.web.theme : '',
    session_timeout: 30,
    use_google: true,
    code: true,
    offline_mode: false
};
plugins.setConfigs('frontend', frontendConfig);

/**
 * Set user configurable frontend options
 */
const frontendUserConfig: FrontendUserConfig = {
    production: false,
    theme: false,
    session_timeout: false,
    use_google: false,
    code: false,
};
plugins.setUserConfigs('frontend', frontendUserConfig);

// Export types for use by other modules
export type {
    ApiConfig,
    AppsConfig,
    SecurityConfig,
    LogsConfig,
    TrackingConfig,
    FrontendConfig,
    FrontendUserConfig
};
