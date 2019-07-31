/*global countlyCommon, countlyGlobal, CountlyHelpers, jQuery, countlyDataMigration, app, countlyView, Handlebars, Dropzone, ActiveXObject, DataMigrationView, $*/
window.DataMigrationView = countlyView.extend({
    //need to provide at least empty initialize function
    //to prevent using default template
    initialize: function() {},
    beforeRender: function() {
        //then lets initialize our mode
        if (this.template) {
            return $.when(countlyDataMigration.initialize()).then(function() {});
        }
        else {
            //else let's fetch our template and initialize our mode in paralel
            var self = this;
            return $.when($.get(countlyGlobal.path + '/data_migration/templates/default.html', function(src) {
                //precompiled our template
                self.template_src = src;
                self.template = Handlebars.compile(src);
            }), countlyDataMigration.initialize(), countlyDataMigration.loadExportList(), countlyDataMigration.loadImportList(),
            $.get(countlyGlobal.path + '/data_migration/templates/export_drawer.html', function(src) {
                self.export_drawer = Handlebars.compile(src);
            }),
            $.get(countlyGlobal.path + '/data_migration/templates/import_drawer.html', function(src) {
                self.import_drawer = Handlebars.compile(src);
            })

            ).then(function() {});
        }
    },
    check_ext: function(file) {
        var ee = file.split('.');
        if (ee.length === 2) {
            if (ee[1] === 'tgz') {
                return true;
            }
        }
        else if (ee.length === 3 && ee[1] === 'tar' && ee[2] === 'gz') {
            return true;
        }
        CountlyHelpers.alert(jQuery.i18n.map["data-migration.badformat"], "popStyleGreen", {title: jQuery.i18n.map["common.error"], image: "token-warning"});
        return false;
    },
    resizeFileUploadBox: function() {
        // Set file upload box size based on the drawer height
        var fileBoxHeight = $("#import-widget-drawer").height() - 300;
        $("#data-migration-import-via-file").height((fileBoxHeight < 180) ? 180 : fileBoxHeight);
    },
    //here we need to render our view
    renderCommon: function(isRefresh) {
        var self = this;
        this.templateData = {
            apps: countlyGlobal.apps,
            delete_log_text: jQuery.i18n.map["data-migration.delete-log"],
            downolad_log_text: jQuery.i18n.map["data-migration.download-log"],
            downolad_export_text: jQuery.i18n.map["data-migration.download-export"],
            resend_export_text: jQuery.i18n.map["data-migration.resend-export"],
            delete_export_text: jQuery.i18n.map["data-migration.delete-export"],
            stop_export_text: jQuery.i18n.map["data-migration.stop-export"],
            data_migration_exports: "",
            data_migration_imports: "",
            no_exports_text: jQuery.i18n.map["data-migration.no-exports"],
            no_imports_text: jQuery.i18n.map["data-migration.no-imports"],
            app_name_text: jQuery.i18n.map["data-migration.table.app-name"],
            step_text: jQuery.i18n.map["data-migration.table.step"],
            status_text: jQuery.i18n.map["data-migration.table.status"],
            last_update_text: jQuery.i18n.map["data-migration.table.last-update"]
        };
        this.configsData = countlyDataMigration.getData();
        if (this.configsData.fileSizeLimit) {
            this.configsData.fileSizeLimit = parseFloat(this.configsData.fileSizeLimit);
        }
        //get export list
        var exportlist = countlyDataMigration.getExportList();
        if (exportlist.result && exportlist.result === 'success') {
            this.templateData.data_migration_exports = exportlist.data;
        }
        //get import list
        var importlist = countlyDataMigration.getImportList();
        if (importlist.result && importlist.result === 'success') {
            this.templateData.data_migration_imports = importlist.data;
        }


        this.crash_symbolication = false;
        if (countlyGlobal.plugins && countlyGlobal.plugins.indexOf("crash_symbolication") > -1) {
            this.crash_symbolication = true;
        }

        this.explanations = {
            "You don't have any apps": "apps_not_found",
            "Please provide export ID": "exportid_not_provided",
            "You don't have any exports": "no_exports",
            "You don't have exported files on server": "export_files_missing",
            "Please provide at least one app id to export data": "no_app_ids",
            'Missing parameter "server_token"': "token_missing",
            'Missing parameter "server_address"': "address_missing",
            'Missing parameter "exportid"': "exportid_missing",
            'Invalid export ID': 'invalid-exportid',
            "You don't have any apps with given ids": "some_bad_ids",
            "Given app id is/are not valid": "invalid_app_id",
            "Already running exporting process": "existing_process",
            "Failed to generate export scripts": "failed-generate-scripts",
            "Export process stopped": "export_stopped",
            "Import file missing": "import-file-missing",
            "There is ongoing import process on target server with same apps. Clear out data on target server to start new import process.": "import-process-exist",
            "Invalid path. You have reached countly server, but it seems like data migration plugin is not enabled on it.": "invalid-server-path",
            "Target server address is not valid": "target-server-not-valid",
            "Connection is valid": "connection-is-valid",
            "Sending failed. Target server address is not valid": "target-server-not-valid",
            "You don't have any imports": "no-imports",
            "Export already failed": "export-already-failed",
            "Export already finished": "export-already-finished",
            "Data has already been sent": "export-already-sent"
        };
        $(this.el).html(this.template(this.templateData));

        if (!isRefresh) {
            //appends export drawer
            $(".widget").after(self.export_drawer);
            app.localize($("#export-widget-drawer"));
            self.create_export_tab();

            //appends import drawer
            $(".widget").after(self.import_drawer);
            app.localize($("#import-widget-drawer"));
            self.create_import_tab();

            //top button, open export drawer
            $("#show_data_export_form").on("click", function() {
                self.reset_export_tab();
                $("#import-export-button").removeClass("active");
                $("#import-export-button-menu").css('display', 'none');
                $(".cly-drawer").removeClass("open editing");
                $("#export-widget-drawer").addClass("open");
                $(".cly-drawer").find(".close").off("click").on("click", function() {
                    $(this).parents(".cly-drawer").removeClass("open");
                });
            });

            //top button, open import drawer
            $("#show_data_import_form").on("click", function() {
                $(".cly-drawer").removeClass("open editing");
                $("#import-export-button").removeClass("active");
                $("#import-export-button-menu").css('display', 'none');
                $("#import-widget-drawer").addClass("open");

                self.resizeFileUploadBox();

                $(".cly-drawer").find(".close").off("click").on("click", function() {

                    if ($('#data_migration_generated_token').hasClass('newTokenIsGenerated')) {
                        CountlyHelpers.confirm(jQuery.i18n.map["data-migration.close-without-copy"], "popStyleGreen", function(result) {
                            if (!result) {
                                return true;
                            }
                            $("#import-widget-drawer").removeClass("open");
                            self.reset_import_tab();
                        }, [jQuery.i18n.map["data-migration.cancel"], jQuery.i18n.map['data-migration.continue-and-close']], {title: jQuery.i18n.map["data-migration.close-confirm-title"], image: "token-warning"});
                    }
                    else {
                        self.reset_import_tab();
                        $(this).parents(".cly-drawer").removeClass("open");
                    }
                });
            });
        }
        $("#tabs").tabs();


        //export list - resend export button
        $('#data_migration_exports').on('click', '.resend_export', function() {
            self.reset_export_tab();
            $('#migrate_server_token').val($(this).attr('data-server-token'));
            $('#migrate_server_address').val($(this).attr('data-server-address'));

            var myapps = $(this).attr('data-apps').split(",");
            var selected_apps = [];
            for (var i = 0; i < myapps.length; i++) {
                selected_apps.push({value: myapps[i], name: countlyGlobal.apps[myapps[i]].name});
            }

            $("#multi-app-dropdown").clyMultiSelectSetSelection(selected_apps);
            $("#multi-app-dropdown").addClass("disabled");

            $("#export_data_button").css('display', 'none');
            $("#export-type-section").css('display', 'none');
            $("#migration_aditional_files").parent().parent().css('display', 'none');
            $("#export_path").css('display', 'none');
            $("#send_export_button").css('display', 'block');
            $("#target-server-data").css('display', 'block');
            $("#target-server-data").addClass('disabled');
            $("#resend_export_id").val($(this).attr('data-id'));
            $("#export-widget-drawer").trigger("data-updated");
            $("#export-widget-drawer").addClass("open");
            $(".cly-drawer").find(".close").off("click").on("click", function() {
                $("#export-widget-drawer").removeClass("open");
            });
        });

        //Stop export click(in list)
        $('#data_migration_exports').on('click', '.stop_export', function() {
            var overlay = $("#overlay").clone();
            $("body").append(overlay);
            overlay.show();

            $.when(countlyDataMigration.stopExport($(this).attr('data'), function(result) {
                overlay.hide();
                if (result && result.result === 'success') {
                    if (result.data && self.explanations[result.data]) {
                        var msg = {title: jQuery.i18n.map["common.success"], message: self.get_translation(result.data), info: "", sticky: false, clearAll: true, type: "info"};
                        CountlyHelpers.notify(msg);
                    }
                }
                else if (result && result.result === 'error') {
                    var resp = self.get_response_text(result.data.xhr, result.data.status, result.data.error);
                    CountlyHelpers.alert(self.get_translation(resp), "red");
                }
                self.load_export_list();
            }));
        });

        //delete export click(in list)
        $('#data_migration_exports').on('click', '.delete_export', function() {
            var myid = $(this).attr('data');
            CountlyHelpers.confirm(jQuery.i18n.map["data-migration.delete-export-confirm"], "popStyleGreen", function(result) {
                if (!result) {
                    return true;
                }
                var overlay = $("#overlay").clone();
                $("body").append(overlay);
                overlay.show();

                $.when(countlyDataMigration.deleteExport(myid, function(resultReturn) {
                    overlay.hide();
                    if (resultReturn && resultReturn.result === 'error') {
                        var resp = self.get_response_text(resultReturn.data.xhr, resultReturn.data.status, resultReturn.data.error);
                        CountlyHelpers.alert(self.get_translation(resp), "red");
                    }
                    self.load_export_list();
                }));
            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["data-migration.yes-delete-export"]], {title: jQuery.i18n.map["data-migration.delete-export"] + "?", image: "delete-exports"});
        });

        //delete import list(in my import list)
        $('#data_migration_imports').on('click', '.delete_import', function() {
            var myid = $(this).attr('data');
            CountlyHelpers.confirm(jQuery.i18n.map["data-migration.delete-import-confirm"], "popStyleGreen", function(result) {
                if (!result) {
                    return true;
                }
                var overlay = $("#overlay").clone();
                $("body").append(overlay);
                overlay.show();

                $.when(countlyDataMigration.deleteImport(myid, function(resultReturn) {
                    overlay.hide();
                    if (resultReturn && resultReturn.result === 'error') {
                        var resp = self.get_response_text(resultReturn.data.xhr, resultReturn.data.status, resultReturn.data.error);
                        CountlyHelpers.alert(self.get_translation(resp), "red");
                    }
                    self.load_import_list();
                }));
            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["data-migration.yes-delete-export"]], {title: jQuery.i18n.map["data-migration.delete-export"] + "?", image: "delete-exports"});
        });

        $(window).click(function() {
            $(".options-item").find(".edit").next(".edit-menu").fadeOut();
            $("#import-export-button").removeClass("active");
            $("#import-export-button-menu").css('display', 'none');
        });

        $("body").on("click", ".options-item .edit", function(e) {
            e.stopPropagation();
            if ($(this).attr('id') !== 'import-export-button') {
                var self1 = $(this).next(".edit-menu").attr('data');

                $('.edit-menu').each(function() {
                    if ($(this).attr('data') === self1 || $(this).css('display') === 'block') {
                        $(this).fadeToggle();
                    }
                });
                $("#import-export-button").removeClass("active");
                $("#import-export-button-menu").css('display', 'none');
            }
        });
        $("#tabs a").click(function() {
            $(".options-item").find(".edit").next(".edit-menu").fadeOut();
            $("#import-export-button").removeClass("active");
            $("#import-export-button-menu").css('display', 'none');
        });
        $("#import-export-button").click(function(e) {
            e.stopPropagation();
            $('.edit-menu').css('display', 'none');
            if ($(this).hasClass("active")) {
                $(this).removeClass("active");
                $("#import-export-button-menu").hide();
            }
            else {
                $(this).addClass("active");
                $("#import-export-button-menu").show();
            }
        });
    },
    create_export_tab: function() {
        var self = this;
        var apps = [];
        for (var appId in countlyGlobal.apps) {
            apps.push({value: appId, name: countlyGlobal.apps[appId].name});
        }

        $("#multi-app-dropdown").clyMultiSelectSetItems(apps);
        $("#multi-app-dropdown").on("cly-multi-select-change", function() {
            $("#export-widget-drawer").trigger("data-updated");
        });
        $('#migrate_server_address').on("keyup", function() {
            $("#export-widget-drawer").trigger("data-updated");
        });
        $('#migrate_server_token').on("keyup", function() {
            $("#export-widget-drawer").trigger("data-updated");
        });

        $("#data-export-type-selector").off("click").on("click", ".check", function() {
            $("#data-export-type-selector").find(".check").removeClass("selected");
            $(this).addClass("selected");

            if ($(this).attr('data-from') === 'export-transfer') {
                $('#target-server-data').css('display', 'block');
                $('#migration_redirect_traffic').parent().parent().css('display', 'table-row');
            }
            else {
                $('#target-server-data').css('display', 'none');
                $('#migration_redirect_traffic').parent().parent().css('display', 'none');//hide row
                $('#migration_redirect_traffic').removeClass("fa-check-square");
                $('#migration_redirect_traffic').addClass("fa-square-o");
            }
            $("#export-widget-drawer").trigger("data-updated");
        });

        $("#export-widget-drawer .check-green").on("click", function() {
            var isChecked = $(this).hasClass("fa-check-square");//is now checked
            if (isChecked) {
                $(this).addClass("fa-square-o");
                $(this).removeClass("fa-check-square");
            }
            else {
                $(this).removeClass("fa-square-o");
                $(this).addClass("fa-check-square");
            }
        });

        $("#export-widget-drawer").on("data-updated", function() {
            var download_me = ($("#data-export-type-selector").find(".check.selected").data("from") === "export-download");
            var applist = $("#multi-app-dropdown").clyMultiSelectGetSelection();

            if ($('#migrate_server_address').val() !== '' && $('#migrate_server_token').val() !== '') {
                $("#test_connection_button").css('visibility', 'visible');
            }
            else {
                $("#test_connection_button").css('visibility', 'hidden');
            }

            if (applist && applist.length > 0 && (download_me || ($('#migrate_server_address').val() !== '' && $('#migrate_server_token').val() !== ''))) {
                $("#export_data_button").removeClass("disabled");
            }
            else {
                $("#export_data_button").addClass("disabled");
            }

            if ($("#resend_export_id").val() !== "" && $('#migrate_server_address').val() !== '' && $('#migrate_server_token').val() !== '') {
                $("#send_export_button").removeClass("disabled");
            }
            else {
                $("#send_export_button").addClass("disabled");
            }
        });

        $("#export_data_button").click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            $("#export_data_form .symbol-api-key").val(countlyGlobal.member.api_key);
            $("#export_data_form .symbol-app-id").val(countlyCommon.ACTIVE_APP_ID);
            var overlay = $("#overlay").clone();
            $("body").append(overlay);
            overlay.show();

            $('#export_data_form').ajaxSubmit({
                beforeSubmit: function(formData) {
                    var applist = $("#multi-app-dropdown").clyMultiSelectGetSelection();
                    var download_me = ($("#data-export-type-selector").find(".check.selected").data("from") === "export-download");

                    if (download_me) {
                        formData.push({ name: 'only_export', value: '1' });
                    }
                    else {
                        formData.push({ name: 'only_export', value: '' });
                    }
                    var isChecked = $("#migration_aditional_files").hasClass("fa-check-square");//is now checked
                    if (isChecked) {
                        formData.push({name: 'aditional_files', value: '1'});
                    }
                    isChecked = $("#migration_redirect_traffic").hasClass("fa-check-square");//is now checked
                    if (isChecked) {
                        formData.push({name: 'redirect_traffic', value: '1'});
                    }

                    formData.push({ name: 'apps', value: applist.join() });
                },
                success: function() {
                    overlay.hide();
                    self.load_export_list();
                    setTimeout(self.load_export_list(), 1000);
                    $("#export-widget-drawer").removeClass("open");
                    $("#tabs ul li a[href='#data_migration_exports']").trigger('click');

                    var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["data-migration.export-started"], sticky: false, clearAll: true, type: "info"};
                    CountlyHelpers.notify(msg);
                },
                error: function(xhr, status, error) {
                    overlay.hide();
                    var resp = self.get_response_text(xhr, status, error);
                    var splitted = resp.split(':');

                    if (jQuery.i18n.map["data-migration." + resp]) {
                        CountlyHelpers.alert(jQuery.i18n.map["data-migration." + resp], "red");
                    }
                    else if (splitted.length > 1 && jQuery.i18n.map["data-migration." + splitted[0]]) {
                        CountlyHelpers.alert(jQuery.i18n.map["data-migration." + splitted[0]] + "" + splitted[1], "red");
                    }
                    else {
                        CountlyHelpers.alert(resp, "red");
                    }
                    self.load_export_list();
                    setTimeout(self.load_export_list(), 1000);
                }
            });

        });

        $('#test_connection_button').click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            var overlay = $("#overlay").clone();
            $("body").append(overlay);
            overlay.show();

            $.when(countlyDataMigration.testConnection($('#migrate_server_token').val(), $('#migrate_server_address').val(), function(result) {
                overlay.hide();
                if (result && result.result === 'success') {
                    var mm = result.data;
                    if (self.explanations[result.data]) {
                        mm = self.get_translation(result.data);
                    }

                    var msg = {title: jQuery.i18n.map["common.success"], message: mm, info: "", sticky: false, clearAll: true, type: "info"};
                    CountlyHelpers.notify(msg);
                }
                else if (result && result.result === 'error') {
                    var resp = self.get_response_text(result.data.xhr, result.data.status, result.data.error);
                    resp = self.get_translation(resp);
                    if (resp !== "") {
                        CountlyHelpers.alert(resp, "red");
                    }
                    else {
                        CountlyHelpers.alert(jQuery.i18n.map["common.error"], "red");
                    }

                }
            }));
        });

        //SEND EXPORT
        $("#send_export_button").click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            var overlay = $("#overlay").clone();
            $("body").append(overlay);
            overlay.show();
            var redir_me = '';
            var isChecked = $("#migration_redirect_traffic").hasClass("fa-check-square");//is now checked
            if (isChecked) {
                redir_me = '1';
            }
            $.when(countlyDataMigration.sendExport($('#resend_export_id').val(), $('#migrate_server_token').val(), $('#migrate_server_address').val(), redir_me, function(result) {
                overlay.hide();
                if (result && result.result === 'success') {
                    if (self.explanations[result.data]) {
                        var msg = {title: jQuery.i18n.map["common.success"], message: self.get_translation(result.data), info: "", sticky: false, clearAll: true, type: "info"};
                        CountlyHelpers.notify(msg);
                    }
                    $("#export-widget-drawer").removeClass("open");
                    $("#tabs ul li a[href='#data_migration_exports']").trigger('click');
                }
                else if (result && result.result === 'error') {
                    var resp = self.get_response_text(result.data.xhr, result.data.status, result.data.error);
                    CountlyHelpers.alert(self.get_translation(resp), "red");
                }
                self.load_export_list();
            }));
        });
    },
    create_import_tab: function() {
        var self = this;
        $('#migration_address_copyboard').attr("data", window.location.protocol + '//' + window.location.hostname);
        $('#migration_address_copyboard2').attr("data", window.location.protocol + '//' + window.location.hostname);
        $('#migration_address_copyboard input').first().val(window.location.protocol + '//' + window.location.hostname);
        $('#migration_address_copyboard2 input').first().val(window.location.protocol + '//' + window.location.hostname);

        //file oploader
        this.myDropzone = new Dropzone("#data-migration-import-via-file", {
            url: '/',
            autoQueue: false,
            param_name: "new_plugin_input",
            parallelUploads: 0,
            maxFiles: 1,
            addedfile: function(file) {
                if (self.check_ext(file.name)) {
                    var iSize = 0;
                    if ($.browser.msie) {
                        var objFSO = new ActiveXObject("Scripting.FileSystemObject");
                        var sPath = file.value;
                        var objFile = objFSO.getFile(sPath);
                        iSize = objFile.size;
                        iSize = iSize / 1024;
                    }
                    else {
                        iSize = (file.size / 1024);
                    }

                    if (self.configsData && self.configsData.fileSizeLimit && self.configsData.fileSizeLimit > 0 && iSize > self.configsData.fileSizeLimit) {
                        CountlyHelpers.alert(jQuery.i18n.map["data-migration.file-to-big-warning"], "red");
                    }
                    self.myDropzone.disable();
                    $('#data-migration-import-via-file').removeClass('file-hovered');
                    $('#data-migration-import-via-file').addClass('file-selected');
                    $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">' + countlyCommon.encodeHtml(file.name) + '</p><p class="remove" id="remove-files"><i class="fa fa-trash"  aria-hidden="true"></i> ' + jQuery.i18n.map["plugin-upload.remove"] + '</p></div>');
                    $('#import_data_button').removeClass('disabled');
                }
            },
            dragover: function() {
                $('#data-migration-import-via-file').addClass('file-hovered');
            },
            dragleave: function() {
                $('#data-migration-import-via-file').removeClass('file-hovered');
            }
        });

        $(window).on('resize', function() {
            self.resizeFileUploadBox();
        });

        $("#migration_upload_fallback").change(function() {
            var pp = $(this).val().split('\\');
            if (self.check_ext(pp[pp.length - 1])) {
                $('#data-migration-import-via-file').addClass('file-selected');
                $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">' + $(this).val() + '</p></div>');

                $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">' + pp[pp.length - 1] + '</p><p class="remove" id="remove-files"><i class="fa fa-trash"  aria-hidden="true"></i> ' + jQuery.i18n.map["plugin-upload.remove"] + '</p></div>');
                $('#import_data_button').removeClass('disabled');
            }
        });

        $('.dz-filechosen').on('click', function(e) {
            if (e.target.id === 'remove-files') {
                $('#data-migration-import-via-file').removeClass('file-selected');
                $('.dz-filechosen').html('');
                if (typeof $("#migration_upload_fallback") !== 'undefined') {
                    $("#migration_upload_fallback").replaceWith($("#migration_upload_fallback").val('').clone(true));
                }
                $('#import_data_button').addClass('disabled');
                if ($('.fallback').length === 0) {
                    self.myDropzone.removeAllFiles(); self.myDropzone.enable();
                }

            }
        });

        $('#migrate_server_address').on("keyup", function() {
            $("#import-widget-drawer").trigger("data-updated");
        });
        $('#migrate_server_token').on("keyup", function() {
            $("#import-widget-drawer").trigger("data-updated");
        });

        $("#data-import-type-selector").off("click").on("click", ".check", function() {
            $("#data-import-type-selector").find(".check").removeClass("selected");
            $(this).addClass("selected");

            if ($(this).attr('data-from') === 'import-upload') {
                $('#import-via-file').css('display', 'block');
                $('#import-via-token').css('display', 'none');
                $('#import_data_button').css('display', 'block');
                $('#create_new_token').css('display', 'none');
            }
            else {
                $('#import-via-file').css('display', 'none');
                $('#import-via-token').css('display', 'block');
                $('#import_data_button').css('display', 'none');
                $('#create_new_token').css('display', 'block');
            }
            $("import-widget-drawer").trigger("data-updated");
        });

        $("#import-widget-drawer").on("data-updated", function() {
            var download_me = ($("#data-export-type-selector").find(".check.selected").data("from") === "export-download");
            var applist = $("#multi-app-dropdown").clyMultiSelectGetSelection();

            if (applist && applist.length > 0 && (download_me || ($('#migrate_server_address').val() !== '' && $('#migrate_server_token').val() !== ''))) {
                $("#export_data_button").removeClass("disabled");
            }
            else {
                $("#export_data_button").addClass("disabled");
            }
        });

        $("#create_new_token").click(function() {
            var overlay = $("#overlay").clone();
            $("body").append(overlay);
            overlay.show();

            var msg = {title: jQuery.i18n.map["data-migration.please-wait"], message: jQuery.i18n.map["data-migration.creating-new-token"], sticky: false};
            CountlyHelpers.notify(msg);

            $.when(countlyDataMigration.createToken(function(result) {
                overlay.hide();
                if (result && result.result === 'success') {
                    var mytoken = result.data;
                    $("#import-widget-drawer .details .section").css('display', 'none');
                    $("#import-widget-drawer .details .buttons").css('display', 'none');

                    $('#migration_token_copyboard').attr("data", mytoken);
                    $('#migration_token_copyboard input').first().val(mytoken);
                    $('#data_migration_generated_token').addClass('newTokenIsGenerated');


                    $('#create_new_token').css('display', 'none');
                    $('#data_migration_generated_token').css('display', 'block');
                    var msg1 = {title: jQuery.i18n.map["data-migration.complete"], message: jQuery.i18n.map["data-migration.new-token-created"], sticky: false, clearAll: true};
                    CountlyHelpers.notify(msg1);
                }
                else if (result && result.result === 'error') {
                    var resp = self.get_response_text(result.data.xhr, result.data.status, result.data.error);
                    resp = self.get_translation(resp);
                    var msg2 = {title: jQuery.i18n.map["data-migration.error"], message: jQuery.i18n.map["data-migration.unable-create-token"], info: resp, sticky: true, clearAll: true, type: "error"};
                    CountlyHelpers.notify(msg2);
                }

            }));
        });

        $('.migration_copyboard').click(function() {
            $(this).find('input').first().select();
            document.execCommand("copy");

            var msg = jQuery.i18n.map["data-migration.address-coppied-in-clipboard"];
            if ($(this).attr('id') === "migration_token_copyboard") {
                msg = jQuery.i18n.map["data-migration.tokken-coppied-in-clipboard"];
                $('#data_migration_generated_token').removeClass('newTokenIsGenerated');
            }
            msg = {title: msg, sticky: false, clearAll: true};
            CountlyHelpers.notify(msg);
        });
        $("#create_another_token").click(function() {
            if ($('#data_migration_generated_token').hasClass('newTokenIsGenerated')) {

                CountlyHelpers.confirm(jQuery.i18n.map["data-migration.close-without-copy"], "popStyleGreen", function(result) {
                    if (!result) {
                        return true;
                    }
                    $('#data_migration_generated_token').removeClass('newTokenIsGenerated');
                    $('#create_new_token').css('display', 'block');
                    $('#data_migration_generated_token').css('display', 'none');
                    $("#import-via-token").css('display', 'block');
                }, [jQuery.i18n.map["data-migration.cancel"], jQuery.i18n.map['data-migration.continue-and-close']], {title: jQuery.i18n.map["data-migration.close-confirm-title"], image: "token-warning"});

            }
            else {
                $('#create_new_token').css('display', 'block');
                $('#data_migration_generated_token').css('display', 'none');
                $("#import-via-token").css('display', 'block');
            }

        });

        $("#import_data_button").click(function() {
            if (!$(this).hasClass("disabled")) {
                $("#import_data_form .symbol-app-id").val(countlyCommon.ACTIVE_APP_ID);
                $(this).addClass("disabled");
                var overlay = $("#overlay").clone();
                $("body").append(overlay);
                overlay.show();

                CountlyHelpers.notify({title: jQuery.i18n.map["common.success"], message: "Uploading file....", sticky: true});
                $('#import_data_form').ajaxSubmit({
                    beforeSubmit: function(formData) {
                        if (self.myDropzone && self.myDropzone.files && self.myDropzone.files.length > 0) {
                            formData.push({ name: 'import_file', value: self.myDropzone.files[self.myDropzone.files.length - 1] });
                        }
                    },
                    success: function(result) {
                        overlay.hide();
                        if (result.result) {
                            var msg = {title: jQuery.i18n.map["common.success"], message: result.result, sticky: false};
                            if (result.result.substr(0, 26) === 'Importing process started.') {
                                msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["data-migration.import-started"], sticky: false, clearAll: true};

                                $("#import-widget-drawer").removeClass("open");
                                $("#tabs ul li a[href='#data_migration_imports']").trigger('click');
                                self.load_import_list();
                            }
                            CountlyHelpers.notify(msg);
                        }
                    },
                    error: function(xhr, status, error) {
                        var resp = self.get_response_text(xhr, status, error);
                        resp = self.get_translation(resp);
                        var msg = {title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["systemlogs.action.import_failed"], sticky: false, clearAll: true, type: "error"};
                        CountlyHelpers.notify(msg);
                        if (resp === "") {
                            CountlyHelpers.alert(jQuery.i18n.map["systemlogs.action.import_failed"], "red");
                        }
                        else if (resp === "Request Entity Too Large") {
                            CountlyHelpers.alert(jQuery.i18n.map["data-migration.file-to-big-error"], "red");
                        }
                        else {
                            CountlyHelpers.alert(resp, "red");
                        }
                        overlay.hide();
                    }
                });
            }
        });


    },
    reset_export_tab: function() {
        $("#multi-app-dropdown").removeClass("disabled");
        $("#export_data_button").css('display', 'block');
        $("#export-type-section").css('display', 'block');
        $("#send_export_button").css('display', 'none');
        $("#export_path").css('display', 'block');
        $("#test_connection_button").css('visibility', 'hidden');

        if (this.crash_symbolication === true) {
            $("#migration_aditional_files").parent().parent().css('display', 'table-row');
        }
        else {
            $("#migration_aditional_files").parent().parent().css('display', 'none');
        }

        if (this.configsData.def_path) {
            $('#dif_target_path').val(this.configsData.def_path);
        }
        else {
            $('#dif_target_path').val("");
        }

        $('#migrate_server_token').val("");
        $('#migrate_server_address').val("");
        $('#connection_test_result').html("");
        $("#export-widget-drawer").trigger("data-updated");

        $('#migration_redirect_traffic').removeClass("fa-check-square");
        $('#migration_redirect_traffic').addClass("fa-square-o");
        $('#migration_aditional_files').removeClass("fa-check-square");
        $('#migration_aditional_files').addClass("fa-square-o");

        $('#migration_redirect_traffic').parent().parent().css('display', 'table-row');

        $('#target-server-data').css('display', 'block');
        $('#data-export-type-selector').find(".check[data-from=export-transfer]").addClass("selected");
        $('#data-export-type-selector').find(".check[data-from=export-download]").removeClass("selected");

        $('#multi-app-dropdown').clyMultiSelectClearSelection();
        var apps = [];
        for (var appId in countlyGlobal.apps) {
            apps.push({value: appId, name: countlyGlobal.apps[appId].name});
        }
        $("#multi-app-dropdown").clyMultiSelectSetItems(apps);
    },
    reset_import_tab: function() {
        $("#import-widget-drawer .details .section").css('display', 'block');
        $("#import-widget-drawer .details .buttons").css('display', 'block');
        $("#import-via-token").css('display', 'none');
        $("#create_new_token").css('display', 'none');
        $("#data_migration_generated_token").css('display', 'none');
        $('#import_data_button').addClass('disabled');
        $('#import_data_button').css('display', 'block');

        $('#target-server-data').css('display', 'block');
        $('#data-import-type-selector').find(".check[data-from=import-upload]").addClass("selected");
        $('#data-import-type-selector').find(".check[data-from=import-token]").removeClass("selected");

        $('#data-migration-import-via-file').removeClass('file-selected');
        $('.dz-filechosen').html('');
        if (typeof $("#migration_upload_fallback") !== 'undefined') {
            $("#migration_upload_fallback").replaceWith($("#migration_upload_fallback").val('').clone(true));
        }
        $('#import_data_button').addClass('disabled');
        if ($('.fallback').length === 0) {
            this.myDropzone.removeAllFiles(); this.myDropzone.enable();
        }
    },
    get_response_text: function(xhr, status, error) {
        var resp;
        if (xhr.responseText) {
            try {
                resp = JSON.parse(xhr.responseText);
                if (resp && resp.result) {
                    resp = resp.result;
                }
                else {
                    resp = null;
                }
            }
            catch (ex) {
                resp = null;
            }
        }
        if (!resp) {
            resp = error;
        }
        return resp;
    },
    get_translation: function(msg) {
        if (this.explanations && this.explanations[msg] && jQuery.i18n.map["data-migration." + this.explanations[msg]]) {
            return jQuery.i18n.map["data-migration." + this.explanations[msg]];
        }
        else {
            return msg;
        }
    },
    load_export_list: function(refresh) {
        var self = this;
        $.when(countlyDataMigration.loadExportList()).then(function() {
            var result = countlyDataMigration.getExportList();
            if (result && result.result === 'success') {
                self.templateData.data_migration_exports = result.data;
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                if (!refresh) {
                    $(self.el).find('#my_exports_list').replaceWith(newPage.find('#my_exports_list'));
                }
                else {
                    for (var i = 0; i < result.data.length; i++) {
                        var el = $(self.el).find('#my_exports_list #exportrow_' + result.data[i]._id);
                        if (el) {
                            var menu = $(el).find('.edit-menu').first();
                            if (!($(menu).css('display') === 'block')) {
                                $(el).replaceWith(newPage.find('#my_exports_list #exportrow_' + result.data[i]._id));
                            }
                        }
                        else {
                            $(self.el).find('#migration_exports').append(newPage.find('#my_exports_list #exportrow_' + result.data[i]._id));
                        }
                    }
                }
            }
            else if (result && result.result === 'error') {
                var resp = self.get_response_text(result.data.xhr, result.data.status, result.data.error);
                CountlyHelpers.alert(self.get_translation(resp), "red");
            }
        });
    },
    load_import_list: function(refresh) {
        var self = this;

        $.when(countlyDataMigration.loadImportList()).then(function() {
            var result = countlyDataMigration.getImportList();
            if (result && result.result === 'success') {
                self.templateData.data_migration_imports = result.data;
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                if (!refresh) {
                    $(self.el).find('#my_imports_list').replaceWith(newPage.find('#my_imports_list'));
                }
                else {
                    for (var i = 0; i < result.data.length; i++) {
                        var el = $(self.el).find('#my_imports_list #importrow_' + result.data[i].key).first();
                        if (el) {
                            var menu = $(el).find('.edit-menu').first();
                            if (!($(menu).css('display') === 'block')) {
                                $(el).replaceWith(newPage.find('#my_imports_list #importrow_' + result.data[i].key));
                            }
                        }
                        else {
                            $(self.el).find('#migration_imports').append(newPage.find('#my_imports_list #importrow_' + result.data[i].key));
                        }
                    }
                }
            }
            else if (result && result.result === 'error') {
                var resp = self.get_response_text(result.data.xhr, result.data.status, result.data.error);
                CountlyHelpers.alert(self.get_translation(resp), "red");
            }
        });
    },
    refresh: function() {
        this.load_import_list(true); this.load_export_list(true);
    }
});

//create view
app.DataMigrationView = new DataMigrationView();



if (countlyGlobal.member.global_admin) {
    //register route
    app.route('/manage/data-migration', 'datamigration', function() {
        this.renderWhenReady(this.DataMigrationView);
    });

    //add app setting for redirect
    app.addAppSetting("redirect_url", {
        toDisplay: function(appId, elem) {
            var vall = countlyGlobal.apps[appId].redirect_url || "";
            $(elem).text(vall);
        },
        toInput: function(appId, elem) {
            var val = countlyGlobal.apps[appId].redirect_url || "";
            $(elem).val(val);
            if (val !== "") {
                $(elem).parent().parent().parent().css('display', 'table-row');
                $(elem).parent().find('.hint').html(val);
            }
            else {
                $(elem).parent().parent().parent().css('display', 'none');
            }
        },
        toSave: function(appId, args, elem) {
            if ($(elem).is(":checked")) {
                args.redirect_url = "";
            }
        },
        toInject: function() {
            var editApp = '<tr class="help-zone-vs" data-help-localize="manage-apps.redirect_url">' +
                '<td>' +
                    '<span data-localize="management-applications.redirect_url"></span>' +
                '</td>' +
                '<td>' +
                    '<div class="read app-read-settings" data-id="redirect_url"></div>' +
                    '<div class="edit">' +
                        '<input type="checkbox" value="1" class="app-write-settings migration-green-checkbox" data-id="redirect_url" data-localize="placeholder.redirect_url"/>' + '<span data-localize="management-applications.table.remove_redirect" >Remove redirect</span>' +
                        '<div class="hint">' + '</div>' +
                    '</div>' +
                '</td>' +
            '</tr>';

            $(".app-details table .table-edit").before(editApp);
        }
    });

    $(document).ready(function() {
        //Adding as menu item : Managment>Data migration. Before help toggle button.
        if (countlyGlobal.member.global_admin) {
            app.addMenu("management", {code: "data-migration", url: "#/manage/data-migration", text: "data-migration.page-title", icon: '<div class="logo-icon fa fa-arrows-alt-h"></div>', priority: 90});
        }
        var curapp = countlyCommon.ACTIVE_APP_ID;
        if (curapp && countlyGlobal.apps[curapp] && countlyGlobal.apps[curapp].redirect_url && countlyGlobal.apps[curapp].redirect_url !== "") {
            var mm = jQuery.i18n.map["data-migration.app-redirected-explanation"] + countlyGlobal.apps[curapp].redirect_url;
            var msg = {
                title: jQuery.i18n.map["data-migration.app-redirected"].replace('{app_name}', countlyGlobal.apps[curapp].name),
                message: mm,
                info: jQuery.i18n.map["data-migration.app-redirected-remove"],
                sticky: true,
                clearAll: true,
                type: "warning",
                onClick: function() {
                    app.navigate("#/manage/apps", true);
                }
            };
            CountlyHelpers.notify(msg);
        }
    });

    //switching apps. show message if redirect url is set
    app.addAppSwitchCallback(function(appId) {
        if (appId && countlyGlobal.apps[appId] && countlyGlobal.apps[appId].redirect_url && countlyGlobal.apps[appId].redirect_url !== "") {
            var mm = jQuery.i18n.map["data-migration.app-redirected-explanation"] + countlyGlobal.apps[appId].redirect_url;
            var msg = {
                title: jQuery.i18n.map["data-migration.app-redirected"].replace('{app_name}', countlyGlobal.apps[appId].name),
                message: mm,
                info: jQuery.i18n.map["data-migration.app-redirected-remove"],
                sticky: true,
                clearAll: true,
                type: "warning",
                onClick: function() {
                    app.navigate("#/manage/apps", true);
                }
            };
            CountlyHelpers.notify(msg);
        }
    });
}