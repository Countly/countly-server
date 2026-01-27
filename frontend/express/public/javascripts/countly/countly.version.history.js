import jQuery from 'jquery';
import { countlyCommon } from './countly.common.js';

const $ = jQuery;

//we will store our data here
let _data = {};

const countlyVersionHistoryManager = {};

//Initializing model
countlyVersionHistoryManager.initialize = function() {
    //returning promise
    return $.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/o/countly_version",
        data: {},
        success: function(json) {
            //got our data, let's store it
            _data = json.result;
        },
        error: function(/*exception*/) {}
    });
};

//return data that we have
countlyVersionHistoryManager.getData = function(detailed) {
    if (detailed) {
        return _data;
    }
    return _data.fs;
};

export default countlyVersionHistoryManager;
