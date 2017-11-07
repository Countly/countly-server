(function(){
    var map,
        gdata,
        curRadius = 1,
        curBlur = 1,
        baseRadius = 1,
        baseBlur = 1.6,
        actionType = "click",
        apiPath = "/o/actions",
        period = Countly.passed_data.period || "30days",
        pageWidth = 0,
        pageHeight = 0,
        currentDevice = [],
        dataCache = {};
        showHeatMap = Countly.passed_data.showHeatMap == false ? false : true;        
	    Countly._internals.loadJS(Countly.url+"/views/javascripts/simpleheat.js", function(){
	    loadCSS("http://code.ionicframework.com/ionicons/2.0.1/css/ionicons.min.css", function () {
            loadCSS(Countly.url + "/views/stylesheets/heatmap.css", function () {
		        document.body.style.position = "relative";
                var origtop = document.body.style.top;
                var toppx = 59;
                pageWidth = Countly._internals.getDocWidth();
                pageHeight = Countly._internals.getDocHeight();
                var devices = [
                    {
                        type: "mobile",
                        displayText: "Mobile",
                        minWidth: 0,
                        maxWidth: 767
                    },
                    {
                        type: "tablet",
                        displayText: "Tablet",
                        minWidth: 767,
                        maxWidth: 1024
                    },
                    {
                        type: "desktop",
                        displayText: "Desktop",
                        minWidth: 1024,
                        maxWidth: 10240
                    },
                ];

                currentDevice = devices.filter((device) => {
                    return device.minWidth < pageWidth && device.maxWidth >= pageWidth;
                });

                if (origtop)
                    toppx += parseInt(origtop);
                document.body.style.top = toppx + "px";

                //TOPBAR
                var topbar = document.createElement('div');
                topbar.setAttribute("id", "cly-topbar");
                document.body.appendChild(topbar);

                //TOPBAR IMAGE
                var img = document.createElement('img');
                img.src =  Countly.url+"/images/dashboard/countly_logo.svg";
                img.setAttribute('class', 'cly-logo');
		        topbar.appendChild(img);

                //MAIN DROPDOWN CONTAINER DIV WITHIN TOPBAR
                var mainDiv = document.createElement('div');
                mainDiv.setAttribute('class', 'cly-center-menu');
		        topbar.appendChild(mainDiv);

                //DROPDOWN TO SELECT THE HEATMAP TYPE --- STARTS HERE ---
                var mapsDropdown = document.createElement('div');
                mapsDropdown.setAttribute('class', 'cly-dropdown cly-bordered cly-large cly-active');

                var mapSpan = document.createElement('span');
                mapSpan.innerHTML = "Heatmap Type";
                mapSpan.setAttribute('class', 'cly-title');

                var selectedMap = document.createElement('div');
                selectedMap.innerHTML = "Click Map";
                selectedMap.setAttribute('class', 'cly-selected cly-map');

                var mapMenuDiv = document.createElement('div');
                mapMenuDiv.setAttribute('class', 'cly-menu');

                var mapListDiv = document.createElement('div');
                mapListDiv.setAttribute('class', 'cly-list');
                mapListDiv.setAttribute('id', 'cly-maps');

                var mapTypes = ['click'];

                mapTypes.forEach((map) => {
                    var tag = document.createElement('a');
                    tag.setAttribute('class', 'cly-item');
                    tag.setAttribute('data-value', map);
                    tag.innerHTML = capitalize(map) + " Map";
                    tag.addEventListener("click", function (e) {
                        var dropdowns = topbar.getElementsByClassName("cly-dropdown");

                        if (dropdowns.length) {
                            Object.keys(dropdowns).forEach((drop) => {
                                dropdowns[drop].classList.remove("cly-clicked");
                            })
                        }

                        selectedMap.innerHTML = capitalize(map) + " Map";
                        e.stopPropagation();
                    })

                    mapListDiv.appendChild(tag);
                })

                mapMenuDiv.appendChild(mapListDiv);
                mapsDropdown.appendChild(mapSpan);
                mapsDropdown.appendChild(selectedMap);
                mapsDropdown.appendChild(mapMenuDiv);

                //DROPDOWN TO SELECT THE HEATMAP TYPE --- ENDS HERE ---

                //DROPDOWN TO SELECT THE DEVICE TYPE --- STARTS HERE ---
                var deviceDropdown = document.createElement('div');
                deviceDropdown.setAttribute('class', 'cly-dropdown cly-bordered cly-large cly-active');

                var deviceSpan = document.createElement('span');
                deviceSpan.innerHTML = "Resolution";
                deviceSpan.setAttribute('class', 'cly-title');

                var selectedDevice = document.createElement('div');
                selectedDevice.innerHTML = "Desktop";
                selectedDevice.setAttribute('class', 'cly-selected cly-device');

                var deviceMenuDiv = document.createElement('div');
                deviceMenuDiv.setAttribute('class', 'cly-menu');

                var deviceListDiv = document.createElement('div');
                deviceListDiv.setAttribute('class', 'cly-list');
                deviceListDiv.setAttribute('id', 'cly-devices');

                devices.forEach((device) => {
                    var tag = document.createElement('a');
                    tag.setAttribute('class', 'cly-item ');
                    tag.setAttribute('data-value', device.type);
                    tag.innerHTML = device.displayText;

                    if (device.type == currentDevice[0].type) {
                        selectedDevice.innerHTML = device.displayText;
                    }

                    deviceListDiv.appendChild(tag);

                    Countly._internals.add_event(tag, "click", function (e) {
                        document.body.style.width = "100%";
                        pageWidth = Countly._internals.getDocWidth();
                        canvas.setAttribute("width", "0px");
                        canvas.setAttribute("height", "0px");
                        pageWidth = Math.min(device.maxWidth, pageWidth);
                        document.body.style.width = pageWidth + "px";
                        document.body.style.marginLeft = "auto";
                        document.body.style.marginRight = "auto";
                        pageHeight = Countly._internals.getDocHeight();
                        canvas.setAttribute("width", pageWidth + "px");
                        canvas.setAttribute("height", pageHeight + "px");
                        map.resize();

                        var updatedDevice = devices.filter((device) => {
                            return device.minWidth < pageWidth && device.maxWidth >= pageWidth;
                        });

                        var dropdowns = topbar.getElementsByClassName("cly-dropdown");
                        
                        if (dropdowns.length) {
                            Object.keys(dropdowns).forEach((drop) => {
                                dropdowns[drop].classList.remove("cly-clicked");
                            })
                        }
                        
                        currentDevice[0] = updatedDevice[0];
                        selectedDevice.innerHTML = currentDevice[0].displayText;
                        checkCache();
                        e.stopPropagation();
                    });
                })

                deviceMenuDiv.appendChild(deviceListDiv);
                deviceDropdown.appendChild(deviceSpan);
                deviceDropdown.appendChild(selectedDevice);
                deviceDropdown.appendChild(deviceMenuDiv);
                //DROPDOWN TO SELECT THE DEVICE TYPE --- ENDS HERE ---

                listenDropdownEvent("click", mapsDropdown);
                listenDropdownEvent("click", deviceDropdown);

                //REFRESH 
                var refresh = document.createElement('div');
                refresh.setAttribute('class', 'cly-block');

                var icon = document.createElement('i');
                icon.setAttribute('class', 'ion-refresh');

                var text = document.createElement('span');
                text.innerHTML = 'Reload Data';

                refresh.appendChild(icon);
                refresh.appendChild(text);

                mainDiv.appendChild(mapsDropdown);
                mainDiv.appendChild(deviceDropdown);
                mainDiv.appendChild(refresh);

                Countly._internals.add_event(refresh, "click", function () {
                    dataCache = {};
                    canvas.setAttribute("width", "0px");
                    canvas.setAttribute("height", "0px");
                    setTimeout(function () {
                        canvas.setAttribute("width", pageWidth + "px");
                        canvas.setAttribute("height", pageHeight + "px");
                        map.resize();
                        checkCache();
                    }, 1);
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
                checkCache();

                Countly._internals.add_event(window, "resize", function () {
                    canvas.setAttribute("width", "0px");
                    canvas.setAttribute("height", "0px");
                    setTimeout(function () {
                        document.body.style.width = "100%";
                        pageWidth = Countly._internals.getDocWidth();
                        pageHeight = Countly._internals.getDocHeight();
                        var updatedDevice = devices.filter((device) => {
                            return device.minWidth < pageWidth && device.maxWidth >= pageWidth;
                        });
                        canvas.setAttribute("width", pageWidth + "px");
                        canvas.setAttribute("height", pageHeight + "px");
                        map.resize();
                        currentDevice[0] = updatedDevice[0];
                        selectedDevice.innerHTML = currentDevice[0].displayText;
                        checkCache();
                    }, 1);
                });
                
                var showHide = document.createElement('div');
                showHide.setAttribute('class', 'cly-checkbox');

                var shLabel = document.createElement('label');
                shLabel.setAttribute('class', 'cly-label');
                shLabel.innerHTML = "Show Heatmap";

                var shInput = document.createElement('input');
                shInput.setAttribute('style', 'display: none');
                shInput.setAttribute('type', 'checkbox');
		        if(showHeatMap){
                    shInput.setAttribute('checked', 'checked');                    
                }
	
                var shSpan = document.createElement('span');
                shSpan.setAttribute('class', 'cly-checkmark');

                shLabel.appendChild(shInput);
                shLabel.appendChild(shSpan);
                showHide.appendChild(shLabel);
                Countly._internals.add_event(shInput, "click", function () {
                    showHeatMap = shInput.checked;
                    var dataCLY;
                    var prefix = "";
                    if(window.name && window.name.indexOf("cly:") === 0){
                        dataCLY = JSON.parse(window.name.replace("cly:", ""));
                        prefix = window.name.slice(0,4);
                    }
                    else if(location.hash && location.hash.indexOf("#cly:") === 0){
                        dataCLY = JSON.parse(location.hash.replace("#cly:", ""));
                        prefix = window.name.slice(0,5);                        
                    }

                    dataCLY.showHeatMap = showHeatMap;
                    window.name = prefix + JSON.stringify(dataCLY);

	                if(!showHeatMap){
                        canvas.setAttribute("width", "0px");
                        canvas.setAttribute("height", "0px");
                        map.resize();
                    }else{
                    	canvas.setAttribute("width", pageWidth + "px");
                        canvas.setAttribute("height", pageHeight + "px");
                        map.resize();
                        checkCache();
			        }
                });

                topbar.appendChild(showHide);
                
                document.body.addEventListener("click", function (e) {
                    var dropdowns = topbar.getElementsByClassName("cly-dropdown");
                    if (dropdowns.length) {
                        Object.keys(dropdowns).forEach((drop) => {
                            dropdowns[drop].classList.remove("cly-clicked");
                        })
                    }

                    e.stopPropagation();
                })

                function listenDropdownEvent(event, element) {
                    element.addEventListener(event, function (e) {
                        var wasActive = element.classList.contains("cly-clicked");
                        var dropdowns = topbar.getElementsByClassName("cly-dropdown");

                        if (dropdowns.length) {
                            Object.keys(dropdowns).forEach((drop) => {
                                dropdowns[drop].classList.remove("cly-clicked");
                            })
                        }

                        if (wasActive) {
                            element.classList.remove("cly-clicked");
                        } else {
                            element.classList.add("cly-clicked");
                        }

                        e.stopPropagation();
                    });
                }
           })
        });   
    });
    
    function loadCSS(css, callback) {
        var fileref = document.createElement('link'), loaded;
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("href", css);
        fileref.onreadystatechange = fileref.onload = function () {
            if (!loaded) {
                callback();
            }
            loaded = true;
        };
        document.getElementsByTagName("head")[0].appendChild(fileref);
    } 
   
    function capitalize(str) {
        return str[0].toUpperCase() + str.slice(1);
    }

    function checkCache(){
        if(showHeatMap){
            if (dataCache[currentDevice[0].type]) {
                drawData();
            } else {
                loadData();
            }
        }
    }

    function loadData(){
        sendXmlHttpRequest({app_key:Countly.app_key, view:Countly._internals.getLastView() || window.location.pathname, period:period, width:pageWidth}, function(err, clicks){
            if(!err){
                dataCache[currentDevice[0].type] = clicks.data;
                drawData();
            }
        });
    }
    
    function drawData(){
        var heat = [];
        var point;
        var width = pageWidth;
        var height = pageHeight;
        var data = dataCache[currentDevice[0].type];
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