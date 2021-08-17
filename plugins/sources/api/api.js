var pluginInstance = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    stores = require("../stores.json"),
    fetch = require('../../../api/parts/data/fetch.js'),
    parseDomain = require('parse-domain'),
    { validateRead } = require('../../../api/utils/rights.js'),
    urlParse = require('url');

const FEATURE_NAME = 'sources';

var searchEngineKeyWord = {
    "q": true,
    "search": true,
    "searchfor": true,
    "query": true,
    "wd": "baidu", //only for baidu domains
    "p": "yahoo", //only for yahoo domains
    "text": "yandex", // only for yandex domains
    "u": "facebook.com/l.php" // only for facebook.com/l.php
};

var filterList = ["google", "baidu.com", "bing", "yahoo", "yandex", "aol", "facebook.com/l.php"];
var stripPath = ["r.search.yahoo.com", "m.baidu.com"];
var utmTags = ["_ga", "_gac", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];


(function(plugin) {
    plugins.setConfigs("sources", {
        sources_length_limit: 100
    });

    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

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
                if (queryData.length >= 2 && queryData[1].length > 0) {
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

    plugins.register("/worker", function() {
        common.dbUserMap.source = 'src';
    });
    plugins.register("/o/method/total_users", function(ob) {
        ob.shortcodesForMetrics.sources = "src";
    });
    plugins.register("/metric/collection", function(ob) {
        if (ob.metric === "sources") {
            ob.data = ["sources", "sources", "sources"];
        }
    });
    plugins.register("/sdk/pre", function(ob) {
        var params = ob.params;

        if (params.qstring.metrics) {
            if (typeof params.qstring.metrics._store === "undefined" && params.qstring.metrics._os) {
                params.qstring.metrics._store = params.qstring.metrics._os;
                if (!params.qstring.metrics._source_channel) {
                    params.qstring.metrics._source_channel = "Direct";
                }
            }
        }
        if (params.qstring.metrics && typeof params.qstring.metrics._store !== "undefined") {

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

            params.qstring.metrics._store = common.db.encode(params.qstring.metrics._store);
        }
    });
    plugins.register("/sdk/user_properties", function(ob) {
        if (ob.params.qstring.metrics && ob.params.qstring.metrics._source_channel) {
            ob.updates.push({$set: {src_ch: ob.params.qstring.metrics._source_channel}});
        }
    });
    plugins.register("/session/metrics", function(ob) {
        var predefinedMetrics = ob.predefinedMetrics;

        predefinedMetrics.push({
            db: "sources",
            metrics: [
                { name: "_store", set: "sources", short_code: common.dbUserMap.source }
            ]
        });
    });
    plugins.register("/o", function(ob) {
        var params = ob.params;
        if (params.qstring.method === "sources") {
            validateRead(params, FEATURE_NAME, fetch.fetchTimeObj, "sources");
            return true;
        }
        return false;
    });

    plugins.register("/o/keywords", function(ob) {
        var params = ob.params;
        validateRead(params, FEATURE_NAME, function() {
            fetch.getMetric(params, "sources", null, function(data) {
                var result = [];
                for (var i = 0; i < data.length; i++) {
                    var parts = urlParse.parse(common.db.decode(data[i]._id), true);
                    if ((parts.href || parts.hostname) && parts.query) {
                        parts.hostname = parts.hostname || parts.href.split("/")[0];
                        for (var c in searchEngineKeyWord) {
                            if (typeof parts.query[c] !== "undefined" && parts.query[c] !== "") {
                                if (typeof searchEngineKeyWord[c] === "boolean" || (typeof searchEngineKeyWord[c] === "string" && parts.hostname.indexOf(searchEngineKeyWord[c]) !== -1)) {
                                    data[i]._id = common.db.encode(parts.query[c] + "");
                                    result.push(data[i]);
                                    break;
                                }
                            }
                        }
                    }
                }
                common.returnOutput(params, result);
            });
        });
        return true;
    });

    plugins.register("/o/sources", function(ob) {
        common.returnOutput(ob.params, stores);
        return true;
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('sources').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('sources').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('sources').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('sources').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
    });
}(pluginInstance));

module.exports = pluginInstance;