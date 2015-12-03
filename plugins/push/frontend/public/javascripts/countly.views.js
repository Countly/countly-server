window.MessagingDashboardView = countlyView.extend({
    showOnGraph: 3,
    initialize:function () {
    },
    beforeRender: function() {
        if (this.template) {
            return $.when(countlySession.initialize(), countlyUser.initialize(), countlyPushEvents.initialize(), countlyPush.initialize(), typeof countlyGeo === 'undefined' ? {} : countlyGeo.initialize()).then(function () {});
        } else {
            var self = this;
            return $.when($.get(countlyGlobal["path"]+'/push/templates/messaging-dashboard.html', function(src){
                self.template = Handlebars.compile(src);
            }), countlySession.initialize(), countlyUser.initialize(), countlyPushEvents.initialize(), countlyPush.initialize(), typeof countlyGeo === 'undefined' ? {} : countlyGeo.initialize()).then(function () {});
        }
    },
    renderCommon:function (isRefresh) {
        var sessionData = countlySession.getSessionData(),
            messUserDP = countlySession.getMsgUserDPActive(),
            pushDP = countlyPushEvents.getDashDP(),
            pushSummary = countlyPushEvents.getDashSummary(),
            templateData = {};

        templateData["page-title"] = countlyCommon.getDateRange();
        templateData["logo-class"] = "sessions";
        templateData["push_short"] = countlyPush.getMessagesForCurrApp();

        templateData["big-numbers"] = pushSummary;

        var secondary = [sessionData.usage['total-users'], sessionData.usage['messaging-users']];
        secondary[0].title = jQuery.i18n.map["common.total-users"];
        secondary[0].id = "draw-total-users";
        secondary[0].help = "dashboard.total-users";
        secondary[1].title = jQuery.i18n.map["common.messaging-users"];
        secondary[1].id = "draw-messaging-users";
        secondary[1].help = "dashboard.messaging-users";
        templateData["big-numbers-secondary"] = secondary;

        var enabling = 0, sent = 0, delivery = 0, action = 0;
        if (sessionData.usage['total-users'].total) {
            enabling = Math.round(100 * (sessionData.usage['messaging-users'].total / sessionData.usage['total-users'].total));
        }
        for (var i in pushDP.chartDP[0].data) {
            sent += pushDP.chartDP[0].data[i][1];
        }
        for (var i in pushDP.chartDP[1].data) {
            delivery += pushDP.chartDP[1].data[i][1];
        }
        for (var i in pushDP.chartDP[2].data) {
            action += pushDP.chartDP[2].data[i][1];
        }
        delivery = delivery ? Math.round(100 * delivery / sent) : 0;
        action = action ? Math.round(100 * action / sent) : 0;
        templateData["big-numbers-intermediate"] = [
            {
                percentage: enabling + '%',
                title: jQuery.i18n.map['push.rate.enabling'],
                help: 'dashboard.push.enabling-rate' },
            {
                percentage: delivery + '%',
                title: jQuery.i18n.map['push.rate.delivery'],
                help: 'dashboard.push.delivery-rate' },
            {
                percentage: action + '%',
                title: jQuery.i18n.map['push.rate.action'],
                help: 'dashboard.push.actions-rate' }
        ];

        this.templateData = templateData;

        $(this.el).html(this.template(this.templateData));
        countlyCommon.drawTimeGraph(pushDP.chartDP, "#dashboard-graph");
        countlyCommon.drawTimeGraph(messUserDP.chartDP, "#dashboard-graph-secondary");

        if (isRefresh) {
            CountlyHelpers.setUpDateSelectors(this);
            app.localize();
        }
    },
    refresh:function () {
        $.when(this.beforeRender()).then(this.renderCommon.bind(this, true));
    },
    dateChanged: function() {
        this.refresh();
    }
});

window.MessagingListView = countlyView.extend({
    template: null,
    initialize:function () {
    },
    beforeRender: function() {
        if(this.template)
            return $.when(countlyPush.initialize(), typeof countlyGeo === 'undefined' ? {} : countlyGeo.initialize()).then(function () {});
        else{
            var self = this;
            return $.when($.get(countlyGlobal["path"]+'/push/templates/messaging-list.html', function(src){
                self.template = Handlebars.compile(src);
            }), countlyPush.initialize(), typeof countlyGeo === 'undefined' ? {} : countlyGeo.initialize()).then(function () {});
        }
    },
    renderTable:function (isRefresh) {
        var pushes = countlyPush.getAllMessages();

        $.fn.dataTableExt.oStdClasses.sWrapper = "dataTableOne_wrapper message-list";
        this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": pushes,
            "aoColumns": [
                { "mData": "messagePerLocale", "mRender": CountlyHelpers.clip(CountlyHelpers.messageText), "sTitle": jQuery.i18n.map["push.table.message"] },
                { "mData": "apps", sType:"string", "mRender": CountlyHelpers.clip(CountlyHelpers.appIdsToNames), "sTitle": jQuery.i18n.map["push.table.app-names"] },
                { "mData": "percentDelivered", sType:"string", "mRender": function(d, type, data){
                    return '<div class="bar" data-desc="' + d + '%">' +
                                '<div class="bar-inner" style="width:' + data.percentDelivered + '%;" data-item="' + data.percentDelivered + '%"></div>' +
                                '<div class="bar-inner" style="width:' + data.percentNotDelivered + '%;" data-item="' + data.percentNotDelivered + '%"></div> ' +
                            '</div>' +
                            '<div class="percent-text">' + jQuery.i18n.prop('push.count.sent', data.percentDelivered, data.result.sent) + '</div>';
                }, "sTitle": jQuery.i18n.map["push.table.delivered"] },
                { "mData": "result", sType:"string", "mRender":function(d, type, data) { 
                    if (data.sending && d.found) {
                        return '<div class="bar" data-desc="' + d + '%">' +
                                 '<div class="bar-inner" style="width:' + data.percentSent + '%;" data-item="' + data.percentSent + '%"></div>' +
                                 '<div class="bar-inner" style="width:' + data.percentNotSent + '%;" data-item="' + data.percentNotSent + '%"></div> ' +
                             '</div>' +
                             '<div class="percent-text">' + jQuery.i18n.prop('push.count.sending', data.percentSent, d.found - (d.processed - d.sent)) + '</div>';
                    } else {
                        return '<span data-localize="push.message.status.' + d.status + '"></span>';
                    }
                }, "sTitle": jQuery.i18n.map["push.table.status"] },
                { "mData": "local.created", sType:"date", "sTitle": jQuery.i18n.map["push.table.created"] },
                { "mData": "local", sType:"string", "sTitle": jQuery.i18n.map["push.table.sent-scheduled"], mRender: function(local){
                    return local.sent ? local.sent : local.date;
                } }
            ],
            "aaSorting": [[4, 'desc']],
            "fnCreatedRow": function(row, data, i) {
                $(row).attr('data-mid', data._id);
            }
        }));

        $.fn.dataTableExt.oStdClasses.sWrapper = "dataTableOne_wrapper";

        // $('.d-table').dataTable().api().rows().each(function(row, i){
        //     $(row.node()).attr('data-mid', row.data()._id);
        // });

        // $('.d-table').find('tr').each(function(i, tr){
        //     if (i > 0) $(tr).attr('data-mid', pushes[i - 1]._id);
        // });

        $(".d-table").stickyTableHeaders();

        $('.btn-create-message').off('click').on('click', PushPopup.bind(window, undefined, undefined));
        $('.d-table tr:not(.push-no-messages)').off('click').on('click', function(){
            var mid = $(this).attr('data-mid');
            for (var i in pushes) if (pushes[i]._id === mid) {
                PushPopup(pushes[i]);
                return;
            }
        });
    },
    renderCommon:function (isRefresh) {
        if (!isRefresh) {
            $('#content').html(this.template({
                'logo-class': 'logo',
                'page-title': jQuery.i18n.map["push.page-title"]
            }));
        }

        this.renderTable();

        if (isRefresh) {
            CountlyHelpers.setUpDateSelectors(this);
            app.localize();
        }
    },
    refresh: function(){
        $.when(this.beforeRender()).then(this.renderCommon.bind(this, true));
    },
    dateChanged: function() {
        this.refresh();
    }
});

var PushPopup = function(message, duplicate, dontReplaceApp) {
    var allApps = {}, hasPushApps = false, hasPushAdminApps = false, APN = 'i', GCM = 'a',
        languages = countlyGlobalLang['languages'],
        locales;

    for (var id in countlyGlobal['apps']) {
        var a = countlyGlobal['apps'][id];
        if ((a.apn && (a.apn.test || a.apn.prod)) || (a.gcm && a.gcm.key)) {
            hasPushApps = true;
            if (countlyGlobal['admin_apps'][a._id]) {
                hasPushAdminApps = true;
                allApps[a._id] = a;
            }
        }
    }

    currentApp = allApps[countlyCommon.ACTIVE_APP_ID];

    if (!hasPushApps) {
        CountlyHelpers.alert(jQuery.i18n.map["push.no-apps"], "red");
        return;
    } else if (!hasPushAdminApps) {
        CountlyHelpers.alert(jQuery.i18n.map["push.no-apps-admin"], "red");
        return;
    }

    if (!currentApp || !((currentApp.apn && (currentApp.apn.test || currentApp.apn.prod)) || (currentApp.gcm && currentApp.gcm.key))) {
        if (dontReplaceApp) {
            CountlyHelpers.alert(jQuery.i18n.map["push.no-app"], "red");
            return;
        } else {
            for (var a in allApps) { currentApp = allApps[a]; }
        }
    }

    if (message) {
        message = {
            _id: message._id,
            duplicate: message,
            type: message.type || 'message',
            apps: message.apps.slice(0),
            appNames: [],
            platforms: message.platforms.slice(0),
            appsPlatforms: [],
            messagePerLocale: _.extend({}, message.messagePerLocale),
            locales: _.extend({}, message.locales),
            sound:  duplicate ? message.sound : !!message.sound,
            update: duplicate ? message.update : !!message.update,
            review: duplicate ? message.review : !!message.review,
            badge: duplicate ? message.badge : typeof message.badge === 'undefined' ? false : true,
            data: duplicate ? message.data : typeof message.data === 'undefined' ? false : true,
            url: duplicate ? message.url : typeof message.url === 'undefined' ? false : true,
            test: message.test,
            date: message.date,
            sent: message.sent,
            conditions: message.conditions === '{}' ? undefined : (typeof message.conditions === 'string' ? JSON.parse(message.conditions) : message.conditions),
            geo: typeof message.geo === 'undefined' ? undefined : ((typeof message.geo === 'string' && message.geo) ? message.geo : undefined),
            noTests: false,
            noApps: false,
            noPlatforms: false
        }
        for (var i in message.apps) for (var a in allApps) if (allApps[a]._id === message.apps[i]) message.appNames.push(allApps[a].name);
        if (message.conditions && message.conditions._id) {
            message.noTests = true;
            message.noApps = true;
            message.noPlatforms = true;
        }
    } else {
        message = {
            type: 'message',
            apps: [currentApp._id],
            appNames: [currentApp.name],
            platforms: [],
            appsPlatforms: [],
            messagePerLocale: {
                "default": ''
            },
            sound: true,
            noTests: false,
            noApps: false,
            noPlatforms: false
       };
    }

    var dialog = $("#cly-popup").clone().removeAttr("id").addClass('push-create');
    dialog.find(".content").html($('#push-create').html());

    var content = dialog.find('.content');

    app.localize(content);

    // View, Create, or Duplicate
    var isView = message._id && !duplicate;
    if (isView) {
        content.find('.create-header').hide();
    } else {
        content.find('.view-header').hide();
    }

    // geos
    if (typeof countlyGeo !== 'undefined') {
        var geos = countlyGeo.getAll();
        if (geos.length) {
            var all = content.find('.geos .select-items > div'), doesntMatter = content.find('.geos .select-items > div').text();
            for (var k in geos) {
                all.append($('<div data-value="' + geos[k]._id + '" class="item">' + geos[k].title + '</div>'));
                if (message.geo === geos[k]._id) {
                    content.find('.geos .cly-select .text').text(geos[k].title);
                }
            }
            if (!message.geo) {
                content.find('.geos .cly-select .text').text(doesntMatter);
            }
            content.find(".geos .cly-select .text").on('changeData', function(e){
                message.geo = $(this).data('value');
                setDeviceCount();
            });
        } else {
            content.find('.divide-three.create-header').removeClass('.divide-three');
            content.find('.create-header .field.geos').remove();
        }
    } else {
        var geos = content.find('.field.geos');
        geos.parent().removeClass('divide-three').addClass('divide');
        geos.remove();
    }

    // Apps
    if (isView) {
        content.find('.view-apps .view-value').text(message.appNames.join(', '));
    } else {
        if (message.noApps) {
            content.find('.field.apps').hide();
        }

        content.find(".select-apps").on('click', function(ev){
            if ($('#listof-apps').length) {
                $('#listof-apps').remove();
            } else {
                var pos = $(this).offset();
                pos.top = pos.top + 46 - content.offset().top;
                pos.left = pos.left - 18 - content.offset().left;
                showAppsSelector(pos);
            }
        });

        showChangedApps();

        function showAppsSelector(pos) {
            $('#listof-apps').remove();

            var listofApps = $('<div id="listof-apps"><div class="tip"></div><div class="scrollable"></div><div class="button-container"><a class="icon-button dark btn-done">' + jQuery.i18n.map["common.done"] + '</a><a class="icon-button dark btn-select-all">' + jQuery.i18n.map["common.select-all"] + '</a><a class="icon-button dark btn-deselect-all">' + jQuery.i18n.map["common.deselect-all"] + '</a></div></div>').hide(),
                listofAppsScrollable = listofApps.find('.scrollable');
                ap = function(app){
                    return $('<div class="app" data-app-id="' + app._id + '"><div class="image" style="background-image: url(\'/files/' + app._id + '.png\');"></div><div class="name">' + app.name + '</div><input class="app_id" type="hidden" value="{{this._id}}"/></div>');
                };

            for (var id in allApps) {
                var app = allApps[id], el = ap(app);
                el.on('click', function(){
                    var self = $(this),
                        id = self.attr('data-app-id'),
                        selected = ! self.hasClass('selected');
                    if (selected) {
                        addToArray(id, message.apps);
                        addToArray(allApps[id].name, message.appNames);
                    } else {
                        removeFromArray(id, message.apps);
                        removeFromArray(allApps[id].name, message.appNames);
                    }
                    self.toggleClass('selected');
                    showChangedApps();
                })
                if (message.apps.indexOf(app._id) !== -1) el.addClass('selected');
                listofAppsScrollable.append(el);
            };

            listofApps.find('.btn-select-all').on('click', function(ev) {
                ev.preventDefault();

                message.apps = [];
                message.appNames = [];
                for (var i in allApps) {
                    message.apps.push(allApps[i]._id);
                    message.appNames.push(allApps[i].name);
                }
                showChangedApps();
                $(this).hide();
                listofApps.find(".btn-deselect-all").show();
            });

            listofApps.find('.btn-deselect-all').on('click', function(ev) {
                ev.preventDefault();

                message.apps = [];
                message.appNames = [];
                showChangedApps();
                $(this).hide();
                listofApps.find(".btn-select-all").show();
            });

            listofApps.find('.btn-done').on('click', function (ev) {
                ev.preventDefault();

                fillAppsPlatforms();
                showPlatforms();

                listofApps.remove();
            });

            if (message.apps.length === lengthOfObject(allApps)) {
                listofApps.find('.btn-select-all').hide();
                listofApps.find('.btn-deselect-all').show();
            }

            // return listofApps;
            // content.find('.app-list-names').text(message.appNames.join(', '));
            listofApps.appendTo(content).offset(pos).show();
            // $(body).offset(buttonPos).append(listofApps);

            // listofAppsScrollable.slimScroll({
            //     height: '100%',
            //     start: 'top',
            //     wheelStep: 10,
            //     position: 'right'
            // });

        }
    }

    // Check APN / GCM credentials and set platform buttons accordingly
    if (isView) {
        if (!hasInArray(APN, message.platforms)) content.find('.view-platforms .ios').hide();
        if (!hasInArray(GCM, message.platforms)) content.find('.view-platforms .android').hide();
    } else {
        fillAppsPlatforms(duplicate);

        if (message.noPlatforms) {
            content.find('.field.platforms').hide();
        }

        if (!message.platforms.length) {
            return false;
        }

        dialog.find('.push-platform').on('click', function (ev){
            ev.preventDefault();

            var platform = $(this).attr('data-platform');

            if (hasInArray(platform, message.platforms)) {
                removeFromArray(platform, message.platforms);
            } else {
                addToArray(platform, message.platforms);
            }
            showPlatforms();
        });

        showPlatforms();
    }

    // Set up message type select
    var heights = {
        message: 540,
        update: 540,
        review: 540,
        data: 378,
        link: 613,
        category: 613
    };
    if (message.noPlatforms && message.noApps) for (var k in heights) heights[k] -= 90;

    if (isView) {
        content.find('.view-type .view-value').text(jQuery.i18n.map['push.type.' + message.type]);
        // CountlyHelpers.changeDialogHeight(dialog, 470);
        // setTimeout(CountlyHelpers.changeDialogHeight.bind(CountlyHelpers, dialog, dialog.height(), undefined), 20);
        setTimeout(CountlyHelpers.changeDialogHeight.bind(CountlyHelpers, dialog, message.type == 'data' ? 310 : 470), 20);
    } else {
        CountlyHelpers.initializeSelect(content);

        content.find(".type .cly-select .text").on('changeData', function(e){
            setMessageType($(this).data('value'));
        });

        var link = content.find('.field.link'),
            category = content.find('.field.category'),
            msg = content.find('.field.msg'),
            sound = content.find('.extra-sound-check').parents('tr'),
            badge = content.find('.extra-badge-check').parents('tr'),
            data = content.find('.extra-data-check').parents('tr');

        if (message.type == 'link') {
            link.find('.push-link').val(message.url);
        }

        if (message.type == 'category') {
            category.find('.push-category').val(message.category);
        }

        function setMessageType(type) {
            message.type = type;
            content.find('.type .cly-select .text').text(jQuery.i18n.map['push.type.' + type]);

            if (type === 'message' || type === 'update' || type === 'review') {
                link.slideUp();
                category.slideUp();
                msg.slideDown();
                sound.slideDown();
                badge.slideDown();
                data.slideDown();
            } else if (type === 'data') {
                link.slideUp();
                category.slideUp();
                msg.slideUp();
                sound.slideDown();
                badge.slideDown();
                data.slideDown();
            } else if (type === 'link') {
                link.slideDown();
                category.slideUp();
                msg.slideDown();
                sound.slideDown();
                badge.slideDown();
                data.slideDown();
            } else if (type === 'category') {
                link.slideUp();
                category.slideDown();
                msg.slideDown();
                sound.slideDown();
                badge.slideDown();
                data.slideDown();
            }

            checkMessageForSendButton();

            CountlyHelpers.changeDialogHeight(dialog, heights[type], true);
        }

        setTimeout(setMessageType.bind(this, message.type), 20);
    }

    // Date / send later
    if (isView) {
        var fmt = 'MMM DD, YYYY HH:mm';
        content.find('.view-date .view-value').text(message.date ? moment(message.date).format(fmt) : '');
        content.find('.view-sent .view-value').text(message.sent ? moment(message.sent).format(fmt) : '');
    } else {
        //ignore clicks inside calendar
        content.find(".date-picker-push").click(function(e){
            e.stopPropagation();
        });
        var hidePicker = function(e){
            $(document.body).off('click', hidePicker);
            content.find(".date-picker-push").hide();
        };

        function setTimeText() {
            var laterText = moment(content.find(".send-later-datepicker").datepicker("getDate")).format("DD.MM.YYYY");
            laterText += ", " + content.find(".time-picker-push").find("span.active").text();

            content.find(".send-later-date").text(laterText);
            content.find(".send-later-date").data("timestamp", moment(laterText, "DD.MM.YYYY, H:mm").unix());
        }

        function initTimePicker(isToday) {
            var timeSelected = false;
            content.find(".time-picker-push").html("");

            if (isToday) {
                var currHour = parseInt(moment().format("H"), 10),
                    currMin = parseInt(moment().format("m"), 10),
                    timePickerStartHour = moment().format("H");

                if (currMin < 30) {
                    content.find(".time-picker-push").append('<span class="active">' + timePickerStartHour + ':30</span>');
                    timeSelected = true;
                }

                timePickerStartHour = currHour + 1;
            } else {
                timePickerStartHour = 0;
            }

            for (; timePickerStartHour <= 23; timePickerStartHour++) {
                if (timeSelected) {
                    content.find(".time-picker-push").append('<span>' + timePickerStartHour + ':00</span>');
                } else {
                    content.find(".time-picker-push").append('<span class="active">' + timePickerStartHour + ':00</span>');
                    timeSelected = true;
                }

                content.find(".time-picker-push").append('<span>' + timePickerStartHour + ':30</span>');
            }
        }

        content.find(".send-later-datepicker").datepicker({
            numberOfMonths:1,
            showOtherMonths:true,
            minDate:new Date(),
            onSelect:function (selectedDate) {
                var instance = $(this).data("datepicker"),
                    date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);

                if (moment(date).format("DD-MM-YYYY") == moment().format("DD-MM-YYYY")) {
                    initTimePicker(true);
                } else {
                    initTimePicker();
                }
            }
        });

        content.find(".send-later-datepicker").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

        initTimePicker(true);

        // content.find(".send-later").next('label').on("click", content.find(".send-later").trigger.bind(content.find(".send-later"), "click"));
        content.find(".send-later").on("click", function (e) {
            if ($(this).is(":checked")) {
                content.find(".date-picker-push").show();
                setTimeText();
                $(document.body).off('click', hidePicker).on('click', hidePicker);
            } else {
                content.find(".date-picker-push").hide();
                content.find(".send-later-date").text("");
            }

            e.stopPropagation();
        });

        content.find(".send-later-date").on('click', function(e){
            e.stopPropagation();

            $(document.body).off('click', hidePicker);

            if (content.find(".date-picker-push").is(':visible')) {
                content.find(".date-picker-push").hide();
            } else {
                content.find(".date-picker-push").show();
                $(document.body).on('click', hidePicker);
            }
        });

        content.find(".time-picker-push").on("click", "span", function() {
            content.find(".time-picker-push").find("span").removeClass("active");
            $(this).addClass("active");
            setTimeText();
        });
    }

    // Locales / message
    // {
        message.usedLocales = {};
        var ul = content.find('.locales ul'),
            txt = content.find('.msg textarea'),
            li = function(percentage, locale, title){
                var el = $('<li data-locale="' + locale + '"><span class="percentage">' + percentage + '%</span><span class="locale">' + title + '</span><span class="fa fa-check"></span>' + (locale === 'default' ? '' :  ' <span class="fa fa-remove"></span>') + '</li>')
                        .on('click', function(){
                            var selected = ul.find('.selected').attr('data-locale');
                            message.messagePerLocale[selected] = txt.val();

                            setMessagePerLocale(locale);
                        })
                        .on('click', '.fa-remove', function(ev){
                            ev.stopPropagation();

                            txt.val('');
                            delete message.messagePerLocale[locale];

                            setUsedLocales();
                        });
                return el;
            };

        function fillLocales() {
            ul.empty();
            if ('default' in message.usedLocales) {
                ul.append(li(Math.round(100 * message.usedLocales['default']), 'default', jQuery.i18n.map["push.locale.default"]).addClass('selected'));
            }

            var sortable = [], locale;
            for (locale in message.usedLocales) if (locale !== 'default') {
                sortable.push([locale, message.usedLocales[locale]]);
            }
            sortable.sort(function(a, b) { return b[1] - a[1]; });

            for (var i in sortable) {
                ul.append(li(Math.round(100 * sortable[i][1]), sortable[i][0], (languages[sortable[i][0]] || '').englishName));
            }

            var def;
            if ('default' in message.usedLocales) def = 'default';
            else for (var k in sortable) { def = sortable[k][0]; break; }
            setMessagePerLocale(def);
        }

        function setMessagePerLocale(selected) {
            ul.find('li').each(function(){
                var li = $(this), locale = li.attr('data-locale');

                if (message.messagePerLocale[locale]) {
                    li.addClass('set');
                } else {
                    li.removeClass('set');
                }

                if (selected === locale) {
                    li.addClass('selected');
                } else {
                    li.removeClass('selected');
                }

            });
            txt.val(message.messagePerLocale[selected] || '');
        }

        if (isView) {
            message.usedLocales = _.extend({}, message.locales);
            fillLocales();

            if (message.type === 'data') {
                content.find('.field.msg').hide();
            }
        } else {
            txt.on('keydown', setUsedLocales);
            // wait for device count download

            // message.apps.forEach(function(appId){
            //     var app = allApps[appId];

            //     if (appId in locales) for (var locale in locales[appId]) {
            //         if (!(locale in message.usedLocales)) message.usedLocales[locale] = 0;
            //         message.usedLocales[locale] += locales[appId][locale];
            //     }
            // });
            // for (var locale in message.usedLocales) message.usedLocales[locale] /= message.apps.length;
        }
    // }

    if (isView) {
        content.find('textarea').prop('disabled', true);
        content.find('.locales').addClass('view-locales');
    }

    // Extras
    if (isView || duplicate) {
        if (message.test) content.find('.extra-test-check').attr('checked', 'checked');
        if (message.sound) {
            content.find('.extras .extra-sound-check').attr('checked', 'checked');
            content.find('.extras .extra-sound').val(message.duplicate.sound);
        } else {
            content.find('.extras .extra-sound-check').removeAttr('checked');
        }
        if (message.badge) {
            content.find('.extras .extra-badge-check').attr('checked', 'checked');
            content.find('.extras .extra-badge').val(message.duplicate.badge);
        }
        if (message.data) {
            content.find('.extras .extra-data-check').attr('checked', 'checked');
            content.find('.extras .extra-data').val(JSON.stringify(message.duplicate.data));
        }
    }

    if (isView) {
        content.find('.extras input, .extra-test-check').prop('disabled', true);
    } else {
        content.find('.extras table input[type="checkbox"], .extra-test-check').on('change', function(ev){
            message[$(this).attr('data-attr')] = $(this).is(':checked');
            showExtras();

            $(this).parents('td').next('td').find('input').focus();
            if ($(this).attr('data-attr') === 'test') {
                setDeviceCount();
            }
        });
        content.find('.extras table td.td-value').on('click', function(ev){
            if ($(this).find('input[type="text"]').prop('disabled')) {
                $(this).prev().find('input[type="checkbox"]').trigger('click');
            }
        });
        if (message.noTests) {
            content.find('.test-switch-holder').hide();
        }
        content.find('.extras table label, .test-switch-holder label').on('click', function(ev){
            var box = $(this).prev();
            if (box.is(':checkbox')) {
                box.trigger('click');
            }
        });

        var sound = content.find('.extras .extra-sound'),
            badge = content.find('.extras .extra-badge'),
            data = content.find('.extras .extra-data');
        function showExtras(){
            if (message.sound) sound.prop('disabled', false);
            else sound.prop('disabled', true);

            if (message.badge) badge.prop('disabled', false);
            else badge.prop('disabled', true);

            if (message.data) data.prop('disabled', false);
            else data.prop('disabled', true);
        }

        content.find('.extra-data').on('blur', function(){
            $(this).next('.required').remove();

            var str = $(this).val(), json = toJSON(str);
            if (json) $(this).val(JSON.stringify(json));
            else if (str) {
                $(this).after($("<span>").addClass("required").text("*").show());
            }
        });
    }

    // Buttons
    if (isView) {
        content.find('.btn-send').hide();
        content.find('.btn-duplicate').on('click', function(){
            $("#overlay").trigger('click');
            setTimeout(PushPopup.bind(window, message.duplicate, true), 500);
        });
        content.find('.btn-delete').on('click', function(){
            var butt = $(this).addClass('disabled');
            countlyPush.deleteMessage(message._id, function(msg){
                butt.removeClass('disabled');
                app.activeView.render();
                content.find('.btn-close').trigger('click');
            }, function(error){
                content.find('.btn-close').trigger('click');
            });
        });
    } else {
        content.find('.btn-duplicate').hide();
        content.find('.btn-delete').hide();
        content.find('.btn-send').on('click', function(){
            if ($(this).hasClass('disabled')) return;

            var json = messageJSON();

            $(".required").fadeOut().remove();
            var req = $("<span>").addClass("required").text("*");

            if (!json.apps.length) {
                content.find(".field.apps .app-names").append(req.clone());
            }
            if (!json.platforms.length) {
                content.find(".field.platforms .details").append(req.clone());
            }
            if (message.sound && !json.sound) {
                content.find(".extra-sound").after(req.clone());
            }
            if (message.badge) {
                if (!json.badge || !isNumber(json.badge)) {
                    content.find(".extra-badge").after(req.clone());
                } else {
                    json.badge = 1 * json.badge;
                }
            }
            if (message.data && !json.data) {
                content.find(".extra-data").after(req.clone());
            }
            if (json.type === 'link' && (!json.url || ! /^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(json.url) )) {
                content.find(".field.link .details").after(req.clone());
            }
            if ('default' in message.usedLocales && !json.messagePerLocale['default'] && json.type != 'data') {
                content.find(".locales li").first().append(req.clone());
            }

            if (!$('.required').show().length) {
                var butt = $(this).addClass('disabled');
                countlyPush.createMessage(json, null, function(msg){
                    butt.removeClass('disabled');
                    app.activeView.render();
                    content.find('.btn-close').trigger('click');
                }, function(error){
                    butt.removeClass('disabled');
                    CountlyHelpers.alert(error);
                    // butt.removeClass('disabled');
                });
            }
        });
    }

    content.find('.btn-close').on('click', function(){
        $("#overlay").trigger('click');
    });

    // Device count
    // {
        var count, send = content.find('.btn-send');

        function checkMessageForSendButton() {
            if (typeof message.count === 'undefined' || !message.count.TOTALLY || ('default' in message.usedLocales && !message.messagePerLocale['default'] && message.type != 'data')) {
                send.addClass('disabled');
            } else {
                send.removeClass('disabled');
            }
        }

        function setUsedLocales() {
            var txt = content.find('.msg textarea'),
                selected = content.find('.locales ul li.selected').attr('data-locale');

            if (selected) message.messagePerLocale[selected] = txt.val();

            message.usedLocales = {};
            for (var l in message.count) if (typeof message.count[l] !== 'object') {
                if (l in languages && message.count[l]) {
                    message.usedLocales[l] = message.count[l];
                }
            }
            var all = 0;
            for (var l in message.messagePerLocale) {
                if (message.messagePerLocale[l] && l !== 'default') all += message.usedLocales[l];
            }

            if (message.messagePerLocale['default']) {
                message.usedLocales['default'] = message.count.TOTALLY - all;
            } else if (all < message.count.TOTALLY) {
                message.usedLocales['default'] = message.count.TOTALLY - all;
            }

            if (message.count.TOTALLY) {
                txt.show();
                for (var l in message.usedLocales) {
                    message.usedLocales[l] = message.usedLocales[l] / message.count.TOTALLY;
                }
            } else {
                txt.hide();
            }

            checkMessageForSendButton();

            fillLocales();

            if (selected) content.find('.locales ul li[data-locale="' + selected + '"]').trigger('click');
        }

        function setDeviceCount(){
            if (!count) {
                count = content.find('.count-value');
            }
            count.text('');
            countlyPush.getAudience(
                {apps: message.apps, platforms: message.platforms, test: message.test, conditions: message.conditions, geo: message.geo || undefined},
                function(resp) {
                    message.count = resp;

                    setUsedLocales();

                    var span = '<span class="green">&nbsp;' + jQuery.i18n.prop('push.count', resp.TOTALLY) + '&nbsp;</span';
                    count.empty().append(jQuery.i18n.map['push.start']).append(span).append(jQuery.i18n.map['push.end']);
                },
                function(err){

                }
            );
        }

        setDeviceCount();
   // }

    if (isView) {
        content.find('input, textarea').each(function(){
            $(this).removeAttr('placeholder');
        });
    }

    // Platforms stuff
    function showPlatforms() {
        var ios = content.find('.push-platform.ios'), and = content.find('.push-platform.android');

        if (hasInArray(APN, message.appsPlatforms)) {
            ios.show();
            if (hasInArray(APN, message.platforms)) {
                ios.addClass('active');
            } else {
                ios.removeClass('active');
            }
        } else {
            ios.hide();
        }

        if (hasInArray(GCM, message.appsPlatforms)) {
            and.show();
            if (hasInArray(GCM, message.platforms)) {
                and.addClass('active');
            } else {
                and.removeClass('active');
            }
        } else {
            and.hide();
        }

        setDeviceCount();
    }

    function showChangedApps() {
        if (message.apps.length) {
            content.find(".no-apps").hide();
            content.find(".app-names").text(message.appNames.join(", ")).show();
        } else {
            content.find(".no-apps").show();
            content.find(".app-names").hide();
        }
        content.find('#listof-apps .app').each(function(){
            if (hasInArray($(this).attr('data-app-id'), message.apps)) {
                $(this).addClass('selected');
            } else {
                $(this).removeClass('selected');
            }
        });
    }

    function lengthOfObject(obj) {
        var l = 0;
        for (var i in obj) l++;
        return l;
    }

    function hasInArray(item, array) {
        return array.indexOf(item) !== -1;
    }

    function removeFromArray(item, array) {
        var index = array.indexOf(item);
        if (index !== -1) array.splice(index, 1);
    }

    function addToArray(item, array) {
        removeFromArray(item, array)
        array.push(item);
    }

    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function toJSON(str) {
        try {
            var o = jsonlite.parse(str);
            return typeof o === 'object' ? o : false;
        } catch(e){
            return false;
        }
    }

    function fillAppsPlatforms(skipPlatforms) {
        if (!skipPlatforms) message.platforms = [];
        message.appsPlatforms = [];

        message.apps.forEach(function(appId){
            var app = allApps[appId];
            if (app.apn && (app.apn.test || app.apn.prod)) {
                if (!skipPlatforms) addToArray(APN, message.platforms);
                addToArray(APN, message.appsPlatforms);
            }
            if (app.gcm && app.gcm.key) {
                if (!skipPlatforms) addToArray(GCM, message.platforms);
                addToArray(GCM, message.appsPlatforms);
            }
        });
    }

    function messageJSON() {
        var txt = content.find('.msg textarea'),
            selected = content.find('.locales ul li.selected').attr('data-locale');

        message.messagePerLocale[selected] = txt.val();

        var json = {
            type: message.type,
            apps: message.apps.slice(0),
            appNames: message.appNames.slice(0),
            platforms: message.platforms.slice(0),
            messagePerLocale: {},
            test: message.test,
            sound: message.sound ? content.find('.extra-sound').val() : '',
            badge: message.badge ? content.find('.extra-badge').val() : '',
            data:  message.data  ? content.find('.extra-data').val()  : '',
            update: message.type === 'update',
            review: message.type === 'review',
            url: message.type === 'link' ? content.find('.push-link').val() : '',
            category: message.type === 'category' ? content.find('.push-category').val() : '',
            locales: message.usedLocales,
            date: content.find('.send-later:checked').length ? content.find('.send-later-date').data('timestamp') : null,
            conditions: message.conditions,
            geo: message.geo
        };

        if (json.sound === '') delete json.sound;
        if (json.badge === '') delete json.badge;
        if (json.data  === '') delete json.data;
        if (json.url  === '') delete json.url;
        if (json.category  === '') delete json.category;
        if (!json.update) delete json.update;
        if (!json.review) delete json.review;
        if (!json.conditions) delete json.conditions;
        if (!json.geo) delete json.geo;
        if (json.data) json.data = toJSON(json.data);

        for (var l in message.messagePerLocale) if (message.messagePerLocale[l]) {
            json.messagePerLocale[l] = message.messagePerLocale[l];
        }
        return json;
    }

    CountlyHelpers.revealDialog(dialog, heights[message.type]);
};


//register views
app.messagingDashboardView = new MessagingDashboardView();
app.messagingListView = new MessagingListView();

app.route('/messaging', 'messagingDashboardView', function () {
    this.renderWhenReady(this.messagingDashboardView);
});
app.route('/messaging/messages', 'messagingListView', function () {
    this.renderWhenReady(this.messagingListView);
});

var managementAdd = "";
function pushAppMgmt(){
    $(".app-details table tr.table-edit").before(managementAdd);
    app.localize();
    var appId = countlyCommon.ACTIVE_APP_ID;
    
    if(!countlyGlobal["apps"][appId] || countlyGlobal["apps"][appId].type == "mobile"){
        $(".appmng-push").show();
    } 
    else{
        $(".appmng-push").hide();
    }

    if (!appId) { return; }

    countlyGlobal['apps'][appId].apn = countlyGlobal['apps'][appId].apn || {};
    countlyGlobal['apps'][appId].gcm = countlyGlobal['apps'][appId].gcm || {};

    //app was changed
    $(".app-container:not(#app-container-new)").live("click", function () {
        appId = $(this).data("id");
        countlyGlobal['apps'][appId].apn = countlyGlobal['apps'][appId].apn || {};
        countlyGlobal['apps'][appId].gcm = countlyGlobal['apps'][appId].gcm || {};
        $("#push-apn-cert-test-view").removeClass('fa fa-remove').removeClass('fa fa-check').addClass(countlyGlobal['apps'][appId].apn.test ? 'fa fa-check' : 'fa fa-remove');
        $("#push-apn-cert-prod-view").removeClass('fa fa-remove').removeClass('fa fa-check').addClass(countlyGlobal['apps'][appId].apn.prod ? 'fa fa-check' : 'fa fa-remove');
        $("#view-gcm-key").html(countlyGlobal['apps'][appId].gcm.key || '<i class="fa fa-remove"></i>');
        $("#gcm-key").val(countlyGlobal['apps'][appId].gcm.key || '');
    });

    $("#push-apn-cert-test-view").removeClass('fa fa-remove').removeClass('fa fa-check').addClass(countlyGlobal['apps'][appId].apn.test ? 'fa fa-check' : 'fa fa-remove');
    $("#push-apn-cert-prod-view").removeClass('fa fa-remove').removeClass('fa fa-check').addClass(countlyGlobal['apps'][appId].apn.prod ? 'fa fa-check' : 'fa fa-remove');
    $("#view-gcm-key").html(countlyGlobal['apps'][appId].gcm.key || '<i class="fa fa-remove"></i>');
    $("#gcm-key").val(countlyGlobal['apps'][appId].gcm.key || '');

    $("#save-app-edit").click(function () {
        var certTest = $('#apns_cert_test').val().split('.').pop().toLowerCase();
        if (certTest && $.inArray(certTest, ['p12']) == -1) {
            CountlyHelpers.alert(jQuery.i18n.map["management-applications.push-error"], "red");
            return false;
        }

        var certProd = $('#apns_cert_prod').val().split('.').pop().toLowerCase();
        if (certProd && $.inArray(certProd, ['p12']) == -1) {
            CountlyHelpers.alert(jQuery.i18n.map["management-applications.push-error"], "red");
            return false;
        }

        var loading = CountlyHelpers.loading(jQuery.i18n.map["management-applications.checking"]);

        var forms = 1 + (certTest ? 1 : 0) + (certProd ? 1 : 0),
        reactivateForm = function() {
            forms--;
            if (forms == 0) {
                CountlyHelpers.removeDialog(loading);
            }
            $("#push-apn-cert-test-view").removeClass('fa fa-remove').removeClass('fa fa-check').addClass(countlyGlobal['apps'][appId].apn.test ? 'fa fa-check' : 'fa fa-remove');
            $("#push-apn-cert-prod-view").removeClass('fa fa-remove').removeClass('fa fa-check').addClass(countlyGlobal['apps'][appId].apn.prod ? 'fa fa-check' : 'fa fa-remove');
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
                    app_id:appId,
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
                if (!countlyGlobal['apps'][appId].apn) countlyGlobal['apps'][appId].apn = {};
                if (!countlyGlobal['admin_apps'][appId].apn) countlyGlobal['admin_apps'][appId].apn = {};

                if (!countlyGlobal['apps'][appId].gcm) countlyGlobal['apps'][appId].gcm = {};
                if (!countlyGlobal['admin_apps'][appId].gcm) countlyGlobal['admin_apps'][appId].gcm = {};
                if(data.gcm){
                    countlyGlobal['apps'][appId].gcm.key = data.gcm.key;
                    countlyGlobal['admin_apps'][appId].gcm.key = data.gcm.key;
                }

                $("#view-gcm-key").html(countlyGlobal['apps'][appId].gcm.key || '<i class="fa fa-remove"></i>');

                if (certTest) {
                    $('#add-edit-apn-creds-test-form').find("input[name=app_id]").val(appId);
                    $('#add-edit-apn-creds-test-form').ajaxSubmit({
                        resetForm:true,
                        beforeSubmit:function (formData, jqForm, options) {
                            formData.push({ name:'_csrf', value:countlyGlobal['csrf_token'] });
                            formData.push({ name:'api_key', value:countlyGlobal.member.api_key });
                        },
                        success:function (resp) {
                            if (!resp || resp.error) {
                                if (countlyGlobal['apps'][appId].apn) {
                                    delete countlyGlobal['apps'][appId].apn.test;
                                }
                                showError(jQuery.i18n.map["management-applications.push-apn-creds-test-error"]);
                            } else {
                                if (!countlyGlobal['apps'][appId].apn) {
                                    countlyGlobal['apps'][appId].apn = {test: resp};
                                } else {
                                    countlyGlobal['apps'][appId].apn.test = resp;
                                }
                            }

                            reactivateForm();
                        }
                    });
                }

                if (certProd) {
                    $('#add-edit-apn-creds-prod-form').find("input[name=app_id]").val(appId);
                    $('#add-edit-apn-creds-prod-form').ajaxSubmit({
                        resetForm:true,
                        beforeSubmit:function (formData, jqForm, options) {
                            formData.push({ name:'_csrf', value:countlyGlobal['csrf_token'] });
                            formData.push({ name:'api_key', value:countlyGlobal.member.api_key });
                        },
                        success:function (resp) {
                            if (!resp || resp.error) {
                                if (countlyGlobal['apps'][appId].apn) {
                                    delete countlyGlobal['apps'][appId].apn.prod;
                                }
                                showError(jQuery.i18n.map["management-applications.push-apn-creds-prod-error"]);
                            } else {
                                if (!countlyGlobal['apps'][appId].apn) {
                                    countlyGlobal['apps'][appId].apn = {prod: resp};
                                } else {
                                    countlyGlobal['apps'][appId].apn.prod = resp;
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

app.addPageScript("/manage/apps", function(){
    if(managementAdd == "")
        $.get(countlyGlobal["path"]+'/push/templates/push-management.html', function(src){
            managementAdd = src;
            pushAppMgmt();
        });
    else
        pushAppMgmt();
});

app.addAppManagementSwitchCallback(function(appId, type){
    if(type == "mobile"){
        $(".appmng-push").show();
    } 
    else{
        $(".appmng-push").hide();
    }
});

app.addPageScript("/drill", function(){
    $("#bookmark-filter").after(
    '<div id="create-message-connector" style="display:none; float:left; height:1px; border-top:1px solid #999; width:50px; margin-top:14px; margin-left:5px;"></div>'+
    '<a class="icon-button green btn-header btn-create-message" data-localize="push.create" style="display:none"></a>');
    app.localize();
    $('.btn-create-message').off('click').on('click', function(){
        var filterData = app.drillView.getFilterObjAndByVal();
        var message = {
            apps: [countlyCommon.ACTIVE_APP_ID],
            platforms: [],
            conditions: {}
        };

        for (var k in filterData.dbFilter) {
            if (k.indexOf('up.') === 0) message.conditions[k.substr(3)] = filterData.dbFilter[k];
        }

        PushPopup(message, false, true);
    });
    $("#bookmark-view").on("click", ".bookmark-action.send", function() {
        var filter = $(this).data("query");

        var message = {
            apps: [countlyCommon.ACTIVE_APP_ID],
            platforms: [],
            conditions: {}
        };

        for (var k in filter) {
            if (k.indexOf('up.') === 0) message.conditions[k.substr(3)] = filter[k];
        }

        PushPopup(message, false, true);
    });
});

app.addPageScript("/users/#", function(){
    var userDetails = countlyUserdata.getUserdetails();

    var platforms = [], test = false, prod = false;
    if (userDetails.tk) {
        if (userDetails.tk.id || userDetails.tk.ia || userDetails.tk.ip) { platforms.push('i'); }
        if (userDetails.tk.at || userDetails.tk.ap) { platforms.push('a'); }

        test = !!userDetails.tk.id || !!userDetails.tk.ia || !!userDetails.tk.at;
        prod = !!userDetails.tk.ip || !!userDetails.tk.ap;
    }
    if (platforms.length) {
        if (!$('.btn-create-message').length) {
            $('.widget-header .left').append($('<a class="icon-button green btn-header left btn-create-message" data-localize="push.create"></a>').text(jQuery.i18n.map['push.create']));
        }
        $('.btn-create-message').show().off('click').on('click', function(){
            PushPopup({
                platforms: platforms,
                apps: [countlyCommon.ACTIVE_APP_ID],
                test: test && !prod,
                conditions: {_id: app.userdetailsView.user_id}
            }, true, true);
        });
    } else {
        $('.btn-create-message').hide();
    }
});

app.addPageScript("/messaging/messages", function(){
    $("#sidebar-app-select").addClass("disabled");
    $("#sidebar-app-select").removeClass("active");
});

$( document ).ready(function() {
    $.get(countlyGlobal["path"]+'/push/templates/push-create.html', function(src){
        $("body").append(src);
    });
    Handlebars.registerPartial("message", $("#template-message-partial").html());
    Handlebars.registerHelper('messageText', function (context, options) {
        return CountlyHelpers.messageText(context.messagePerLocale);
    });

    Handlebars.registerHelper('ifMessageStatusToRetry', function (status, options) {
        return status == MessageStatus.Error ? options.fn(this) : '';
    });
    Handlebars.registerHelper('ifMessageStatusToStop', function (status, options) {
        return status == MessageStatus.InProcessing || status == MessageStatus.InQueue ? options.fn(this) : '';
    });

    var menu = '<a class="item messaging" id="sidebar-messaging">'+
        '<div class="logo logo-icon fa fa-envelope-square" style="font-size: 28px;"></div>'+
        '<div class="text" data-localize="push.sidebar.section">Messaging</div>'+
    '</a>'+
    '<div class="sidebar-submenu" id="messaging-submenu">'+
        '<a href="#/messaging" class="item">'+
            '<div class="logo-icon fa fa-line-chart"></div>'+
            '<div class="text" data-localize="push.sidebar.overview">Overview</div>'+
        '</a>'+
        '<a href="#/messaging/messages" class="item">'+
            '<div class="logo-icon fa fa-inbox""></div>'+
            '<div class="text" data-localize="push.sidebar.messages">Messages</div>'+
        '</a>'+
    '</div>';
    if($('#mobile-type #management-menu').length)
        $('#mobile-type #management-menu').before(menu);
    else
        $('#mobile-type').append(menu);
});
