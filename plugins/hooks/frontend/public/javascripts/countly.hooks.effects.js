/*global
    jQuery
 */
(function(hooksPlugin, jQuery) {
    var _hookEffects = {
        "EmailEffect": {
            name: jQuery.i18n.map["hooks.EmailEffect"],
            init: function() {
            },
            renderConfig: function(data, dom) {
                var configuration =  data.configuration;
                $(dom).find(".emaileffect-email-address").val(configuration.address);
            },
            getValidConfig: function(dom) {
                var email = $(dom).find(".emaileffect-email-address").val();
                if (!email) {
                    return null;
                }
                return {address: email}
            }
        },
        "HTTPEffect": {
            name: jQuery.i18n.map["hooks.HTTPEffect"],
            init: function() {
                var methods = [
                    {value:"get", name: jQuery.i18n.map["hooks.http-method-get"]},
                    {value:"post", name: jQuery.i18n.map["hooks.http-method-post"]}, 
                ]
                $(".http-effect-method-dropdown").clySelectSetItems(methods);
                $(".http-effect-method-dropdown").clySelectSetSelection(methods[0].value, methods[0].name);
            },
            getValidConfig: function(dom) {
                var url = $(dom).find("#http-effect-url").val();
                var method = $(dom).find(".http-effect-method-dropdown").clySelectGetSelection();
                var requestData = $(dom).find("[name=http-effect-params]").val();
                console.log("http get", url, method, requestData);
                if( !url || !method || !requestData) {
                    return null;
                }
                return {url, method, requestData};
            },
            renderConfig: function(data, dom) {
                var configuration = data.configuration;
                window.dd=dom;
                $(dom).find("#http-effect-url").val(configuration.url);
                $(dom).find(".http-effect-method-dropdown").clySelectSetSelection(configuration.method,
                jQuery.i18n.map["hooks.http-method-" + configuration.method]);
                ($(dom).find("[name=http-effect-params]")[0]).innerHTML= configuration.requestData;
            },
        },
       /* "SDKEventEffect": {
            name: jQuery.i18n.map["hooks.SDKEventEffect"],
            init: function() {
            },
        }
        */
    }

    /**
     * get default hook effects dictionary
     * @return {objecT} hook effects dictionary
     */
    hooksPlugin.getHookEffects = function () {
        return _hookEffects;
    }

}(window.hooksPlugin = window.hooksPlugin || {}, jQuery));
