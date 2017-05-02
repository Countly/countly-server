(function(){
    var map,
        gdata,
        curRadius = 1,
        curBlur = 1,
        baseRadius = 1,
        baseBlur = 1.6,
        actionType = "click",
        apiPath = "/o/actions",
        period = Countly.passed_data.period || "30days";
    Countly._internals.loadJS(Countly.url+"/views/javascripts/simpleheat.js", function(){
        //place the toolbar
        document.body.style.position = "relative";
        var origtop = document.body.style.top;
        var toppx = 60;
        if(origtop)
            toppx += parseInt(origtop);
        document.body.style.top = toppx+"px";
        var topbar = document.createElement('div');
        topbar.setAttribute("id", "cly-topbar");
        topbar.style.position = "fixed";
        topbar.style.top = "0px";
        topbar.style.left = "0px";
        topbar.style.width = "100%";
        topbar.style.height = "45px";
        topbar.style.paddingTop = "15px";
        topbar.style.backgroundColor = "#F0F3F7";
        topbar.style.boxSizing = "content-box";
        topbar.style.zIndex = 1000001;
        document.body.appendChild(topbar);
        var img = document.createElement('img');
        img.src = Countly.url+"/images/dashboard/countly_logo.svg";
        img.setAttribute('style', 'height:30px !important; vertical-align:-7px;');
        var childSpan = document.createElement('span');
        childSpan.setAttribute('style', 'display: inline-block; margin-left: 14px; font-size: 16px; vertical-align: top; margin-top: 6px; border-left: 1px solid #ababab; padding-left: 14px;');
        childSpan.innerHTML = "Heatmaps";
        var span = document.createElement('span');
        span.appendChild(img);
        span.appendChild(childSpan);
        span.setAttribute('style', 'font:20px "PT Sans", sans-serif;margin-left: 22px;color:#666;');
        topbar.appendChild(span);
        var closeX = document.createElement('a');
        closeX.innerHTML = "&#10006;";
        closeX.setAttribute('style', 'font: 22px "PT Sans", sans-serif;position: absolute;top: 17px;right: 22px;color:#666;');
        closeX.href = "#";
        topbar.appendChild(closeX);
        Countly._internals.add_event(closeX, "click", function(){
            topbar.style.display = "none";
            canvas.style.display = "none";
            document.body.style.top = origtop;
            window.name = null;
        });
        //make canvas on whole screen
		var canvas = document.createElement("canvas");
		canvas.style.position = "absolute";
		canvas.style.top = "0px";
		canvas.style.left = "0px";
		canvas.style.zIndex = 1000000;
		canvas.style.opacity = 0.5;
        canvas.style.pointerEvents = "none";
        canvas.setAttribute("width", Countly._internals.getDocWidth() + "px");
        canvas.setAttribute("height", Countly._internals.getDocHeight() + "px");
		canvas.id = "cly-canvas-map";
		document.body.appendChild(canvas);
        map = simpleheat("cly-canvas-map");
        loadData();
        Countly._internals.add_event(window, "resize", function(){
            Countly.stop_time();
            canvas.setAttribute("width", "0px");
            canvas.setAttribute("height", "0px");
            setTimeout(function(){
                canvas.setAttribute("width", Countly._internals.getDocWidth() + "px");
                canvas.setAttribute("height", Countly._internals.getDocHeight() + "px");
                map.resize();
                drawData(); 
            },1);
        });
    });
    
    function loadData(){
        sendXmlHttpRequest({app_key:Countly.app_key, view:Countly._internals.getLastView() || window.location.pathname, period:period}, function(err, clicks){
            if(!err){
                data = clicks.data;
                drawData();
            }
        });
    }
    
    function drawData(){
        var heat = [];
        var point;
        var width = Countly._internals.getDocWidth();
        var height = Countly._internals.getDocHeight();
        for(var i = 0; i < data.length; i++){
            point = data[i].sg;
            if(point.type == actionType)
                heat.push([parseInt((point.x/point.width)*width), parseInt((point.y/point.height)*height), data[i].c])
        }
        map.clear();
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
			Countly._internals.log("Sending XML HTTP request");
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
                        Countly._internals.log("failed, trying fallback header");
                        Countly.token = xhr.getResponseHeader("content-language");
                    }
                }
                if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
					if (typeof callback === 'function') { callback(false, JSON.parse(readBody(xhr))); }
                } else if (this.readyState === 4) {
					Countly._internals.log("Failed Server XML HTTP request", this.status);
                    if (typeof callback === 'function') { callback(true, params); }
                }
            };
            if(method == "GET")
                xhr.send();
            else
                xhr.send(data);
        } catch (e) {
            // fallback
			Countly._internals.log("Failed XML HTTP request", e);
            if (typeof callback === 'function') { callback(true, params); }
        }
    }
})();