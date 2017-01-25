(function () {
    var _carrierCodeMap = {"46000": "中国移动(GSM)", "46001": "中国联通(GSM)", "46002": "中国移动(TD-S)", "46003": "中国电信(CDMA)", "46005":"中国电信(CDMA)", "46006":"中国联通(WCDMA)", "46007":"中国移动(TD-S)", "46011":"中国电信(FDD-LTE)","460 11":"中国电信(FDD-LTE)"};

    function getCarrierCodeName(code) {
        return _carrierCodeMap[code] ? _carrierCodeMap[code] : code;
    }

    window.countlyCarrier = window.countlyCarrier || {};
    window.countlyCarrier.getCarrierCodeName=getCarrierCodeName;
    CountlyHelpers.createMetricModel(window.countlyCarrier, {name: "carriers", estOverrideMetric:"carriers"}, jQuery, getCarrierCodeName);
}());