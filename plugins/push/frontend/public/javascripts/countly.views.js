

//register views
app.messagingDashboardView = new MessagingDashboardView();

app.route('/messaging', 'messagingDashboardView', function () {
    this.renderWhenReady(this.messagingDashboardView);
});

var settingsAppId,
    apn, gcm;

function changeApp(appId){
    settingsAppId = appId;
    if(!countlyGlobal["apps"][appId] || countlyGlobal["apps"][appId].type == "mobile"){
        $(".appmng-push").show();
    } 
    else{
        $(".appmng-push").hide();
    }

    if (!appId) { return; }

    apn = countlyGlobal['apps'][appId].apn = countlyGlobal['apps'][appId].apn || {};
    gcm = countlyGlobal['apps'][appId].gcm = countlyGlobal['apps'][appId].gcm || {};

    $("#push-apn-cert-uni-view").removeClass('fa fa-remove').removeClass('fa fa-check').addClass(apn.universal ? 'fa fa-check' : 'fa fa-remove');
    $("#view-gcm-key").html(gcm.key || '<i class="fa fa-remove"></i>');
    $("#gcm-key").val(gcm.key || '');

    $('.app-apn-cert-old')[apn.prod || apn.test ? 'show' : 'hide']();
    $('.app-apn-cert-old .dev')[apn.test ? 'show' : 'hide']();
    $('.app-apn-cert-old .prod')[apn.prod ? 'show' : 'hide']();

}

function pushAppMgmt(){
    app.localize();

    if (!settingsAppId) { return; }
    else { changeApp(settingsAppId); }

    window.pushSubmitting = false;
    $("#save-app-edit").on('click', function () {
        if (window.pushSubmitting) { return; }
        window.pushSubmitting = true;

        var certProd = $('#apns_cert_prod').val().split('.').pop().toLowerCase();
        if (certProd && $.inArray(certProd, ['p12']) == -1) {
            CountlyHelpers.alert(jQuery.i18n.map["management-applications.push-error"], "red");
            return false;
        }

        var loading = CountlyHelpers.loading(jQuery.i18n.map["management-applications.checking"]);

        var forms = 1 + (certProd ? 1 : 0),
        reactivateForm = function() {
            forms--;
            if (forms == 0) {
                window.pushSubmitting = false;
                CountlyHelpers.removeDialog(loading);
            }
            changeApp(settingsAppId);
        },
        showError = function(msg){
            CountlyHelpers.removeDialog(loading);
            CountlyHelpers.alert(msg, "red");
        };

        $.ajax({
            type:"GET",
            url:countlyCommon.API_URL + "/i/pushes/update",
            data:{
                args:JSON.stringify({
                    app_id:settingsAppId,
                    "gcm.key": $("#gcm-key").val() || undefined
                }),
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"jsonp",
            success:function (data) {
                if (data.error) {
                    showError(jQuery.i18n.map["management-applications.gcm-creds-error"]);
                    forms = 1;
                    reactivateForm();
                    return;
                }
                if (!countlyGlobal['apps'][settingsAppId].apn) countlyGlobal['apps'][settingsAppId].apn = {};
                if (!countlyGlobal['admin_apps'][settingsAppId].apn) countlyGlobal['admin_apps'][settingsAppId].apn = {};

                if (!countlyGlobal['apps'][settingsAppId].gcm) countlyGlobal['apps'][settingsAppId].gcm = {};
                if (!countlyGlobal['admin_apps'][settingsAppId].gcm) countlyGlobal['admin_apps'][settingsAppId].gcm = {};
                
                if(data.gcm){
                    countlyGlobal['apps'][settingsAppId].gcm.key = data.gcm.key;
                    countlyGlobal['admin_apps'][settingsAppId].gcm.key = data.gcm.key;
                }

                changeApp(settingsAppId);

                if (certProd) {
                    $('#add-edit-apn-creds-uni-form').find("input[name=app_id]").val(settingsAppId);
                    $('#add-edit-apn-creds-uni-form').ajaxSubmit({
                        resetForm:true,
                        beforeSubmit:function (formData, jqForm, options) {
                            formData.push({ name:'_csrf', value:countlyGlobal['csrf_token'] });
                            formData.push({ name:'api_key', value:countlyGlobal.member.api_key });
                        },
                        success:function (resp) {
                            if (!resp || resp.error) {
                                if (countlyGlobal['apps'][settingsAppId].apn) {
                                    delete countlyGlobal['apps'][settingsAppId].apn.universal;
                                    delete apn.universal;
                                }
                                showError(jQuery.i18n.map["management-applications.push-apn-creds-prod-error"] + (resp.error ? ' (' + resp.error + ')' : ''));
                            } else {
                                if (!countlyGlobal['apps'][settingsAppId].apn) {
                                    apn = countlyGlobal['apps'][settingsAppId].apn = {universal: resp};
                                } else {
                                    apn.universal = countlyGlobal['apps'][settingsAppId].apn.universal = resp;
                                }
                            }

                            reactivateForm();
                        }
                    });
                }

                reactivateForm();
            }
        });
    });
};


var managementAdd = "";
app.addPageScript("/manage/apps", function(){
    if(managementAdd == "")
        $.get(countlyGlobal["path"]+'/push/templates/push-management.html', function(src){
            managementAdd = src;
            addPushHTMLIfNeeded();
            pushAppMgmt();
        });
    else
        pushAppMgmt();
});


function addPushHTMLIfNeeded() {
    if ($('.appmng-push').length === 0) {
        $(".app-details table tr.table-edit").before(managementAdd);
        $('.appmng-push').prev().removeClass('table-edit-prev');
    }
}

app.addAppManagementSwitchCallback(function(appId, type){
    if(type == "mobile"){
        addPushHTMLIfNeeded();
        $(".appmng-push").show();
        changeApp(appId);
    } 
    else{
        $(".appmng-push").hide();
    }
});

app.addPageScript("/drill#", function(){
    if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile"){
        $("#bookmark-filter").after(
        '<div id="create-message-connector" style="display:none; float:left; height:1px; border-top:1px solid #999; width:50px; margin-top:14px; margin-left:5px;"></div>'+
        '<a class="icon-button green btn-header btn-create-message" data-localize="push.create" style="display:none"></a>');
        app.localize();
        $('.btn-create-message').off('click').on('click', function(){
            var filterData = app.drillView.getFilterObjAndByVal();
            var message = {
                apps: [countlyCommon.ACTIVE_APP_ID],
                drillConditions: countlySegmentation.getRequestData()
            };
    
            // for (var k in filterData.dbFilter) {
            //     if (k.indexOf('up.') === 0) message.conditions[k.substr(3).replace("cmp_","cmp.")] = filterData.dbFilter[k];
            // }
    
            components.push.popup.show(message);
        });
        $("#bookmark-view").on("click", ".bookmark-action.send", function() {
            var filter = $(this).data("query");
    
            var message = {
                apps: [countlyCommon.ACTIVE_APP_ID],
                platforms: [],
                drillConditions: filter
            };
    
            // for (var k in filter) {
            //     if (k.indexOf('up.') === 0) message.conditions[k.substr(3).replace("cmp_","cmp.")] = filter[k];
            // }
    
            components.push.popup.show(message);
        });
    }
});

app.addPageScript("/users#", function(){
    if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile"){
        //check if it is profile view
        if(app.activeView.updateEngagement){
            var userDetails = countlyUserdata.getUserdetails();
        
            var platforms = [], test = false, prod = false;
            if (userDetails.tk) {
                if (userDetails.tk.id || userDetails.tk.ia || userDetails.tk.ip) { platforms.push('i'); }
                if (userDetails.tk.at || userDetails.tk.ap) { platforms.push('a'); }
        
                test = !!userDetails.tk.id || !!userDetails.tk.ia || !!userDetails.tk.at;
                prod = !!userDetails.tk.ip || !!userDetails.tk.ap;
            }
            if (!$('.btn-create-message').length) {
                $('#user-profile-detail-buttons').append($('<a class="icon-button green left btn-create-message" data-localize="push.create"></a>').text(jQuery.i18n.map['push.create']));
            }
            $('.btn-create-message').show().off('click').on('click', function(){
                if (platforms.length) {
                    components.push.popup.show({
                        platforms: platforms,
                        apps: [countlyCommon.ACTIVE_APP_ID],
                        test: test && !prod,
                        userConditions: {_id: app.userdetailsView.user_id}
                    });
                } else {
                    CountlyHelpers.alert(jQuery.i18n.map["push.no-user-token"], "red");
                }
            });
        }
        else{
            //list view
            if (!$('.btn-create-message').length) {
                $('.widget-header .left').append($('<a class="icon-button green btn-header left btn-create-message" data-localize="push.create"></a>').text(jQuery.i18n.map['push.create']));
            }
            $('.btn-create-message').off('click').on('click', function(){
                //drill filter
                var filterData = app.userdataView._query || {};
                
                //known/anonymous filter
                if(app.userdataView.filter == "user-known")
                    filterData["hasInfo"] = true;
                else if(app.userdataView.filter == "user-anonymous")
                    filterData["hasInfo"] = {"$ne": true};
                
                //text search filter
                if($('.dataTables_filter input').val().length)
                    filterData["$text"] = { "$search": "\""+$('.dataTables_filter input').val()+"\"" };
                
                components.push.popup.show({
                    apps: [countlyCommon.ACTIVE_APP_ID],
                    userConditions: filterData
                });
            });
        }
    }
});

$( document ).ready(function() {

    var menu = '<a class="item messaging" id="sidebar-messaging">'+
        '<div class="logo ion-chatbox-working"></div>'+
        '<div class="text" data-localize="push.sidebar.section">Messaging</div>'+
    '</a>'+
    '<div class="sidebar-submenu" id="messaging-submenu">'+
        '<a href="#/messaging" class="item">'+
            '<div class="logo-icon fa fa-line-chart"></div>'+
            '<div class="text" data-localize="push.sidebar.overview">Overview</div>'+
        '</a>'+
    '</div>';
    if($('#mobile-type #management-menu').length)
        $('#mobile-type #management-menu').before(menu);
    else
        $('#mobile-type').append(menu);
});
