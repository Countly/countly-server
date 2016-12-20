'use strict';

/* jshint undef: true, unused: true */
/* globals m, app, $, countlyGlobal, components, countlyCommon, countlySegmentation, countlyUserdata, CountlyHelpers, jQuery */


function addPushHTMLIfNeeded() {
    if ($('.appmng-push').length === 0) {
        $(".app-details table tr.table-edit").before('<tr class="appmng-push help-zone-vs" data-help-localize="help.manage-apps.push-apn-certificate">' +
            '<td data-localize="management-applications.push-apn-creds"></td>' +
            '<td id="app-apn">' +
            '</td>' +
        '</tr>' +
        '<tr class="table-edit-prev appmng-push help-zone-vs" data-help-localize="help.manage-apps.push-gcm-key">' +
            '<td data-localize="management-applications.push-gcm-creds"></td>' +
            '<td id="app-gcm">' +
            '</td>' +
        '</tr>');
        $('.appmng-push').prev().removeClass('table-edit-prev');
    }
}

var apnCtrl, gcmCtrl;

app.addAppManagementSwitchCallback(function(appId, type){
    if (type == "mobile") {
        addPushHTMLIfNeeded();
        apnCtrl = m.mount($('#app-apn')[0], window.components.credentials.app_component('apn', countlyGlobal.apps[appId] || {}));
        gcmCtrl = m.mount($('#app-gcm')[0], window.components.credentials.app_component('gcm', countlyGlobal.apps[appId] || {}));
        $(".appmng-push").show();
    } else {
        $(".appmng-push").hide();
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
            if (tokens.length) {
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
            if (!$('.btn-create-message').length) {
                $('.widget-header .left').append($('<a class="icon-button green btn-header left btn-create-message" data-localize="push.create"></a>').text(jQuery.i18n.map['push.create']));
            }
            $('.btn-create-message').off('click').on('click', function(){
                //drill filter
                var filterData = app.userdataView._query || {};
                
                //known/anonymous filter
                if(app.userdataView.filter == "user-known")
                    filterData.hasInfo = true;
                else if(app.userdataView.filter == "user-anonymous")
                    filterData.hasInfo = {"$ne": true};
                
                //text search filter
                if($('.dataTables_filter input').val().length)
                    filterData.$text = { "$search": "\""+$('.dataTables_filter input').val()+"\"" };
                
                components.push.popup.show({
                    apps: [countlyCommon.ACTIVE_APP_ID],
                    userConditions: filterData
                });
            });
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
