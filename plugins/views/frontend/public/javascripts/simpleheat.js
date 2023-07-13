'use strict';

if (typeof module !== 'undefined') {
    module.exports = simpleheat;
}
/**
 * Function to create heatmap instance
 * @param  {string} canvas - canvas DOM identifier
 * @returns {instance} simpleheat - Returns heatmap instance
 */
function simpleheat(canvas) {
    if (!(this instanceof simpleheat)) {
        return new simpleheat(canvas);
    }

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

    data: function(data) {
        this._data = data;
        return this;
    },

    max: function(max) {
        this._max = max;
        return this;
    },

    viewPortSize: function(data) {
        this._viewPortHeight = data.height;
    },

    add: function(point) {
        this._data.push(point);
        return this;
    },

    clear: function() {
        this._data = [];
        return this;
    },

    radius: function(r, blur) {
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

    resize: function() {
        this._width = this._canvas.width;
        this._height = this._canvas.height;
    },

    gradient: function(grad) {
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

    draw: function(minOpacity) {
        if (!this._circle) {
            this.radius(this.defaultRadius);
        }

        if (!this._grad) {
            this.gradient(this.defaultGradient);
        }

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

    _colorize: function(pixels, gradient) {
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

    highest: function(data) {
        this._highest = data;
        return this;
    },

    setPosition: function() {

        this._colorStops.forEach(function(obj) {
            delete obj.y;
            delete obj.position;
            delete obj.zeroY;
            delete obj.hundredY;
            delete obj.percentage;
        });

        var addedColorStop = [];
        if (this._data[0] === 0) {
            //NO ONE SAW THE WEBSITE YET   
            this._colorStops[this._colorStops.length - 1].position = 0;
            this._colorStops[this._colorStops.length - 1].zeroY = 0;
            this._colorStops[this._colorStops.length - 1].percentage = 0;
            var originalColor = this._colorStops[this._colorStops.length - 1].color;
            this._colorStops[this._colorStops.length - 1].color = "rgba(255, 255, 255, 0.7)";
            this._colorStops[this._colorStops.length - 1].originalColor = originalColor;
        }
        else if (this._data[0] === this._data[this._data.length - 1]) {

            //EVERYONE SCROLLED TILL BOTTOM
            this._colorStops[0].position = 0;
            this._colorStops[0].hundredY = this._height;
            this._colorStops[0].percentage = 100;

        }
        else {
            var j = 0;
            for (var i = 0; i < this._colorStops.length; i++) {
                var range = this._colorStops[i].range;
                var lastColorStop = undefined;
                if (addedColorStop.length) {
                    lastColorStop = addedColorStop[addedColorStop.length - 1];
                }

                while (j < this._data.length) {
                    //NOT CONSIDERING 0 AND 100 PERCENTAGE IN THIS LOOP 
                    if (this._data[j] === 100 && this._data[j + 1] !== 100) {
                        //FINDING THE Y-OFFSET FOR 100%
                        this._colorStops[0].hundredY = j;
                    }

                    if (this._data[j] === 0 && this._data[j - 1] !== 0) {
                        //FINDING THE Y-OFFSET FOR 0%
                        this._colorStops[this._colorStops.length - 1].zeroY = j;
                    }

                    if (this._data[j] > range[0] || this._data[j] === this._data[j + 1] || this._data[j] === 100) {
                        j++;
                    }
                    else if (this._data[j] <= range[0] && this._data[j] > range[1]) {
                        var position = parseFloat((j / this._height).toFixed(2));
                        if (!lastColorStop || (Math.abs(position - lastColorStop.position) > 0.1)) {
                            this._colorStops[i].position = position;
                            this._colorStops[i].y = j;
                            this._colorStops[i].percentage = this._data[j];
                            addedColorStop.push(this._colorStops[i]);
                            break;
                        }
                        else {
                            j++;
                        }
                    }
                    else {
                        break;
                    }
                }
            }

            while (j < this._data.length) {
                j++;
                if (this._data[j] === 0) {
                    //FINDING THE Y-OFFSET FOR 0%
                    this._colorStops[this._colorStops.length - 1].zeroY = j;
                    break;
                }
            }

            this._colorStops[0].position = 0;
            this._colorStops[this._colorStops.length - 1].position = 1;
        }
    },

    drawgradiant: function() {
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

    addMarkers: function() {
        var ctx = this._ctx;

        var markers = [];
        var self = this;

        var totalViews = this._max;
        var highestViews = this._highest;
        var averageViews = totalViews / this._data.length;
        var averageViewsPercentage = parseInt((averageViews / highestViews) * 100);

        this._colorStops.forEach(function(stop) {
            var markerObj = undefined;
            var averageObj = undefined;

            if (stop.hundredY >= 0) {
                //MARKER FOR 100 PERCENTAGE
                markerObj = {
                    percentage: 100,
                    y: stop.hundredY
                };
                markers.push(markerObj);
            }

            //ONLY THOSE MARKERS WILL BE CONSIDERED THAT HAS A PERCENTAGE AND A Y-OFFSET
            if (stop.y >= 0 && stop.percentage >= 0) {
                markerObj = {
                    percentage: stop.percentage,
                    y: stop.y
                };
            }

            if (averageViewsPercentage <= stop.range[0] && averageViewsPercentage > stop.range[1]) {
                //NO AVERAGE OBJECT FOR 0 PERCENTAGE
                averageObj = {
                    percentage: averageViewsPercentage,
                    isAverage: true
                };
            }

            if (markerObj && averageObj) {
                if (markerObj.percentage >= averageObj.percentage) {
                    markers.push(markerObj);
                    markers.push(averageObj);
                }
                else {
                    markers.push(averageObj);
                    markers.push(markerObj);
                }
            }
            else if (markerObj) {
                markers.push(markerObj);
            }
            else if (averageObj) {
                markers.push(averageObj);
            }

            if (stop.zeroY >= 0) {
                //MARKER FOR ZERO PERCENTAGE
                markerObj = {
                    percentage: 0,
                    y: stop.zeroY
                };
                markers.push(markerObj);
            }
        });

        var allowedMarkers = [];
        var allowedByLastMarker = true;

        for (var i = 0; i < markers.length; i++) {
            var isAverageAllowed = markers[i].percentage !== 0 && markers[i].percentage !== 100;
            if (markers[i].isAverage && isAverageAllowed) {
                //CALCULATE THE Y-OFFSET FOR THE AVERAGE MARKER
                var previousMarker = markers[i - 1] || {};
                var nextMarker = markers[i + 1] || {};
                var yPR = parseFloat((Math.abs((previousMarker.percentage || 100) - markers[i].percentage) / Math.abs(markers[i].percentage - (nextMarker.percentage || 0))).toFixed(2));
                markers[i].y = parseInt(((previousMarker.y || 0) + (yPR * (nextMarker.y || this._height))) / (yPR + 1));
            }

            if (allowedMarkers.length) {
                var lastMarkerAdded = allowedMarkers[allowedMarkers.length - 1];
                allowedByLastMarker = Math.abs(markers[i].y - lastMarkerAdded.y) > (markers[i].percentage === 0 ? 100 : 50);
            }

            if ((markers[i].isAverage && isAverageAllowed) || (markers[i].percentage === 0)) {
                if (allowedByLastMarker) {
                    allowedMarkers.push(markers[i]);
                }
                else {
                    allowedMarkers.pop();
                    allowedMarkers.push(markers[i]);
                }
            }
            else if (allowedByLastMarker) {
                allowedMarkers.push(markers[i]);
            }
        }

        allowedMarkers.forEach(function(marker) {
            var cornerRadius = 5;
            var rectX = 20;
            var rectWidth = 217;
            var rectHeight = 30;
            var boxYOffset = 15;
            var textYOffset = 0;
            var textXOffset = 19;

            if (marker.isAverage) {
                rectWidth = 111;
            }

            ctx.lineWidth = 1;
            if (marker.y < boxYOffset) {
                //100% MARKER
                boxYOffset = 0;
                textYOffset = 15;
            }
            else if (marker.y > self._height - boxYOffset) {
                //0% MARKER
                boxYOffset = 30;
                textYOffset = -15;
            }

            if (marker.percentage === 0) {
                if (marker.y === 0) {
                    rectWidth = 400;
                    rectHeight = 100;
                    boxYOffset = -100;
                    rectX = self._width / 2 - rectWidth / 2;
                    textXOffset = rectX;
                    textYOffset = Math.abs(boxYOffset) + rectHeight / 2;
                }
                else {
                    rectWidth = 232;
                }
            }

            var rectY = marker.y - boxYOffset;

            ctx.beginPath();
            ctx.moveTo(0, marker.y);
            ctx.lineTo(self._width, marker.y);
            ctx.shadowBlur = 0;
            ctx.lineJoin = "meter";
            ctx.strokeStyle = "#313131";

            if (!(marker.y === 0 && marker.percentage === 0)) {
                ctx.stroke();
            }

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
            if (marker.isAverage) {
                ctx.fillText("AVERAGE FOLD", textXOffset + rectWidth / 2, marker.y + textYOffset);
            }
            else {
                var text = marker.percentage + " % of visitors reached this point";

                if (marker.percentage === 0) {
                    if (marker.y === 0) {
                        text = "We don’t have any scrollmap data for this page yet";
                    }
                    else {
                        text = "No scrollmap data beyond this point";
                    }
                }
                ctx.fillText(text, textXOffset + rectWidth / 2, marker.y + textYOffset);
            }
        });

        if (this._colorStops[this._colorStops.length - 1].originalColor) {
            this._colorStops[this._colorStops.length - 1].color = this._colorStops[this._colorStops.length - 1].originalColor;
        }
        delete this._colorStops[this._colorStops.length - 1].originalColor;
    }
};