window.PluginsView = countlyView.extend({
    initialize:function () {
        this.filter = (store.get("countly_pluginsfilter")) ? store.get("countly_pluginsfilter") : "plugins-all";
    },
    beforeRender: function() {
        if(this.template)
            return $.when(countlyPlugins.initialize()).then(function () {});
        else{
            var self = this;
            return $.when($.get(countlyGlobal["path"]+'/plugins/templates/plugins.html', function(src){
                self.template = Handlebars.compile(src);
            }), countlyPlugins.initialize()).then(function () {});
        }
    },
    renderCommon:function (isRefresh) {

        var pluginsData = countlyPlugins.getData();
        this.templateData = {
            "page-title":jQuery.i18n.map["plugins.title"]
        };
        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $("#"+this.filter).addClass("selected").addClass("active");
            $.fn.dataTableExt.afnFiltering.push(function( oSettings, aData, iDataIndex ) {
                if(!$(oSettings.nTable).hasClass("plugins-filter"))
                    return true;
                if(self.filter == "plugins-enabled") {
                    return aData[4]
                }
                if(self.filter == "plugins-disabled") {
                    return !aData[4]
                }
                return true;
            });

            this.dtable = $('#plugins-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": pluginsData,
                "aoColumns": [
                    { "mData": function(row, type){return row.title;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.name"]},
                    { "mData": function(row, type){return row.description;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.description"] },
                    { "mData": function(row, type){return row.version;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.version"], "sClass":"center" },
                    { "mData": function(row, type){if(!row.enabled) return jQuery.i18n.map["plugins.disabled"]; else return jQuery.i18n.map["plugins.enabled"];}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.status"], "sClass":"center" },
                    { "mData": function(row, type){if(type == "display"){ var prepackagedClass = row.prepackaged ? 'disabled' : 'btn-plugins'; if(!row.enabled) return '<a class="icon-button green btn-header '+prepackagedClass+'" id="plugin-'+row.code+'">'+jQuery.i18n.map["plugins.enable"]+'</a>'; else return '<a class="icon-button red btn-header '+prepackagedClass+'" id="plugin-'+row.code+'">'+jQuery.i18n.map["plugins.disable"]+'</a>';}else return row.enabled;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.state"], "sClass":"shrink center"},
                    { "mData": function(row, type){if(row.homepage != "") return '<a class="icon-button btn-header light" href="'+ row.homepage + '" target="_blank">'+jQuery.i18n.map["plugins.homepage"]+'</a>'; else return "";}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.homepage"], "sClass":"shrink center"}
                ]
            }));
            this.dtable.stickyTableHeaders();
            this.dtable.fnSort( [ [0,'asc'] ] );
        }
    },
    refresh:function (){
    },
    togglePlugin: function(plugins){
        var self = this;
        var overlay = $("#overlay").clone();
        $("body").append(overlay);
        overlay.show();
        var loader = $(this.el).find("#loader");
        loader.show();
        countlyPlugins.toggle(plugins, function(res){
            var msg = {clearAll:true};
            if(res == "Success" || res == "Errors"){
                var seconds = 10;
                if(res == "Success"){
                    msg.title = jQuery.i18n.map["plugins.success"];
                    msg.message = jQuery.i18n.map["plugins.restart"]+" "+seconds+" "+jQuery.i18n.map["plugins.seconds"];
                    msg.info = jQuery.i18n.map["plugins.finish"];
                    msg.delay = seconds*1000;
                }
                else if(res == "Errors"){
                    msg.title = jQuery.i18n.map["plugins.errors"];
                    msg.message = jQuery.i18n.map["plugins.errors-msg"];
                    msg.info = jQuery.i18n.map["plugins.restart"]+" "+seconds+" "+jQuery.i18n.map["plugins.seconds"];
                    msg.sticky = true;
                    msg.type = "error";
                }
                setTimeout(function(){
                    window.location.reload(true);
                }, seconds*1000);
            }
            else{
                overlay.hide();
                loader.hide();
                msg.title = jQuery.i18n.map["plugins.error"];
                msg.message = res;
                msg.info = jQuery.i18n.map["plugins.retry"];
                msg.sticky = true;
                msg.type = "error";
            }
            CountlyHelpers.notify(msg);
        });
    },
    filterPlugins: function(filter){
        this.filter = filter;
        store.set("countly_pluginsfilter", filter);
        $("#"+this.filter).addClass("selected").addClass("active");
        this.dtable.fnDraw();
    }
});

window.ConfigurationsView = countlyView.extend({
    userConfig: false,
    initialize:function () {
        this.predefinedInputs = {};
        this.predefinedLabels = {
            "frontend":jQuery.i18n.map["configs.frontend"],
            "api":jQuery.i18n.map["configs.api"],
            "apps":jQuery.i18n.map["configs.apps"],
            "logs": jQuery.i18n.map["configs.logs"],
            "security": jQuery.i18n.map["configs.security"],
            "frontend-production":jQuery.i18n.map["configs.frontend-production"],
            "frontend-session_timeout":jQuery.i18n.map["configs.frontend-session_timeout"],
            "frontend-theme":jQuery.i18n.map["configs.frontend-theme"],
            "frontend-use_google":jQuery.i18n.map["configs.frontend-use_google"],
            "frontend-code":jQuery.i18n.map["configs.frontend-code"],
            "security-login_tries":jQuery.i18n.map["configs.security-login_tries"],
            "security-login_wait":jQuery.i18n.map["configs.security-login_wait"],
            "security-dashboard_additional_headers":jQuery.i18n.map["configs.security-dashboard_additional_headers"],
            "security-password_min":jQuery.i18n.map["configs.security-password_min"],
            "security-password_char":jQuery.i18n.map["configs.security-password_char"],
            "security-password_number":jQuery.i18n.map["configs.security-password_number"],
            "security-password_symbol":jQuery.i18n.map["configs.security-password_symbol"],
            "security-password_expiration":jQuery.i18n.map["configs.security-password_expiration"],
            "api-domain":jQuery.i18n.map["configs.api-domain"],
            "api-safe":jQuery.i18n.map["configs.api-safe"],
            "api-session_duration_limit":jQuery.i18n.map["configs.api-session_duration_limit"],
            "api-city_data":jQuery.i18n.map["configs.api-city_data"],
            "api-event_limit":jQuery.i18n.map["configs.api-event_limit"],
            "api-event_segmentation_limit":jQuery.i18n.map["configs.api-event_segmentation_limit"],
            "api-event_segmentation_value_limit":jQuery.i18n.map["configs.api-event_segmentation_value_limit"],
            "api-sync_plugins":jQuery.i18n.map["configs.api-sync_plugins"],
            "api-session_cooldown":jQuery.i18n.map["configs.api-session_cooldown"],
            "api-total_users":jQuery.i18n.map["configs.api-total_users"],
            "api-metric_limit":jQuery.i18n.map["configs.api-metric_limit"],
            "security-api_additional_headers":jQuery.i18n.map["configs.security-api_additional_headers"],
            "apps-country":jQuery.i18n.map["configs.apps-country"],
            "apps-category":jQuery.i18n.map["configs.apps-category"]
        };
        this.configsData = {};
        this.cache = {};
        this.changes = {};
        
        //register some common system config inputs
        this.registerInput("apps-category", function(value){
            var categories = app.manageAppsView.getAppCategories();
            var select = '<div class="cly-select" id="apps-category">'+
                '<div class="select-inner">'+
                    '<div class="text-container">';
            if(!categories[value])
                select += '<div class="text"></div>';
            else
                select += '<div class="text">'+categories[value]+'</div>';
            select += '</div>'+
                    '<div class="right combo"></div>'+
                '</div>'+
                '<div class="select-items square">'+
                    '<div>';
                    
                for(var i in categories){
                    select += '<div data-value="'+i+'" class="segmentation-option item">'+categories[i]+'</div>';
                }

            select += '</div>'+
                '</div>'+
            '</div>';
            return select;
        });
        
        this.registerInput("apps-country", function(value){
            var zones = app.manageAppsView.getTimeZones();
            var select = '<div class="cly-select" id="apps-country">'+
                '<div class="select-inner">'+
                    '<div class="text-container">';
            if(!zones[value])
                select += '<div class="text"></div>';
            else
                select += '<div class="text"><div class="flag" style="background-image:url(images/flags/'+value.toLowerCase()+'.png)"></div>'+zones[value].n+'</div>';
            
            select += '</div>'+
                    '<div class="right combo"></div>'+
                '</div>'+
                '<div class="select-items square">'+
                    '<div>';
                    
                for(var i in zones){
                    select += '<div data-value="'+i+'" class="segmentation-option item"><div class="flag" style="background-image:url(images/flags/'+i.toLowerCase()+'.png)"></div>'+zones[i].n+'</div>';
                }

            select += '</div>'+
                '</div>'+
            '</div>';
            return select;
        });
        
        this.registerInput("frontend-theme", function(value){
            var themes = countlyPlugins.getThemeList();
            var select = '<div class="cly-select" id="frontend-theme">'+
                '<div class="select-inner">'+
                    '<div class="text-container">';
            if(value && value.length)
                select += '<div class="text">'+value+'</div>';
            else
                select += '<div class="text">'+jQuery.i18n.map["configs.no-theme"]+'</div>';
            
            select += '</div>'+
                    '<div class="right combo"></div>'+
                '</div>'+
                '<div class="select-items square">'+
                    '<div>';
                    
                for(var i = 0; i < themes.length; i++){
                    if(themes[i] == "")
                        select += '<div data-value="" class="segmentation-option item">'+jQuery.i18n.map["configs.no-theme"]+'</div>';
                    else
                        select += '<div data-value="'+themes[i]+'" class="segmentation-option item">'+themes[i]+'</div>';
                }

            select += '</div>'+
                '</div>'+
            '</div>';
            return select;
        });
        
        //register some common system config inputs
        this.registerInput("logs-default", function(value){
            var categories = ['debug', 'info', 'warn', 'error'];
            var select = '<div class="cly-select" id="logs-default">'+
                '<div class="select-inner">'+
                    '<div class="text-container">';
            if(value && value.length)
                select += '<div class="text">'+jQuery.i18n.map["configs.logs."+value]+'</div>';
            else
                select += '<div class="text">'+Query.i18n.map["configs.logs.warn"]+'</div>';
            select += '</div>'+
                    '<div class="right combo"></div>'+
                '</div>'+
                '<div class="select-items square">'+
                    '<div>';

                for(var i = 0; i < categories.length; i++){
                    select += '<div data-value="'+categories[i]+'" class="segmentation-option item">'+jQuery.i18n.map["configs.logs."+categories[i]]+'</div>';
                }

            select += '</div>'+
                '</div>'+
            '</div>';
            return select;
        });

        this.registerInput("security-dashboard_additional_headers", function(value){
            return '<textarea rows="5" style="width:100%" id="security-dashboard_additional_headers">'+(value || "")+'</textarea>';
        });

        this.registerInput("security-api_additional_headers", function(value){
            return '<textarea rows="5" style="width:100%" id="security-api_additional_headers">'+(value || "")+'</textarea>';
        });

        this.registerInput("apps-timezone", function(value){
            return null;
        });
    },
    beforeRender: function() {
        if(this.template)
            if(this.userConfig)
                return $.when(countlyPlugins.initializeUserConfigs()).then(function () {});
            else
                return $.when(countlyPlugins.initializeConfigs()).then(function () {});
        else{
            var self = this;
            if(this.userConfig)
                return $.when($.get(countlyGlobal["path"]+'/plugins/templates/configurations.html', function(src){
                    self.template = Handlebars.compile(src);
                }), countlyPlugins.initializeUserConfigs()).then(function () {});
            else
                return $.when($.get(countlyGlobal["path"]+'/plugins/templates/configurations.html', function(src){
                    self.template = Handlebars.compile(src);
                }), countlyPlugins.initializeConfigs()).then(function () {});
        }
    },
    renderCommon:function (isRefresh) {
        if(this.reset)
            $("#new-install-overlay").show();
        if(this.userConfig)
            this.configsData = countlyPlugins.getUserConfigsData();
        else
            this.configsData = countlyPlugins.getConfigsData();
        var configsHTML;
        var title = jQuery.i18n.map["plugins.configs"];
        if(this.userConfig)
            title = jQuery.i18n.map["plugins.user-configs"];
        if(this.namespace && this.configsData[this.namespace]){
            configsHTML = this.generateConfigsTable(this.configsData[this.namespace], "-"+this.namespace);
            title = this.getInputLabel(this.namespace, this.namespace) + " " + title;
        }
        else
            configsHTML = this.generateConfigsTable(this.configsData);
        
        
        this.templateData = {
            "page-title":title,
            "configs":configsHTML,
            "namespace":this.namespace,
            "user": this.userConfig,
            "reset": this.reset
        };
        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.changes = {};
            this.cache = JSON.parse(JSON.stringify(this.configsData));
            
            $(".configs #username").val($("#menu-username").text());
            $(".configs #api-key").val($("#user-api-key").val());
            
            $("#configs-back").click(function(){
                window.history.back();
            });

            $(".boolean-selector>.button").click(function () {
                var dictionary = {"plugins.enable":true, "plugins.disable":false};
                var cur = $(this);
                if (cur.hasClass("selected")) {
                    return true;
                }
                var prev = cur.parent(".button-selector").find(">.button.selected");
                prev.removeClass("selected").removeClass("active");
                cur.addClass("selected").addClass("active");
                var id = $(this).parent(".button-selector").attr("id");
                var value = dictionary[$(this).data("localize")];
                self.updateConfig(id, value);
            });
            
            $(".configs input").keyup(function () {
                var id = $(this).attr("id");
                var value = $(this).val();
                if($(this).attr("type") == "number")
                    value = parseFloat(value);
                self.updateConfig(id, value);
            });
            
            $(".configs textarea").keyup(function () {
                var id = $(this).attr("id");
                var value = $(this).val();
                self.updateConfig(id, value);
            });
            
            $(".configs .segmentation-option").on("click", function () {
                var id = $(this).closest(".cly-select").attr("id");
                var value = $(this).data("value");
                self.updateConfig(id, value);
            });
            
            $(".configs #username").off("keyup").on("keyup",_.throttle(function() {
                if (!($(this).val().length) || $("#menu-username").text() == $(this).val()) {
                    $(".username-check").remove();
                    return false;
                }
            
                $(this).next(".required").remove();
            
                var existSpan = $("<span class='username-check red-text'>").html(jQuery.i18n.map["management-users.username.exists"]),
                    notExistSpan = $("<span class='username-check green-text'>").html("&#10004;"),
                    data = {};
                
                data.username = $(this).val();
                data._csrf = countlyGlobal['csrf_token'];
            
                var self = $(this);
                $.ajax({
                    type: "POST",
                    url: countlyGlobal["path"]+"/users/check/username",
                    data: data,
                    success: function(result) {
                        $(".username-check").remove();
                        if (result) {
                            self.after(notExistSpan.clone());
                        } else {
                            self.after(existSpan.clone());
                        }
                    }
                });
            }, 300));
            
            $(".configs #new_pwd").off("keyup").on("keyup",_.throttle(function() {
                $(".password-check").remove();
                var error = CountlyHelpers.validatePassword($(this).val());
                if (error) {
                    var invalidSpan = $("<div class='password-check red-text'>").html(error);
                    $(this).after(invalidSpan.clone());
                    return false;
                }
            }, 300));
            
            $(".configs #re_new_pwd").off("keyup").on("keyup",_.throttle(function() {
                $(".password-check").remove();
                var error = CountlyHelpers.validatePassword($(this).val());
                if (error) {
                    var invalidSpan = $("<div class='password-check red-text'>").html(error);
                    $(this).after(invalidSpan.clone());
                    return false;
                }
            }, 300));
            
            $(".configs .account-settings .input input").keyup(function () {
                $("#configs-apply-changes").removeClass("settings-changes");
                $(".configs .account-settings .input input").each(function(){
                    var id = $(this).attr("id");
                    switch(id){
                        case "username":
                            if(this.value != $("#menu-username").text())
                                $("#configs-apply-changes").addClass("settings-changes");
                            break;
                        case "api-key":
                            if(this.value != $("#user-api-key").val())
                                $("#configs-apply-changes").addClass("settings-changes");
                            break;
                        default:
                            if(this.value != "")
                                $("#configs-apply-changes").addClass("settings-changes");
                            break;
                    }
                    if($("#configs-apply-changes").hasClass("settings-changes"))
                        $("#configs-apply-changes").show();
                    else if(!$("#configs-apply-changes").hasClass("configs-changes"))
                        $("#configs-apply-changes").hide();
                });
            });
            
            $("#configs-apply-changes").click(function () {
                if(self.userConfig){
                    $(".username-check.green-text").remove();
                    if ($(".red-text").length) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["user-settings.please-correct-input"],
                            message: jQuery.i18n.map["configs.not-saved"],
                            type: "error"
                        });
                        return false;
                    }
                    var username = $(".configs #username").val(),
                        old_pwd = $(".configs #old_pwd").val(),
                        new_pwd = $(".configs #new_pwd").val(),
                        re_new_pwd = $(".configs #re_new_pwd").val(),
                        api_key = $(".configs #api-key").val();
                    
                    var ignoreError = false;
                    
                    if((new_pwd.length && re_new_pwd.length) || api_key.length || username.length){
                        ignoreError = true;
                    }
                    
                    if ((new_pwd.length || re_new_pwd.length) && !old_pwd.length) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["user-settings.old-password-match"],
                            message: jQuery.i18n.map["configs.not-saved"],
                            type: "error"
                        });
                        return true;
                    }
    
                    if (new_pwd != re_new_pwd) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["user-settings.password-match"],
                            message: jQuery.i18n.map["configs.not-saved"],
                            type: "error"
                        });
                        return true;
                    }
                    
                    if (new_pwd == old_pwd) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["user-settings.password-not-old"],
                            message: jQuery.i18n.map["configs.not-saved"],
                            type: "error"
                        });
                        return true;
                    }
    
                    $.ajax({
                        type:"POST",
                        url:countlyGlobal["path"]+"/user/settings",
                        data:{
                            "username":username,
                            "old_pwd":old_pwd,
                            "new_pwd":new_pwd,
                            "api_key":api_key,
                            _csrf:countlyGlobal['csrf_token']
                        },
                        success:function (result) {
                            var saveResult = $(".configs #settings-save-result");
    
                            if (result == "username-exists") {
                                CountlyHelpers.notify({
                                    title: jQuery.i18n.map["management-users.username.exists"],
                                    message: jQuery.i18n.map["configs.not-saved"],
                                    type: "error"
                                });
                                return true;
                            } else if (!result) {
                                CountlyHelpers.notify({
                                    title: jQuery.i18n.map["user-settings.alert"],
                                    message: jQuery.i18n.map["configs.not-saved"],
                                    type: "error"
                                });
                                return true;
                            } else {
                                if(!isNaN(parseInt(result))){
                                    $("#new-install-overlay").fadeOut();
                                    countlyGlobal["member"].password_changed = parseInt(result);
                                }
                                else if(typeof result === "string"){
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.map["user-settings.old-password-not-match"],
                                        message: jQuery.i18n.map["configs.not-saved"],
                                        type: "error"
                                    });
                                    return true;
                                }
                                $(".configs #old_pwd").val("");
                                $(".configs #new_pwd").val("");
                                $(".configs #re_new_pwd").val("");
                                $("#menu-username").text(username);
                                $("#user-api-key").val(api_key);
                                countlyGlobal["member"].username = username;
                                countlyGlobal["member"].api_key = api_key;
                            }
                            countlyPlugins.updateUserConfigs(self.changes, function(err, services){
                                if(err && !ignoreError){
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.map["configs.not-changed"],
                                        message: jQuery.i18n.map["configs.not-saved"],
                                        type: "error"
                                    });
                                }
                                else{
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.map["configs.changed"],
                                        message: jQuery.i18n.map["configs.saved"]
                                    });
                                    self.configsData = JSON.parse(JSON.stringify(self.cache));
                                    $("#configs-apply-changes").hide();
                                    self.changes = {};
                                }
                            });
                        }
                    });
                }
                else{
                    countlyPlugins.updateConfigs(self.changes, function(err, services){
                        if(err){
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["configs.not-changed"],
                                message: jQuery.i18n.map["configs.not-saved"],
                                type: "error"
                            });
                        }
                        else{
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["configs.changed"],
                                message: jQuery.i18n.map["configs.saved"]
                            });
                            self.configsData = JSON.parse(JSON.stringify(self.cache));
                            $("#configs-apply-changes").hide();
                            self.changes = {};
                        }
                    });
                }
            });
        }
    },
    updateConfig: function(id, value){
        var configs = id.split("-");
                
        //update cache
        var data = this.cache;
        for(var i = 0; i < configs.length; i++){
            if(typeof data[configs[i]] == "undefined"){
                break;
            }
            else if(i == configs.length-1){
                data[configs[i]] = value;
            }
            else{
                data = data[configs[i]];
            }
        }
        
        //add to changes
        var data = this.changes;
        for(var i = 0; i < configs.length; i++){
            if(i == configs.length-1){
                data[configs[i]] = value;
            }
            else if(typeof data[configs[i]] == "undefined"){
                data[configs[i]] = {};
            }
            data = data[configs[i]];
        }
        $("#configs-apply-changes").removeClass("configs-changes");
        if(JSON.stringify(this.configsData) != JSON.stringify(this.cache)){
            $("#configs-apply-changes").addClass("configs-changes");
        }
        else{
            this.changes = {};
        }  
        
        if($("#configs-apply-changes").hasClass("configs-changes"))
            $("#configs-apply-changes").show();
        else if(!$("#configs-apply-changes").hasClass("settings-changes"))
            $("#configs-apply-changes").hide();
    },
    generateConfigsTable: function(configsData, id){
        id = id || "";
        var first = true;
        if(id != ""){
            first = false;
        }
        var configsHTML = "";
        if(!first)
            configsHTML += "<table class='d-table help-zone-vb' cellpadding='0' cellspacing='0'>";
        for(var i in configsData){
            if(typeof configsData[i] == "object"){
                if(configsData[i] != null){
                    var label = this.getInputLabel((id+"-"+i).substring(1), i);
                    if(label)
                        configsHTML += "<tr><td>"+label+"</td><td>"+this.generateConfigsTable(configsData[i], id+"-"+i)+"</td></tr>";
                }
                else{
                    var input = this.getInputByType((id+"-"+i).substring(1), "");
                    var label = this.getInputLabel((id+"-"+i).substring(1), i);
                    if(input && label)
                        configsHTML += "<tr><td>"+label+"</td><td>"+input+"</td></tr>";
                }
            }
            else{
                var input = this.getInputByType((id+"-"+i).substring(1), configsData[i]);
                var label = this.getInputLabel((id+"-"+i).substring(1), i);
                if(input && label)
                    configsHTML += "<tr><td>"+label+"</td><td>"+input+"</td></tr>";
            }
        }
        if(!first)
            configsHTML += "</table>";
        return configsHTML;
    },
    getInputLabel: function(id, value){
        var ns = id.split("-")[0];
        if(ns != "frontend" && ns != "api" && ns != "apps" && ns != "logs" && ns != "security" && countlyGlobal["plugins"].indexOf(ns) == -1){
            return null;
        }
        var ret = "";
        if(jQuery.i18n.map["configs.help."+id])
            ret = "<span class='config-help'>"+jQuery.i18n.map["configs.help."+id]+"</span>";
        if(typeof this.predefinedLabels[id] != "undefined")
            return "<div>"+this.predefinedLabels[id]+"</div>"+ret;
        else
            return "<div>"+value+"</div>"+ret;
    },
    getInputByType: function(id, value){
        if(this.predefinedInputs[id]){
            return this.predefinedInputs[id](value);
        }
        else if(typeof value == "boolean"){
            var input = '<div id="'+id+'" class="button-selector boolean-selector">';
            if(value){
                input += '<div class="button active selected" data-localize="plugins.enable"></div>';
                input += '<div class="button" data-localize="plugins.disable"></div>';
            }
            else{
                input += '<div class="button" data-localize="plugins.enable"></div>';
                input += '<div class="button active selected" data-localize="plugins.disable"></div>';
            }
            input += '</div>';
            return input;
        }
        else if(typeof value == "number"){
            return "<input type='number' id='"+id+"' value='"+value+"'/>";
        }
        else
            return "<input type='text' id='"+id+"' value='"+value+"'/>";
    },
    registerInput: function(id, callback){
        this.predefinedInputs[id] = callback;
    },
    registerLabel: function(id, html){
        this.predefinedLabels[id] = html;
    },
    refresh:function (){
    }
});

//register views
app.pluginsView = new PluginsView();
app.configurationsView = new ConfigurationsView();
if(countlyGlobal["member"].global_admin){
    app.route('/manage/plugins', 'plugins', function () {
        this.renderWhenReady(this.pluginsView);
    });
    
    app.route('/manage/configurations', 'configurations', function () {
        this.configurationsView.namespace = null;
        this.configurationsView.reset = false;
        this.configurationsView.userConfig = false;
        this.renderWhenReady(this.configurationsView);
    });
    
    app.route('/manage/configurations/:namespace', 'configurations_namespace', function (namespace) {
        this.configurationsView.namespace = namespace;
        this.configurationsView.reset = false;
        this.configurationsView.userConfig = false;
        this.renderWhenReady(this.configurationsView);
    });
} 
app.route('/manage/user-settings', 'user-settings', function () {
    this.configurationsView.namespace = null;
    this.configurationsView.reset = false;
    this.configurationsView.userConfig = true;
    this.renderWhenReady(this.configurationsView);
});

app.route('/manage/user-settings/:namespace', 'user-settings_namespace', function (namespace) {
    if(namespace == "reset")
        this.configurationsView.reset = true;
    else
        this.configurationsView.namespace = namespace;
    this.configurationsView.userConfig = true;
    this.renderWhenReady(this.configurationsView);
});


app.addPageScript("/manage/plugins", function(){
   $("#plugins-selector").find(">.button").click(function () {
        if ($(this).hasClass("selected")) {
            return true;
        }

        $(".plugins-selector").removeClass("selected").removeClass("active");
        var filter = $(this).attr("id");
        app.activeView.filterPlugins(filter);
    });
    var plugins = countlyGlobal["plugins"].slice();
    $("#plugins-table").on("click", ".btn-plugins", function () {
        var show = false;
        var plugin = this.id.toString().replace(/^plugin-/, '');
        if($(this).hasClass("green")){
            $(this).removeClass("green").addClass("red");
            $(this).text(jQuery.i18n.map["plugins.disable"]);
            plugins.push(plugin);
        }
        else if($(this).hasClass("red")){
            $(this).removeClass("red").addClass("green");
            $(this).text(jQuery.i18n.map["plugins.enable"]);
            var index = $.inArray(plugin, plugins);
            plugins.splice(index, 1);
        }
        if(plugins.length != countlyGlobal["plugins"].length)
            show = true;
        else{
            for(var i = 0; i < plugins.length; i++){
                if($.inArray(plugins[i], countlyGlobal["plugins"]) == -1){
                    show = true;
                    break;
                }
            }
        }
        if(show)
            $(".btn-plugin-enabler").show();
        else
            $(".btn-plugin-enabler").hide();
    });
    $("#plugins-selector").on("click", ".btn-plugin-enabler", function () {
        var plugins = {};
        $(".btn-plugins").each(function(){
            var plugin = this.id.toString().replace(/^plugin-/, '');
            var state = ($(this).hasClass("green")) ? false : true;
            plugins[plugin] = state;
        })
        var text = jQuery.i18n.map["plugins.confirm"];
        var msg = {title:jQuery.i18n.map["plugins.processing"], message: jQuery.i18n.map["plugins.wait"], info:jQuery.i18n.map["plugins.hold-on"], sticky:true};
        CountlyHelpers.confirm(text, "red", function (result) {
            if (!result) {
                return true;
            }
            CountlyHelpers.notify(msg);
            app.activeView.togglePlugin(plugins);
        });
    });
});

$( document ).ready(function() {
    if(countlyGlobal["member"] && countlyGlobal["member"]["global_admin"]){
        var menu = '<a href="#/manage/plugins" class="item">'+
            '<div class="logo-icon fa fa-puzzle-piece"></div>'+
            '<div class="text" data-localize="plugins.title"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
        
        var menu = '<a href="#/manage/configurations" class="item">'+
            '<div class="logo-icon fa fa-wrench"></div>'+
            '<div class="text" data-localize="plugins.configs"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
    }
});