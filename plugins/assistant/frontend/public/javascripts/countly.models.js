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
            //set the notification lists to be from newer to older
            the_notifs[b].sort(function (x, y) {
                return x.created_date - y.created_date;
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