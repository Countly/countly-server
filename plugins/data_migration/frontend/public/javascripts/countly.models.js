(function (countlyDataMigration, $) {
    //we will store our data here
    var _data = {};
    //Initializing model
    countlyDataMigration.initialize = function () {
       return $.ajax({
            type:"GET",
            url: countlyCommon.API_URL + "/o/datamigration/get_config",
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
            },
            success:function (json) {
                if(json && json['result'])
                {
                _data = json['result'];
                }
            },
            error:function(exception){}
        });
    };
    //return data that we have
    countlyDataMigration.getData = function () {
        
        return _data;
    }; 

}(window.countlyDataMigration = window.countlyDataMigration || {}, jQuery));