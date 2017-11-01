window.PluginUploadView = countlyView.extend({
  
  //need to provide at least empty initialize function
  //to prevent using default template
	initialize:function (){
		//we can initialize stuff here
	},
 beforeRender: function() {
    },
	//here we need to render our view
  renderCommon:function () {
    
  },
  
	//here we need to refresh data
  refresh:function () {}
});

if(!production)
{
    CountlyHelpers.loadJS("plugin-upload/javascripts/dropzone.js");
}

function check_ext(file)
{
    var ee = file.split('.');
    if(ee.length==2)
    {
        if(ee[1]=='tar' || ee[1]=='zip' || ee[1]=='tgz')
        {
            return true;
        }
    }
    else if(ee.length==3 && ee[1]=='tar' && ee[2] == 'gz')
    {
        return true;
    }
     CountlyHelpers.alert(jQuery.i18n.map["plugin-upload.badformat"], "red");
    return false;
}

function show_me(myname)
{//sometimes it gets called a litle bit too soon. 
    if($(myname))
    {
        $(myname).parent().parent().parent().css('background-color','#baffac');
        $('html,body').scrollTop($(myname).parent().offset().top - 200);
    }
    else
    {
        setTimeout(show_me(myname),500);
    }   
}

if(countlyGlobal["member"].global_admin){
    if(!production){CountlyHelpers.loadJS("plugin-upload/javascripts/dropzone.js");}
    var myDropzone; 

    app.addPageScript("/manage/plugins", function(){
        $( document ).ready(function() {//creates upload form
            $.when($.get(countlyGlobal["path"]+'/plugin-upload/templates/drawer.html', function(src){
                $(".widget").after(Handlebars.compile(src));
                app.localize( $("#plugin-upload-widget-drawer"));  
                //create button
                $(".widget .widget-header .left").after('<a style="float: right; margin-top: 6px;" class="icon-button green" id="show-plugin-upload" data-localize="plugin-upload.add-plugin">'+jQuery.i18n.map["plugin-upload.add-plugin"]+'</a>');
                
                myDropzone = new Dropzone("#plugin-upload-drop", {url:'/',autoQueue:false,param_name:"new_plugin_input",parallelUploads:0,maxFiles:1,
                    addedfile: function(file) {
                        if(check_ext(file.name))
                        {
                            myDropzone.disable();
                            $('#plugin-upload-drop').removeClass('file-hovered');
                            $('#plugin-upload-drop').addClass('file-selected');
                            $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">'+file.name+'</p><p class="remove" id="remove-files"><i class="fa fa-trash"  aria-hidden="true"></i> '+jQuery.i18n.map["plugin-upload.remove"]+'</p></div>');
                            $('#upload-new-plugin').removeClass('mydisabled');
                        }
                    },
                    dragover:function(e)
                    {
                        $('#plugin-upload-drop').addClass('file-hovered');
                    },
                    dragleave:function(e)
                    {
                        $('#plugin-upload-drop').removeClass('file-hovered');
                    }
                });
                
                $(window).on('resize', function () {
                    $("#plugin-upload-drop").height($("#plugin-upload-widget-drawer").height()-170);
                });

                //pull out plugin-upload form
                $("#show-plugin-upload").on("click", function () {
                    $(".cly-drawer").removeClass("open editing");
                    $("#plugin-upload-drop").height($("#plugin-upload-widget-drawer").height()-170);
                    $("#plugin-upload-widget-drawer").addClass("open");
                    $(".cly-drawer").find(".close").off("click").on("click", function () {
                        $(this).parents(".cly-drawer").removeClass("open");
                    });
                });
                //fallback(if drag&drop not available)
                $("#new_plugin_input").change(function (){

                    var pp = $(this).val().split('\\');
                    if(check_ext(pp[pp.length-1]))
                    {
                        
                        $('#plugin-upload-drop').addClass('file-selected');
                        $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">'+$(this).val()+'</p></div>');
                     
                        $(".dz-filechosen").html('<div class="dz-file-preview"><p><i class="fa fa-archive" aria-hidden="true"></i></p><p class="sline">'+ pp[pp.length-1]+'</p><p class="remove" id="remove-files"><i class="fa fa-trash"  aria-hidden="true"></i> '+jQuery.i18n.map["plugin-upload.remove"]+'</p></div>');
                        $('#upload-new-plugin').removeClass('mydisabled');
                    }
                });
                
                $('.dz-filechosen').on('click', function(e) { 
                    if(e.target.id== 'remove-files')
                    { 
                        $('#plugin-upload-drop').removeClass('file-selected');
                        $('.dz-filechosen').html('');
                        if(typeof $("#new_plugin_input")!== 'undefined')
                        {
                           $("#new_plugin_input").replaceWith($("#new_plugin_input").val('').clone(true));
                        }
                         $('#upload-new-plugin').addClass('mydisabled');
                         
                        if($('.fallback').length==0){myDropzone.removeAllFiles(); myDropzone.enable();}
                       
                    }
                });

   
                $("#upload-new-plugin").click(function () {
                    if($("#upload-new-plugin").hasClass("mydisabled"))
                    {
                        return;
                    }
                    
                    $(".cly-drawer").removeClass("open editing");
                    $("#plugin-upload-api-key").val(countlyGlobal['member'].api_key);
                    $("#plugin-upload-app-id").val(countlyCommon.ACTIVE_APP_ID);
                
                    var overlay = $("#overlay").clone();
                    $("body").append(overlay);
                    overlay.show();
        
                    var msg = {title:jQuery.i18n.map["plugin-upload.processing"], message: jQuery.i18n.map["plugin-upload.saving-data"], sticky:true};
                    CountlyHelpers.notify(msg);

                    //submiting form
                    $('#upload-plugin-form').ajaxSubmit({
                        beforeSubmit:function (formData, jqForm, options) {  
                            
                            formData.push({ name:'_csrf', value:countlyGlobal['csrf_token'] });
                            if(myDropzone && myDropzone.files && myDropzone.files.length>0)
                            {
                                formData.push({ name:'new_plugin_input', value:myDropzone.files[myDropzone.files.length-1] });
                                
                            }
                            
                             
                    
                        },
                        success:function (result) {
                            overlay.hide();
                            var aa = result.split('.');
                            if(aa.length==2 && aa[0]=='Success')
                            {
                                if(typeof $("#new_plugin_input")!== 'undefined')
                                {
                                    $("#new_plugin_input").replaceWith($("#new_plugin_input").val('').clone(true));
                                }
                                
                                if($('.fallback').length==0)(myDropzone.enable());
                                
                                
                                $('#plugin-upload-drop').removeClass('file-selected');
                                $('.dz-filechosen').html('');
                                $('#upload-new-plugin').addClass('mydisabled');
                                
                                
                    
                                
                                $.when(app.pluginsView.refresh(true)).then(
                                function()
                                {
                                    var msg = {title:jQuery.i18n.map["plugin-upload.success"], message: jQuery.i18n.map["plugin-upload.success"],clearAll:true, sticky:true};
                                    CountlyHelpers.notify(msg);
                                    //highlight
                                    
                                    //scroll down
                                    show_me('#plugin-'+aa[1]);
                                    
                                });
                            }
                            else if(jQuery.i18n.map['plugin-upload.'+result]!==undefined)
                            {
                                var msg = {title:jQuery.i18n.map["plugin-upload.error"], message: jQuery.i18n.map['plugin-upload.'+result], sticky:true,clearAll:true,type:"error"};
                                CountlyHelpers.notify(msg);
                            }
                            else
                            {
                                var msg = {title:jQuery.i18n.map["plugin-upload.error"], message: result, sticky:true,clearAll:true,type:"error"};
                                 CountlyHelpers.notify(msg);
                            }     
                                  
                        },
                        error: function(xhr, status, error){
                            var resp;
                            if(xhr.responseText){
                                try{
                                    resp = JSON.parse(xhr.responseText);
                                    if(resp && resp.result)resp = resp.result
                                    else resp = null;
                                }
                                catch(ex){
                                    resp = null;
                                }
                            }
                            if(!resp)
                                resp = error;
                            if(resp=='Request Entity Too Large')
                                resp = jQuery.i18n.map["plugin-upload.toobig"];                     
                            var msg = {title:jQuery.i18n.map["plugin-upload.error"], message: resp, sticky:true,clearAll:true,type:"error"};
                            CountlyHelpers.notify(msg);
                            overlay.hide();
                        }
                    });
                });  
            }));            
        });
    });
}