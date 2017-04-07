(function(){
    var map,
        data,
        curRadius = 1,
        curBlur = 1,
        baseRadius = 1,
        baseBlur = 1.6,
        actionType = "click",
        apiPath = "/o/actions",
        period = "30days";
    function get(id) {
        return document.getElementById(id);
    }
    Countly._internals.loadJS(Countly.url+"/views/javascripts/simpleheat.js", function(){
        //make canvas on whole screen
		var canvas = document.createElement("canvas");
		canvas.setAttribute("width", Countly._internals.getDocWidth() + "px");
		canvas.setAttribute("height", Countly._internals.getDocHeight() + "px");
		canvas.style.position = "absolute";
		canvas.style.top = "0px";
		canvas.style.left = "0px";
		canvas.style.zIndex = 1000000;
		canvas.style.opacity = 0.5;
        canvas.style.pointerEvents = "none";
		canvas.id = "cly-canvas-map";
		document.body.appendChild(canvas);
        map = simpleheat("cly-canvas-map");
        loadData();
    });
    
    function loadData(){
        console.log("loading data");
        sendXmlHttpRequest({app_key:Countly.app_key, view:window.location.pathname, period:period}, function(err, data){
            console.log("loaded", err, data);
            if(!err){
                drawData(data.data);
            }
        });
    }
    
    function drawData(data){
        var heat = [];
        var point;
        var width = parseInt(get("cly-canvas-map").getAttribute('width'));
        var height = parseInt(get("cly-canvas-map").getAttribute('height'));
        console.log(width+"x"+height);
        for(var i = 0; i < data.length; i++){
            point = data[i].sg;
            if(point.type == actionType)
                heat.push([parseInt((point.x/point.width)*width), parseInt((point.y/point.height)*height), data[i].c])
        }
        //map.clear();
        console.log("heat", heat);
        map.data(heat);
        baseRadius = Math.max((48500-35*data.length)/900, 5);
        drawMap(); 
    }
    
    function drawMap(){
        map.radius(baseRadius*curRadius, baseRadius*baseBlur*curBlur);
        map.draw();
    }
    
    function readBody(xhr) {
        var data;
        if (!xhr.responseType || xhr.responseType === "text") {
            data = xhr.responseText;
        } else if (xhr.responseType === "document") {
            data = xhr.responseXML;
        } else {
            data = xhr.response;
        }
        return data;
    }


    //sending xml HTTP request
	function sendXmlHttpRequest(params, callback) {
        try {
			console.log("Sending XML HTTP request");
            var xhr = window.XMLHttpRequest ? new window.XMLHttpRequest() : window.ActiveXObject ? new ActiveXObject('Microsoft.XMLHTTP') : null;
            
            var data = Countly._internals.prepareParams(params);      
            var method = "GET";
            if(data.length >= 2000)
                method = "POST";
            else if(Countly.force_post)
                method = "POST";
            
            if(method === "GET")
                xhr.open('GET', Countly.url + apiPath + "?" + data, true);
            else{
                xhr.open('POST', Countly.url + apiPath, true);
                xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            }
            xhr.setRequestHeader("countly-token", Countly._internals.getToken());

            // fallback on error
            xhr.onreadystatechange = function () {
                if(this.readyState == this.HEADERS_RECEIVED) {
                    try{
                        Countly._internals.setToken(xhr.getResponseHeader("content-language"));
                    }
                    catch(ex){
                        console.log("failed, trying fallback header");
                        Countly.token = xhr.getResponseHeader("content-language");
                    }
                }
                if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
					if (typeof callback === 'function') { callback(false, JSON.parse(readBody(xhr))); }
                } else if (this.readyState === 4) {
					console.log("Failed Server XML HTTP request", this.status);
                    if (typeof callback === 'function') { callback(true, params); }
                }
            };
            if(method == "GET")
                xhr.send();
            else
                xhr.send(data);
        } catch (e) {
            // fallback
			console.log("Failed XML HTTP request", e);
            if (typeof callback === 'function') { callback(true, params); }
        }
    }
})();