'use strict';

/* jshint undef: true, unused: true */
/* globals m, app, $, countlyGlobal, components, countlyCommon, countlySegmentation, countlyUserdata, CountlyHelpers, jQuery */

var pushHtml = '<tr class="appmng-push help-zone-vs" data-help-localize="help.manage-apps.push-apn-certificate">' +
            '<td data-localize="management-applications.push-apn-creds"></td>' +
            '<td class="app-apn">' +
            '</td>' +
        '</tr>' +
        '<tr class="table-edit-prev appmng-push help-zone-vs" data-help-localize="help.manage-apps.push-gcm-key">' +
            '<td data-localize="management-applications.push-gcm-creds"></td>' +
            '<td class="app-gcm">' +
            '</td>' +
        '</tr>';

function addPushHTMLIfNeeded(type) {
    if ($('.appmng-push').length === 0) {
        $("#view-app table tr.table-edit").before(pushHtml);
        $('.appmng-push').prev().removeClass('table-edit-prev');
    }
}

var apnCtrl, gcmCtrl;

app.addAppManagementSwitchCallback(function(appId, type){
    $("#add-new-app .appmng-push").hide();
    if (type == "mobile") {
        addPushHTMLIfNeeded(type);
        apnCtrl = m.mount($('#view-app .app-apn')[0], window.components.credentials.app_component('apn', countlyGlobal.apps[appId] || {}));
        gcmCtrl = m.mount($('#view-app .app-gcm')[0], window.components.credentials.app_component('gcm', countlyGlobal.apps[appId] || {}));
        $("#view-app .appmng-push").show();
    } else {
        $("#view-app .appmng-push").hide();
        apnCtrl = gcmCtrl = null;
    }
});

app.addAppAddTypeCallback(function(type){
    if (type == "mobile") {
        if (type === 'mobile' && $('#add-new-app .appmng-push').length === 0) {
            $('#add-new-app tr[data-help-localize="help.manage-apps.app-icon"]').after(pushHtml);
            app.localize();
        }
        apnCtrl = m.mount($('#add-new-app .app-apn')[0], window.components.credentials.app_component('apn', {}));
        gcmCtrl = m.mount($('#add-new-app .app-gcm')[0], window.components.credentials.app_component('gcm', {}));
        $("#add-new-app .appmng-push").show();
    } else {
        $("#add-new-app .appmng-push").hide();
        apnCtrl = gcmCtrl = null;
    }
});

app.addAppObjectModificator(function(args){
    if (apnCtrl && apnCtrl.creds._id()) {
        args.apn = [apnCtrl.creds.toJSON()];
    } else {
        delete args.apn;
    }
    if (gcmCtrl && gcmCtrl.creds._id()) {
        args.gcm = [gcmCtrl.creds.toJSON()];
    } else {
        delete args.gcm;
    }
});

app.addPageScript("/drill#", function(){
    if(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type == "mobile"){
        if (countlyGlobal.member.global_admin || (countlyGlobal.member.admin_of && countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1)) {
            $("#drill-actions").append('<a class="link icon-button light btn-create-message"><i class="ion-chatbox-working"></i><span data-localize="push.create"></span></a>');
            app.localize();
            $('.btn-create-message').off('click').on('click', function(){
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
                    drillConditions: filter
                };
            
                // for (var k in filter) {
                //     if (k.indexOf('up.') === 0) message.conditions[k.substr(3).replace("cmp_","cmp.")] = filter[k];
                // }
            
                components.push.popup.show(message);
            });
        } else {
            $('#drill-actions').remove('.btn-create-message');
        }
    }
});

function modifyUserDetailsForPush () {
    if (Backbone.history.fragment.indexOf('manage/') === -1 && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type == 'mobile') {
        //check if it is profile view
        if (app.activeView.updateEngagement) {
            var userDetails = countlyUserdata.getUserdetails();

            var tokens = [], platforms = [], test = false, prod = false;
            if (userDetails.tk) {
                tokens = Object.keys(userDetails.tk);
                if (userDetails.tk.id || userDetails.tk.ia || userDetails.tk.ip) { platforms.push('i'); }
                if (userDetails.tk.at || userDetails.tk.ap) { platforms.push('a'); }
        
                test = !!userDetails.tk.id || !!userDetails.tk.ia || !!userDetails.tk.at;
                prod = !!userDetails.tk.ip || !!userDetails.tk.ap;
            }
            if (tokens.length && (countlyGlobal.member.global_admin || (countlyGlobal.member.admin_of && countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1))) {
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
                if (!$('#userdata-info > tbody > tr:last-child table .user-property-push').length) {
                    $('<tr class="user-property-push"><td class="text-left"><span>' + components.t('userdata.push') + '</span></td><td class="text-right"></td></tr>').appendTo($('#userdata-info > tbody > tr:last-child table tbody'));
                }
                $('#userdata-info > tbody > tr:last-child table .user-property-push td.text-right').html(tokens.map(function(t){ return components.t('pu.tk.' + t); }).join('<br />'));
            } else {
                $('#userdata-info > tbody > tr:last-child table .user-property-push').remove();
                $('.btn-create-message').remove();
            }
        } else {
            //list view
            if (countlyGlobal.member.global_admin || (countlyGlobal.member.admin_of && countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1)) {
                if (!$('.btn-create-message').length) {
                    $('.widget-header .left').append($('<a class="icon-button green btn-header left btn-create-message" data-localize="push.create"></a>').text(jQuery.i18n.map['push.create']));
                    
                }
                $('.btn-create-message').off('click').on('click', function(){
                    var q = app.userdataView.getExportQuery().query, filterData = {};
                    if (q) {
                        try {
                            filterData = JSON.parse(q);
                        } catch (ignored) {}
                    }
                    
                    components.push.popup.show({
                        apps: [countlyCommon.ACTIVE_APP_ID],
                        userConditions: filterData
                    });
                });
            } else {
                $('.btn-create-message').remove();
            }
        }
    }
}

app.addRefreshScript("/users#", modifyUserDetailsForPush);
app.addPageScript("/users#", modifyUserDetailsForPush);

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
