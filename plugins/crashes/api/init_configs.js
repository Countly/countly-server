var plugins = require('../../pluginManager.js'),
    { DEFAULT_MAX_CUSTOM_FIELD_KEYS } = require('./parts/custom_field.js');

//This file is included in all processes.(api, ingestor and aggregator)
(function() {

    plugins.setConfigs("crashes", {
        report_limit: 100,
        grouping_strategy: "error_and_file",
        smart_preprocessing: true,
        smart_regexes: "{.*?}\n/.*?/",
        same_app_version_crash_update: false,
        max_custom_field_keys: DEFAULT_MAX_CUSTOM_FIELD_KEYS,
        activate_custom_field_cleanup_job: false,
    });
}());