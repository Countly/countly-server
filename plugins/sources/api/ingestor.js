var pluginInstance = {};
const plugins = require('../../pluginManager.js');
const common = require('../../../api/utils/common.js');
const parseDomain = require('parse-domain');

var searchEngineKeyWord = {};
try {
    searchEngineKeyWord = require("../keywords.json");
}
catch (e) {
    console.log("There is no keywords file defined for source plugin.");
}
var filterList = ["google", "baidu.com", "bing", "yahoo", "yandex", "aol", "facebook.com/l.php"];
var stripPath = ["r.search.yahoo.com", "m.baidu.com"];
var utmTags = ["_ga", "_gac", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

(function(plugin) {
    plugin.urlParser = function(url) {
        var qIndex = url.indexOf("?");
        var path = qIndex > 0 ? url.substring(0, qIndex) : url;
        var query = qIndex > 0 ? url.substring(qIndex + 1) : "";
        path = path
            .replace(/^(http|https):\/\//, "")
            .replace(/^www./, "");

        var isFromSearchEngine = false;
        filterList.forEach(function(item) {
            if (path.indexOf(item) >= 0) {
                isFromSearchEngine = true;
            }
        });
        var needStripPath = false;
        stripPath.forEach(function(item) {
            if (path.indexOf(item) >= 0) {
                needStripPath = true;
            }
        });

        var finallyQueryString = "";
        query = query.split("#")[0];
        var querryArray = query.split("&");

        if (needStripPath && path.indexOf("/") > 0) {
            path = path.substring(0, path.indexOf("/"));
        }
        if (isFromSearchEngine) {
            querryArray.forEach(function(item) {
                var queryData = item.split("=");
                if (queryData.length >= 2 && queryData[1].length > 0 && searchEngineKeyWord) {
                    var key = item.split("=")[0];
                    var keepIt = false;
                    for (var sKey in searchEngineKeyWord) {
                        if (searchEngineKeyWord[sKey] === true || path.indexOf(searchEngineKeyWord[sKey]) > 0) {
                            if (key === sKey) {
                                keepIt = true;
                            }
                        }
                    }
                    if (keepIt) {
                        finallyQueryString += (finallyQueryString[0] === "?" ? "&" : "?") + item;
                    }
                }
            });
        }
        else {
            querryArray.forEach(function(item) {
                if (item.indexOf("=") >= 0 && item.split("=").length >= 2) {
                    var key = item.split("=")[0];
                    if (utmTags.indexOf(key) < 0) {
                        finallyQueryString += (finallyQueryString[0] === "?" ? "&" : "?") + item;
                    }
                }
            });

        }
        var processedURL = path + finallyQueryString;
        if (processedURL[processedURL.length - 1] === "/" && !/\/(\w+)\//.test(processedURL)) {
            processedURL = processedURL.substring(0, processedURL.length - 1);
        }
        return processedURL;
    };


    plugins.register("/sdk/process_request", function(ob) {
        var params = ob.params;
        if (params.qstring.metrics) {
            if (typeof params.qstring.metrics._store === "undefined" && params.qstring.metrics._os) {
                params.qstring.metrics._store = params.qstring.metrics._os;
                if (!params.qstring.metrics._source_channel) {
                    params.qstring.metrics._source_channel = "Direct";
                }
            }

            if (typeof params.qstring.metrics._store !== "undefined") {
                if (params.app && params.app.type === "web") {
                    if (!params.qstring.metrics._source_channel) {
                        params.qstring.metrics._source_channel = params.qstring.metrics._store;
                        try {
                            const getURL = new URL(params.qstring.metrics._source_channel);
                            const getHostName = getURL.hostname;
                            const parseResult = parseDomain.parseDomain(getHostName);
                            if (parseResult.type === parseDomain.ParseResultType.Listed) {
                                const { domain} = parseResult;
                                params.qstring.metrics._source_channel = domain;
                            }
                            else {
                                throw "invalid URL";
                            }
                        }
                        catch (ex) {
                            delete params.qstring.metrics._source_channel;
                        }
                    }
                    params.qstring.metrics._store = plugin.urlParser(params.qstring.metrics._store);
                }

                var sourcesConfig = plugins.getConfig("sources", params.app && params.app.plugins, true) || {};
                var sources_length_limit = (sourcesConfig.sources_length_limit && parseInt(sourcesConfig.sources_length_limit, 10)) || 100;
                params.qstring.metrics._store = params.qstring.metrics._store.substring(0, sources_length_limit);

                params.qstring.metrics._store = common.dbEncode(params.qstring.metrics._store);
                ob.params.collectedMetrics.src = params.qstring.metrics._store;
            }
            if (params.qstring.metrics._source_channel) {
                ob.params.collectedMetrics.src_ch = params.qstring.metrics._source_channel;
            }
        }
    });
}(pluginInstance));

module.exports = pluginInstance;