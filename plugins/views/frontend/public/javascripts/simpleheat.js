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
            "color": "rgba(226, 72, 45, .7)",
        },
        {
            "stop": 75,
            "range": [75, 50],
            "color": "rgba(61, 234, 35, .7)",
        },
        {
            "stop": 50,
            "range": [50, 25],
            "color": "rgba(32, 232, 232, .7)",
        },
        {
            "stop": 25,
            "range": [25, 0],
            "color": "rgba(35, 41, 234, .7)",
        },
        {
            "stop": 0,
            "color": "rgba(63, 63, 63, .7)",
        }
    ],

    setPosition: function () {
        this._colorStops.forEach(function(obj){
            delete obj.y;
            delete obj.position;
        });
        
        if (this._data[0] == 0) {

            //NO ONE SAW THE WEBSITE YET
            this._colorStops.forEach(function(obj){
                delete obj.position;
            });
            
            this._colorStops[this._colorStops.length - 1].position = 0;            

        } else if (this._data[0] == this._data[this._data.length - 1]) {

            //EVERYONE SCROLLED TILL BOTTOM
            this._colorStops[0].position = 0;

        } else {
            this._colorStops[0].position = 0;
            this._colorStops[this._colorStops.length - 1].position = 1;

            var j = 0;
            for (var i = 1; i < (this._colorStops.length - 1); i++) {
                var range = this._colorStops[i].range;
                while (j < this._data.length) {
                    if (this._data[j] > range[0]) {
                        j++;
                    } else if (this._data[j] <= range[0] && this._data[j] > range[1]) {
                        this._colorStops[i].position = parseFloat((j / this._height).toFixed(2));
                        this._colorStops[i].y = j;
                        break;
                    } else {
                        break;
                    }
                }
            }
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

        self = this;
        this._colorStops.forEach(function (stop) {
            if (stop.y >= 0) {
                ctx.beginPath();
                ctx.moveTo(0, stop.y);
                ctx.lineTo(self._width, stop.y);
                ctx.stroke();

                ctx.fillStyle = "rgba(0,0,0,.5)";
                ctx.fillRect(0, stop.y - 20, 40, 20);
                ctx.stroke();

                ctx.font = "13px Ubuntu";
                ctx.fillStyle = "#fff";
                ctx.fillText(stop.stop + " %", 5, stop.y - 5);
            }
        })
    }
};