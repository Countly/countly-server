import jQuery from 'jquery';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { appIdsToNames } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

var _data = {};
var _import_list = "";
var _export_list = "";

var countlyDataMigration = {};

countlyDataMigration.initialize = function() {
    return jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/o/datamigration/get_config",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
        },
        success: function(json) {
            if (json && json.result) {
                _data = json.result;
            }
        },
        error: function() {}
    });
};

countlyDataMigration.loadExportList = function() {
    return jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/o/datamigration/getmyexports",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
        },
        success: function(json) {
            if (json.result && Array.isArray(json.result)) {
                for (var z = 0; z < json.result.length; z++) {
                    if (!json.result[z].apps) {
                        json.result[z].apps = [];
                    }
                    json.result[z].appnames = appIdsToNames(json.result[z].apps);

                    var dd = new Date(json.result[z].ts);
                    json.result[z].time = dd.toLocaleDateString("en-US") + ' ' + dd.toLocaleTimeString("en-US");
                    json.result[z].step = i18n("data-migration.step." + json.result[z].step);
                    json.result[z].status_text = i18n("data-migration.status." + json.result[z].status);
                    json.result[z].applist = json.result[z].apps.join();

                    if ((json.result[z].status === 'failed' || json.result[z].status === 'finished' || json.result[z].stopped === true) && json.result[z].can_download === true) {
                        json.result[z].can_sendExport = true;
                    }
                    else {
                        json.result[z].can_resend = false;
                    }

                    if (json.result[z].stopped === false && (json.result[z].status !== 'failed' && json.result[z].status !== 'finished')) {
                        json.result[z].can_stop = true;
                    }
                    else {
                        json.result[z].can_stop = false;
                    }
                }
                _export_list = {result: "success", data: json.result};
            }
            else {
                _export_list = {result: "success", data: ""};
            }
        },
        error: function(xhr, status, error) {
            _export_list = {result: "error", data: {xhr: xhr, status: status, error: error}};
        }
    });
};

countlyDataMigration.loadImportList = function() {
    return jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/o/datamigration/getmyimports",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
        },
        success: function(json) {
            if (json.result && typeof json.result === 'object') {
                var my_imports = [];
                for (var key in json.result) {
                    if (Object.prototype.hasOwnProperty.call(json.result, key)) {
                        json.result[key].key = key;

                        if (json.result[key].last_update && json.result[key].last_update !== '') {
                            var dd = new Date(json.result[key].last_update);
                            json.result[key].last_update = dd.toLocaleDateString("en-US") + ' ' + dd.toLocaleTimeString("en-US");
                        }
                        if (json.result[key].type === '') {
                            json.result[key].status_text = i18n("data-migration.status.finished");
                        }
                        else {
                            json.result[key].status_text = i18n("data-migration.status.progress");
                        }

                        my_imports.push(json.result[key]);
                    }
                }

                if (my_imports.length > 0) {
                    _import_list = {result: "success", data: my_imports};
                }
                else {
                    _import_list = {result: "success", data: ""};
                }
            }
            else {
                _import_list = {result: "success", data: ""};
            }
        },
        error: function(xhr, status, error) {
            _import_list = {result: "error", data: {xhr: xhr, status: status, error: error}};
        }
    });
};

countlyDataMigration.stopExport = function(exportid, callback) {
    jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/i/datamigration/stop_export",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "exportid": exportid
        },
        success: function(json) {
            if (callback) {
                callback({result: "success", data: json.result});
            }
        },
        error: function(xhr, status, error) {
            if (callback) {
                callback({result: "error", data: {xhr: xhr, status: status, error: error}});
            }
        }
    });
};

countlyDataMigration.deleteExport = function(exportid, callback) {
    jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/i/datamigration/delete_export",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "exportid": exportid
        },
        success: function(json) {
            if (callback) {
                callback({result: "success", data: json.result});
            }
        },
        error: function(xhr, status, error) {
            if (callback) {
                callback({result: "error", data: {xhr: xhr, status: status, error: error}});
            }
        }
    });
};

countlyDataMigration.deleteImport = function(exportid, callback) {
    jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/i/datamigration/delete_import",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "exportid": exportid
        },
        success: function(json) {
            if (callback) {
                callback({result: "success", data: json.result});
            }
        },
        error: function(xhr, status, error) {
            if (callback) {
                callback({result: "error", data: {xhr: xhr, status: status, error: error}});
            }
        }
    });
};

countlyDataMigration.saveImport = function(importData, callback) {
    jQuery.ajax({
        type: "POST",
        url: countlyCommon.API_URL + "/i/datamigration/import",
        dataType: 'multipart/form-data',
        data: importData,
        success: function(json) {
            if (callback) {
                callback({result: "success", data: json.result});
            }
        },
        error: function(xhr, status, error) {
            if (callback) {
                callback({result: "error", data: {xhr: xhr, status: status, error: error}});
            }
        }
    });
};

countlyDataMigration.saveExport = function(exportData, callback) {
    jQuery.ajax({
        type: "POST",
        url: countlyCommon.API_URL + "/i/datamigration/export",
        data: exportData,
        success: function(json) {
            if (callback) {
                if (json.result) {
                    callback({result: "success", data: json.result});
                }
                else {
                    callback({result: "success", data: json});
                }
            }
        },
        error: function(xhr, status, error) {
            if (callback) {
                callback({result: "error", data: {xhr: xhr, status: status, error: error}});
            }
        }
    });
};

countlyDataMigration.createToken = function(callback) {
    jQuery.ajax({
        type: "POST",
        url: countlyCommon.API_URL + "/o/datamigration/createimporttoken",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
        },
        success: function(json) {
            if (callback) {
                callback({result: "success", data: json.result});
            }
        },
        error: function(xhr, status, error) {
            if (callback) {
                callback({result: "error", data: {xhr: xhr, status: status, error: error}});
            }
        }
    });
};

countlyDataMigration.testConnection = function(token, address, callback) {
    jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/o/datamigration/validateconnection",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "server_token": token,
            "server_address": address
        },
        success: function(json) {
            if (callback) {
                callback({result: "success", data: json.result});
            }
        },
        error: function(xhr, status, error) {
            if (callback) {
                callback({result: "error", data: {xhr: xhr, status: status, error: error}});
            }
        }
    });
};

countlyDataMigration.sendExport = function(exportid, token, address, rediret_traffic, callback) {
    jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/i/datamigration/sendexport",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "server_token": token,
            "server_address": address,
            "exportid": exportid,
            'redirect_traffic': rediret_traffic
        },
        success: function(json) {
            if (callback) {
                callback({result: "success", data: json.result});
            }
        },
        error: function(xhr, status, error) {
            if (callback) {
                callback({result: "error", data: {xhr: xhr, status: status, error: error}});
            }
        }
    });
};

countlyDataMigration.getData = function() {
    return _data;
};

countlyDataMigration.getExportList = function() {
    return _export_list;
};

countlyDataMigration.getImportList = function() {
    return _import_list;
};

export default countlyDataMigration;
