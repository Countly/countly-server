'use strict';

if (typeof module !== 'undefined') module.exports = simpleheat;

function simpleheat(canvas) {
    if (!(this instanceof simpleheat)) return new simpleheat(canvas);

    this._canvas = canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;

    this._ctx = canvas.getContext('2d');
    this._width = canvas.width;
    this._height = canvas.height;

    this._max = 1;
    this._data = [];
}

simpleheat.prototype = {

    defaultRadius: 25,

    defaultGradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
    },

    data: function (data) {
        this._data = data;
        return this;
    },

    max: function (max) {
        this._max = max;
        return this;
    },

    viewPortSize: function (data) {
        this._viewPortHeight = data.height;
    },

    add: function (point) {
        this._data.push(point);
        return this;
    },

    clear: function () {
        this._data = [];
        return this;
    },

    radius: function (r, blur) {
        blur = blur === undefined ? 15 : blur;

        // create a grayscale blurred circle image that we'll use for drawing points
        var circle = this._circle = document.createElement('canvas'),
            ctx = circle.getContext('2d'),
            r2 = this._r = r + blur;

        circle.width = circle.height = r2 * 2;

        ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2;
        ctx.shadowBlur = blur;
        ctx.shadowColor = 'black';

        ctx.beginPath();
        ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        return this;
    },

    resize: function () {
        this._width = this._canvas.width;
        this._height = this._canvas.height;
    },

    gradient: function (grad) {
        // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            gradient = ctx.createLinearGradient(0, 0, 0, 256);

        canvas.width = 1;
        canvas.height = 256;

        for (var i in grad) {
            gradient.addColorStop(i, grad[i]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 256);

        this._grad = ctx.getImageData(0, 0, 1, 256).data;

        return this;
    },

    draw: function (minOpacity) {
        if (!this._circle) this.radius(this.defaultRadius);
        if (!this._grad) this.gradient(this.defaultGradient);

        var ctx = this._ctx;

        ctx.clearRect(0, 0, this._width, this._height);

        // draw a grayscale heatmap by putting a blurred circle at each data point
        for (var i = 0, len = this._data.length, p; i < len; i++) {
            p = this._data[i];
            ctx.globalAlpha = Math.max(p[2] / this._max, minOpacity === undefined ? 0.05 : minOpacity);
            ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
        }

        // colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
        var colored = ctx.getImageData(0, 0, this._width, this._height);
        this._colorize(colored.data, this._grad);
        ctx.putImageData(colored, 0, 0);

        return this;
    },

    _colorize: function (pixels, gradient) {
        for (var i = 0, len = pixels.length, j; i < len; i += 4) {
            j = pixels[i + 3] * 4; // get gradient color from opacity value

            if (j) {
                pixels[i] = gradient[j];
                pixels[i + 1] = gradient[j + 1];
                pixels[i + 2] = gradient[j + 2];
            }
        }
    },

    _colorStops: [
        {
            "stop": 100,
            "range": [100, 90],
            "color": "rgba(253, 36, 5, 0.7)"
        },
        {
            "stop": 90,
            "range": [90, 80],
            "color": "rgba(255, 212, 32, 0.7) "
        },
        {
            "stop": 80,
            "range": [80, 70],
            "color": "rgba(217, 253, 40, 0.7)"
        },
        {
            "stop": 70,
            "range": [70, 60],
            "color": "rgba(71, 254, 41, 0.7)"
        },
        {
            "stop": 60,
            "range": [60, 50],
            "color": "rgba(0, 255, 130, 0.7)"
        },
        {
            "stop": 50,
            "range": [50, 40],
            "color": "rgba(0, 255, 205, 0.7)"
        },
        {
            "stop": 40,
            "range": [40, 30],
            "color": "rgba(1, 169, 251, 0.7)"
        },
        {
            "stop": 30,
            "range": [30, 20],
            "color": "rgba(0, 41, 229, 0.7)"
        },
        {
            "stop": 20,
            "range": [20, 10],
            "color": "rgba(40, 40, 89, 0.7)"
        },
        {
            "stop": 10,
            "range": [10, 0],
            "color": "rgba(50, 49, 58, 0.7)"
        }
    ],

    highest: function (data) {
        this._highest = data;
        return this;
    },

    setPosition: function () {
        this._colorStops.forEach(function (obj) {
            delete obj.y;
            delete obj.position;
        });

        var addedColorStop = [];
        if (this._data[0] == 0) {

            //NO ONE SAW THE WEBSITE YET
            this._colorStops.forEach(function (obj) {
                delete obj.position;
            });

            this._colorStops[this._colorStops.length - 1].position = 0;

        } else if (this._data[0] == this._data[this._data.length - 1]) {

            //EVERYONE SCROLLED TILL BOTTOM
            this._colorStops[0].position = 0;

        } else {
            var j = 0;
            for (var i = 0; i < this._colorStops.length; i++) {
                var range = this._colorStops[i].range;
                var lastColorStop = undefined;
                if (addedColorStop.length) {
                    lastColorStop = addedColorStop[addedColorStop.length - 1];
                }

                while (j < this._data.length) {
                    if (this._data[j] > range[0]) {
                        j++;
                    } else if (this._data[j] <= range[0] && this._data[j] > range[1]) {
                        var position = parseFloat((j / this._height).toFixed(2));
                        if(!lastColorStop || (Math.abs(position - lastColorStop.position) > 0.1)){
                            this._colorStops[i].position = position
                            this._colorStops[i].y = j;
                            this._colorStops[i].percentage = this._data[j];
                            addedColorStop.push(this._colorStops[i]);                        
                        }
                        break;
                    } else {
                        break;
                    }
                }
            }

            this._colorStops[0].position = 0;
            this._colorStops[this._colorStops.length - 1].position = 1;
        }
    },

    drawgradiant: function () {
        var ctx = this._ctx;

        var grd = ctx.createLinearGradient(0, 0, 0, this._height);

        this.setPosition();

        for (var i = 0; i < this._colorStops.length; i++) {
            if (this._colorStops[i].position >= 0) {
                grd.addColorStop(this._colorStops[i].position, this._colorStops[i].color);
            }
        }
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, this._width, this._height);
    },

    addMarkers: function () {
        var ctx = this._ctx;

        var markers = [];
        self = this;

        var totalViews = this._max;
        var highestViews = this._highest;
        var averageViews = totalViews / this._data.length;
        var averageViewsPercentage = parseInt((averageViews / highestViews) * 100);

        this._colorStops.forEach(function (stop) {
            if (stop.y && stop.percentage) {
                var obj = {
                    percentage: stop.percentage,
                    y: stop.y
                }
                markers.push(obj);
            }
        });

        var addedMarkers = [];
        var allowedByLastMarker = true;
        markers.forEach(function (marker) {
            if (addedMarkers.length) {
                var lastMarkerAdded = addedMarkers[addedMarkers.length - 1];
                allowedByLastMarker = Math.abs(marker.y - lastMarkerAdded.y) > 50;
            }

            //DISPLAYING ONLY MARKERS LYING AT 50PX FROM TOP AND BOTTOM            
            if (marker.y >= 50 && marker.y < self._height - 50 && allowedByLastMarker) {
                var cornerRadius = 5;
                var rectX = 20;
                var rectY = marker.y - 15;
                var rectWidth = 217;
                var rectHeight = 30;

                ctx.beginPath();
                ctx.moveTo(0, marker.y);
                ctx.lineTo(self._width, marker.y);
                ctx.shadowBlur = 0;
                ctx.lineJoin = "meter";
                ctx.lineWidth = 1;
                ctx.strokeStyle = "#313131"; 
                ctx.stroke();

                ctx.fillStyle = "#313131";
                ctx.lineJoin = "round";
                ctx.lineWidth = cornerRadius;
                ctx.shadowBlur = 2;
                ctx.shadowColor = "rgba(0,0,0,0.11)";
                ctx.strokeStyle = "#313131";
                ctx.strokeRect(rectX + (cornerRadius / 2), rectY + (cornerRadius / 2), rectWidth - cornerRadius, rectHeight - cornerRadius);
                ctx.fillRect(rectX + (cornerRadius / 2), rectY + (cornerRadius / 2), rectWidth - cornerRadius, rectHeight - cornerRadius);

                ctx.font = "13px Ubuntu";
                ctx.fillStyle = "#fff";
                ctx.textAlign = 'center';
                ctx.textBaseline = "middle";
                ctx.fillText(marker.percentage + " % of visitors reached this point", 18 + rectWidth/2, marker.y);

                addedMarkers.push(marker);
            }
        })
    }
};