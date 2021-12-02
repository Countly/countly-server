/*global
    jQuery, $,CountlyHelpers, countlyGlobal,
 */
(function(hooksPlugin, jQuery) {
    var _hookEffects = {
        "CustomCodeEffect": {
            name: jQuery.i18n.map["hooks.CustomCodeEffect"],
            init: function(dom) {
                $(dom).find(".custom-code-input").val("");
            },
            renderConfig: function(data, dom) {
                var code = data.configuration.code;
                ($(dom).find("[name=custom-code-input]")[0]).innerHTML = code;
            },
            getValidConfig: function(dom) {
                var code = $(dom).find("[name=custom-code-input]").val();
                if (!code) {
                    return null;
                }
                return {code: code};
            },
        },
        "EmailEffect": {
            name: jQuery.i18n.map["hooks.EmailEffect"],
            init: function(dom) {
                var self = this;
                var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';
                self.emailInput = $(dom).find('select.email-list-input').selectize({
                    plugins: ['remove_button'],
                    persist: false,
                    maxItems: null,
                    valueField: 'email',
                    labelField: 'name',
                    searchField: ['name', 'email'],
                    options: [
                        {email: countlyGlobal.member.email, name: ''},
                    ],
                    render: {
                        item: function(item, escape) {
                            return '<div>' +
                                (item.name ? '<span class="name">' + escape(item.name) + '</span>' : '') +
                                (item.email ? '<span class="email">' + escape(item.email) + '</span>' : '') +
                            '</div>';
                        },
                        option: function(item, escape) {
                            var label = item.name || item.email;
                            var caption = item.name ? item.email : null;
                            return '<div>' +
                                '<span class="label">' + escape(label) + '</span>' +
                                (caption ? '<span class="caption">' + escape(caption) + '</span>' : '') +
                            '</div>';
                        }
                    },
                    createFilter: function(input) {
                        var match, regex;
                        // email@address.com
                        regex = new RegExp('^' + REGEX_EMAIL + '$', 'i');
                        match = input.match(regex);
                        if (match) {
                            return !Object.prototype.hasOwnProperty.call(this.options, match[0]);
                        }
                        // name <email@address.com>
                        /*eslint-disable */
                        regex = new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i');
                        /*eslint-enable */
                        match = input.match(regex);
                        if (match) {
                            return !Object.prototype.hasOwnProperty.call(this.options, match[2]);
                        }
                        return false;
                    },
                    create: function(input) {
                        if ((new RegExp('^' + REGEX_EMAIL + '$', 'i')).test(input)) {
                            return {email: input};
                        }
                        /*eslint-disable */
                        var match = input.match(new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i'));
                        /*eslint-enable */
                        if (match) {
                            return {
                                email: match[2],
                                name: $.trim(match[1])
                            };
                        }
                        CountlyHelpers.alert('Invalid email address.', "red");
                        return false;
                    }
                });
            },
            renderConfig: function(data) {
                var configuration = data.configuration;
                var emailSelectorDom = this.emailInput[0];// $(dom).find("select.email-list-input");
                for (var i = 0; i < configuration.address.length; i++) {
                    emailSelectorDom.selectize.addOption({ "name": '', "email": configuration.address[i] });
                }
                emailSelectorDom.selectize.setValue(configuration.address, false);
            },
            getValidConfig: function(dom) {
                var emailList = [];
                $(dom).find("select.email-list-input  :selected").each(function() {
                    emailList.push($(this).val());
                });
                if (emailList.length === 0) {
                    return null;
                }
                return {address: emailList};
            }
        },
        "HTTPEffect": {
            name: jQuery.i18n.map["hooks.HTTPEffect"],
            init: function(dom) {
                var methods = [
                    {value: "get", name: jQuery.i18n.map["hooks.http-method-get"]},
                    {value: "post", name: jQuery.i18n.map["hooks.http-method-post"]},
                ];
                $(dom).find(".http-effect-method-dropdown").clySelectSetItems(methods);
                $(dom).find(".http-effect-method-dropdown").clySelectSetSelection(methods[0].value, methods[0].name);
            },
            getValidConfig: function(dom) {
                var url = $(dom).find("#http-effect-url").val();
                var method = $(dom).find(".http-effect-method-dropdown").clySelectGetSelection();
                var requestData = $(dom).find("[name=http-effect-params]").val();
                if (!url || !method || !requestData) {
                    return null;
                }
                return {url: url, method: method, requestData: requestData};
            },
            renderConfig: function(data, dom) {
                var configuration = data.configuration;
                $(dom).find("#http-effect-url").val(configuration.url);
                $(dom).find(".http-effect-method-dropdown").clySelectSetSelection(configuration.method,
                    jQuery.i18n.map["hooks.http-method-" + configuration.method]);
                ($(dom).find("[name=http-effect-params]")[0]).innerHTML = configuration.requestData;
            },
        },
        /* "SDKEventEffect": {
            name: jQuery.i18n.map["hooks.SDKEventEffect"],
            init: function() {
            },
        }
        */
    };

    /**
     * get default hook effects dictionary
     * @return {objecT} hook effects dictionary
     */
    hooksPlugin.getHookEffects = function() {
        return _hookEffects;
    };

}(window.hooksPlugin = window.hooksPlugin || {}, jQuery));
