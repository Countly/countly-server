/*global countlyCommon, CountlyHelpers, jQuery*/
(function(countlyDataMigration, $) {
    //we will store our data here
    var _data = {};
    var _import_list = "";
    var _export_list = "";
    /*
     * Initialization function. Loads configuration
     */
    countlyDataMigration.initialize = function() {
        return $.ajax({
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
    /*
     * Function loads all exports
     */
    countlyDataMigration.loadExportList = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/datamigration/getmyexports",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
            },
            success: function(json) {
                if (json.result && Array.isArray(json.result)) {
                    for (var i = 0; i < json.result.length; i++) {
                        if (!json.result[i].apps) {
                            json.result[i].apps = [];
                        }
                        json.result[i].appnames = CountlyHelpers.appIdsToNames(json.result[i].apps);

                        var dd = new Date(json.result[i].ts);
                        json.result[i].time = dd.toLocaleDateString("en-US") + ' ' + dd.toLocaleTimeString("en-US");
                        json.result[i].step = jQuery.i18n.map["data-migration.step." + json.result[i].step];
                        json.result[i].status_text = jQuery.i18n.map["data-migration.status." + json.result[i].status];
                        json.result[i].applist = json.result[i].apps.join();

                        if ((json.result[i].status === 'failed' || json.result[i].status === 'finished' || json.result[i].stopped === true) && json.result[i].can_download === true) {
                            json.result[i].can_sendExport = true;
                        }
                        else {
                            json.result[i].can_resend = false;
                        }

                        if (json.result[i].stopped === false && (json.result[i].status !== 'failed' && json.result[i].status !== 'finished')) {
                            json.result[i].can_stop = true;
                        }
                        else {
                            json.result[i].can_stop = false;
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
        return $.ajax({
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
                                json.result[key].status_text = jQuery.i18n.map["data-migration.status.finished"];
                            }
                            else {
                                json.result[key].status_text = jQuery.i18n.map["data-migration.status.progress"];
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
        $.ajax({
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
        $.ajax({
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
        $.ajax({
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
        $.ajax({
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
        $.ajax({
            type: "POST",
            url: countlyCommon.API_URL + "/i/datamigration/export",
            //dataType: 'application/json',
            data: exportData,
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

    countlyDataMigration.createToken = function(callback) {
        $.ajax({
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
        $.ajax({
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
        $.ajax({
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

    //return data that we have
    countlyDataMigration.getData = function() {
        return _data;
    };

    countlyDataMigration.getExportList = function() {
        return _export_list;
    };

    countlyDataMigration.getImportList = function() {
        return _import_list;
    };

}(window.countlyDataMigration = window.countlyDataMigration || {}, jQuery));