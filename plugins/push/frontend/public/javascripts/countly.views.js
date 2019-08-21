'use strict';

/* jshint undef: true, unused: true */
/* globals app, $, countlyGlobal, components, countlyCommon, countlySegmentation, countlyUserdata, CountlyHelpers, jQuery, countlyManagementView, Backbone */

app.addAppManagementView('push', jQuery.i18n.map['push.plugin-title'], countlyManagementView.extend({
    initialize: function() {
        this.plugin = 'push';
        this.templatePath = '/push/templates/push.html';
        this.resetTemplateData();
    },

    resetTemplateData: function() {
        var c = this.config();
        if (c.i && c.i._id) {
            this.templateData = {
                i: {
                    _id: c.i._id,
                    type: c.i.type,
                    key: c.i.key,
                    team: c.i.team,
                    bundle: c.i.bundle,
                    help: c.i.type === 'apn_universal' && c.i._id ? '<i class="fa fa-check-circle"></i>' + jQuery.i18n.map['mgmt-plugins.push.uploaded.p12'] : c.i.type === 'apn_token' ? '<i class="fa fa-check-circle"></i>' + jQuery.i18n.map['mgmt-plugins.push.uploaded.p8'] : ''
                    // help: '<a href="' + countlyCommon.API_URL + '/i/pushes/download/' + c.i._id + '?api_key=' + countlyGlobal.member.api_key + '">' + jQuery.i18n.map['mgmt-plugins.push.uploaded'] + '</a>. ' + (c.i.type === 'apn_universal' ? (jQuery.i18n.map['mgmt-plugins.push.uploaded.bundle'] + ' ' + c.i.bundle) : '')
                }
            };
        }
        else {
            this.templateData = {
                i: {
                    type: 'apn_token',
                    key: '',
                    team: '',
                    bundle: '',
                }
            };
        }
        this.templateData.a = {
            _id: c.a && c.a._id || '',
            key: c.a && c.a && c.a.key || '',
            help: c.a && c.a && c.a.key ? jQuery.i18n.map['mgmt-plugins.push.detected'] + ' ' + (c.a.key.length > 50 ? 'FCM' : 'GCM') : ''
        };
    },

    onChange: function(name, value) {
        if (name === 'i.type') {
            this.resetTemplateData();
            countlyCommon.dot(this.templateData, name, value);
            this.render();
        }
        else if (name === 'a.key' && value) {
            this.templateData.a.type = value.length > 100 ? 'fcm' : 'gcm';
            this.el.find('input[name="a.type"]').val(this.templateData.a.type);
        }
        else if (name === 'i.pass' && !value) {
            delete this.templateData.i.pass;
        }
    },

    isSaveAvailable: function() {
        var td = JSON.parse(JSON.stringify(this.templateData)),
            std = JSON.parse(this.savedTemplateData);

        if (td.i) {
            delete td.i.pass;
        }

        if (std.i) {
            delete std.i.pass;
        }

        return JSON.stringify(td) !== JSON.stringify(std);
    },

    validate: function() {
        var i = this.config().i || {},
            //a = this.config().a || {},
            t = this.templateData;

        if (t.i.type) {
            if (t.i.file && t.i.file.length) {
                if (t.i.type === 'apn_token') {
                    if (!t.i.key) {
                        return jQuery.i18n.map['mgmt-plugins.push.error.nokey'];
                    }
                    if (!t.i.team) {
                        return jQuery.i18n.map['mgmt-plugins.push.error.noteam'];
                    }
                    if (!t.i.bundle) {
                        return jQuery.i18n.map['mgmt-plugins.push.error.nobundle'];
                    }
                }
            }
            else {
                if (t.i.type === 'apn_token') {
                    if ((t.i.key || '') !== (i.key || '') || (t.i.team || '') !== (i.team || '') || (t.i.bundle || '') !== (i.bundle || '')) {
                        return jQuery.i18n.map['mgmt-plugins.push.error.nofile'];
                    }
                }
            }
        }
    },

    loadFile: function() {
        var data = JSON.parse(JSON.stringify(this.templateData));

        if (data.i.file) {
            if (data.i.file.indexOf('.p8') === data.i.file.length - 3) {
                data.i.fileType = 'p8';
            }
            else if (data.i.file.indexOf('.p12') === data.i.file.length - 4) {
                data.i.fileType = 'p12';
            }
            else {
                return $.Deferred().reject('File type not supported');
            }

            var d = new $.Deferred(),
                reader = new window.FileReader();

            reader.addEventListener('load', function() {
                data.i.file = reader.result;
                d.resolve({push: data});
            });
            reader.addEventListener('error', d.reject.bind(d));
            reader.readAsDataURL(this.el.find('input[name="i.file"]')[0].files[0]);

            return d.promise();
        }
        else {
            return $.when({push: data});
        }
    },

    prepare: function() {
        // var text = jQuery.i18n.map["plugins.confirm"];
        // var msg = { title: jQuery.i18n.map["plugins.processing"], message: jQuery.i18n.map["plugins.wait"], info: jQuery.i18n.map["plugins.hold-on"], sticky: true };
        // CountlyHelpers.confirm(text, "popStyleGreen popStyleGreenWide", function (result) {
        //     if (!result) {
        //         return true;
        //     }
        //     CountlyHelpers.notify(msg);
        //     app.activeView.togglePlugin(plugins);
        // },[jQuery.i18n.map["common.no-dont-continue"],jQuery.i18n.map["plugins.yes-i-want-to-apply-changes"]],{title:jQuery.i18n.map["plugins-apply-changes-to-plugins"],image:"apply-changes-to-plugins"});
        return this.loadFile().then(function(data) {
            delete data.push.i.help;
            delete data.push.a.help;

            if (!data.push.i.file && !data.push.i._id) {
                data.push.i = null;
            }
            else if (data.push.i.file) {
                delete data.push.i._id;
            }

            if (!data.push.a.key) {
                data.push.a = null;
            }


            return data;
        });
    }
}));

app.addPageScript('/drill#', function() {
    if (Array.isArray(countlyGlobal.member.restrict) && countlyGlobal.member.restrict.indexOf('#/messaging') !== -1) {
        return;
    }
    if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === 'mobile') {
        if (countlyGlobal.member.global_admin || (countlyGlobal.member.admin_of && countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1)) {
            var content =
            '<div class="item" id="action-create-message">' +
                '<div class="item-icon">' +
                    '<span class="logo ion-chatbox-working"></span>' +
                '</div>' +
                '<div class="content">' +
                    '<div class="title" data-localize="pu.send-message"></div>' +
                    '<div class="subtitle" data-localize="pu.send-message-desc"></div>' +
                '</div>' +
            '</div>';

            $('#actions-popup').append(content);
            app.localize();
            $('#action-create-message').off('click').on('click', function() {
                var message = {
                    apps: [countlyCommon.ACTIVE_APP_ID],
                    drillConditions: countlySegmentation.getRequestData()
                };

                // for (var k in filterData.dbFilter) {
                //     if (k.indexOf('up.') === 0) message.conditions[k.substr(3).replace("cmp_","cmp.")] = filterData.dbFilter[k];
                // }

                components.push.popup.show(message);
                app.recordEvent({
                    "key": "drill-action",
                    "count": 1,
                    "segmentation": {action: "push"}
                });
            });
            $('#bookmark-view').on('click', '.bookmark-action.send', function() {
                var filter = $(this).data('query');

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
        else {
            $('#drill-actions').remove('.btn-create-message');
        }
    }
});
/**
* Modify user profile views with push additions
**/
function modifyUserDetailsForPush() {
    if (Array.isArray(countlyGlobal.member.restrict) && countlyGlobal.member.restrict.indexOf('#/messaging') !== -1) {
        return;
    }
    if (Backbone.history.fragment.indexOf('manage/') === -1 && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === 'mobile') {
        //check if it is profile view
        if (app.activeView.updateEngagement) {
            var userDetails = countlyUserdata.getUserdetails();

            var tokens = [], platforms = [], test = false, prod = false;
            tokens = Object.keys(userDetails).filter(function(k) {
                return k.indexOf('tk') === 0;
            }).map(function(k) {
                return k.substr(2);
            });
            if (userDetails.tkid || userDetails.tkia || userDetails.tkip) {
                platforms.push('i');
            }
            if (userDetails.tkat || userDetails.tkap) {
                platforms.push('a');
            }

            test = !!userDetails.tkid || !!userDetails.tkia || !!userDetails.tkat;
            prod = !!userDetails.tkip || !!userDetails.tkap;

            if (tokens.length && (countlyGlobal.member.global_admin || (countlyGlobal.member.admin_of && countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1))) {
                if (!$('.btn-create-message').length) {
                    $('#user-profile-detail-buttons .cly-button-menu').append('<div class="item btn-create-message" >' + jQuery.i18n.map['push.create'] + '</div>');
                    app.activeView.resetExportSubmenu();
                }
                $('.btn-create-message').show().off('click').on('click', function() {
                    if (platforms.length) {
                        components.push.popup.show({
                            platforms: platforms,
                            apps: [countlyCommon.ACTIVE_APP_ID],
                            test: test && !prod,
                            userConditions: {_id: app.userdetailsView.user_id}
                        });
                    }
                    else {
                        CountlyHelpers.alert(jQuery.i18n.map['push.no-user-token'], 'red');
                    }
                });
                if (!$('#userdata-info > tbody > tr:last-child table .user-property-push').length) {
                    $('<tr class="user-property-push"><td class="text-left"><span>' + components.t('userdata.push') + '</span></td><td class="text-right"></td></tr>').appendTo($('#userdata-info > tbody > tr:last-child table tbody'));
                }
                $('#userdata-info > tbody > tr:last-child table .user-property-push td.text-right').html(tokens.map(function(t) {
                    return components.t('pu.tk.' + t);
                }).join('<br />'));
            }
            else {
                $('#userdata-info > tbody > tr:last-child table .user-property-push').remove();
                $('.btn-create-message').remove();
                app.activeView.resetExportSubmenu();
            }
        }
        else {
            //list view
            if (countlyGlobal.member.global_admin || (countlyGlobal.member.admin_of && countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1)) {
                if (!$('.btn-create-message').length) {
                    $('.widget-header').append($('<a class="icon-button green btn-header right btn-create-message" data-localize="push.create"></a>').text(jQuery.i18n.map['push.create']));

                }
                $('.btn-create-message').off('click').on('click', function() {
                    var q = app.userdataView.getExportQuery().query, filterData = {};
                    if (q) {
                        try {
                            filterData = JSON.parse(q);
                        }
                        catch (ignored) {
                            //ignoring error
                        }
                    }

                    components.push.popup.show({
                        apps: [countlyCommon.ACTIVE_APP_ID],
                        userConditions: filterData
                    });
                });
            }
            else {
                $('.btn-create-message').remove();
            }
        }
    }
}

app.addRefreshScript('/users#', modifyUserDetailsForPush);
app.addPageScript('/users#', modifyUserDetailsForPush);

$(document).ready(function() {
    app.addMenuForType("mobile", "reach", {code: "push", text: "push.sidebar.section", icon: '<div class="logo ion-chatbox-working"></div>', priority: 10});
    app.addSubMenuForType("mobile", "push", {code: "messaging", url: "#/messaging", text: "push.sidebar.overview", priority: 10});

    if (app.configurationsView) {
        app.configurationsView.registerLabel("push", "push.plugin-title");
        app.configurationsView.registerLabel("push.proxyhost", "push.proxyhost");
        app.configurationsView.registerLabel("push.proxyport", "push.proxyport");
    }
});