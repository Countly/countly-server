(function (countlyDBviewer, $, undefined) {

    //Private Properties
    var _data = {},
		_collections = {},
		_document = {};

    //Public Methods
    countlyDBviewer.initialize = function (app_id) {
    	var data = { api_key: countlyGlobal['member'].api_key, app_id:app_id };
		// is app_id provided?
		if (data.app_id && data.app_id == "all") delete data.app_id;
		// is there stored app_id?
		if ((!app_id && store.get('dbviewer_selected_app')) && store.get('dbviewer_selected_app') !== "all") {
			data.app_id = store.get('dbviewer_selected_app');
		}
		return $.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/o/db",
			data:data,
			success:function (json) {
				_data = json;
				for(var i = 0; i < _data.length; i++){
                    if(_data[i].collections){
                    	var list = [];
                    	for(var j in _data[i].collections){
                        	list.push(j);
                        }
                        list.sort(function(a, b) {
                        	if(a < b) return -1;
						    if(a > b) return 1;
						    return 0;
                        });
                        _data[i].list = list;
                    }
                }
			}
		});
    };
	
	countlyDBviewer.loadCollections = function (db, collection, page, filter, limit, sort, projection, isSort) {
		limit = limit || 20;
		var skip = (page-1) * limit;
		return $.ajax({
			type:"GET",
			url:countlyCommon.API_URL + '/o/db/',
			data:{
				dbs:db,
				collection:collection,
				filter: filter || "{}",
				limit: limit,
				sort: (isSort) ? (typeof sort === "string") ? sort : JSON.stringify(sort) : "{}",
				projection: (typeof projection === "string") ? projection : JSON.stringify(projection),
				skip: skip,
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