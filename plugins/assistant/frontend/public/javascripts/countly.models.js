(function (countlyAssistant, $, undefined) {

    //Private Properties
    var _data = {};
    countlyAssistant.initialize = function () {
        //CountlyHelpers.alert("2", "green");
        return $.ajax({
            type:"GET",
            url:countlyCommon.API_URL + "/o/assistant",
            data:{
                api_key:countlyGlobal['member'].api_key
            },
            success:function (json) {
                _data = json;
                //CountlyHelpers.alert(""+json, "green");
            }
        });
    };

    countlyAssistant.getData = function () {
        return _data;
    };

    var plugins = {};

    //countlyAssistant.addPlugin("crashes", "new_crash", function(){//do something})
    countlyAssistant.addPlugin = function(plugin, type, func){
        if(!plugins[plugin])
            plugins[plugin] = {};
        plugins[plugin][type] = func;
    };



    var timeSince = function (date) {

        var seconds = Math.floor((new Date() - date) / 1000);
        var interval = Math.floor(seconds / 31536000);

        if (interval > 1) {
            return interval + " years ago";
        }
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return interval + " months ago";
        }
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return interval + " days ago";
        }
        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return interval + " hours ago";
        }
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return interval + " minutes ago";
        }
        return "now";
        //return Math.floor(seconds) + " seconds";
    };



    var fixData = function (given_data) {
        var the_notifs = [given_data.notifications, given_data.notifs_saved_private, given_data.notifs_saved_global];

        for(var b = 0 ; b < the_notifs.length ; b++) {
            //pre parse all dates for performance
            for(var c = 0 ; c < the_notifs[b].length ; c++) {
                the_notifs[b][c].createdDateUTC = Date.parse(the_notifs[b][c].created_date) / 1000;
            }

            //set the notification lists to be from newer to older
            the_notifs[b].sort(function (x, y) {
                return y.createdDateUTC - x.createdDateUTC;
            });

            for (var a = 0; a < the_notifs[b].length; a++) {
                var obj = the_notifs[b][a];

                //check if a plugin provids it's own formating for it's notifications
                if(plugins[obj.plugin_name] && plugins[obj.plugin_name][obj.notif_type]) {
                    var styling_info = plugins[obj.plugin_name][obj.notif_type](obj);

                    obj.title = styling_info.title;
                    obj.msg = styling_info.msg;
                    obj.icon_styling_class = styling_info.icon_class;
                } else {//use the default style
                    //prepare notification message
                    var messageArr = obj.data.slice();//create copy of data
                    messageArr.unshift(obj.i18n_id + ".message");//put the message in front of the data
                    obj.msg = jQuery.i18n.prop.apply(null, messageArr);//insert fields where needed

                    //create a table for a few specific tickets
                    {
                        var tableStart = '<div style="width: 100%; display: table;">';
                        var tableEnd = '</div><br>';
                        var rowStart = '<div style="display: table-row">';
                        var rowEnd = '</div>';
                        var cellStart = '<div style="border-style: solid; border-width: 2px; width: 50%; display: table-cell;">';
                        var cellEnd = '</div>';

                        //web referrals
                        if(obj.plugin_name === "assistant-base" && (obj.notif_type === "2" && obj.notif_subtype === "8") ){

                            var tableContent_8 = tableStart + rowStart +
                                    cellStart + obj.data[0] + cellEnd +
                                    cellStart + obj.data[1] + ' visitors, ' + obj.data[2] + ' visits' + cellEnd +
                                rowEnd + rowStart +
                                cellStart + obj.data[3] + cellEnd +
                                cellStart + obj.data[4] + ' visitors, ' + obj.data[5] + ' visits' + cellEnd +
                                rowEnd + rowStart +
                                cellStart + obj.data[6] + cellEnd +
                                cellStart + obj.data[7] + ' visitors, ' + obj.data[8] + ' visits' + cellEnd +
                                rowEnd + tableEnd;
                            obj.msg = tableContent_8 + obj.msg;
                        }

                        //app sources
                        if(obj.plugin_name === "assistant-base" && (obj.notif_type === "2" && obj.notif_subtype === "7") ){

                            var tableContent_7 = tableStart + rowStart +
                                cellStart + obj.data[0] + cellEnd +
                                cellStart + obj.data[1] + ' installs' + cellEnd +
                                rowEnd + rowStart +
                                cellStart + obj.data[2] + cellEnd +
                                cellStart + obj.data[3] + ' installs' + cellEnd +
                                rowEnd + rowStart +
                                cellStart + obj.data[4] + cellEnd +
                                cellStart + obj.data[5] + ' installs' + cellEnd +
                                rowEnd + tableEnd;
                            obj.msg = tableContent_7 + obj.msg;
                        }

                        //session duration
                        if(obj.plugin_name === "assistant-base" && (obj.notif_type === "2" && obj.notif_subtype === "5" ||
                            obj.notif_type === "2" && obj.notif_subtype === "6") ){

                            var tableContent_56 = tableStart + rowStart +
                                    cellStart + 'this week' + cellEnd +
                                    cellStart + obj.data[0] + ' minutes ' + obj.data[1] + ' seconds' + cellEnd +
                                rowEnd + rowStart +
                                    cellStart + 'previous week' + cellEnd +
                                    cellStart + obj.data[2] + ' minutes ' + obj.data[3] + ' seconds' + cellEnd +
                                rowEnd + tableEnd;
                            obj.msg = tableContent_56 + obj.msg;
                        }

                        //active users
                        if(obj.plugin_name === "assistant-base" && (obj.notif_type === "2" && obj.notif_subtype === "1" ||
                            obj.notif_type === "2" && obj.notif_subtype === "2" ||
                            obj.notif_type === "2" && obj.notif_subtype === "3" ||
                            obj.notif_type === "2" && obj.notif_subtype === "4") ){

                            var tableContent_1234 = tableStart + rowStart +
                                cellStart + 'this week' + cellEnd +
                                cellStart + obj.data[0] + ' users' + cellEnd +
                                rowEnd + rowStart +
                                cellStart + 'previous week' + cellEnd +
                                cellStart + obj.data[1] + ' users' + cellEnd +
                                rowEnd + tableEnd;
                            obj.msg = tableContent_1234 + obj.msg;
                        }
                    }

                    //todo is this a security risk?
                    obj.msg = countlyCommon.decode(obj.msg);//decode given urls

                    //prepare notification title
                    var titleArr = obj.data.slice();//create copy of data
                    titleArr.unshift(obj.i18n_id + ".title");//put the title in front of the data
                    obj.title = jQuery.i18n.prop.apply(null, titleArr);//insert fields where needed


                    //set icon styling
                    if(obj.notif_type === "1") {//quick tips
                        obj.icon_styling_class = "assistant_icon_quicktips";
                    } else if(obj.notif_type === "2") {//insight
                        obj.icon_styling_class = "assistant_icon_insight";
                    } else if(obj.notif_type === "3") {//announcments
                        obj.icon_styling_class = "assistant_icon_announcments";
                    } else {//default
                        obj.icon_styling_class = "assistant_icon_regular";
                    }

                    //set icon path

                    if(obj.plugin_name === "assistant-base" && obj.notif_type === "1" && obj.notif_subtype === "2") {
                        obj.icon_path = "./assistant/images/push.svg";
                    } else if(obj.plugin_name === "assistant-base" && obj.notif_type === "2" && obj.notif_subtype === "1") {
                        obj.icon_path = "./assistant/images/activity_increase.svg";
                    } else if(obj.plugin_name === "assistant-base" && obj.notif_type === "2" && obj.notif_subtype === "2") {
                        obj.icon_path = "./assistant/images/activity_decrease.svg";
                    } else if(obj.plugin_name === "assistant-base" && obj.notif_type === "2" && obj.notif_subtype === "3") {
                        obj.icon_path = "./assistant/images/activity_increase.svg";
                    } else if(obj.plugin_name === "assistant-base" && obj.notif_type === "2" && obj.notif_subtype === "4") {
                        obj.icon_path = "./assistant/images/activity_decrease.svg";
                    } else if(obj.plugin_name === "assistant-base" && obj.notif_type === "2" && obj.notif_subtype === "5") {
                        obj.icon_path = "./assistant/images/activity_increase.svg";
                    } else if(obj.plugin_name === "assistant-base" && obj.notif_type === "2" && obj.notif_subtype === "6") {
                        obj.icon_path = "./assistant/images/activity_decrease.svg";
                    } else if(obj.plugin_name === "assistant-base" && obj.notif_type === "3" && obj.notif_subtype === "2") {
                        obj.icon_path = "./assistant/images/ios.svg";
                    } else if(obj.plugin_name === "assistant-base" && obj.notif_type === "3" && obj.notif_subtype === "3") {
                        obj.icon_path = "./assistant/images/android.svg";
                    } else if(obj.plugin_name === "star-rating" && obj.notif_type === "1" && obj.notif_subtype === "1") {
                        obj.icon_path = "./assistant/images/star_rating.svg";
                    } else if(obj.notif_type === "1") {//quick tips
                        obj.icon_path = "./assistant/images/tip.svg";
                    } else if(obj.notif_type === "2") {//insight
                        obj.icon_path = "./assistant/images/generic_1.png";
                    } else if(obj.notif_type === "3") {//announcments
                        obj.icon_path = "./assistant/images/announcement.svg";
                    } else {//default
                        obj.icon_path = "./assistant/images/generic_2.png";
                    }
                }
                obj.timeSince = timeSince(new Date(obj.created_date));
            }
        }

        return given_data;
    };

    countlyAssistant.getDataForApp = function (app_id) {
        //CountlyHelpers.alert(10, "green");
        for(var a = 0 ; a < _data.length ; a++){
            if(_data[a].id === app_id) return fixData(_data[a]);
        }
        CountlyHelpers.alert(11, "green");
        return [];//todo fix this
    };

    countlyAssistant.changeNotification = function (notif_id, is_private, save_it) {
        //CountlyHelpers.alert("1.1", "green");
        return $.ajax({
            type:"GET",
            url:countlyCommon.API_URL + "/i/assistant/" + (is_private?"private":"global"),
            data:{
                api_key:countlyGlobal['member'].api_key,
                save: save_it,
                notif: notif_id
            },
            success:function (json) {

            }
        });
    };

}(window.countlyAssistant = window.countlyAssistant || {}, jQuery));