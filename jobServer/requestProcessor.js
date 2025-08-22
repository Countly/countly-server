const url = require('url');

const common = require('../api/utils/common.js');
const pluginManager = require("../plugins/pluginManager.js");

require('./api');

/**
 * Process request function
 * @param {object} params - request parameters
 * @returns {boolean} - returns false if request is cancelled
 */
const processRequest = (params) => {
    if (!params.req || !params.req.url) {
        return common.returnMessage(params, 400, "Please provide request data");
    }

    params.tt = Date.now().valueOf();
    const urlParts = url.parse(params.req.url, true),
        queryString = urlParts.query,
        paths = urlParts.pathname.split("/");

    params.href = urlParts.href;
    params.qstring = params.qstring || {};
    params.res = params.res || {};
    params.urlParts = urlParts;
    params.paths = paths;

    params.req.headers = params.req.headers || {};
    params.req.socket = params.req.socket || {};
    params.req.connection = params.req.connection || {};

    //copying query string data as qstring param
    if (queryString) {
        for (let i in queryString) {
            params.qstring[i] = queryString[i];
        }
    }

    //copying body as qstring param
    if (params.req.body && typeof params.req.body === "object") {
        for (let i in params.req.body) {
            params.qstring[i] = params.req.body[i];
        }
    }

    if (params.qstring.app_id && params.qstring.app_id.length !== 24) {
        common.returnMessage(params, 400, 'Invalid parameter "app_id"');
        return false;
    }

    if (params.qstring.user_id && params.qstring.user_id.length !== 24) {
        common.returnMessage(params, 400, 'Invalid parameter "user_id"');
        return false;
    }

    //remove countly path
    if (common.config.path === "/" + paths[1]) {
        paths.splice(1, 1);
    }

    let apiPath = '';

    for (let i = 1; i < paths.length; i++) {
        if (i > 2) {
            break;
        }

        apiPath += "/" + paths[i];
    }

    params.apiPath = apiPath;
    params.fullPath = paths.join("/");

    switch (apiPath) {
    case '/o/ping': {
        common.db.collection("plugins").findOne({_id: "plugins"}, {_id: 1}).then(() => {
            common.returnMessage(params, 200, 'Success');
        }).catch(() => {
            common.returnMessage(params, 404, 'DB Error');
        });
        return;
    }
    default:
        if (!pluginManager.dispatch(apiPath, {
            params: params,
            paths: paths
        })) {
            if (!pluginManager.dispatch(params.fullPath, {
                params: params,
                paths: paths
            })) {
                common.returnMessage(params, 400, 'Invalid path');
            }
        }
    }

};

module.exports = {processRequest: processRequest};
