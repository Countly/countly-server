(function (countlyDBviewer, $, undefined) {

    //Private Properties
    var _data = {},
		_collections = {},
		_document = {};

    //Public Methods
    countlyDBviewer.initialize = function () {
		return $.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/o/db",
			data:{
                api_key:countlyGlobal['member'].api_key
            },
			success:function (json) {
				_data = json;
			}
		});
    };
	
	countlyDBviewer.loadCollections = function (db, collection, page, filter, limit) {
		limit = limit || 20;
		var skip = (page-1)*limit;
		return $.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/o/db",
			data:{
				dbs:db,
				collection:collection,
				limit: limit,
				skip: skip,
				filter: filter,
				api_key:countlyGlobal['member'].api_key
			},
			success:function (json) {
				_collections = json;
			}
		});
    };
	
	countlyDBviewer.loadDocument = function (db, collection, id) {
		return $.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/o/db",
			data:{
				dbs:db,
				collection:collection,
				document:id,
				api_key:countlyGlobal['member'].api_key
			},
			success:function (json) {
				_document = json;
			}
		});
    };
	
	countlyDBviewer.getData = function () {
		return _data;
    };
	
	countlyDBviewer.getCollections = function () {
		return _collections;
    };
	
	countlyDBviewer.getDocument = function () {
		return _document;
    };
	
}(window.countlyDBviewer = window.countlyDBviewer || {}, jQuery));