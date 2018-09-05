(function(countlyVersionHistoryManager, $) {
    //we will store our data here
    var _data = [];
    //Initializing model
    countlyVersionHistoryManager.initialize = function() {
        //returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/countly_version",
            data: {
                //providing current user's api key
                "api_key": countlyGlobal.member.api_key
            },
            success: function(json) {
                //got our data, let's store it
                _data = json.result;
            },
            error: function(exception) {}
        });
    };
    //return data that we have
    countlyVersionHistoryManager.getData = function() {
        return _data;
    };
}(window.countlyVersionHistoryManager = window.countlyVersionHistoryManager || {}, jQuery));