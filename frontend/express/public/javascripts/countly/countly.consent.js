(function (countlyConsentManager, $, undefined) {

    CountlyHelpers.createMetricModel(countlyConsentManager, {name: "consents", estOverrideMetric:"consents"}, jQuery);
    
    countlyConsentManager.clearObject = function (obj) {
        if (obj) {
            if (!obj["i"]) obj["i"] = 0;
            if (!obj["o"]) obj["o"] = 0;
        }
        else {
            obj = {"i":0, "o":0};
        }

        return obj;
    };
    
    countlyConsentManager.getConsentDP = function () {

        var chartData = [
                { data:[], label:jQuery.i18n.map["consent.opt-i"] },
                { data:[], label:jQuery.i18n.map["consent.opt-o"] }
            ],
            dataProps = [
                { name:"i" },
                { name:"o" }
            ];

        return countlyCommon.extractChartData(countlyConsentManager.getDb(), countlyConsentManager.clearObject, chartData, dataProps);
    };
    
    countlyConsentManager.common = function (data, path, callback) {
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.api_key = countlyGlobal['member'].api_key;
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.r + '/consent/'+path,
            data:data,
            dataType:"json",
			success:function (json) {
                if(callback)
                    callback(json);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };
	
}(window.countlyConsentManager = window.countlyConsentManager || {}, jQuery));