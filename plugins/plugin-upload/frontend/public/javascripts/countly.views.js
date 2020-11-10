/*global countlyView, CountlyHelpers,countlyGlobal, app, T, Dropzone, countlyCommon, jQuery, $, countlyAuth */
window.PluginUploadView = countlyView.extend({

    //need to provide at least empty initialize function
    //to prevent using default template
    initialize: function() {
        //we can initialize stuff here
    },
    beforeRender: function() {
    },
    //here we need to render our view
    renderCommon: function() {

    },

    //here we need to refresh data
    refresh: function() {}
});

/** Function checks file extension. Accept .zip, tar, .tgz, .tar.gz
* @param {string} file - filename
* @returns {boolean} true - if file vaild, false - if not.
*/
function check_ext(file) {
    var ee = file.split('.');
    var last = "";
    var plast = "";
    if (ee.length > 0) {
        last = ee[ee.length - 1];
    }
    if (ee.length > 1) {
        plast = ee[ee.length - 2];
    }
    if (last === 'tar' || last === 'zip' || last === 'tgz') {
        return true;
    }
    else if (plast === 'tar' && last === 'gz') {
        return true;
    }
    CountlyHelpers.alert(jQuery.i18n.map["plugin-upload.badformat"], "popStyleGreen", {title: jQuery.i18n.map["common.error"], image: "token-warning"});
    return false;
}

/**Function highlights plugin in plugin list. Used after uploading plugin.
* @param {string} myname - plugin name
*/
function highlight_my_uploaded_plugin(myname) { //sometimes it gets called a litle bit too soon. 
    if ($(myname)) {
        $(myname).parent().parent().parent().css('background-color', '#baffac');
        $('html,body').scrollTop($(myname).parent().offset().top - 200);
    }
    else {
        setTimeout(highlight_my_uploaded_plugin(myname), 500);
    }
}

if (countlyAuth.validateCreate("global_plugin-upload")) {
    var myDropzone;

    app.addPageScript("/manage/plugins", function() {
        $(document).ready(function() { //creates upload form
            if (countlyAuth.validateCreate('global_plugin-upload')) {
                return false;
            }
            $.when(T.render('/plugin-upload/templates/drawer.html', function(src) {
                //create button
                $(".widget .widget-header .left").after('<a style="float: right; margin-top: 6px;" class="icon-button green" id="show-plugin-upload" data-localize="plugin-upload.add-plugin">' + jQuery.i18n.map["plugin-upload.add-plugin"] + '</a>');

                self.plugin_upload_drawer = CountlyHelpers.createDrawer({
                    id: "plugin-upload-widget-drawer",
                    template: src,
                    title: jQuery.i18n.map["plugin-upload.upload-title"],
                });


                myDropzone = new Dropzone("#plugin-upload-drop", {
                    url: '/',
                    autoQueue: false,
                    param_name: "new_plugin_input",
                    parallelUploads: 0,
                    maxFiles: 1,
                    addedfile: function(file) {
                        if (check_ext(file.name)) {
                            myDropzone.disable();
                            $('#plugin-upload-drop').removeClass('file-hovered');
                            $('#plugin-upload-drop').addClass('file-selected');
                            $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">' + countlyCommon.encodeHtml(file.name) + '</p><p class="remove" id="remove-files"><i class="fa fa-trash"  aria-hidden="true"></i> ' + jQuery.i18n.map["plugin-upload.remove"] + '</p></div>');
                            $('#upload-new-plugin').removeClass('mydisabled');
                        }
                    },
                    dragover: function() {
                        $('#plugin-upload-drop').addClass('file-hovered');
                    },
                    dragleave: function() {
                        $('#plugin-upload-drop').removeClass('file-hovered');
                    }
                });

                $(window).on('resize', function() {
                    resizePluginUploadFileBox();
                });

                //pull out plugin-upload form
                $("#show-plugin-upload").on("click", function() {
                    resizePluginUploadFileBox();
                    self.plugin_upload_drawer.open();
                });
                /** function resizes upload box. */
                function resizePluginUploadFileBox() {
                    var newPluginUploadFileBoxHeight = $("#plugin-upload-widget-drawer").height() - 50;
                    $("#plugin-upload-drop").height((newPluginUploadFileBoxHeight < 180) ? 180 : newPluginUploadFileBoxHeight);
                }

                //fallback(if drag&drop not available)
                $("#new_plugin_input").change(function() {
                    var pp = $(this).val().split('\\');
                    if (check_ext(pp[pp.length - 1])) {

                        $('#plugin-upload-drop').addClass('file-selected');
                        $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">' + $(this).val() + '</p></div>');

                        $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">' + pp[pp.length - 1] + '</p><p class="remove" id="remove-files"><i class="fa fa-trash"  aria-hidden="true"></i> ' + jQuery.i18n.map["plugin-upload.remove"] + '</p></div>');
                        $('#upload-new-plugin').removeClass('mydisabled');
                    }
                });

                $('.dz-filechosen').on('click', function(e) {
                    if (e.target.id === 'remove-files') {
                        $('#plugin-upload-drop').removeClass('file-selected');
                        $('.dz-filechosen').html('');
                        if (typeof $("#new_plugin_input") !== 'undefined') {
                            $("#new_plugin_input").replaceWith($("#new_plugin_input").val('').clone(true));
                        }
                        $('#upload-new-plugin').addClass('mydisabled');

                        if ($('.fallback').length === 0) {
                            myDropzone.removeAllFiles(); myDropzone.enable();
                        }
                    }
                });


                $("#upload-new-plugin").click(function() {
                    if ($("#upload-new-plugin").hasClass("mydisabled")) {
                        return;
                    }

                    self.plugin_upload_drawer.close();
                    $("#plugin-upload-api-key").val(countlyGlobal.member.api_key);
                    $("#plugin-upload-app-id").val(countlyCommon.ACTIVE_APP_ID);

                    var overlay = $("#overlay").clone();
                    $("body").append(overlay);
                    overlay.show();

                    var msg1 = {title: jQuery.i18n.map["plugin-upload.processing"], message: jQuery.i18n.map["plugin-upload.saving-data"], sticky: true};
                    CountlyHelpers.notify(msg1);

                    //submiting form
                    $('#upload-plugin-form').ajaxSubmit({
                        beforeSubmit: function(formData) {
                            formData.push({ name: '_csrf', value: countlyGlobal.csrf_token });
                            if (myDropzone && myDropzone.files && myDropzone.files.length > 0) {
                                formData.push({ name: 'new_plugin_input', value: myDropzone.files[myDropzone.files.length - 1] });

                            }
                        },
                        success: function(result) {
                            overlay.hide();
                            var aa = result.split('.');
                            if (aa.length === 2 && aa[0] === 'Success') {
                                if (typeof $("#new_plugin_input") !== 'undefined') {
                                    $("#new_plugin_input").replaceWith($("#new_plugin_input").val('').clone(true));
                                }

                                if ($('.fallback').length === 0) {
                                    (myDropzone.enable());
                                }

                                $('#plugin-upload-drop').removeClass('file-selected');
                                $('.dz-filechosen').html('');
                                $('#upload-new-plugin').addClass('mydisabled');

                                $.when(app.pluginsView.refresh(true)).then(
                                    function() {
                                        var msg = {title: jQuery.i18n.map["plugin-upload.success"], message: jQuery.i18n.map["plugin-upload.success"], clearAll: true, sticky: true};
                                        CountlyHelpers.notify(msg);
                                        //highlight and scroll down
                                        highlight_my_uploaded_plugin('#plugin-' + aa[1]);
                                    }
                                );
                            }
                            else if (jQuery.i18n.map['plugin-upload.' + result] !== undefined) {
                                var msg2 = {title: jQuery.i18n.map["plugin-upload.error"], message: jQuery.i18n.map['plugin-upload.' + result], sticky: true, clearAll: true, type: "error"};
                                CountlyHelpers.notify(msg2);
                            }
                            else {
                                var msg3 = {title: jQuery.i18n.map["plugin-upload.error"], message: result, sticky: true, clearAll: true, type: "error"};
                                CountlyHelpers.notify(msg3);
                            }
                        },
                        error: function(xhr, status, error) {
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
                            if (resp === 'Request Entity Too Large') {
                                resp = jQuery.i18n.map["plugin-upload.toobig"];
                            }
                            var msg = {title: jQuery.i18n.map["plugin-upload.error"], message: resp, sticky: true, clearAll: true, type: "error"};
                            CountlyHelpers.notify(msg);
                            overlay.hide();
                        }
                    });
                });
            }));
        });
    });
}