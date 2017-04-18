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
                if (!$(oSettings.nTable).hasClass("plugins-filter")) {
                    return true;
                }

                if (self.filter == "plugins-enabled") {
                    return aData[1]
                }

                if(self.filter == "plugins-disabled") {
                    return !aData[1]
                }

                return true;
            });

            this.dtable = $('#plugins-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": pluginsData,
                "aoColumns": [
                    { "mData": function(row, type){if (row.enabled) {return jQuery.i18n.map[row.code+".plugin-title"] || jQuery.i18n.map[row.code+".title"] || row.title;} else return row.title}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.name"]},
                    { "mData": function(row, type){
                        if (type == "display") {
                            var disabled = (row.prepackaged)? 'disabled' : '';
                            var input = '<div class="on-off-switch ' + disabled + '">';

                            if (row.enabled) {
                                input += '<input type="checkbox" class="on-off-switch-checkbox" id="plugin-' + row.code + '" checked ' + disabled + '>';
                            } else {
                                input += '<input type="checkbox" class="on-off-switch-checkbox" id="plugin-' + row.code + '" ' + disabled + '>';
                            }

                            input += '<label class="on-off-switch-label" for="plugin-' + row.code + '"></label>';
                            input += '<span class="text">' + jQuery.i18n.map["plugins.enable"] + '</span>';

                            return input;
                        } else {
                            return row.enabled;
                        }
                    },
                        "sType":"string", "sTitle": jQuery.i18n.map["plugins.state"], "sClass":"shrink"},
                    { "mData": function(row, type){if (row.enabled) {return jQuery.i18n.map[row.code+".plugin-description"] || jQuery.i18n.map[row.code+".description"] || row.description;} else return row.description;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.description"], "bSortable": false, "sClass": "light" },
                    { "mData": function(row, type){return row.version;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.version"], "sClass":"center", "bSortable": false },
                    { "mData": function(row, type){if(row.homepage != "") return '<a class="plugin-link" href="'+ row.homepage + '" target="_blank"><i class="ion-android-open"></i></a>'; else return "";}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.homepage"], "sClass":"shrink center", "bSortable": false }
                ]
            }));
            this.dtable.stickyTableHeaders();
            this.dtable.fnSort( [ [0,'asc'] ] );

            /*
             Make header sticky if scroll is more than the height of header
             This is done in order to make Apply Changes button visible
             */
            var navigationTop = $("#sticky-plugin-header").offset().top;
            var tableHeaderTop = $("#plugins-table").find("thead").offset().top;

            $(window).on("scroll", function(e) {
                var topBarHeight = $("#top-bar").outerHeight();
                var $fixedHeader = $("#sticky-plugin-header");

                if ($(this).scrollTop() > navigationTop - topBarHeight) {
                    var width = $("#content-container").width();
                    $fixedHeader.addClass("fixed");
                    $fixedHeader.css({width: width});

                    if (topBarHeight) {
                        $fixedHeader.css({top: topBarHeight});
                    } else {
                        $fixedHeader.css({top: 0});
                    }
                } else {
                    $fixedHeader.removeClass("fixed");
                    $fixedHeader.css({width: ""});
                }

                if (($(this).scrollTop() + $fixedHeader.outerHeight()) > tableHeaderTop) {
                    $(".sticky-header").removeClass("hide");
                } else {
                    $(".sticky-header").addClass("hide");
                }

            });

            $(window).on("resize", function(e) {
                var $fixedHeader = $("#sticky-plugin-header");

                if ($fixedHeader.hasClass("fixed")) {
                    var width = $("#content-container").width();
                    $fixedHeader.css({width: width});
                }
            });
        }
    },
    refresh:function () {},
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
        };
        this.configsData = {};
        this.cache = {};
        this.changes = {};
        
        //register some common system config inputs
        this.registerInput("apps-category", function(value){
            return null;
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
                select += '<div class="text" data-localize="configs.no-theme">'+jQuery.i18n.map["configs.no-theme"]+'</div>';
            
            select += '</div>'+
                    '<div class="right combo"></div>'+
                '</div>'+
                '<div class="select-items square">'+
                    '<div>';
                    
                for(var i = 0; i < themes.length; i++){
                    if(themes[i] == "")
                        select += '<div data-value="" class="segmentation-option item" data-localize="configs.no-theme">'+jQuery.i18n.map["configs.no-theme"]+'</div>';
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
                select += '<div class="text" data-localize="configs.logs.'+value+'">'+jQuery.i18n.map["configs.logs."+value]+'</div>';
            else
                select += '<div class="text" data-localzie="configs.logs.warn">'+Query.i18n.map["configs.logs.warn"]+'</div>';
            select += '</div>'+
                    '<div class="right combo"></div>'+
                '</div>'+
                '<div class="select-items square">'+
                    '<div>';

                for(var i = 0; i < categories.length; i++){
                    select += '<div data-value="'+categories[i]+'" class="segmentation-option item" data-localize="configs.logs.'+categories[i]+'">'+jQuery.i18n.map["configs.logs."+categories[i]]+'</div>';
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

            $('.on-off-switch input').on("change", function() {
                var isChecked = $(this).is(":checked"),
                    attrID = $(this).attr("id");

                self.updateConfig(attrID, isChecked);
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
            
                var existSpan = $("<span class='username-check red-text' data-localize='management-users.username.exists'>").html(jQuery.i18n.map["management-users.username.exists"]),
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
            
            $(".configs #usersettings_regenerate").click(function(){
                $(".configs #api-key").val(CountlyHelpers.generatePassword(32, true)).trigger("keyup");
            });
            
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
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["user-settings.old-password-match"],
                            type: "error"
                        });
                        return true;
                    }
    
                    if (new_pwd != re_new_pwd) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["user-settings.password-match"],
                            type: "error"
                        });
                        return true;
                    }

                    if (new_pwd.length && new_pwd == old_pwd) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["user-settings.password-not-old"],
                            type: "error"
                        });
                        return true;
                    }
                    
                    if (api_key.length != 32) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["user-settings.api-key-length"],
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
                                    title: jQuery.i18n.map["configs.not-saved"],
                                    message: jQuery.i18n.map["management-users.username.exists"],
                                    type: "error"
                                });
                                return true;
                            } else if (!result) {
                                CountlyHelpers.notify({
                                    title:jQuery.i18n.map["configs.not-saved"],
                                    message: jQuery.i18n.map["user-settings.alert"],
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
                                        title: jQuery.i18n.map["configs.not-saved"],
                                        message: jQuery.i18n.map[result],
                                        type: "error"
                                    });
                                    return true;
                                }
                                $("#user-api-key").val(api_key);
                                countlyGlobal["member"].api_key = api_key;
                                $(".configs #old_pwd").val("");
                                $(".configs #new_pwd").val("");
                                $(".configs #re_new_pwd").val("");
                                $("#menu-username").text(username);
                                $("#user-api-key").val(api_key);
                                countlyGlobal["member"].username = username;
                                countlyGlobal["member"].api_key = api_key;
                            }
                            if(Object.keys(self.changes).length){
                                countlyPlugins.updateUserConfigs(self.changes, function(err, services){
                                    if(err && !ignoreError){
                                        CountlyHelpers.notify({
                                            title: jQuery.i18n.map["configs.not-saved"],
                                            message: jQuery.i18n.map["configs.not-changed"],
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
                            else{
                                CountlyHelpers.notify({
                                    title: jQuery.i18n.map["configs.changed"],
                                    message: jQuery.i18n.map["configs.saved"]
                                });
                                $("#configs-apply-changes").hide();
                            }
                        }
                    });
                }
                else{
                    countlyPlugins.updateConfigs(self.changes, function(err, services){
                        if(err){
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["configs.not-saved"],
                                message: jQuery.i18n.map["configs.not-changed"],
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

            /*
                Make header sticky if scroll is more than the height of header
                This is done in order to make Apply Changes button visible
             */
            var navigationTop = $("#sticky-config-header").offset().top;

            $(window).on("scroll", function(e) {
                var topBarHeight = $("#top-bar").outerHeight();
                var $fixedHeader = $("#sticky-config-header");

                if ($(this).scrollTop() > navigationTop - topBarHeight) {
                    var width = $("#content-container").width();
                    $fixedHeader.addClass("fixed");
                    $fixedHeader.css({width: width});

                    if (topBarHeight) {
                        $fixedHeader.css({top: topBarHeight});
                    } else {
                        $fixedHeader.css({top: 0});
                    }
                } else {
                    $fixedHeader.removeClass("fixed");
                    $fixedHeader.css({width: ""});
                }
            });

            $(window).on("resize", function(e) {
                var $fixedHeader = $("#sticky-config-header");

                if ($fixedHeader.hasClass("fixed")) {
                    var width = $("#content-container").width();
                    $fixedHeader.css({width: width});
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
            ret = "<span class='config-help' data-localize='configs.help."+id+"'>"+jQuery.i18n.map["configs.help."+id]+"</span>";
        if(typeof this.predefinedLabels[id] != "undefined")
            return "<div data-localize='"+this.predefinedLabels[id]+"'>"+jQuery.i18n.map[this.predefinedLabels[id]]+"</div>"+ret;
        else if(jQuery.i18n.map["configs."+id])
            return "<div data-localize='configs."+id+"'>"+jQuery.i18n.map["configs."+id]+"</div>"+ret;
        else if(jQuery.i18n.map[id.replace("-", ".")])
            return "<div data-localize='"+id.replace("-", ".")+"'>"+jQuery.i18n.map[id.replace("-", ".")]+"</div>"+ret;
        else
            return "<div>"+value+"</div>"+ret;
    },
    getInputByType: function(id, value){
        if(this.predefinedInputs[id]){
            return this.predefinedInputs[id](value);
        }
        else if(typeof value == "boolean"){
            var input = '<div class="on-off-switch">';

            if (value) {
                input += '<input type="checkbox" name="on-off-switch" class="on-off-switch-checkbox" id="' + id + '" checked>';
            } else {
                input += '<input type="checkbox" name="on-off-switch" class="on-off-switch-checkbox" id="' + id + '">';
            }

            input += '<label class="on-off-switch-label" for="' + id + '"></label>';
            input += '<span class="text">' + jQuery.i18n.map["plugins.enable"] + '</span>';

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

    var plugins = _.clone(countlyGlobal["plugins"]);

    $("#plugins-table").on("change", ".on-off-switch input", function () {
        var $checkBox = $(this),
            plugin = $checkBox.attr("id").replace(/^plugin-/, '');

        if ($checkBox.is(":checked")) {
            plugins.push(plugin);
            plugins = _.uniq(plugins);
        } else {
            plugins = _.without(plugins, plugin);
        }

        if (_.difference(countlyGlobal["plugins"], plugins).length == 0 &&
            _.difference(plugins, countlyGlobal["plugins"]).length == 0) {
            $(".btn-plugin-enabler").hide();
        } else {
            $(".btn-plugin-enabler").show();
        }
    });

    $(document).on("click", ".btn-plugin-enabler", function () {
        var plugins = {};

        $("#plugins-table").find(".on-off-switch input").each(function() {
            var plugin = this.id.toString().replace(/^plugin-/, ''),
                state = ($(this).is(":checked")) ? true : false;

            plugins[plugin] = state;
        });

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