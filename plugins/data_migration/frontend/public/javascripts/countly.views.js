window.DataMigrationView = countlyView.extend({
    //need to provide at least empty initialize function
    //to prevent using default template
    initialize:function (){},
    beforeRender: function() {
        if(this.template)
            //then lets initialize our mode
            return $.when(countlyDataMigration.initialize()).then(function () {});
        else {
            //else let's fetch our template and initialize our mode in paralel
            var self = this;
            return $.when($.get(countlyGlobal["path"]+'/data_migration/templates/default.html',   function(src){
                    //precompiled our template
                    self.template_src = src;
                    self.template = Handlebars.compile(src);
            }),countlyDataMigration.initialize(),countlyDataMigration.loadExportList(),countlyDataMigration.loadImportList(),
            $.get(countlyGlobal["path"]+'/data_migration/templates/export_drawer.html', function(src){
                self.export_drawer = Handlebars.compile(src);
            }),
            $.get(countlyGlobal["path"]+'/data_migration/templates/import_drawer.html', function(src){
                self.import_drawer = Handlebars.compile(src);
            })
            
            ).then(function () {});
        }
    },
    //here we need to render our view
    renderCommon:function (isRefresh) {
        var self = this;
        this.templateData={
            apps:countlyGlobal['apps'],
            delete_log_text:jQuery.i18n.map["data-migration.delete-log"],
            downolad_log_text:jQuery.i18n.map["data-migration.download-log"],
            downolad_export_text:jQuery.i18n.map["data-migration.download-export"],
            resend_export_text:jQuery.i18n.map["data-migration.resend-export"],
            delete_export_text:jQuery.i18n.map["data-migration.delete-export"],
            stop_export_text:jQuery.i18n.map["data-migration.stop-export"],
            data_migration_exports:"",
            data_migration_imports:"",
            no_exports_text:jQuery.i18n.map["data-migration.no-exports"],
            no_imports_text:jQuery.i18n.map["data-migration.no-imports"],
            app_name_text:jQuery.i18n.map["data-migration.table.app-name"],
            step_text:jQuery.i18n.map["data-migration.table.step"],
            status_text:jQuery.i18n.map["data-migration.table.status"],
            last_update_text:jQuery.i18n.map["data-migration.table.last-update"]
        };
        this.configsData = countlyDataMigration.getData();
        //get export list
        var exportlist = countlyDataMigration.getExportList();
        if(exportlist.result && exportlist.result=='success')
            this.templateData.data_migration_exports = exportlist.data;
        //get import list
        var importlist = countlyDataMigration.getImportList();
        if(importlist.result && importlist.result=='success')
            this.templateData.data_migration_imports = importlist.data;
        
        
        this.crash_symbolication = false;
        if(countlyGlobal['plugins'] && countlyGlobal['plugins'].indexOf("crash_symbolication")>-1)
        {
            this.crash_symbolication=true;
        }

        this.explanations={
            "You don't have any apps":"apps_not_found",
            "Please provide export ID":"exportid_not_provided",
            "You don't have any exports":"no_exports",
            "Invalid export ID":"export_not_found",
            "You don't have exported files on server":"export_files_missing",
            "Please provide at least one app id to export data":"no_app_ids",
            'Missing parameter "server_token"':"token_missing",
            'Missing parameter "server_address"':"address_missing",
            'Missing parameter "exportid"':"exportid_missing",
            'Invalid export ID':'invalid-exportid',
            "You don't have any apps with given ids":"some_bad_ids",
            "Given app id is/are not valid":"invalid_app_id",
            "Already running exporting process":"existing_process",
            "Failed to generate export scripts":"failed-generate-scripts",
            "Export process stopped":"export_stopped",
            "Import file missing":"import-file-missing",
            "There is ongoing import process on target server with same apps. Clear out data on target server to start new import process.":"import-process-exist",
            "Invalid path. You have reached countly server, but it seems like data migration plugin is not enabled on it.":"invalid-server-path",
            "Target server address is not valid":"target-server-not-valid",
            "Connection is valid":"connection-is-valid",
            "Sending failed. Target server address is not valid":"target-server-not-valid",
            "You don't have any imports":"no-imports",
            "You don't have any exports":"no-exports",
            "Export already failed":"export-already-failed",
            "Export already finished":"export-already-finished",
            "Export process stopped":"export-already-stopped",
            "Data has already been sent":"export-already-sent"
        }
        $(this.el).html(this.template(this.templateData));
        
        if(!isRefresh)
        {
            //appends export drawer
            $(".widget").after(self.export_drawer);
            app.localize( $("#export-widget-drawer")); 
            self.create_export_tab();
            
            //appends import drawer
            $(".widget").after(self.import_drawer);
            app.localize( $("#import-widget-drawer")); 
            self.create_import_tab();
            
            //top button, open export drawer
            $("#show_data_export_form").on("click", function () {
                self.reset_export_tab();
                $(".cly-drawer").removeClass("open editing");
                $("#export-widget-drawer").addClass("open");
                $(".cly-drawer").find(".close").off("click").on("click", function () {
                    $(this).parents(".cly-drawer").removeClass("open");
                });
            });
            
            //top button, open import drawer
            $("#show_data_import_form").on("click", function () {
                $(".cly-drawer").removeClass("open editing");
                $("#import-widget-drawer").addClass("open");
                $("#data-migration-import-via-file").height($("#import-widget-drawer").height()-300);
                $(".cly-drawer").find(".close").off("click").on("click", function () {
                   
                    if($('#data_migration_generated_token').hasClass('newTokenIsGenerated'))
                    {
                        CountlyHelpers.confirm(jQuery.i18n.map["data-migration.close-without-copy"], "red",function(result) {
                        if (!result) {return true;}
                        $("#import-widget-drawer").removeClass("open");
                        self.reset_import_tab();
                        },[jQuery.i18n.map["data-migration.cancel"],jQuery.i18n.map['data-migration.continue-and-close']]);
                    }
                    else
                    {
                        self.reset_import_tab();
                        $(this).parents(".cly-drawer").removeClass("open");
                    }
                });
            });
        }
        $( "#tabs" ).tabs();


        //export list - resend export button
        $('#data_migration_exports').on('click', '.resend_export', function() {
            self.reset_export_tab();
            $('#migrate_server_token').val($(this).attr('data-server-token'));
            $('#migrate_server_address').val($(this).attr('data-server-address'));
           
            var myapps = $(this).attr('data-apps').split(",")
            var selected_apps = [];
            for (var i=0; i<myapps.length; i++) {
                selected_apps.push({value: myapps[i], name: countlyGlobal.apps[myapps[i]].name});
            }
                
            $("#multi-app-dropdown").clyMultiSelectSetSelection( selected_apps);
            $("#multi-app-dropdown").addClass("disabled");

            $("#export_data_button").css('display','none');
            $("#export-type-section").css('display','none');
            $('#migration_additional_files').css('display','none');
            $("#export_path").css('display','none');
            $("#send_export_button").css('display','block');
            $("#target-server-data").css('display','block');
            $("#target-server-data").addClass('disabled');
            $("#resend_export_id").val($(this).attr('data-id'));
            $("#export-widget-drawer").trigger("data-updated");
            $("#export-widget-drawer").addClass("open");
            $(".cly-drawer").find(".close").off("click").on("click", function () {
                $("#export-widget-drawer").removeClass("open");
            });
        });
        
        //Stop export click(in list)
        $('#data_migration_exports').on('click', '.stop_export', function() {
            var overlay = $("#overlay").clone();
            $("body").append(overlay);
            overlay.show();
            
            $.when(countlyDataMigration.stopExport($(this).attr('data'),function(result)
            {
                overlay.hide();
                if(result && result['result']=='success')
                {
                    if(result.data && self.explanations[result.data])
                    {
                        var msg = {title:jQuery.i18n.map["data-migration.ok"], message: self.get_translation(result.data),info:"", sticky:false,clearAll:true,type:"info"};
                        CountlyHelpers.notify(msg);
                    }
                }
                else if(result && result['result']=='error')
                {
                       resp = self.get_response_text(result.data.xhr,result.data.status,result.data.error);
                       CountlyHelpers.alert(self.get_translation(resp),"red");
                       
                }
                self.load_export_list();
            }));
        });
        
        //delete export click(in list)
        $('#data_migration_exports').on('click', '.delete_export', function() {
            var  myid =$(this).attr('data');
            CountlyHelpers.confirm(jQuery.i18n.map["data-migration.delete-export-confirm"], "red",function(result) {
                if (!result) {return true;}
                var overlay = $("#overlay").clone();
                $("body").append(overlay);
                overlay.show();
                
                $.when(countlyDataMigration.deleteExport(myid,function(result)
                {
                    overlay.hide();
                    if(result && result['result']=='error')
                    {
                        resp = self.get_response_text(result.data.xhr,result.data.status,result.data.error);
                        CountlyHelpers.alert(self.get_translation(resp),"red");
                    }
                    self.load_export_list();
                }));
            });
        });
       
       //delete import list(in my import list)
        $('#data_migration_imports').on('click', '.delete_import', function() {
            var  myid =$(this).attr('data');
            CountlyHelpers.confirm(jQuery.i18n.map["data-migration.delete-import-confirm"], "red",function(result) {
                if (!result) {return true;}
                var overlay = $("#overlay").clone();
                $("body").append(overlay);
                overlay.show();
                
                $.when(countlyDataMigration.deleteImport(myid,function(result)
                {
                    overlay.hide();
                    if(result && result['result']=='error')
                    {
                        resp = self.get_response_text(result.data.xhr,result.data.status,result.data.error);
                        CountlyHelpers.alert(self.get_translation(resp),"red");
                    }
                    self.load_import_list();
                }));
            });
        });
            
        $("body").off("click", ".options-item .edit").on("click", ".options-item .edit", function () {
            if($(this).attr('id')!='import-export-button')
            {
                $(this).next(".edit-menu").fadeToggle();    
                $("#import-export-button").removeClass("active");
                $("#import-export-button-menu").css('display','none');
            }
		});
		$("body").off("mouseleave").on("mouseleave", ".options-item", function () {
			$(this).find(".edit").next(".edit-menu").fadeOut();
		});
        
        $(".edit-menu").hover(function(e){e.stopPropagation(); },function(e){e.stopPropagation(); });
        
        $("#import-export-button").click(function () {
            if ($(this).hasClass("active")) {
                $(this).removeClass("active");
               $("#import-export-button-menu").css('display','none');
              } else {
                $(this).addClass("active");
                $("#import-export-button-menu").css('display','block');
              }
        });
    },
    create_export_tab:function()
    {
        var self = this;
        var apps = [];
        for (var appId in countlyGlobal.apps) {
            apps.push({value: appId, name: countlyGlobal.apps[appId].name});
        }
        
        $("#multi-app-dropdown").clyMultiSelectSetItems(apps);      
        $("#multi-app-dropdown").on("cly-multi-select-change", function(e, selected) {
            $("#export-widget-drawer").trigger("data-updated");
        });
        $('#migrate_server_address').on( "keyup", function(e){$("#export-widget-drawer").trigger("data-updated");} );
        $('#migrate_server_token').on( "keyup", function(e){$("#export-widget-drawer").trigger("data-updated");} );
             
        $("#data-export-type-selector").off("click").on("click", ".check", function() {
            $("#data-export-type-selector").find(".check").removeClass("selected");
            $(this).addClass("selected");  
            
            if($(this).attr('data-from')=='export-transfer')
                $('#target-server-data').css('display','block');
            else
                $('#target-server-data').css('display','none'); 
            $("#export-widget-drawer").trigger("data-updated");
        }); 
        
        $('#migration_additional_files').click(function(){
            $(this).toggleClass("checked");
        });
        $('#migration_redirect_traffic').click(function(){
            $(this).toggleClass("checked");
        });  
                     
        $("#export-widget-drawer").on("data-updated", function() {
            var allGood=false;
            var download_me = ($("#data-export-type-selector").find(".check.selected").data("from") == "export-download");       
            var applist  = $("#multi-app-dropdown").clyMultiSelectGetSelection();
                   
            if($('#migrate_server_address').val()!='' && $('#migrate_server_token').val()!='')
                $("#test_connection_button").css('visibility','visible');
            else
                $("#test_connection_button").css('visibility','hidden');
                    
            if(applist && applist.length>0 && (download_me ||($('#migrate_server_address').val()!='' && $('#migrate_server_token').val()!='')))
                $("#export_data_button").removeClass("disabled");
            else
                $("#export_data_button").addClass("disabled");
                    
            if($("#resend_export_id").val()!="" && $('#migrate_server_address').val()!='' && $('#migrate_server_token').val()!='')
                $("#send_export_button").removeClass("disabled");
            else
                $("#send_export_button").addClass("disabled");
        });
                
        $("#export_data_button").click(function () {
            if ($(this).hasClass("disabled")) {return;}
                $("#export_data_form .symbol-api-key").val(countlyGlobal['member'].api_key);
                $("#export_data_form .symbol-app-id").val(countlyCommon.ACTIVE_APP_ID);
                var overlay = $("#overlay").clone();
                $("body").append(overlay);
                overlay.show();
            
                $('#export_data_form').ajaxSubmit({
                        beforeSubmit:function (formData, jqForm, options) { 
                            var applist  = $("#multi-app-dropdown").clyMultiSelectGetSelection();
                            var download_me = ($("#data-export-type-selector").find(".check.selected").data("from") == "export-download");
  
                            if(download_me)
                                 formData.push({ name:'only_export', value:'1' });
                            else
                                formData.push({ name:'only_export', value:'' });
                            formData.push({ name:'apps', value:applist.join() });
                        },
                        success:function (result) {
                            overlay.hide();                          
                            self.load_export_list()
                            setTimeout(self.load_export_list(),1000);                            
                            $("#export-widget-drawer").removeClass("open");
                            $("#tabs ul li a[href='#data_migration_exports']").trigger('click');
                            
                            var msg = {title:jQuery.i18n.map["data-migration.ok"], message: jQuery.i18n.map["data-migration.export-started"],info:"", sticky:false,clearAll:true,type:"info"};
                            CountlyHelpers.notify(msg);
                        },
                        error: function(xhr, status, error){
                            overlay.hide();
                            var resp=self.get_response_text(xhr,status,error);
                            var splitted = resp.split(':');
                            
                              if(jQuery.i18n.map["data-migration."+resp])
                              {
                                CountlyHelpers.alert(jQuery.i18n.map["data-migration."+resp],"red");
                              }
                              else if(splitted.length>1 && jQuery.i18n.map["data-migration."+splitted[0]])
                              {
                                CountlyHelpers.alert(jQuery.i18n.map["data-migration."+splitted[0]]+""+splitted[1],"red");
                              }
                              else
                                CountlyHelpers.alert(resp,"red");
                            self.load_export_list()
                            setTimeout(self.load_export_list(),1000);  
                        }
                    });
            
        });
                       
        $('#test_connection_button').click(function(){
            if ($(this).hasClass("disabled")) {return;}
            
            var overlay = $("#overlay").clone();
            $("body").append(overlay);
            overlay.show();
              
            $.when(countlyDataMigration.testConnection($('#migrate_server_token').val(),$('#migrate_server_address').val(),function(result)
            {
                overlay.hide();
                if(result && result['result']=='success')
                {
                    var mm = result.data;
                    if(self.explanations[result.data])
                    {
                        mm = self.get_translation(result.data)
                    }
                            
                    var msg = {title:jQuery.i18n.map["data-migration.ok"], message: mm,info:"", sticky:false,clearAll:true,type:"info"};
                            CountlyHelpers.notify(msg);
                }
                else if(result && result['result']=='error')
                {
                       resp = self.get_response_text(result.data.xhr,result.data.status,result.data.error);
                       CountlyHelpers.alert(self.get_translation(resp),"red");
                       
                }
            }));
        });
        
        //SEND EXPORT
        $("#send_export_button").click(function () {
            if ($(this).hasClass("disabled")) {return;}
            var overlay = $("#overlay").clone();
            $("body").append(overlay);
            overlay.show();
            var redir_me = '';
            if($("#migration_redirect_traffic input").first().prop('checked') == true){
                redir_me = '1';
            }
           $.when(countlyDataMigration.sendExport($('#resend_export_id').val(),$('#migrate_server_token').val(),$('#migrate_server_address').val(),redir_me,function(result)
            {
                overlay.hide();
                if(result && result['result']=='success')
                {
                    var mm = result.data;
                    if(self.explanations[result.data] )
                    {
                        var msg = {title:jQuery.i18n.map["data-migration.ok"], message: self.get_translation(result.data),info:"", sticky:false,clearAll:true,type:"info"};
                        CountlyHelpers.notify(msg);
                    }
                    $("#export-widget-drawer").removeClass("open");
                    $("#tabs ul li a[href='#data_migration_exports']").trigger('click');    
                }
                else if(result && result['result']=='error')
                {
                       resp = self.get_response_text(result.data.xhr,result.data.status,result.data.error);
                       CountlyHelpers.alert(self.get_translation(resp),"red");
                       
                }
                self.load_export_list();
            }));       
        });
    },
    create_import_tab:function()
    {
        var self = this;
        $('#migration_address_copyboard').attr("data",window.location.protocol+'//'+window.location.hostname);
        $('#migration_address_copyboard2').attr("data",window.location.protocol+'//'+window.location.hostname);
        $('#migration_address_copyboard input').first().val(window.location.protocol+'//'+window.location.hostname);
        $('#migration_address_copyboard2 input').first().val(window.location.protocol+'//'+window.location.hostname);
            
        //file oploader
        myDropzone = new Dropzone("#data-migration-import-via-file", {url:'/',autoQueue:false,param_name:"new_plugin_input",parallelUploads:0,maxFiles:1,
            addedfile: function(file) {
                    if(check_ext(file.name))
                    {
                        myDropzone.disable();
                        $('#data-migration-import-via-file').removeClass('file-hovered');
                        $('#data-migration-import-via-file').addClass('file-selected');
                        $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">'+file.name+'</p><p class="remove" id="remove-files"><i class="fa fa-trash"  aria-hidden="true"></i> '+jQuery.i18n.map["plugin-upload.remove"]+'</p></div>');
                        $('#import_data_button').removeClass('disabled');
                    }
                },
                dragover:function(e)
                {
                    $('#data-migration-import-via-file').addClass('file-hovered');
                },
                dragleave:function(e)
                {
                    $('#data-migration-import-via-file').removeClass('file-hovered');
                }
            });
                
            $(window).on('resize', function () {
                $("#data-migration-import-via-file").height($("#import-widget-drawer").height()-300);
            });
                
            $("#migration_upload_fallback").change(function (){
                var pp = $(this).val().split('\\');
                if(check_ext(pp[pp.length-1]))
                {
                    $('#data-migration-import-via-file').addClass('file-selected');
                    $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">'+$(this).val()+'</p></div>');
                     
                    $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">'+ pp[pp.length-1]+'</p><p class="remove" id="remove-files"><i class="fa fa-trash"  aria-hidden="true"></i> '+jQuery.i18n.map["plugin-upload.remove"]+'</p></div>');
                    $('#import_data_button').removeClass('disabled');
                }
            });
                
            $('.dz-filechosen').on('click', function(e) { 
                if(e.target.id== 'remove-files')
                { 
                    $('#data-migration-import-via-file').removeClass('file-selected');
                    $('.dz-filechosen').html('');
                    if(typeof $("#migration_upload_fallback")!== 'undefined')
                    {
                        $("#migration_upload_fallback").replaceWith($("#migration_upload_fallback").val('').clone(true));
                    }
                    $('#import_data_button').addClass('disabled');    
                    if($('.fallback').length==0){myDropzone.removeAllFiles(); myDropzone.enable();}
                       
                }
            });
                  
            $('#migrate_server_address').on( "keyup", function(e){$("#import-widget-drawer").trigger("data-updated");} );
            $('#migrate_server_token').on( "keyup", function(e){$("#import-widget-drawer").trigger("data-updated");} );
             
            $("#data-import-type-selector").off("click").on("click", ".check", function() {
                $("#data-import-type-selector").find(".check").removeClass("selected");
                $(this).addClass("selected");
                    
                if($(this).attr('data-from')=='import-upload')
                {
                    $('#import-via-file').css('display','block');
                    $('#import-via-token').css('display','none');
                    $('#import_data_button').css('display','block');
                    $('#create_new_token').css('display','none');
                }
                else
                {
                    $('#import-via-file').css('display','none');
                    $('#import-via-token').css('display','block');
                    $('#import_data_button').css('display','none');
                    $('#create_new_token').css('display','block');
                }
                $("import-widget-drawer").trigger("data-updated");
            });

            $("#import-widget-drawer").on("data-updated", function() {
                allGood=false;
                var download_me = ($("#data-export-type-selector").find(".check.selected").data("from") == "export-download");
                var applist  = $("#multi-app-dropdown").clyMultiSelectGetSelection();
                   
                if(applist && applist.length>0 && (download_me ||($('#migrate_server_address').val()!='' && $('#migrate_server_token').val()!='')))
                    $("#export_data_button").removeClass("disabled");
                else
                    $("#export_data_button").addClass("disabled"); 
            });
            
            $("#create_new_token").click(function () {
                var overlay = $("#overlay").clone();
                $("body").append(overlay);
                overlay.show();
                
                var msg = {title:jQuery.i18n.map["data-migration.please-wait"], message: jQuery.i18n.map["data-migration.creating-new-token"], sticky:false};
                CountlyHelpers.notify(msg);
                
                $.when(countlyDataMigration.createToken(function(result)
                {
                    overlay.hide();
                    if(result && result['result']=='success')
                    {
                        var mytoken=result.data;
                        $("#import-widget-drawer .details .section").css('display','none');
                            $("#import-widget-drawer .details .buttons").css('display','none');
                            
                            $('#migration_token_copyboard').attr("data",mytoken);
                            $('#migration_token_copyboard input').first().val(mytoken);
                            $('#data_migration_generated_token').addClass('newTokenIsGenerated');
                            
                            
                             $('#create_new_token').css('display','none');
                             $('#data_migration_generated_token').css('display','block');
                            var msg = {title:jQuery.i18n.map["data-migration.complete"], message: jQuery.i18n.map["data-migration.new-token-created"], sticky:false,clearAll:true};
                            CountlyHelpers.notify(msg);
                    }
                    else if(result && result['result']=='error')
                    {
                       resp = self.get_response_text(result.data.xhr,result.data.status,result.data.error);
                       resp = self.get_translation(resp);
                       var msg = {title:jQuery.i18n.map["data-migration.error"], message: jQuery.i18n.map["data-migration.unable-create-token"],info:resp, sticky:true,clearAll:true,type:"error"};
                        CountlyHelpers.notify(msg);
                    }
                
                }));
            });
             
            $('.migration_copyboard').click(function(){
                $(this).find('input').first().select();
                document.execCommand("copy");
                 
                var msg = jQuery.i18n.map["data-migration.address-coppied-in-clipboard"];
                if($(this).attr('id') == "migration_token_copyboard")
                {
                    msg = jQuery.i18n.map["data-migration.tokken-coppied-in-clipboard"];
                    $('#data_migration_generated_token').removeClass('newTokenIsGenerated');
                }
                var msg = {title: msg, sticky:false,clearAll:true};
                CountlyHelpers.notify(msg);       
            });
            $("#create_another_token").click(function()
            {
                if($('#data_migration_generated_token').hasClass('newTokenIsGenerated'))
                {
                   
                     CountlyHelpers.confirm(jQuery.i18n.map["data-migration.close-without-copy"], "red",function(result) {
                        if (!result) {return true;}
                        $('#data_migration_generated_token').removeClass('newTokenIsGenerated');
                        $('#create_new_token').css('display','block');
                        $('#data_migration_generated_token').css('display','none');
                        $("#import-via-token").css('display','block');
                    },[jQuery.i18n.map["data-migration.cancel"],jQuery.i18n.map['data-migration.continue-and-close']]);
                    
                }
                else
                {
                $('#create_new_token').css('display','block');
                $('#data_migration_generated_token').css('display','none');
                $("#import-via-token").css('display','block');
                }

            });
            
            $("#import_data_button").click(function () {
                if(!$(this).hasClass("disabled"))
                {
                $("#import_data_form .symbol-app-id").val(countlyCommon.ACTIVE_APP_ID);
            
                var overlay = $("#overlay").clone();
                $("body").append(overlay);
                overlay.show();
            
                $('#import_data_form').ajaxSubmit({
                    beforeSubmit:function (formData, jqForm, options) {  
                        if(myDropzone && myDropzone.files && myDropzone.files.length>0)
                        {
                            formData.push({ name:'import_file', value:myDropzone.files[myDropzone.files.length-1] });   
                        }
                    },
                    success:function (result) {
                        overlay.hide(); 
                        if(result['result'])
                        {
                            if(result['result'].substr(0,26)=='Importing process started.')
                            {
                                var msg = {title:jQuery.i18n.map["data-migration.ok"], message: jQuery.i18n.map["data-migration.import-started"], sticky:false};
                                
                                $("#import-widget-drawer").removeClass("open");
                                $("#tabs ul li a[href='#data_migration_imports']").trigger('click');
                                self.load_import_list();
                            } 
                            else
                            {
                                var msg = {title:jQuery.i18n.map["data-migration.ok"], message: result['result'], sticky:false};
                            }
                            CountlyHelpers.notify(msg);
                        }    
                    },
                    error: function(xhr, status, error){
                        var resp = self.get_response_text(xhr,status,error);
                        resp = self.get_translation(resp);
                        CountlyHelpers.alert(resp,"red");
                        overlay.hide();   
                    }
                });
                }
            });
            
            
    },
    reset_export_tab:function()
    {
        $("#multi-app-dropdown").removeClass("disabled");
        $("#export_data_button").css('display','block');
        $("#export-type-section").css('display','block');
        $("#send_export_button").css('display','none');
        $("#export_path").css('display','block');
        $("#test_connection_button").css('visibility','hidden');
        
        if(self.crash_symbolication==true)
            $("#migration_additional_files").css('display','block');
        else
            $("#migration_additional_files").css('display','none');
        
        
        if(this.configsData['def_path'])
            $('#dif_target_path').val(this.configsData['def_path']);
        else
            $('#dif_target_path').val("");
  
        $('#migrate_server_token').val("");
        $('#migrate_server_address').val("");
        $('#connection_test_result').html("");
        $("#export-widget-drawer").trigger("data-updated");
        
        $('#migration_additional_files').find("input").removeAttr('checked');
        $('#migration_redirect_traffic').find("input").removeAttr('checked');
        $('#target-server-data').css('display','block');
        $('#data-export-type-selector').find(".check[data-from=export-transfer]").addClass("selected");
        $('#data-export-type-selector').find(".check[data-from=export-download]").removeClass("selected");
        
        $('#migration_additional_files').css('display','block');
            
        $('#multi-app-dropdown').clyMultiSelectClearSelection();
        var apps = [];
            for (var appId in countlyGlobal.apps) {
                apps.push({value: appId, name: countlyGlobal.apps[appId].name});
            }
            $("#multi-app-dropdown").clyMultiSelectSetItems(apps);
    },
    reset_import_tab:function()
    {
       $("#import-widget-drawer .details .section").css('display','block');
       $("#import-widget-drawer .details .buttons").css('display','block');
       $("#import-via-token").css('display','none');
       $("#create_new_token").css('display','none');
       $("#data_migration_generated_token").css('display','none');
       $('#import_data_button').addClass('disabled');
       $('#import_data_button').css('display','block');

       $('#target-server-data').css('display','block');
       $('#data-import-type-selector').find(".check[data-from=import-upload]").addClass("selected");
       $('#data-import-type-selector').find(".check[data-from=import-token]").removeClass("selected");
        
    },
    get_response_text:function(xhr,status,error)
    {
        var resp;
        if(xhr.responseText){
            try{
                resp = JSON.parse(xhr.responseText);
                if(resp && resp.result)resp = resp.result
                else resp = null;
            }
            catch(ex){resp = null;}
        }
        if(!resp)resp = error;
        return resp;
    },
    get_translation:function(msg)
    {
        if(this.explanations && this.explanations[msg] && jQuery.i18n.map["data-migration."+this.explanations[msg]])
            return jQuery.i18n.map["data-migration."+this.explanations[msg]];
        else return msg;
    },
    load_export_list:function(isRefresh)
    {
        var self = this;
		$.when(countlyDataMigration.loadExportList()).then(function () {
            var result = countlyDataMigration.getExportList();
            if(result && result['result']=='success')
            {
                self.templateData.data_migration_exports = result.data;
                newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $(self.el).find('#my_exports_list').replaceWith(newPage.find('#my_exports_list')); 
            }
            else if(result && result['result']=='error')
            {
                resp = self.get_response_text(result.data.xhr,result.data.status,result.data.error);
                CountlyHelpers.alert(self.get_translation(resp),"red");
            }
        });
    },
    load_import_list:function(isRefresh)
    {
        var self=this;  
        
        $.when(countlyDataMigration.loadImportList()).then(function () {
            var result = countlyDataMigration.getImportList();
            if(result && result['result']=='success')
            {
                self.templateData.data_migration_imports = result.data;
                newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $(self.el).find('#my_imports_list').replaceWith(newPage.find('#my_imports_list'));   
            }
            else if(result && result['result']=='error')
            {
                resp = self.get_response_text(result.data.xhr,result.data.status,result.data.error);
                CountlyHelpers.alert(self.get_translation(resp),"red");
            }
        });
    },
    refresh:function () {
        this.load_import_list(true); this.load_export_list();
    }
});

//create view
app.DataMigrationView = new DataMigrationView();



if(countlyGlobal["member"].global_admin){
    //register route
   app.route('/manage/data-migration', 'datamigration', function () {
        this.renderWhenReady(this.DataMigrationView);
    });
    
    //add app setting for redirect
    app.addAppSetting("redirect_url", {
        toDisplay: function(appId, elem){
            var vall = countlyGlobal['apps'][appId]["redirect_url"] || "";
            $(elem).text(vall);
        },
        toInput: function(appId, elem){
            var val = countlyGlobal['apps'][appId]["redirect_url"] || "";
            $(elem).val(val);
            if(val!="")
            {
              $(elem).parent().parent().parent().css('display','table-row'); 
                $(elem).parent().find('.hint').html(val);
            }
            else
            {
                $(elem).parent().parent().parent().css('display','none');
            }
        },
        toSave: function(appId, args, elem){
            if($(elem).is(":checked"))
            {
                args.redirect_url = "";
            } 
        },
        toInject: function(){
            var editApp = '<tr class="help-zone-vs" data-help-localize="manage-apps.redirect_url">'+
                '<td>'+
                    '<span data-localize="management-applications.redirect_url"></span>'+
                '</td>'+
                '<td>'+
                    '<div class="read app-read-settings" data-id="redirect_url"></div>'+
                    '<div class="edit">'+
                        '<input type="checkbox" value="1" class="app-write-settings migration-green-checkbox" data-id="redirect_url" data-localize="placeholder.redirect_url"/>'+'<span data-localize="management-applications.table.remove_redirect" >Remove redirect</span>'+
                        '<div class="hint">'+'</div>'+
                    '</div>'+
                '</td>'+
            '</tr>';
            
            $(".app-details table .table-edit").before(editApp);
        }
    });
    
    $( document ).ready(function() {
        //Adding as menu item : Managment>Data migration. Before help toggle button.
         if(countlyGlobal["member"]["global_admin"]){
            var menu = '<a href="#/manage/data-migration" class="item">'+
                '<div class="logo-icon ion-bowtie"></div>'+
                '<div class="text" data-localize="data-migration.page-title"></div>'+
            '</a>';
            if($('#management-submenu .help-toggle').length)
                $('#management-submenu .help-toggle').before(menu);
        }
        
        var curapp = countlyGlobal['member']['active_app_id'];
        
        if(curapp  && countlyGlobal['apps'][curapp]['redirect_url'] &&  countlyGlobal['apps'][curapp]['redirect_url']!="")
        {
            var mm = jQuery.i18n.map["data-migration.app-redirected-explanation"]+countlyGlobal['apps'][curapp]['redirect_url'];
            var msg = {title:jQuery.i18n.map["data-migration.app-redirected"].replace('{app_name}',countlyGlobal['apps'][curapp]['name']), message: mm,info:jQuery.i18n.map["data-migration.app-redirected-remove"], sticky:true,clearAll:true,type:"warning",onClick:function()
            {
                app.navigate("#/manage/apps", true);
            }};
            CountlyHelpers.notify(msg);
        }
    });
    
    //switching apps. show message if redirect url is set
    app.addAppSwitchCallback(function(appId){
        if(appId  && countlyGlobal['apps'][appId]['redirect_url'] &&  countlyGlobal['apps'][appId]['redirect_url']!="")
        {
            var mm = jQuery.i18n.map["data-migration.app-redirected-explanation"]+countlyGlobal['apps'][appId]['redirect_url'];
            var msg = {title:jQuery.i18n.map["data-migration.app-redirected"].replace('{app_name}',countlyGlobal['apps'][appId]['name']), message: mm,info:jQuery.i18n.map["data-migration.app-redirected-remove"], sticky:true,clearAll:true,type:"warning",onClick:function()
            {
                app.navigate("#/manage/apps", true);
            }};
            CountlyHelpers.notify(msg);
        }
    });
}