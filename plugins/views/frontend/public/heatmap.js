(function() {
    var pageWidth = 0,
        pageHeight = 0,
        currentDevice = Countly.passed_data.currentDevice && Countly.passed_data.currentDevice.length && Countly.passed_data.currentDevice[0] ? Countly.passed_data.currentDevice : [],
        currentMap = Countly.passed_data.currentMap == "scroll" ? "scroll" : "click",
        showHeatMap = Countly.passed_data.showHeatMap == false ? false : true,
        clickMap,
        scrollMap;

    Countly._internals.loadCSS(Countly.url + "/stylesheets/ionicons/css/ionicons.min.css", function() {
        Countly._internals.loadCSS(Countly.url + "/views/stylesheets/heatmap.css", function() {
            document.body.style.position = "relative";
            var origtop = document.body.style.top;
            var toppx = 59;
            var allDevices = [
                {
                    type: "all",
                    displayText: "All",
                    minWidth: 0,
                    maxWidth: 10240
                },
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
                    type: "desktop-1280",
                    displayText: "Desktop - 1280",
                    minWidth: 1024,
                    maxWidth: 1280
                },
                {
                    type: "desktop-1366",
                    displayText: "Desktop - 1366",
                    minWidth: 1280,
                    maxWidth: 1366
                },
                {
                    type: "desktop-1440",
                    displayText: "Desktop - 1440",
                    minWidth: 1366,
                    maxWidth: 1440
                },
                {
                    type: "desktop-1600",
                    displayText: "Desktop - 1600",
                    minWidth: 1440,
                    maxWidth: 1600
                },
                {
                    type: "desktop-1920",
                    displayText: "Desktop - 1920",
                    minWidth: 1600,
                    maxWidth: 1920
                },
                {
                    type: "desktop-other",
                    displayText: "Desktop - Other",
                    minWidth: null,
                    maxWidth: 10240
                }
            ];

            var devices = [];

            if (origtop) {
                toppx += parseInt(origtop);
            }
            document.body.style.top = toppx + "px";

            //TOPBAR
            var topbar = document.createElement('div');
            topbar.setAttribute("id", "cly-heatmap-topbar");
            document.body.appendChild(topbar);

            if (currentDevice.length) {
                pageWidth = Countly._internals.getDocWidth();
                pageWidth = Math.min(currentDevice[0].maxWidth, pageWidth);
                document.body.style.width = pageWidth + "px";
                document.body.style.marginLeft = "auto";
                document.body.style.marginRight = "auto";
                pageHeight = Countly._internals.getDocHeight() - toppx;
            }
            else {
                pageWidth = Countly._internals.getDocWidth();
                pageHeight = Countly._internals.getDocHeight() - toppx;
            }

            for (var i = 0; i < allDevices.length; i++) {
                if ((allDevices[i].minWidth != null) && (allDevices[i].minWidth < pageWidth)) {
                    devices.push(allDevices[i]);
                }

                if (allDevices[i].type === "desktop-other" && (devices.length > 3)) {
                    devices.push(allDevices[i]);
                    devices[devices.length - 1].minWidth = devices[devices.length - 2].maxWidth;
                }
            }

            if (!currentDevice.length) {
                currentDevice = devices.filter((deviceObj) => {
                    return deviceObj.minWidth < pageWidth && deviceObj.maxWidth >= pageWidth && deviceObj.type != "all";
                });
            }

            //TOPBAR IMAGE
            var img = document.createElement('img');
            img.src = Countly.url + "/images/dashboard/countly_logo.svg";
            img.setAttribute('class', 'cly-heatmap-logo');
            topbar.appendChild(img);

            //MAIN DROPDOWN CONTAINER DIV WITHIN TOPBAR
            var mainDiv = document.createElement('div');
            mainDiv.setAttribute('class', 'cly-heatmap-center-menu');
            topbar.appendChild(mainDiv);

            //DROPDOWN TO SELECT THE HEATMAP TYPE --- STARTS HERE ---
            var mapsDropdown = document.createElement('div');
            mapsDropdown.setAttribute('class', 'cly-heatmap-dropdown cly-heatmap-bordered cly-heatmap-large cly-heatmap-active');

            var mapSpan = document.createElement('span');
            mapSpan.innerHTML = "Heatmap Type";
            mapSpan.setAttribute('class', 'cly-heatmap-title');

            var selectedMap = document.createElement('div');
            selectedMap.innerHTML = capitalize(currentMap) + " Map";
            selectedMap.setAttribute('class', 'cly-heatmap-selected cly-heatmap-map');

            var mapMenuDiv = document.createElement('div');
            mapMenuDiv.setAttribute('class', 'cly-heatmap-menu');

            var mapListDiv = document.createElement('div');
            mapListDiv.setAttribute('class', 'cly-heatmap-list');
            mapListDiv.setAttribute('id', 'cly-heatmap-maps');

            var mapTypes = ['click', 'scroll'];

            mapTypes.forEach((map) => {
                var tag = document.createElement('a');
                tag.setAttribute('class', 'cly-heatmap-item');
                tag.setAttribute('data-value', map);
                tag.innerHTML = capitalize(map) + " Map";
                Countly._internals.add_event(tag, "click", function(e) {
                    var dropdowns = topbar.getElementsByClassName("cly-heatmap-dropdown");

                    if (dropdowns.length) {
                        Object.keys(dropdowns).forEach((drop) => {
                            dropdowns[drop].classList.remove("cly-heatmap-clicked");
                        });
                    }

                    canvas.setAttribute("width", "0px");
                    canvas.setAttribute("height", "0px");

                    var grdMap = document.getElementById("cly-heatmap-scroll-grd-map");
                    if (grdMap) {
                        grdMap.parentNode.removeChild(grdMap);
                    }

                    if (map == "click") {
                        canvas.style.opacity = 0.5;
                        setTimeout(function() {
                            canvas.setAttribute("width", pageWidth + "px");
                            canvas.setAttribute("height", pageHeight + "px");
                            clickMap("mapOpen", pageWidth, pageHeight, currentDevice, showHeatMap);
                        }, 1);
                    }
                    else if (map == "scroll") {
                        canvas.style.opacity = 1;
                        setTimeout(function() {
                            canvas.setAttribute("width", pageWidth + "px");
                            canvas.setAttribute("height", pageHeight + "px");
                            scrollMap("mapOpen", pageWidth, pageHeight, currentDevice, showHeatMap);
                        }, 1);
                    }

                    currentMap = map;
                    addDataToWindow([{ "key": "currentMap", "value": currentMap }]);
                    selectedMap.innerHTML = capitalize(map) + " Map";
                    e.stopPropagation();
                });

                mapListDiv.appendChild(tag);
            });

            mapMenuDiv.appendChild(mapListDiv);
            mapsDropdown.appendChild(mapSpan);
            mapsDropdown.appendChild(selectedMap);
            mapsDropdown.appendChild(mapMenuDiv);
            //DROPDOWN TO SELECT THE HEATMAP TYPE --- ENDS HERE ---

            //DROPDOWN TO SELECT THE DEVICE TYPE --- STARTS HERE ---
            var deviceDropdown = document.createElement('div');
            deviceDropdown.setAttribute('class', 'cly-heatmap-dropdown cly-heatmap-bordered cly-heatmap-large cly-heatmap-active');

            var deviceSpan = document.createElement('span');
            deviceSpan.innerHTML = "Resolution";
            deviceSpan.setAttribute('class', 'cly-heatmap-title');

            var selectedDevice = document.createElement('div');
            selectedDevice.innerHTML = "Desktop";
            selectedDevice.setAttribute('class', 'cly-heatmap-selected cly-heatmap-device');

            var deviceMenuDiv = document.createElement('div');
            deviceMenuDiv.setAttribute('class', 'cly-heatmap-menu');

            var deviceListDiv = document.createElement('div');
            deviceListDiv.setAttribute('class', 'cly-heatmap-list');
            deviceListDiv.setAttribute('id', 'cly-heatmap-devices');

            devices.forEach((device) => {
                var tag = document.createElement('a');
                tag.setAttribute('class', 'cly-heatmap-item ');
                tag.setAttribute('data-value', device.type);
                tag.innerHTML = device.displayText;

                if (device.type == currentDevice[0].type) {
                    selectedDevice.innerHTML = device.displayText;
                }

                deviceListDiv.appendChild(tag);

                Countly._internals.add_event(tag, "click", function(e) {
                    document.body.style.width = "100%";
                    var grdMap = document.getElementById("cly-heatmap-scroll-grd-map");
                    if (grdMap) {
                        grdMap.parentNode.removeChild(grdMap);
                    }
                    pageWidth = Countly._internals.getDocWidth();
                    canvas.setAttribute("width", "0px");
                    canvas.setAttribute("height", "0px");
                    pageWidth = Math.min(device.maxWidth, pageWidth);
                    document.body.style.width = pageWidth + "px";
                    document.body.style.marginLeft = "auto";
                    document.body.style.marginRight = "auto";
                    pageHeight = Countly._internals.getDocHeight() - toppx;
                    canvas.setAttribute("width", pageWidth + "px");
                    canvas.setAttribute("height", pageHeight + "px");

                    var updatedDevice = devices.filter((deviceObj) => {
                        if (device.type == "all") {
                            return deviceObj.type == "all";
                        }
                        else if (device.type == "desktop-other") {
                            return deviceObj.type == "desktop-other";
                        }
                        else {
                            return deviceObj.minWidth < pageWidth && deviceObj.maxWidth >= pageWidth && deviceObj.type != "all";
                        }
                    });

                    var dropdowns = topbar.getElementsByClassName("cly-heatmap-dropdown");

                    if (dropdowns.length) {
                        Object.keys(dropdowns).forEach((drop) => {
                            dropdowns[drop].classList.remove("cly-heatmap-clicked");
                        });
                    }

                    currentDevice[0] = updatedDevice[0];
                    addDataToWindow([{ "key": "currentDevice", "value": currentDevice }]);
                    selectedDevice.innerHTML = currentDevice[0].displayText;

                    if (currentMap == "click") {
                        clickMap("device", pageWidth, pageHeight, currentDevice, showHeatMap);
                    }
                    else {
                        scrollMap("device", pageWidth, pageHeight, currentDevice, showHeatMap);
                    }
                    e.stopPropagation();
                });
            });

            deviceMenuDiv.appendChild(deviceListDiv);
            deviceDropdown.appendChild(deviceSpan);
            deviceDropdown.appendChild(selectedDevice);
            deviceDropdown.appendChild(deviceMenuDiv);
            //DROPDOWN TO SELECT THE DEVICE TYPE --- ENDS HERE ---

            listenDropdownEvent("click", mapsDropdown);
            listenDropdownEvent("click", deviceDropdown);

            //REFRESH
            var refresh = document.createElement('div');
            refresh.setAttribute('class', 'cly-heatmap-block');

            var icon = document.createElement('i');
            icon.setAttribute('class', 'ion-refresh');

            var text = document.createElement('span');
            text.innerHTML = 'Reload Data';

            refresh.appendChild(icon);
            refresh.appendChild(text);

            mainDiv.appendChild(mapsDropdown);
            mainDiv.appendChild(deviceDropdown);
            mainDiv.appendChild(refresh);

            Countly._internals.add_event(refresh, "click", function() {
                dataCache = {};
                canvas.setAttribute("width", "0px");
                canvas.setAttribute("height", "0px");
                var grdMap = document.getElementById("cly-heatmap-scroll-grd-map");
                if (grdMap) {
                    grdMap.parentNode.removeChild(grdMap);
                }
                setTimeout(function() {
                    canvas.setAttribute("width", pageWidth + "px");
                    canvas.setAttribute("height", pageHeight + "px");

                    if (currentMap == "click") {
                        clickMap("refresh", pageWidth, pageHeight, currentDevice, showHeatMap);
                    }
                    else {
                        scrollMap("refresh", pageWidth, pageHeight, currentDevice, showHeatMap);
                    }
                }, 1);
            });

            var canvas = document.createElement("canvas");
            canvas.style.position = "absolute";
            canvas.style.top = "0px";
            canvas.style.left = "0px";
            canvas.style.zIndex = 1000000;
            canvas.style.pointerEvents = "none";
            canvas.setAttribute("width", pageWidth + "px");
            canvas.setAttribute("height", pageHeight + "px");
            canvas.id = "cly-heatmap-canvas-map";
            document.body.appendChild(canvas);

            Countly._internals.add_event(window, "resize", function() {
                canvas.setAttribute("width", "0px");
                canvas.setAttribute("height", "0px");
                var grdMap = document.getElementById("cly-heatmap-scroll-grd-map");
                if (grdMap) {
                    grdMap.parentNode.removeChild(grdMap);
                }
                setTimeout(function() {
                    document.body.style.width = "100%";
                    pageWidth = Countly._internals.getDocWidth();
                    pageHeight = Countly._internals.getDocHeight() - toppx;
                    var updatedDevice = devices.filter((deviceObj) => {
                        if (currentDevice[0].type == "all") {
                            return deviceObj.type == "all";
                        }
                        else if (currentDevice[0].type == "desktop-other") {
                            return deviceObj.type == "desktop-other";
                        }
                        else {
                            return deviceObj.minWidth < pageWidth && deviceObj.maxWidth >= pageWidth && deviceObj.type != "all";
                        }
                    });
                    canvas.setAttribute("width", pageWidth + "px");
                    canvas.setAttribute("height", pageHeight + "px");
                    currentDevice[0] = updatedDevice[0];
                    addDataToWindow([{ "key": "currentDevice", "value": currentDevice }]);
                    selectedDevice.innerHTML = currentDevice[0].displayText;
                    if (currentMap == "click") {
                        clickMap("resize", pageWidth, pageHeight, currentDevice, showHeatMap);
                    }
                    else {
                        scrollMap("resize", pageWidth, pageHeight, currentDevice, showHeatMap);
                    }
                }, 1);
            });

            var showHide = document.createElement('div');
            showHide.setAttribute('class', 'cly-heatmap-checkbox');

            var shLabel = document.createElement('label');
            shLabel.setAttribute('class', 'cly-heatmap-label');
            shLabel.innerHTML = "Show Heatmap";

            var shInput = document.createElement('input');
            shInput.setAttribute('style', 'display: none');
            shInput.setAttribute('type', 'checkbox');
            if (showHeatMap) {
                shInput.setAttribute('checked', 'checked');
            }

            var shSpan = document.createElement('span');
            shSpan.setAttribute('class', 'cly-heatmap-checkmark');

            shLabel.appendChild(shInput);
            shLabel.appendChild(shSpan);
            showHide.appendChild(shLabel);
            Countly._internals.add_event(shInput, "click", function() {
                showHeatMap = shInput.checked;
                addDataToWindow([{ "key": "showHeatMap", "value": showHeatMap }]);

                if (!showHeatMap) {
                    canvas.setAttribute("width", "0px");
                    canvas.setAttribute("height", "0px");
                    var grdMap = document.getElementById("cly-heatmap-scroll-grd-map");
                    if (grdMap) {
                        grdMap.parentNode.removeChild(grdMap);
                    }
                }
                else {
                    canvas.setAttribute("width", pageWidth + "px");
                    canvas.setAttribute("height", pageHeight + "px");
                    if (currentMap == "click") {
                        clickMap("toggleMap", pageWidth, pageHeight, currentDevice, showHeatMap);
                    }
                    else {
                        scrollMap("toggleMap", pageWidth, pageHeight, currentDevice, showHeatMap);
                    }
                }
            });

            topbar.appendChild(showHide);

            Countly._internals.add_event(document.body, "click", function(e) {
                var dropdowns = topbar.getElementsByClassName("cly-heatmap-dropdown");
                if (dropdowns.length) {
                    Object.keys(dropdowns).forEach((drop) => {
                        dropdowns[drop].classList.remove("cly-heatmap-clicked");
                    });
                }

                e.stopPropagation();
            });

            loadClickMap(function(fn) {
                clickMap = fn;
                if (currentMap == "click") {
                    canvas.style.opacity = 0.5;
                    clickMap("init", pageWidth, pageHeight, currentDevice, showHeatMap);
                }
            });

            loadScrollMap(function(fn) {
                scrollMap = fn;
                if (currentMap == "scroll") {
                    canvas.style.opacity = 1;
                    scrollMap("init", pageWidth, pageHeight, currentDevice, showHeatMap);
                }
            });

            function listenDropdownEvent(event, element) {
                element.addEventListener(event, function(e) {
                    var wasActive = element.classList.contains("cly-heatmap-clicked");
                    var dropdowns = topbar.getElementsByClassName("cly-heatmap-dropdown");

                    if (dropdowns.length) {
                        Object.keys(dropdowns).forEach((drop) => {
                            dropdowns[drop].classList.remove("cly-heatmap-clicked");
                        });
                    }

                    if (wasActive) {
                        element.classList.remove("cly-heatmap-clicked");
                    }
                    else {
                        element.classList.add("cly-heatmap-clicked");
                    }

                    e.stopPropagation();
                });
            }
        });
    });

    function addDataToWindow(dataArray) {
        var dataCLY = {};
        var prefix = "";
        if (window.name && window.name.indexOf("cly:") === 0) {
            dataCLY = JSON.parse(window.name.replace("cly:", ""));
            prefix = window.name.slice(0, 4);
        }
        else if (location.hash && location.hash.indexOf("#cly:") === 0) {
            dataCLY = JSON.parse(location.hash.replace("#cly:", ""));
            prefix = window.name.slice(0, 5);
        }

        dataArray.forEach(function(dataObj) {
            dataCLY[dataObj.key] = dataObj.value;
        });

        window.name = prefix + JSON.stringify(dataCLY);
    }

    function loadClickMap(cb) {
        var map,
            curRadius = 1,
            curBlur = 1,
            baseRadius = 1,
            baseBlur = 1.6,
            actionType = "click",
            apiPath = "/o/actions",
            period = Countly.passed_data.period || "30days",
            dataCache = {};

        Countly._internals.loadJS(Countly.url + "/views/javascripts/simpleheat.js", function() {
            map = simpleheat("cly-heatmap-canvas-map");
            return cb(function(eventType, pageWidth, pageHeight, currentDevice, showHeatMap) {
                map.resize();

                if (eventType == "refresh") {
                    dataCache = {};
                }

                checkCache();

                function checkCache() {
                    if (showHeatMap) {
                        if (dataCache[currentDevice[0].type]) {
                            drawData();
                        }
                        else {
                            loadData();
                        }
                    }
                }

                function loadData() {
                    sendXmlHttpRequest({ app_key: Countly.app_key, view: Countly._internals.getLastView() || window.location.pathname, period: period, device: JSON.stringify(currentDevice[0]), actionType: actionType }, apiPath, function(err, clicks) {
                        if (!err) {
                            dataCache[currentDevice[0].type] = clicks.data;
                            drawData();
                        }
                    });
                }

                function drawData() {
                    var heat = [];
                    var point;
                    var width = pageWidth;
                    var height = pageHeight;
                    var data = dataCache[currentDevice[0].type];
                    for (var i = 0; i < data.length; i++) {
                        point = data[i].sg;
                        if (point.type == actionType) {
                            heat.push([parseInt((point.x / point.width) * width), parseInt((point.y / point.height) * height), data[i].c]);
                        }
                    }
                    map.clear();
                    map.data(heat);
                    baseRadius = Math.max((48500 - 35 * data.length) / 900, 5);
                    drawMap();
                }

                function drawMap() {
                    map.radius(baseRadius * curRadius, baseRadius * baseBlur * curBlur);
                    map.draw();
                }
            });
        });
    }

    function loadScrollMap(cb) {
        var map,
            actionType = "scroll",
            apiPath = "/o/actions",
            period = Countly.passed_data.period || "30days",
            dataCache = {};

        Countly._internals.loadJS(Countly.url + "/views/javascripts/simpleheat.js", function() {
            map = simpleheat("cly-heatmap-canvas-map");
            return cb(function(eventType, pageWidth, pageHeight, currentDevice, showHeatMap) {
                map.resize();
                map.viewPortSize({ height: Countly._internals.getViewportHeight() });

                if (eventType == "refresh") {
                    dataCache = {};
                }

                checkCache();

                function checkCache() {
                    if (showHeatMap) {
                        if (dataCache[currentDevice[0].type]) {
                            drawData();
                        }
                        else {
                            loadData();
                        }
                    }
                }

                function loadData() {
                    sendXmlHttpRequest({ app_key: Countly.app_key, view: Countly._internals.getLastView() || window.location.pathname, period: period, device: JSON.stringify(currentDevice[0]), actionType: actionType }, apiPath, function(err, scrolls) {
                        if (!err) {
                            dataCache[currentDevice[0].type] = scrolls.data;
                            drawData();
                        }
                    });
                }

                function drawData() {
                    var heat = [];
                    var count = [];
                    var width = pageWidth;
                    var height = pageHeight;
                    var data = dataCache[currentDevice[0].type];

                    for (var i = 0; i < data.length; i++) {
                        offset = data[i].sg;
                        if (offset.type == actionType) {
                            var obj = {
                                y: parseInt((offset.y / offset.height) * height),
                                c: data[i].c
                            };
                            heat.push(obj);
                        }
                    }

                    for (var i = 0; i <= pageHeight; i++) {
                        count.push(0);
                    }

                    for (i = 0; i < heat.length; i++) {
                        var data = heat[i];
                        var y = data.y;
                        ++count[y];
                    }

                    for (var i = (pageHeight - 1); i >= 0; i--) {
                        count[i] += count[i + 1];
                    }

                    var highestViews = count[0];
                    var totalViews = 0;

                    for (var i = 0; i <= pageHeight; i++) {
                        if (highestViews > 0) {
                            totalViews += count[i];
                            count[i] = parseInt((count[i] / highestViews) * 100);
                        }
                    }

                    map.clear();
                    map.max(totalViews);
                    map.highest(highestViews);
                    map.data(count);
                    drawMap();
                }

                function drawMap() {
                    map.drawgradiant();
                    map.addMarkers();

                    //GRADIENT MAP
                    var totalPageWidth = Countly._internals.getDocWidth();
                    var resolutionXOffest = totalPageWidth - map._width;
                    var grdMapX = map._width + (resolutionXOffest / 2) - 70;
                    var grdMapY = map._viewPortHeight - 200;
                    var grdMapWidth = 13;
                    var grdMapHeight = 120;
                    var grdXOffset = 10;
                    var grdYOffset = 18;

                    var canvas = document.createElement("canvas");
                    canvas.style.position = "fixed";
                    canvas.style.top = grdMapY + "px";
                    canvas.style.left = grdMapX + "px";
                    canvas.style.zIndex = 1000002;
                    canvas.setAttribute("width", grdMapWidth + 2 * (grdXOffset) + "px");
                    canvas.setAttribute("height", grdMapHeight + 2 * (grdYOffset) + "px");
                    canvas.id = "cly-heatmap-scroll-grd-map";

                    var context = canvas.getContext('2d');
                    var grdMap = context.createLinearGradient(grdXOffset, grdYOffset, grdMapWidth, grdMapHeight);

                    var colorStops = JSON.parse(JSON.stringify(map._colorStops));
                    var position = 0;
                    colorStops.forEach(function(stop) {
                        stop.position = parseFloat(position.toFixed(1));
                        grdMap.addColorStop(stop.position, stop.color);
                        position += 0.1;
                    });

                    context.fillStyle = "#fff";
                    context.fillRect(0, 0, grdMapWidth + 2 * (grdXOffset), grdMapHeight + 2 * (grdYOffset));

                    context.fillStyle = grdMap;
                    context.fillRect(grdXOffset, grdYOffset, grdMapWidth, grdMapHeight);

                    context.font = "10px Ubuntu";
                    context.fillStyle = "#000";
                    context.fillText("100%", grdXOffset - 7, grdYOffset - 4);

                    context.font = "10px Ubuntu";
                    context.fillStyle = "#000";
                    context.fillText("0%", grdXOffset, grdYOffset + grdMapHeight + 8 + 3);

                    document.body.appendChild(canvas);
                }
            });
        });
    }

    function capitalize(str) {
        return str[0].toUpperCase() + str.slice(1);
    }

    function readBody(xhr) {
        var data;
        if (!xhr.responseType || xhr.responseType === "text") {
            data = xhr.responseText;
        }
        else if (xhr.responseType === "document") {
            data = xhr.responseXML;
        }
        else {
            data = xhr.response;
        }
        return data;
    }

    function sendXmlHttpRequest(params, apiPath, callback) {
        try {
            Countly._internals.log("Sending XML HTTP request");
            var xhr = window.XMLHttpRequest ? new window.XMLHttpRequest() : window.ActiveXObject ? new ActiveXObject('Microsoft.XMLHTTP') : null;

            var data = Countly._internals.prepareParams(params);
            var method = "GET";
            if (data.length >= 2000) {
                method = "POST";
            }
            else if (Countly.force_post) {
                method = "POST";
            }

            if (method === "GET") {
                xhr.open('GET', Countly.url + apiPath + "?" + data, true);
            }
            else {
                xhr.open('POST', Countly.url + apiPath, true);
                xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            }
            xhr.setRequestHeader("countly-token", Countly._internals.getToken());

            // fallback on error
            xhr.onreadystatechange = function() {
                if (this.readyState == this.HEADERS_RECEIVED) {
                    try {
                        Countly._internals.setToken(xhr.getResponseHeader("content-language"));
                    }
                    catch (ex) {
                        Countly._internals.log("failed, trying fallback header");
                        Countly.token = xhr.getResponseHeader("content-language");
                    }
                }
                if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
                    if (typeof callback === 'function') {
                        callback(false, JSON.parse(readBody(xhr)));
                    }
                }
                else if (this.readyState === 4) {
                    Countly._internals.log("Failed Server XML HTTP request", this.status);
                    if (typeof callback === 'function') {
                        callback(true, params);
                    }
                }
            };
            if (method == "GET") {
                xhr.send();
            }
            else {
                xhr.send(data);
            }
        }
        catch (e) {
            // fallback
            Countly._internals.log("Failed XML HTTP request", e);
            if (typeof callback === 'function') {
                callback(true, params);
            }
        }
    }
})();