/*jslint devel: true, bitwise: true, regexp: true, browser: true, confusion: true, unparam: true, eqeq: true, white: true, nomen: true, plusplus: true, maxerr: 50, indent: 4 */
/*globals jQuery,Color,define */

/*!
 * ColorPicker
 *
 * Copyright (c) 2011-2017 Martijn W. van der Lee
 * Licensed under the MIT.
 */
/* Full-featured colorpicker for jQueryUI with full theming support.
 * Most images from jPicker by Christopher T. Tillman.
 * Sourcecode created from scratch by Martijn W. van der Lee.
 */
(function( factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define([
			"jquery"
		], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
} (function ($) {
	"use strict";

	var _colorpicker_index = 0,

		_container_popup = '<div class="ui-colorpicker ui-colorpicker-dialog ui-dialog ui-widget ui-widget-content ui-corner-all" style="display: none;"></div>',
		_container_inlineFrame = '<div class="ui-colorpicker ui-colorpicker-inline ui-dialog ui-widget ui-widget-content ui-corner-all"></div>',
		_container_inline = '<div class="ui-colorpicker ui-colorpicker-inline"></div>',

		_intToHex = function (dec) {
			var result = Math.round(dec).toString(16);
			if (result.length === 1) {
				result = ('0' + result);
			}
			return result.toLowerCase();
		},
		
		_keycode = {
			isPrint: function(keycode) {
				return keycode == 32						// spacebar
					|| (keycode >= 48 && keycode <= 57)		// number keys
					|| (keycode >= 65 && keycode <= 90)		// letter keys
					|| (keycode >= 96 && keycode <= 111)	// numpad keys
					|| (keycode >= 186 && keycode < 192)	// ;=,-./` (in order)
					|| (keycode >= 219 && keycode < 222);	// [\]' (in order)
			},			
			isHex: function(keycode) {
				return (keycode >= 48 && keycode <= 57)		// number keys
					|| (keycode >= 65 && keycode <= 70);	// a-f
			}
		},

		_layoutTable = function(layout, callback) {
			var bitmap,
				x, y,
				width, height,
				columns, rows,
				index,
				cell,
				html,
				w, h,
				colspan,
				walked;

			layout.sort(function(a, b) {
				if (a.pos[1] === b.pos[1]) {
					return a.pos[0] - b.pos[0];
				}
				return a.pos[1] - b.pos[1];
			});

			// Determine dimensions of the table
			width = 0;
			height = 0;
			$.each (layout, function(index, part) {
				width = Math.max(width, part.pos[0] + part.pos[2]);
				height = Math.max(height, part.pos[1] + part.pos[3]);
			});

			// Initialize bitmap
			bitmap = [];
			for (x = 0; x < width; ++x) {
				bitmap.push([]);
			}

			// Mark rows and columns which have layout assigned
			rows	= [];
			columns = [];
			$.each(layout, function(index, part) {
				// mark columns
				for (x = 0; x < part.pos[2]; x += 1) {
					columns[part.pos[0] + x] = true;
				}
				for (y = 0; y < part.pos[3]; y += 1) {
					rows[part.pos[1] + y] = true;
				}
			});

			// Generate the table
			
			html='<table cellspacing="0" cellpadding="0" border="0"><tbody><tr><td class="ui-colorpicker-map-container"></td><td class="ui-colorpicker-bar-container ui-colorpicker-padding-left"></td><td class="ui-colorpicker-alpha-container ui-colorpicker-padding-left"></td></tr></tbody></table>'
            html+='<table class="colorpicker-secondtable ui-dialog-content ui-widget-content"><tr><td class="ui-colorpicker-hex-container"></td><td class="ui-colorpicker-rgb-container"></td></table>';
            return html;
		};

	$.colorpicker = new function() {
		this.regional = {
			'':	{
				ok:				'OK',
				cancel:			'Cancel',
				none:			'None',
				button:			'Color',
				title:			'Pick a color',
				transparent:	'Transparent',
				hsvH:			'H',
				hsvS:			'S',
				hsvV:			'V',
				rgbR:			'R',
				rgbG:			'G',
				rgbB:			'B',
				labL:			'L',
				labA:			'a',
				labB:			'b',
				hslH:			'H',
				hslS:			'S',
				hslL:			'L',
				cmykC:			'C',
				cmykM:			'M',
				cmykY:			'Y',
				cmykK:			'K',
				alphaA:			'A'
			}
		};
        if(jQuery.i18n.map["white-labeling.colorpicker.ok"])
            this.regional['']['ok'] = jQuery.i18n.map["white-labeling.colorpicker.ok"];
        if(jQuery.i18n.map["white-labeling.colorpicker.cancel"])
            this.regional['']['cancel'] = jQuery.i18n.map["white-labeling.colorpicker.cancel"];
        if(jQuery.i18n.map["white-labeling.colorpicker.none"])
            this.regional['']['none'] = jQuery.i18n.map["white-labeling.colorpicker.none"];
		this.swatchesNames = {
			'html':		'HTML'
		};

		this.swatches = {
			'html':	[
				{name: 'black',					r: 0, g: 0, b: 0},
				{name: 'dimgray',				r: 0.4117647058823529, g: 0.4117647058823529, b: 0.4117647058823529},
				{name: 'gray',					r: 0.5019607843137255, g: 0.5019607843137255, b: 0.5019607843137255},
				{name: 'darkgray',				r: 0.6627450980392157, g: 0.6627450980392157, b: 0.6627450980392157},
				{name: 'silver',				r: 0.7529411764705882, g: 0.7529411764705882, b: 0.7529411764705882},
				{name: 'lightgrey',				r: 0.8274509803921568, g: 0.8274509803921568, b: 0.8274509803921568},
				{name: 'gainsboro',				r: 0.8627450980392157, g: 0.8627450980392157, b: 0.8627450980392157},
				{name: 'whitesmoke',			r: 0.9607843137254902, g: 0.9607843137254902, b: 0.9607843137254902},
				{name: 'white',					r: 1, g: 1, b: 1},
				{name: 'rosybrown',				r: 0.7372549019607844, g: 0.5607843137254902, b: 0.5607843137254902},
				{name: 'indianred',				r: 0.803921568627451, g: 0.3607843137254902, b: 0.3607843137254902},
				{name: 'brown',					r: 0.6470588235294118, g: 0.16470588235294117, b: 0.16470588235294117},
				{name: 'firebrick',				r: 0.6980392156862745, g: 0.13333333333333333, b: 0.13333333333333333},
				{name: 'lightcoral',			r: 0.9411764705882353, g: 0.5019607843137255, b: 0.5019607843137255},
				{name: 'maroon',				r: 0.5019607843137255, g: 0, b: 0},
				{name: 'darkred',				r: 0.5450980392156862, g: 0, b: 0},
				{name: 'red',					r: 1, g: 0, b: 0},
				{name: 'snow',					r: 1, g: 0.9803921568627451, b: 0.9803921568627451},
				{name: 'salmon',				r: 0.9803921568627451, g: 0.5019607843137255, b: 0.4470588235294118},
				{name: 'mistyrose',				r: 1, g: 0.8941176470588236, b: 0.8823529411764706},
				{name: 'tomato',				r: 1, g: 0.38823529411764707, b: 0.2784313725490196},
				{name: 'darksalmon',			r: 0.9137254901960784, g: 0.5882352941176471, b: 0.47843137254901963},
				{name: 'orangered',				r: 1, g: 0.27058823529411763, b: 0},
				{name: 'coral',					r: 1, g: 0.4980392156862745, b: 0.3137254901960784},
				{name: 'lightsalmon',			r: 1, g: 0.6274509803921569, b: 0.47843137254901963},
				{name: 'sienna',				r: 0.6274509803921569, g: 0.3215686274509804, b: 0.17647058823529413},
				{name: 'seashell',				r: 1, g: 0.9607843137254902, b: 0.9333333333333333},
				{name: 'chocolate',				r: 0.8235294117647058, g: 0.4117647058823529, b: 0.11764705882352941},
				{name: 'saddlebrown',			r: 0.5450980392156862, g: 0.27058823529411763, b: 0.07450980392156863},
				{name: 'sandybrown',			r: 0.9568627450980393, g: 0.6431372549019608, b: 0.3764705882352941},
				{name: 'peachpuff',				r: 1, g: 0.8549019607843137, b: 0.7254901960784313},
				{name: 'peru',					r: 0.803921568627451, g: 0.5215686274509804, b: 0.24705882352941178},
				{name: 'linen',					r: 0.9803921568627451, g: 0.9411764705882353, b: 0.9019607843137255},
				{name: 'darkorange',			r: 1, g: 0.5490196078431373, b: 0},
				{name: 'bisque',				r: 1, g: 0.8941176470588236, b: 0.7686274509803922},
				{name: 'burlywood',				r: 0.8705882352941177, g: 0.7215686274509804, b: 0.5294117647058824},
				{name: 'tan',					r: 0.8235294117647058, g: 0.7058823529411765, b: 0.5490196078431373},
				{name: 'antiquewhite',			r: 0.9803921568627451, g: 0.9215686274509803, b: 0.8431372549019608},
				{name: 'navajowhite',			r: 1, g: 0.8705882352941177, b: 0.6784313725490196},
				{name: 'blanchedalmond',		r: 1, g: 0.9215686274509803, b: 0.803921568627451},
				{name: 'papayawhip',			r: 1, g: 0.9372549019607843, b: 0.8352941176470589},
				{name: 'orange',				r: 1, g: 0.6470588235294118, b: 0},
				{name: 'moccasin',				r: 1, g: 0.8941176470588236, b: 0.7098039215686275},
				{name: 'wheat',					r: 0.9607843137254902, g: 0.8705882352941177, b: 0.7019607843137254},
				{name: 'oldlace',				r: 0.9921568627450981, g: 0.9607843137254902, b: 0.9019607843137255},
				{name: 'floralwhite',			r: 1, g: 0.9803921568627451, b: 0.9411764705882353},
				{name: 'goldenrod',				r: 0.8549019607843137, g: 0.6470588235294118, b: 0.12549019607843137},
				{name: 'darkgoldenrod',			r: 0.7215686274509804, g: 0.5254901960784314, b: 0.043137254901960784},
				{name: 'cornsilk',				r: 1, g: 0.9725490196078431, b: 0.8627450980392157},
				{name: 'gold',					r: 1, g: 0.8431372549019608, b: 0},
				{name: 'palegoldenrod',			r: 0.9333333333333333, g: 0.9098039215686274, b: 0.6666666666666666},
				{name: 'khaki',					r: 0.9411764705882353, g: 0.9019607843137255, b: 0.5490196078431373},
				{name: 'lemonchiffon',			r: 1, g: 0.9803921568627451, b: 0.803921568627451},
				{name: 'darkkhaki',				r: 0.7411764705882353, g: 0.7176470588235294, b: 0.4196078431372549},
				{name: 'beige',					r: 0.9607843137254902, g: 0.9607843137254902, b: 0.8627450980392157},
				{name: 'lightgoldenrodyellow',	r: 0.9803921568627451, g: 0.9803921568627451, b: 0.8235294117647058},
				{name: 'olive',					r: 0.5019607843137255, g: 0.5019607843137255, b: 0},
				{name: 'yellow',				r: 1, g: 1, b: 0},
				{name: 'lightyellow',			r: 1, g: 1, b: 0.8784313725490196},
				{name: 'ivory',					r: 1, g: 1, b: 0.9411764705882353},
				{name: 'olivedrab',				r: 0.4196078431372549, g: 0.5568627450980392, b: 0.13725490196078433},
				{name: 'yellowgreen',			r: 0.6039215686274509, g: 0.803921568627451, b: 0.19607843137254902},
				{name: 'darkolivegreen',		r: 0.3333333333333333, g: 0.4196078431372549, b: 0.1843137254901961},
				{name: 'greenyellow',			r: 0.6784313725490196, g: 1, b: 0.1843137254901961},
				{name: 'lawngreen',				r: 0.48627450980392156, g: 0.9882352941176471, b: 0},
				{name: 'chartreuse',			r: 0.4980392156862745, g: 1, b: 0},
				{name: 'darkseagreen',			r: 0.5607843137254902, g: 0.7372549019607844, b: 0.5607843137254902},
				{name: 'forestgreen',			r: 0.13333333333333333, g: 0.5450980392156862, b: 0.13333333333333333},
				{name: 'limegreen',				r: 0.19607843137254902, g: 0.803921568627451, b: 0.19607843137254902},
				{name: 'lightgreen',			r: 0.5647058823529412, g: 0.9333333333333333, b: 0.5647058823529412},
				{name: 'palegreen',				r: 0.596078431372549, g: 0.984313725490196, b: 0.596078431372549},
				{name: 'darkgreen',				r: 0, g: 0.39215686274509803, b: 0},
				{name: 'green',					r: 0, g: 0.5019607843137255, b: 0},
				{name: 'lime',					r: 0, g: 1, b: 0},
				{name: 'honeydew',				r: 0.9411764705882353, g: 1, b: 0.9411764705882353},
				{name: 'mediumseagreen',		r: 0.23529411764705882, g: 0.7019607843137254, b: 0.44313725490196076},
				{name: 'seagreen',				r: 0.1803921568627451, g: 0.5450980392156862, b: 0.3411764705882353},
				{name: 'springgreen',			r: 0, g: 1, b: 0.4980392156862745},
				{name: 'mintcream',				r: 0.9607843137254902, g: 1, b: 0.9803921568627451},
				{name: 'mediumspringgreen',		r: 0, g: 0.9803921568627451, b: 0.6039215686274509},
				{name: 'mediumaquamarine',		r: 0.4, g: 0.803921568627451, b: 0.6666666666666666},
				{name: 'aquamarine',			r: 0.4980392156862745, g: 1, b: 0.8313725490196079},
				{name: 'turquoise',				r: 0.25098039215686274, g: 0.8784313725490196, b: 0.8156862745098039},
				{name: 'lightseagreen',			r: 0.12549019607843137, g: 0.6980392156862745, b: 0.6666666666666666},
				{name: 'mediumturquoise',		r: 0.2823529411764706, g: 0.8196078431372549, b: 0.8},
				{name: 'darkslategray',			r: 0.1843137254901961, g: 0.30980392156862746, b: 0.30980392156862746},
				{name: 'paleturquoise',			r: 0.6862745098039216, g: 0.9333333333333333, b: 0.9333333333333333},
				{name: 'teal',					r: 0, g: 0.5019607843137255, b: 0.5019607843137255},
				{name: 'darkcyan',				r: 0, g: 0.5450980392156862, b: 0.5450980392156862},
				{name: 'darkturquoise',			r: 0, g: 0.807843137254902, b: 0.8196078431372549},
				{name: 'aqua',					r: 0, g: 1, b: 1},
				{name: 'cyan',					r: 0, g: 1, b: 1},
				{name: 'lightcyan',				r: 0.8784313725490196, g: 1, b: 1},
				{name: 'azure',					r: 0.9411764705882353, g: 1, b: 1},
				{name: 'cadetblue',				r: 0.37254901960784315, g: 0.6196078431372549, b: 0.6274509803921569},
				{name: 'powderblue',			r: 0.6901960784313725, g: 0.8784313725490196, b: 0.9019607843137255},
				{name: 'lightblue',				r: 0.6784313725490196, g: 0.8470588235294118, b: 0.9019607843137255},
				{name: 'deepskyblue',			r: 0, g: 0.7490196078431373, b: 1},
				{name: 'skyblue',				r: 0.5294117647058824, g: 0.807843137254902, b: 0.9215686274509803},
				{name: 'lightskyblue',			r: 0.5294117647058824, g: 0.807843137254902, b: 0.9803921568627451},
				{name: 'steelblue',				r: 0.27450980392156865, g: 0.5098039215686274, b: 0.7058823529411765},
				{name: 'aliceblue',				r: 0.9411764705882353, g: 0.9725490196078431, b: 1},
				{name: 'dodgerblue',			r: 0.11764705882352941, g: 0.5647058823529412, b: 1},
				{name: 'slategray',				r: 0.4392156862745098, g: 0.5019607843137255, b: 0.5647058823529412},
				{name: 'lightslategray',		r: 0.4666666666666667, g: 0.5333333333333333, b: 0.6},
				{name: 'lightsteelblue',		r: 0.6901960784313725, g: 0.7686274509803922, b: 0.8705882352941177},
				{name: 'cornflowerblue',		r: 0.39215686274509803, g: 0.5843137254901961, b: 0.9294117647058824},
				{name: 'royalblue',				r: 0.2549019607843137, g: 0.4117647058823529, b: 0.8823529411764706},
				{name: 'midnightblue',			r: 0.09803921568627451, g: 0.09803921568627451, b: 0.4392156862745098},
				{name: 'lavender',				r: 0.9019607843137255, g: 0.9019607843137255, b: 0.9803921568627451},
				{name: 'navy',					r: 0, g: 0, b: 0.5019607843137255},
				{name: 'darkblue',				r: 0, g: 0, b: 0.5450980392156862},
				{name: 'mediumblue',			r: 0, g: 0, b: 0.803921568627451},
				{name: 'blue',					r: 0, g: 0, b: 1},
				{name: 'ghostwhite',			r: 0.9725490196078431, g: 0.9725490196078431, b: 1},
				{name: 'darkslateblue',			r: 0.2823529411764706, g: 0.23921568627450981, b: 0.5450980392156862},
				{name: 'slateblue',				r: 0.41568627450980394, g: 0.35294117647058826, b: 0.803921568627451},
				{name: 'mediumslateblue',		r: 0.4823529411764706, g: 0.40784313725490196, b: 0.9333333333333333},
				{name: 'mediumpurple',			r: 0.5764705882352941, g: 0.4392156862745098, b: 0.8588235294117647},
				{name: 'blueviolet',			r: 0.5411764705882353, g: 0.16862745098039217, b: 0.8862745098039215},
				{name: 'indigo',				r: 0.29411764705882354, g: 0, b: 0.5098039215686274},
				{name: 'darkorchid',			r: 0.6, g: 0.19607843137254902, b: 0.8},
				{name: 'darkviolet',			r: 0.5803921568627451, g: 0, b: 0.8274509803921568},
				{name: 'mediumorchid',			r: 0.7294117647058823, g: 0.3333333333333333, b: 0.8274509803921568},
				{name: 'thistle',				r: 0.8470588235294118, g: 0.7490196078431373, b: 0.8470588235294118},
				{name: 'plum',					r: 0.8666666666666667, g: 0.6274509803921569, b: 0.8666666666666667},
				{name: 'violet',				r: 0.9333333333333333, g: 0.5098039215686274, b: 0.9333333333333333},
				{name: 'purple',				r: 0.5019607843137255, g: 0, b: 0.5019607843137255},
				{name: 'darkmagenta',			r: 0.5450980392156862, g: 0, b: 0.5450980392156862},
				{name: 'magenta',				r: 1, g: 0, b: 1},
				{name: 'fuchsia',				r: 1, g: 0, b: 1},
				{name: 'orchid',				r: 0.8549019607843137, g: 0.4392156862745098, b: 0.8392156862745098},
				{name: 'mediumvioletred',		r: 0.7803921568627451, g: 0.08235294117647059, b: 0.5215686274509804},
				{name: 'deeppink',				r: 1, g: 0.0784313725490196, b: 0.5764705882352941},
				{name: 'hotpink',				r: 1, g: 0.4117647058823529, b: 0.7058823529411765},
				{name: 'palevioletred',			r: 0.8588235294117647, g: 0.4392156862745098, b: 0.5764705882352941},
				{name: 'lavenderblush',			r: 1, g: 0.9411764705882353, b: 0.9607843137254902},
				{name: 'crimson',				r: 0.8627450980392157, g: 0.0784313725490196, b: 0.23529411764705882},
				{name: 'pink',					r: 1, g: 0.7529411764705882, b: 0.796078431372549},
				{name: 'lightpink',				r: 1, g: 0.7137254901960784, b: 0.7568627450980392}
			]
		};

		this.writers = {
			'#HEX':		function(color, that) {
							return that._formatColor('#rxgxbx', color);
						}
		,	'#HEX3':	function(color, that) {
							var hex3 = $.colorpicker.writers.HEX3(color);
							return hex3 === false? false : '#'+hex3;
						}
		,	'HEX':		function(color, that) {
							return that._formatColor('rxgxbx', color);
						}
		,	'HEX3':		function(color, that) {
							var rgb = color.getRGB(),
								r = Math.round(rgb.r * 255),
								g = Math.round(rgb.g * 255),
								b = Math.round(rgb.b * 255);

							if (((r >>> 4) === (r &= 0xf))
							 && ((g >>> 4) === (g &= 0xf))
							 && ((b >>> 4) === (b &= 0xf))) {
								return r.toString(16)+g.toString(16)+b.toString(16);
							}
							return false;
						}
		,	'#HEXA':	function(color, that) {
							return that._formatColor('#rxgxbxax', color);
						}						
		,	'#HEXA4':	function(color, that) {
							var hexa4 = $.colorpicker.writers.HEXA4(color, that);
							return hexa4 === false? false : '#'+hexa4;
						}						
		,	'HEXA':	function(color, that) {
							return that._formatColor('rxgxbxax', color);
						}		
		,	'HEXA4':		function(color, that) {
							var a = Math.round(color.getAlpha() * 255);
						
							if ((a >>> 4) === (a &= 0xf)) {
								return $.colorpicker.writers.HEX3(color, that)+a.toString(16);
							}
							return false;
						}						
		,	'RGB':		function(color, that) {
							return color.getAlpha() >= 1
									? that._formatColor('rgb(rd,gd,bd)', color)
									: false;
						}
		,	'RGBA':		function(color, that) {
							return that._formatColor('rgba(rd,gd,bd,af)', color);
						}
		,	'RGB%':		function(color, that) {
							return color.getAlpha() >= 1
									? that._formatColor('rgb(rp%,gp%,bp%)', color)
									: false;
						}
		,	'RGBA%':	function(color, that) {
							return that._formatColor('rgba(rp%,gp%,bp%,af)', color);
						}
		,	'HSL':		function(color, that) {
							return color.getAlpha() >= 1
									? that._formatColor('hsl(hd,sd,vd)', color)
									: false;
						}
		,	'HSLA':		function(color, that) {
							return that._formatColor('hsla(hd,sd,vd,af)', color);
						}
		,	'HSL%':		function(color, that) {
							return color.getAlpha() >= 1
									? that._formatColor('hsl(hp%,sp%,vp%)', color)
									: false;
						}
		,	'HSLA%':	function(color, that) {
							return that._formatColor('hsla(hp%,sp%,vp%,af)', color);
						}
		,	'NAME':		function(color, that) {
							return that._closestName(color);
						}
		,	'EXACT':	function(color, that) {
							return that._exactName(color);
						}
		};

		this.parsers = {
			'':			function(color) {
				            if (color === '') {
								return new $.colorpicker.Color();
							}
						}
		,	'NAME':		function(color, that) {
							var c = that._getSwatch($.trim(color));
							if (c) {
								return new $.colorpicker.Color(c.r, c.g, c.b);
							}
						}
		,	'RGBA':		function(color) {
							var m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)$/.exec(color);
							if (m) {
								return new $.colorpicker.Color(
									m[1] / 255,
									m[2] / 255,
									m[3] / 255,
									parseFloat(m[4])
								);
							}
						}
		,	'RGBA%':	function(color) {
							var m = /^rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)$/.exec(color);
							if (m) {
								return new $.colorpicker.Color(
									m[1] / 100,
									m[2] / 100,
									m[3] / 100,
									m[4] / 100
								);
							}
						}
		,	'HSLA':		function(color) {
							var m = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)$/.exec(color);
							if (m) {
								return (new $.colorpicker.Color()).setHSL(
									m[1] / 255,
									m[2] / 255,
									m[3] / 255).setAlpha(parseFloat(m[4]));
							}
						}
		,	'HSLA%':	function(color) {
							var m = /^hsla?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)$/.exec(color);
							if (m) {
								return (new $.colorpicker.Color()).setHSL(
									m[1] / 100,
									m[2] / 100,
									m[3] / 100).setAlpha(m[4] / 100);
							}
						}
		,	'#HEX':		function(color) {
							var m = /^#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/.exec(color);
							if (m) {
								return new $.colorpicker.Color(
									parseInt(m[1], 16) / 255,
									parseInt(m[2], 16) / 255,
									parseInt(m[3], 16) / 255
								);
							}
						}
		,	'#HEX3':	function(color) {
							var m = /^#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/.exec(color);
							if (m) {
								return new $.colorpicker.Color(
								   parseInt(String(m[1]) + m[1], 16) / 255,
								   parseInt(String(m[2]) + m[2], 16) / 255,
								   parseInt(String(m[3]) + m[3], 16) / 255
								);
							}
						}
		,	'HEX':		function(color) {
							var m = /^([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/.exec(color);
							if (m) {
								return new $.colorpicker.Color(
									parseInt(m[1], 16) / 255,
									parseInt(m[2], 16) / 255,
									parseInt(m[3], 16) / 255
								);
							}
						}
		,	'HEX3':		function(color) {
							var m = /^([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/.exec(color);
							if (m) {
								return new $.colorpicker.Color(
								   parseInt(String(m[1]) + m[1], 16) / 255,
								   parseInt(String(m[2]) + m[2], 16) / 255,
								   parseInt(String(m[3]) + m[3], 16) / 255
								);
							}
						}
		,	'#HEXA':	function(color) {
							var m = /^#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/.exec(color);
							if (m) {
								return new $.colorpicker.Color(
									parseInt(m[1], 16) / 255,
									parseInt(m[2], 16) / 255,
									parseInt(m[3], 16) / 255,
									parseInt(m[4], 16) / 255
								);
							}
						}
		,	'#HEXA4':	function(color) {
							var m = /^#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/.exec(color);
							if (m) {
								return new $.colorpicker.Color(
								   parseInt(String(m[1]) + m[1], 16) / 255,
								   parseInt(String(m[2]) + m[2], 16) / 255,
								   parseInt(String(m[3]) + m[3], 16) / 255,
								   parseInt(String(m[4]) + m[4], 16) / 255
								);
							}
						}
		,	'HEXA':		function(color) {
							var m = /^([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/.exec(color);
							if (m) {
								return new $.colorpicker.Color(
									parseInt(m[1], 16) / 255,
									parseInt(m[2], 16) / 255,
									parseInt(m[3], 16) / 255,
									parseInt(m[4], 16) / 255
								);
							}
						}
		,	'HEXA4':	function(color) {
							var m = /^([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/.exec(color);
							if (m) {
								return new $.colorpicker.Color(
								   parseInt(String(m[1]) + m[1], 16) / 255,
								   parseInt(String(m[2]) + m[2], 16) / 255,
								   parseInt(String(m[3]) + m[3], 16) / 255,
								   parseInt(String(m[4]) + m[4], 16) / 255
								);
							}
						}
		};

		this.partslists = {
			'full':			['header', 'map', 'bar', 'hex', 'hsv', 'rgb', 'alpha', 'lab', 'cmyk', 'preview', 'swatches', 'footer'],
			'popup':		['map', 'bar', 'hex', 'hsv', 'rgb', 'alpha', 'preview', 'footer'],
			'draggable':	['header', 'map', 'bar', 'hex', 'hsv', 'rgb', 'alpha', 'preview', 'footer'],
			'inline':		['map', 'bar', 'hex', 'hsv', 'rgb', 'alpha', 'preview']
		};

		this.limits = {
			'websafe':		function(color) {
								color.limit(6);
							},
			'nibble':		function(color) {
								color.limit(16);
							},
			'binary':		function(color) {
								color.limit(2);
							},
			'name':			function(color, that) {
								var swatch = that._getSwatch(that._closestName(color));
								color.setRGB(swatch.r, swatch.g, swatch.b);
							}
		};

		this.parts = {
			header: function (inst) {
				var that	= this,
					part	= null,
					_html	= function() {
						var title = inst.options.title || inst._getRegional('title'),
							html = '<span class="ui-dialog-title">' + title + '</span>';

						if (!inst.inline && inst.options.showCloseButton) {
							html += '<a href="#" class="ui-dialog-titlebar-close ui-corner-all" role="button">'
								+ '<span class="ui-icon ui-icon-closethick">close</span></a>';
						}

						return '<div class="ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix">' + html + '</div>';
					},
					_onclick = function(event) {
						event.preventDefault();
						inst.close(inst.options.revert);
					};

				this.init = function() {
					part = $(_html()).prependTo(inst.dialog);

					var close = $('.ui-dialog-titlebar-close', part);
					inst._hoverable(close);
					inst._focusable(close);
					close.on('click', _onclick);

					if (!inst.inline && inst.options.draggable) {
						var draggableOptions = {
							handle: part,
						}
						if (inst.options.containment) {
							draggableOptions.containment = inst.options.containment;
						}
						inst.dialog.draggable(draggableOptions);
					}
				};

				this.disable = function (disable) {
					$('.ui-dialog-titlebar-close', part)[disable ? 'off' : 'on']('click', _onclick);
				};
			},

			map: function (inst) {
				var that	= this,
					part	= null,
					pointer, width, height, layers = {},
					_mousedown, _mouseup, _mousemove, _keydown, _html;

				_mousedown = function (event) {
					if (!inst.opened) {
						return;
					}

					var offset	= layers.p.offset(),
						x		= event.pageX - offset.left,
						y		= event.pageY - offset.top;

					if (x >= 0 && x < width && y >= 0 && y < height) {
						event.stopImmediatePropagation();
						event.preventDefault();
						part.off('mousedown', _mousedown).focus();
						$(document).on('mouseup', _mouseup);
						$(document).on('mousemove', _mousemove);
						_mousemove(event);
					}
				};

				_mouseup = function (event) {
					event.stopImmediatePropagation();
					event.preventDefault();
					$(document).off('mouseup', _mouseup);
					$(document).off('mousemove', _mousemove);
					part.on('mousedown', _mousedown);
					
					inst._callback('stop');
				};

				_mousemove = function (event) {
					event.stopImmediatePropagation();
					event.preventDefault();

					if (event.pageX === that.x && event.pageY === that.y) {
						return;
					}
					that.x = event.pageX;
					that.y = event.pageY;

					var offset	= layers.p.offset(),
						x		= event.pageX - offset.left,
						y		= event.pageY - offset.top;

					x = Math.max(0, Math.min(x / width, 1));
					y = Math.max(0, Math.min(y / height, 1));

					// interpret values
					switch (inst.mode) {
						case 'h':
							inst.color.setHSV(null, x, 1 - y);
							break;

						case 's':
						case 'a':
							inst.color.setHSV(x, null, 1 - y);
							break;

						case 'v':
							inst.color.setHSV(x, 1 - y, null);
							break;

						case 'r':
							inst.color.setRGB(null, 1 - y, x);
							break;

						case 'g':
							inst.color.setRGB(1 - y, null, x);
							break;

						case 'b':
							inst.color.setRGB(x, 1 - y, null);
							break;
					}

					inst._change(false);
				};

				_keydown = function(event) {
					var x_channel_map = {
							'h': 's',
							's': 'h',
							'v': 'h',
							'r': 'b',
							'g': 'b',
							'b': 'r',
							'a': 'h'
						},
						x_change = {
							37: -1,
							39: 1,
						},
						y_channel_map = {
							'h': 'v',
							's': 'v',
							'v': 's',
							'r': 'g',
							'g': 'r',
							'b': 'g',
							'a': 'v'
						},
						y_change = {
							38: 1,
							40: -1
						},
						set = {
							35: 0,
							36: 1
						},
						change, value;

						if (typeof x_change[event.which] !== 'undefined') {
							value = inst.color.getChannel(x_channel_map[inst.mode]) * width;
							change = x_change[event.which];
							if (event.shiftKey) {
								change *= 10;
							} else if (event.ctrlKey || event.metaKey) {
								change *= width;
							}
							inst.color.setChannel(x_channel_map[inst.mode], (value + change) / width);
							inst._change(false);
						} else if (typeof y_change[event.which] !== 'undefined') {
							value = inst.color.getChannel(y_channel_map[inst.mode]) * height;
							change = y_change[event.which];
							if (event.shiftKey) {
								change *= 10;
							} else if (event.ctrlKey || event.metaKey) {
								change *= height;
							}
							inst.color.setChannel(y_channel_map[inst.mode], (value + change) / height);
							inst._change(false);
						} else if (typeof set[event.which] !== 'undefined') {
							inst.color.setChannel(x_channel_map[inst.mode], 1 - set[event.which]);
							inst.color.setChannel(y_channel_map[inst.mode], set[event.which]);
							inst._change(false);							
						}					
				};

				_html = function () {
					var html = '<div class="ui-colorpicker-map ui-colorpicker-map-'+(inst.options.part.map.size || 256)+' ui-colorpicker-border" taonex="0">'
							+ '<span class="ui-colorpicker-map-layer-1">&nbsp;</span>'
							+ '<span class="ui-colorpicker-map-layer-2">&nbsp;</span>'
							+ (inst.options.alpha ? '<span class="ui-colorpicker-map-layer-alpha">&nbsp;</span>' : '')
							+ '<span class="ui-colorpicker-map-layer-pointer"><span class="ui-colorpicker-map-pointer"></span></span></div>';
					return html;
				};

				this.init = function () {
					part = $(_html()).appendTo($('.ui-colorpicker-map-container', inst.dialog));

					part.on('mousedown', _mousedown);
					part.on('keydown', _keydown);
					
					// cache					
					layers[1]	= $('.ui-colorpicker-map-layer-1', part);
					layers[2]	= $('.ui-colorpicker-map-layer-2', part);
					layers.a	= $('.ui-colorpicker-map-layer-alpha', part);
					layers.p	= $('.ui-colorpicker-map-layer-pointer', part);
					width		= layers.p.width();
					height		= layers.p.height();
					
					pointer		= $('.ui-colorpicker-map-pointer', part);
				};

				this.update = function () {
					var step = ((inst.options.part.map.size || 256) * 65 / 64);

					switch (inst.mode) {
						case 'h':
							layers[1].css({'background-position': '0 0', 'opacity': ''}).show();
							layers[2].hide();
							break;

						case 's':
						case 'a':
							layers[1].css({'background-position': '0 ' + (-step) + 'px', 'opacity': ''}).show();
							layers[2].css({'background-position': '0 ' + (-step * 2) + 'px', 'opacity': ''}).show();
							break;

						case 'v':
							part.css('background-color', 'black');
							layers[1].css({'background-position': '0 ' + (-step * 3) + 'px', 'opacity': ''}).show();
							layers[2].hide();
							break;

						case 'r':
							layers[1].css({'background-position': '0 ' + (-step * 4) + 'px', 'opacity': ''}).show();
							layers[2].css({'background-position': '0 ' + (-step * 5) + 'px', 'opacity': ''}).show();
							break;

						case 'g':
							layers[1].css({'background-position': '0 ' + (-step * 6) + 'px', 'opacity': ''}).show();
							layers[2].css({'background-position': '0 ' + (-step * 7) + 'px', 'opacity': ''}).show();
							break;

						case 'b':
							layers[1].css({'background-position': '0 ' + (-step * 8) + 'px', 'opacity': ''}).show();
							layers[2].css({'background-position': '0 ' + (-step * 9) + 'px', 'opacity': ''}).show();
							break;
					}
					
					that.repaint();
				};

				this.repaint = function () {
					var x = 0,
						y = 0;

					switch (inst.mode) {
						case 'h':
							var hsv = inst.color.getHSV();
							x = hsv.s * width;
							y = (1 - hsv.v) * width;
							part.css('background-color', inst.color.copy().setHSV(null, 1, 1).toCSS());
							break;

						case 's':
						case 'a':
							var hsv = inst.color.getHSV();
							x = hsv.h * width;
							y = (1 - hsv.v) * width;
							layers[2].css('opacity', 1 - hsv.s);
							break;

						case 'v':
							var hsv = inst.color.getHSV();
							x = hsv.h * width;
							y = (1 - hsv.s) * width;
							layers[1].css('opacity', hsv.v);
							break;

						case 'r':
							var rgb = inst.color.getRGB()
							x = rgb.b * width;
							y = (1 - rgb.g) * width;
							layers[2].css('opacity', rgb.r);
							break;

						case 'g':
							var rgb = inst.color.getRGB();
							x = rgb.b * width;
							y = (1 - rgb.r) * width;
							layers[2].css('opacity', rgb.g);
							break;

						case 'b':
							var rgb = inst.color.getRGB()
							x = rgb.r * width;
							y = (1 - rgb.g) * width;
							layers[2].css('opacity', rgb.b);
							break;
					}

					if (inst.options.alpha) {
						layers.a.css('opacity', 1 - inst.color.getAlpha());
					}

					pointer.css({
						'left': x - 7,
						'top': y - 7
					});
				};

				this.disable = function (disable) {
					part[disable ? 'off' : 'on']('mousedown', _mousedown);
					part[disable ? 'off' : 'on']('keydown', _keydown);
				};
			},

			bar: function (inst) {
				var that		= this,
					part		= null,
					pointer, width, height, layers = {},
					_mousedown, _mouseup, _mousemove, _keydown, _html;

				_mousedown = function (event) {
					if (!inst.opened) {
						return;
					}

					var offset	= layers.p.offset(),
						x		= event.pageX - offset.left,
						y		= event.pageY - offset.top;

					if (x >= 0 && x < width && y >= 0 && y < height) {
						event.stopImmediatePropagation();
						event.preventDefault();
						part.off('mousedown', _mousedown).focus();
						$(document).on('mouseup', _mouseup);
						$(document).on('mousemove', _mousemove);
						_mousemove(event);
					}
				};

				_mouseup = function (event) {
					event.stopImmediatePropagation();
					event.preventDefault();
					$(document).off('mouseup', _mouseup);
					$(document).off('mousemove', _mousemove);
					part.on('mousedown', _mousedown);
					
					inst._callback('stop');					
				};

				_mousemove = function (event) {
					event.stopImmediatePropagation();
					event.preventDefault();

					if (event.pageY === that.y) {
						return;
					}
					that.y = event.pageY;

					var offset  = layers.p.offset(),
						y		= event.pageY - offset.top;

					y = Math.max(0, Math.min(y / height, 1));

					// interpret values
					switch (inst.mode) {
						case 'h':
							inst.color.setHSV(1 - y, null, null);
							break;

						case 's':
							inst.color.setHSV(null, 1 - y, null);
							break;

						case 'v':
							inst.color.setHSV(null, null, 1 - y);
							break;

						case 'r':
							inst.color.setRGB(1 - y, null, null);
							break;

						case 'g':
							inst.color.setRGB(null, 1 - y, null);
							break;

						case 'b':
							inst.color.setRGB(null, null, 1 - y);
							break;

						case 'a':
							inst.color.setAlpha(1 - y);
							break;
					}

					inst._change(false);
				};
				
				_keydown = function(event) {
					var change = {
							38: 1,
							40: -1,
							33: 10,
							34: -10
						},
						set = {
							35: 0,
							36: 1
						},
						change, value;

					if (typeof change[event.which] !== 'undefined') {
						value = inst.color.getChannel(inst.mode) * height;
						change = change[event.which];
						if (event.shiftKey) {
							change *= 10;
						} else if (event.ctrlKey || event.metaKey) {
							change *= height;
						}
						inst.color.setChannel(inst.mode, (value + change) / height);
						inst._change(false);
					} else if (typeof set[event.which] !== 'undefined') {
						inst.color.setChannel(inst.mode, set[event.which]);
						inst._change(false);							
					}					
				};

				_html = function () {
					var html = '<div class="ui-colorpicker-bar ui-colorpicker-bar-'+(inst.options.part.bar.size || 256)+'  ui-colorpicker-border" taonex="0">'
							+ '<span class="ui-colorpicker-bar-layer-1">&nbsp;</span>'
							+ '<span class="ui-colorpicker-bar-layer-2">&nbsp;</span>'
							+ '<span class="ui-colorpicker-bar-layer-3">&nbsp;</span>'
							+ '<span class="ui-colorpicker-bar-layer-4">&nbsp;</span>';

					if (inst.options.alpha) {
						html += '<span class="ui-colorpicker-bar-layer-alpha">&nbsp;</span>'
							+ '<span class="ui-colorpicker-bar-layer-alphabar">&nbsp;</span>';
					}

					html += '<span class="ui-colorpicker-bar-layer-pointer"><span class="ui-colorpicker-bar-pointer"></span></span></div>';

					return html;
				};

				this.init = function () {
					part = $(_html()).appendTo($('.ui-colorpicker-bar-container', inst.dialog));

					part.on('mousedown', _mousedown);
					part.on('keydown', _keydown);
					
					// cache				
					layers[1]	= $('.ui-colorpicker-bar-layer-1', part);
					layers[2]	= $('.ui-colorpicker-bar-layer-2', part);
					layers[3]	= $('.ui-colorpicker-bar-layer-3', part);
					layers[4]	= $('.ui-colorpicker-bar-layer-4', part);
					layers.a	= $('.ui-colorpicker-bar-layer-alpha', part);
					layers.ab	= $('.ui-colorpicker-bar-layer-alphabar', part);
					layers.p	= $('.ui-colorpicker-bar-layer-pointer', part);
					width		= layers.p.width();
					height		= layers.p.height();		
					
					pointer		= $('.ui-colorpicker-bar-pointer', part);
				};
				
				this.update = function () {
					var step = ((inst.options.part.bar.size || 256) * 65 / 64);

					switch (inst.mode) {
						case 'h':
						case 's':
						case 'v':
						case 'r':
						case 'g':
						case 'b':
							layers.a.show();
							layers.ab.hide();
							break;

						case 'a':
							layers.a.hide();
							layers.ab.show();
							break;
					}

					switch (inst.mode) {
						case 'h':
							layers[1].css({'background-position': '0 0', 'opacity': ''}).show();
							layers[2].hide();
							layers[3].hide();
							layers[4].hide();
							break;

						case 's':
							layers[1].css({'background-position': '0 ' + (-step) + 'px', 'opacity': ''}).show();
							layers[2].css({'background-position': '0 ' + (-step * 2) + 'px', 'opacity': ''}).show();
							layers[3].hide();
							layers[4].hide();
							break;

						case 'v':
							layers[1].css({'background-position': '0 ' + (-step * 2) + 'px', 'opacity': ''}).show();
							layers[2].hide();
							layers[3].hide();
							layers[4].hide();
							break;

						case 'r':
							layers[1].css({'background-position': '0 ' + (-step * 6) + 'px', 'opacity': ''}).show();
							layers[2].css({'background-position': '0 ' + (-step * 5) + 'px', 'opacity': ''}).show();
							layers[3].css({'background-position': '0 ' + (-step * 3) + 'px', 'opacity': ''}).show();
							layers[4].css({'background-position': '0 ' + (-step * 4) + 'px', 'opacity': ''}).show();
							break;

						case 'g':
							layers[1].css({'background-position': '0 ' + (-step * 10) + 'px', 'opacity': ''}).show();
							layers[2].css({'background-position': '0 ' + (-step * 9) + 'px', 'opacity': ''}).show();
							layers[3].css({'background-position': '0 ' + (-step * 7) + 'px', 'opacity': ''}).show();
							layers[4].css({'background-position': '0 ' + (-step * 8) + 'px', 'opacity': ''}).show();
							break;

						case 'b':
							layers[1].css({'background-position': '0 ' + (-step * 14) + 'px', 'opacity': ''}).show();
							layers[2].css({'background-position': '0 ' + (-step * 13) + 'px', 'opacity': ''}).show();
							layers[3].css({'background-position': '0 ' + (-step * 11) + 'px', 'opacity': ''}).show();
							layers[4].css({'background-position': '0 ' + (-step * 12) + 'px', 'opacity': ''}).show();
							break;

						case 'a':
							layers[1].hide();
							layers[2].hide();
							layers[3].hide();
							layers[4].hide();
							break;
					}
					
					that.repaint();
				};

				this.repaint = function () {
					var y = 0;

					switch (inst.mode) {
						case 'h':
							y = (1 - inst.color.getHSV().h) * height;
							break;

						case 's':
							var hsv = inst.color.getHSV();
							y = (1 - hsv.s) * height;
							layers[2].css('opacity', 1 - hsv.v);
							part.css('background-color', inst.color.copy().setHSV(null, 1, null).toCSS());
							break;

						case 'v':
							y = (1 - inst.color.getHSV().v) * height;
							part.css('background-color', inst.color.copy().setHSV(null, null, 1).toCSS());
							break;

						case 'r':
							var rgb = inst.color.getRGB();
							y = (1 - rgb.r) * height;
							layers[2].css('opacity', Math.max(0, (rgb.b - rgb.g)));
							layers[3].css('opacity', Math.max(0, (rgb.g - rgb.b)));
							layers[4].css('opacity', Math.min(rgb.b, rgb.g));
							break;

						case 'g':
							var rgb = inst.color.getRGB();
							y = (1 - rgb.g) * height;
							layers[2].css('opacity', Math.max(0, (rgb.b - rgb.r)));
							layers[3].css('opacity', Math.max(0, (rgb.r - rgb.b)));
							layers[4].css('opacity', Math.min(rgb.r, rgb.b));
							break;

						case 'b':
							var rgb = inst.color.getRGB();
							y = (1 - rgb.b) * height;
							layers[2].css('opacity', Math.max(0, (rgb.r - rgb.g)));
							layers[3].css('opacity', Math.max(0, (rgb.g - rgb.r)));
							layers[4].css('opacity', Math.min(rgb.r, rgb.g));
							break;

						case 'a':
							y = (1 - inst.color.getAlpha()) * height;
							part.css('background-color', inst.color.copy().toCSS());
							break;
					}

					if (inst.mode !== 'a') {
						layers.a.css('opacity', 1 - inst.color.getAlpha());
					}

					pointer.css('top', y - 3);
				};

				this.disable = function (disable) {
					part[disable ? 'off' : 'on']('mousedown', _mousedown);
					part[disable ? 'off' : 'on']('keydown', _keydown);
				};
			},

			preview: function (inst) {
				var that = this,
					part = null,
					both,
					initial, initial_alpha,
					current, current_alpha,
					_html,
					onclick = function () {
						inst.color = inst.currentColor.copy();
						inst._change();
					};

				_html = function () {
					return '<div class="ui-colorpicker-preview ui-colorpicker-border">'
						+ '<div class="ui-colorpicker-preview-initial"><div class="ui-colorpicker-preview-initial-alpha"></div></div>'
						+ '<div class="ui-colorpicker-preview-current"><div class="ui-colorpicker-preview-current-alpha"></div></div>'
						+ '</div>';
				};

				this.init = function () {
					part = $(_html()).appendTo($('.ui-colorpicker-preview-container', inst.dialog));

					$('.ui-colorpicker-preview-initial', part).on('click', onclick);

					// cache
					initial			= $('.ui-colorpicker-preview-initial', part);
					initial_alpha	= $('.ui-colorpicker-preview-initial-alpha', part);
					current			= $('.ui-colorpicker-preview-current', part);
					current_alpha	= $('.ui-colorpicker-preview-current-alpha', part);
					both			= $('.ui-colorpicker-preview-initial-alpha, .ui-colorpicker-preview-current-alpha', part);
				};

				this.update = function () {
					both[inst.options.alpha ? 'show' : 'hide']();

					this.repaint();
				};

				this.repaint = function () {
					initial.css('background-color', inst.currentColor.set ? inst.currentColor.toCSS() : '').attr('title', inst.currentColor.set ? inst.currentColor.toCSS() : '');
					initial_alpha.css('opacity', 1 - inst.currentColor.getAlpha());
					current.css('background-color', inst.color.set ? inst.color.toCSS() : '').attr('title', inst.color.set ? inst.color.toCSS() : '');
					current_alpha.css('opacity', 1 - inst.color.getAlpha());
				};

				this.disable = function (disable) {
					$('.ui-colorpicker-preview-initial', part)[disable ? 'off' : 'on']('click', onclick);
				};
			},

			hsv: function (inst) {
				var that = this,
					part = null,
					inputs = {},
					_html;

				_html = function () {
					var html = '';

					if (inst.options.hsv) {
						html +=	'<div class="ui-colorpicker-hsv-h"><input class="ui-colorpicker-mode" type="radio" value="h"/><label>' + inst._getRegional('hsvH') + '</label><input class="ui-colorpicker-number" type="number" min="0" max="360" size="10"/><span class="ui-colorpicker-unit">&deg;</span></div>'
							+ '<div class="ui-colorpicker-hsv-s"><input class="ui-colorpicker-mode" type="radio" value="s"/><label>' + inst._getRegional('hsvS') + '</label><input class="ui-colorpicker-number" type="number" min="0" max="100" size="10"/><span class="ui-colorpicker-unit">%</span></div>'
							+ '<div class="ui-colorpicker-hsv-v"><input class="ui-colorpicker-mode" type="radio" value="v"/><label>' + inst._getRegional('hsvV') + '</label><input class="ui-colorpicker-number" type="number" min="0" max="100" size="10"/><span class="ui-colorpicker-unit">%</span></div>';
					}

					return '<div class="ui-colorpicker-hsv">' + html + '</div>';
				};

				this.init = function () {
					part = $(_html()).appendTo($('.ui-colorpicker-hsv-container', inst.dialog));

					$('.ui-colorpicker-mode', part).click(function () {
						inst.mode = $(this).val();
						inst._updateAllParts();
					});
					
					inputs.h = $('.ui-colorpicker-hsv-h .ui-colorpicker-number', part);
					inputs.s = $('.ui-colorpicker-hsv-s .ui-colorpicker-number', part);
					inputs.v = $('.ui-colorpicker-hsv-v .ui-colorpicker-number', part);

					$('.ui-colorpicker-number', part).on('change keyup', function () {
						inst.color.setHSV(
							inputs.h.val() / 360,
							inputs.s.val() / 100,
							inputs.v.val() / 100
						);
						inst._change();
					});
				};

				this.repaint = function () {
					var hsv = inst.color.getHSV();
					inputs.h.val(Math.round(hsv.h * 360));
					inputs.s.val(Math.round(hsv.s * 100));
					inputs.v.val(Math.round(hsv.v * 100));
				};

				this.update = function () {
					$('.ui-colorpicker-mode', part).each(function () {
						var $this = $(this);
						$this.prop('checked', $this.val() === inst.mode);
					});
					this.repaint();
				};

				this.disable = function (disable) {
					$(':input', part).prop('disabled', disable);
				};
			},

			rgb: function (inst) {
				var that = this,
					part = null,
					inputs = {},
					_html;

				_html = function () {
					var html = '';

					if (inst.options.rgb) {
						html += '<div class="ui-colorpicker-rgb-r"><input class="ui-colorpicker-number" min="0" max="255"/><p>' + inst._getRegional('rgbR') + '</p></div>'
							+ '<div class="ui-colorpicker-rgb-g"><input class="ui-colorpicker-number"  min="0" max="255"/><p>' + inst._getRegional('rgbG') + '</p></div>'
							+ '<div class="ui-colorpicker-rgb-b"><input class="ui-colorpicker-number"  min="0" max="255"/><p>' + inst._getRegional('rgbB') + '</p></div>';
                        html+='<div class="ui-colorpicker-alpha"><input class="ui-colorpicker-number alphainput2" min="0" max="100" value="100" /><p>' + inst._getRegional('alphaA') + '</p></div>';
					}

					return '<div class="ui-colorpicker-rgb">' + html + '</div>';
				};

				this.init = function () {
					part = $(_html()).appendTo($('.ui-colorpicker-rgb-container', inst.dialog));

					$('.ui-colorpicker-mode', part).click(function () {
						inst.mode = $(this).val();
						inst._updateAllParts();
					});
					
					inputs.r = $('.ui-colorpicker-rgb-r .ui-colorpicker-number', part);
					inputs.g = $('.ui-colorpicker-rgb-g .ui-colorpicker-number', part);
					inputs.b = $('.ui-colorpicker-rgb-b .ui-colorpicker-number', part);

					$('.ui-colorpicker-number', part).on('change keyup', function () {
						var r = $('.ui-colorpicker-rgb-r .ui-colorpicker-number', part).val();
						inst.color.setRGB(
							inputs.r.val() / 255,
							inputs.g.val() / 255,
							inputs.b.val() / 255
						);

						inst._change();
					});
				};

				this.repaint = function () {
					var rgb = inst.color.getRGB();
					inputs.r.val(Math.round(rgb.r * 255));
					inputs.g.val(Math.round(rgb.g * 255));
					inputs.b.val(Math.round(rgb.b * 255));
				};

				this.update = function () {
					$('.ui-colorpicker-mode', part).each(function () {
						var $this = $(this);
						$this.prop('checked', $this.val() === inst.mode);
					});
					this.repaint();
				};

				this.disable = function (disable) {
					$(':input', part).prop('disabled', disable);
				};
			},

			lab: function (inst) {
				var that = this,
					part = null,
					inputs = {},
					html = function () {
						var html = '';

						if (inst.options.hsv) {
							html +=	'<div class="ui-colorpicker-lab-l"><label>' + inst._getRegional('labL') + '</label><input class="ui-colorpicker-number" type="number" min="0" max="100"/></div>'
								+ '<div class="ui-colorpicker-lab-a"><label>' + inst._getRegional('labA') + '</label><input class="ui-colorpicker-number" type="number" min="-128" max="127"/></div>'
								+ '<div class="ui-colorpicker-lab-b"><label>' + inst._getRegional('labB') + '</label><input class="ui-colorpicker-number" type="number" min="-128" max="127"/></div>';
						}

						return '<div class="ui-colorpicker-lab">' + html + '</div>';
					};

				this.init = function () {
					var data = 0;

					part = $(html()).appendTo($('.ui-colorpicker-lab-container', inst.dialog));
					
					inputs.l = $('.ui-colorpicker-lab-l .ui-colorpicker-number', part);
					inputs.a = $('.ui-colorpicker-lab-a .ui-colorpicker-number', part);
					inputs.b = $('.ui-colorpicker-lab-b .ui-colorpicker-number', part);

					$('.ui-colorpicker-number', part).on('change keyup', function (event) {
						inst.color.setLAB(
							parseInt(inputs.l.val(), 10) / 100,
							(parseInt(inputs.a.val(), 10) + 128) / 255,
							(parseInt(inputs.b.val(), 10) + 128) / 255
						);
						inst._change();
					});
				};

				this.repaint = function () {
					var lab = inst.color.getLAB();
					inputs.l.val(Math.round(lab.l * 100));
					inputs.a.val(Math.round(lab.a * 255) - 128);
					inputs.b.val(Math.round(lab.b * 255) - 128);
				};

				this.update = this.repaint;
				
				this.disable = function (disable) {
					$(':input', part).prop('disabled', disable);
				};
			},

			cmyk: function (inst) {
				var that = this,
					part = null,
					inputs = {},
					html = function () {
						var html = '';

						if (inst.options.hsv) {
							html +=	'<div class="ui-colorpicker-cmyk-c"><label>' + inst._getRegional('cmykC') + '</label><input class="ui-colorpicker-number" type="number" min="0" max="100"/><span class="ui-colorpicker-unit">%</span></div>'
								+ '<div class="ui-colorpicker-cmyk-m"><label>' + inst._getRegional('cmykM') + '</label><input class="ui-colorpicker-number" type="number" min="0" max="100"/><span class="ui-colorpicker-unit">%</span></div>'
								+ '<div class="ui-colorpicker-cmyk-y"><label>' + inst._getRegional('cmykY') + '</label><input class="ui-colorpicker-number" type="number" min="0" max="100"/><span class="ui-colorpicker-unit">%</span></div>'
								+ '<div class="ui-colorpicker-cmyk-k"><label>' + inst._getRegional('cmykK') + '</label><input class="ui-colorpicker-number" type="number" min="0" max="100"/><span class="ui-colorpicker-unit">%</span></div>';
						}

						return '<div class="ui-colorpicker-cmyk">' + html + '</div>';
					};

				this.init = function () {
					part = $(html()).appendTo($('.ui-colorpicker-cmyk-container', inst.dialog));
					
					inputs.c = $('.ui-colorpicker-cmyk-c .ui-colorpicker-number', part);
					inputs.m = $('.ui-colorpicker-cmyk-m .ui-colorpicker-number', part);
					inputs.y = $('.ui-colorpicker-cmyk-y .ui-colorpicker-number', part);
					inputs.k = $('.ui-colorpicker-cmyk-k .ui-colorpicker-number', part);
					
					$('.ui-colorpicker-number', part).on('change keyup', function (event) {
						inst.color.setCMYK(
							parseInt(inputs.c.val(), 10) / 100,
							parseInt(inputs.m.val(), 10) / 100,
							parseInt(inputs.y.val(), 10) / 100,
							parseInt(inputs.k.val(), 10) / 100
						);
						inst._change();
					});
				};

				this.repaint = function () {
					var cmyk = inst.color.getCMYK();
					inputs.c.val(Math.round(cmyk.c * 100));
					inputs.m.val(Math.round(cmyk.m * 100));
					inputs.y.val(Math.round(cmyk.y * 100));
					inputs.k.val(Math.round(cmyk.k * 100));
				};

				this.update = this.repaint;

				this.disable = function (disable) {
					$(':input', part).prop('disabled', disable);
				};
			},

			alpha: function (inst) {
				var that = this,
					part = null,
					input,
					html = function () {
						var html = '';

						
                        html+='<input class="ui-colorpicker-number alphainput" id="alphainput" type="number" min="0" max=100" value="100" style="display:none;" /><div class="sliderbg"><div class="rangeslider"></div></div>';

						return '<div class="ui-colorpicker-a">' + html + '</div>';
					};

				this.init = function () {
					part = $(html()).appendTo($('.ui-colorpicker-alpha-container', inst.dialog));

					$('.ui-colorpicker-mode', part).click(function () {
						inst.mode = $(this).val();
						inst._updateAllParts();
					});
					
					input = $('.ui-colorpicker-a ui-colorpicker-number', part);

					$('.ui-colorpicker-number', part).on('change keyup', function () {
                    //console.log(input.val() / 100);
                        
						inst.color.setAlpha($('#alphainput').val() / 100);
						inst._change();
					});
				};

				this.update = function () {
					$('.ui-colorpicker-mode', part).each(function () {
						$(this).prop('checked', $(this).val() === inst.mode);
					});
					this.repaint();
				};

				this.repaint = function () {
					input.val(Math.round(inst.color.getAlpha() * 100));
				};
				
				this.disable = function (disable) {
					$(':input', part).prop('disabled', disable);
				};
			},

			hex: function (inst) {
				var that = this,
					part = null,
					inputs = {},
					parseHex = function(color) {
						var c,
							m;

						// {#}rgb
						m = /^#?([a-fA-F0-9]{1,3})$/.exec(color);
						if (m) {
							c = parseInt(m[1], 16);
							return new $.colorpicker.Color(
								((c >> 8) & 0xF) / 15,
								((c >> 4) & 0xF) / 15,
								(c & 0xF) / 15
							);
						}

						// {#}rrggbb
						m = /^#?([a-fA-F0-9]{1,6})$/.exec(color);
						if (m) {
							c = parseInt(m[1], 16);
							return new $.colorpicker.Color(
								((c >> 16) & 0xFF) / 255,
								((c >>  8) & 0xFF) / 255,
								(c & 0xFF) / 255
							);
						}
						
						return new $.colorpicker.Color();
					},
					html = function () {
						var html = '';

						html += '<input class="ui-colorpicker-hex-input" type="text" maxlength="7" size="7"/>';

						return '<div class="ui-colorpicker-hex">' + html + '<p>HEX</p></div>';
					};

				this.init = function () {
					part = $(html()).appendTo($('.ui-colorpicker-hex-container', inst.dialog));

					inputs.color = $('.ui-colorpicker-hex-input', part);
					inputs.alpha = $('.ui-colorpicker-hex-alpha', part);

					inputs.color.on('keydown keyup', function(e) {	
						return e.ctrlKey || e.metaKey || _keycode.isHex(e.which) || !_keycode.isPrint(e.which);
					});

					// repeat here makes the invalid input disappear faster
					inputs.color.on('change', function () {
						if (/[^a-fA-F0-9]/.test(inputs.color.val())) {
							inputs.color.val(inputs.color.val().replace(/[^a-fA-F0-9]/g, ''));
						}
					});

					inputs.color.on('change keyup', function () {
						// repeat here makes sure that the invalid input doesn't get parsed
						inst.color = parseHex(inputs.color.val()).setAlpha(inst.color.getAlpha());
						inst._change();
					});

					inputs.alpha.on('keydown keyup', function(e) {
						return e.ctrlKey || e.metaKey || _keycode.isHex(e.which) || !_keycode.isPrint(e.which);
					});
					
					inputs.alpha.on('change', function () {
						if (/[^a-fA-F0-9]/.test(inputs.alpha)) {
							inputs.alpha.val(inputs.alpha.val().replace(/[^a-fA-F0-9]/g, ''));
						}
					});

					inputs.alpha.on('change keyup', function () {
						inst.color.setAlpha(parseInt(inputs.alpha.val(), 16) / 255);
						inst._change();
					});
				};

				this.repaint = function () {
					if (!inputs.color.is(':focus')) {
						inputs.color.val('#'+inst.color.toHex(true));
					}

					if (!inputs.alpha.is(':focus')) {
						inputs.alpha.val(_intToHex(inst.color.getAlpha() * 255));
					}
				};

				this.update = this.repaint;

				this.disable = function (disable) {
					$(':input', part).prop('disabled', disable);
				};
			},

			swatches: function (inst) {
				var that = this,
					part = null,
					html = function () {
						var html = '';

						inst._eachSwatch(function (name, color) {
							var c = new $.colorpicker.Color(color.r, color.g, color.b),
								css = c.toCSS();
							html += '<div class="ui-colorpicker-swatch" style="background-color:' + css + '" title="' + name + '"></div>';
						});

						return '<div class="ui-colorpicker-swatches ui-colorpicker-border" style="width:' + inst.options.swatchesWidth + 'px">' + html + '</div>';
					},
					onclick = function () {
						inst.color	= inst._parseColor($(this).css('background-color')) || new $.colorpicker.Color();
						inst._change();
					};

				this.init = function () {
					part = $(html());
					$('.ui-colorpicker-swatches-container', inst.dialog).html(part);
					$('.ui-colorpicker-swatch', part).on('click', onclick);
				};

				this.disable = function (disable) {
					$('.ui-colorpicker-swatch', part)[disable ? 'off' : 'on']('click', onclick);
				};
			},

			footer: function (inst) {
				var that = this,
					part = null,
					id_transparent = 'ui-colorpicker-special-transparent-' + inst.colorpicker_index,
					id_none = 'ui-colorpicker-special-none-' + inst.colorpicker_index,
					html = function () {
						var html = '';

							html += '<div class="ui-dialog-buttonset">';
                            if (!inst.inline && inst.options.showNoneButton) {
								/*html += '<input type="radio" name="ui-colorpicker-special" id="'+id_none+'" class="ui-colorpicker-special-none"><label for="'+id_none+'">' + inst._getRegional('none') + '</label>';*/
                                
                                html += '<button class="ui-colorpicker-cancel" id="'+id_none+'">' + inst._getRegional('none') + '</button>';
							}
                            
							if (inst.options.showCancelButton) {
								html += '<button class="ui-colorpicker-cancel">' + inst._getRegional('cancel') + '</button>';
							}
							html += '<button class="ui-colorpicker-ok">' + inst._getRegional('ok') + '</button>';
							html += '</div>';
						

						return '<div>' + html + '</div>';
					};

				this.init = function () {
					part = $(html()).appendTo(inst.dialog);

					$('.ui-colorpicker-ok', part).button().click(function () {
						inst.close();
					});

					$('.ui-colorpicker-cancel', part).button().click(function () {
						inst.close(false);   //cancel
					});

					$('.ui-colorpicker-buttonset', part)[$.fn.controlgroup ? 'controlgroup' : 'buttonset']();

					$('.ui-colorpicker-special-color', part).click(function () {
						inst._change();
					});

					$('#'+id_none, part).click(function () {
						inst.color.set = false;
						inst._change();
					});

					$('#'+id_transparent, part).click(function () {
						inst.color.setAlpha(0);
						inst._change();
					});
				};

				this.repaint = function () {
					$('.ui-colorpicker-special-none', part).prop('checked', !inst.color.set).button('refresh');
					$('.ui-colorpicker-special-transparent', part).prop('checked', inst.color.set && inst.color.getAlpha() === 0).button('refresh');
					$('.ui-colorpicker-ok', part).button(inst.changed ? 'enable' : 'disable');
				};

				this.update = function () {};

				this.disable = function (disabled) {
					$(':input, :button', part).button(disabled ? 'disable' : 'enable');
					if (!disabled) {
						$('.ui-colorpicker-ok', part).button(inst.changed ? 'enable' : 'disable');
					}
				};
			}
		};

		this.Color = function () {
			var spaces = {	rgb:	{r: 0, g: 0, b: 0},
							hsv:	{h: 0, s: 0, v: 0},
							hsl:	{h: 0, s: 0, l: 0},
							lab:	{l: 0, a: 0, b: 0},
							cmyk:	{c: 0, m: 0, y: 0, k: 1}
						},
				a = 1,
				illuminant = [0.9504285, 1, 1.0889],	// CIE-L*ab D65/2' 1931
				args = arguments,
				_clip = function(v) {
					if (isNaN(v) || v === null) {
						return 0;
					}
					if (typeof v == 'string') {
						v = parseInt(v, 10);
					}
					return Math.max(0, Math.min(v, 1));
				},
				_hexify = function (number) {
					var number = Math.round(number),
						digits = '0123456789abcdef',
						lsd = number % 16,
						msd = (number - lsd) / 16,
						hexified = digits.charAt(msd) + digits.charAt(lsd);
					return hexified;
				},
				_rgb_to_xyz = function(rgb) {
					var r = (rgb.r > 0.04045) ? Math.pow((rgb.r + 0.055) / 1.055, 2.4) : rgb.r / 12.92,
						g = (rgb.g > 0.04045) ? Math.pow((rgb.g + 0.055) / 1.055, 2.4) : rgb.g / 12.92,
						b = (rgb.b > 0.04045) ? Math.pow((rgb.b + 0.055) / 1.055, 2.4) : rgb.b / 12.92;

					return {
						x: r * 0.4124 + g * 0.3576 + b * 0.1805,
						y: r * 0.2126 + g * 0.7152 + b * 0.0722,
						z: r * 0.0193 + g * 0.1192 + b * 0.9505
					};
				},
				_xyz_to_rgb = function(xyz) {
					var rgb = {
						r: xyz.x *  3.2406 + xyz.y * -1.5372 + xyz.z * -0.4986,
						g: xyz.x * -0.9689 + xyz.y *  1.8758 + xyz.z *  0.0415,
						b: xyz.x *  0.0557 + xyz.y * -0.2040 + xyz.z *  1.0570
					};

					rgb.r = (rgb.r > 0.0031308) ? 1.055 * Math.pow(rgb.r, (1 / 2.4)) - 0.055 : 12.92 * rgb.r;
					rgb.g = (rgb.g > 0.0031308) ? 1.055 * Math.pow(rgb.g, (1 / 2.4)) - 0.055 : 12.92 * rgb.g;
					rgb.b = (rgb.b > 0.0031308) ? 1.055 * Math.pow(rgb.b, (1 / 2.4)) - 0.055 : 12.92 * rgb.b;

					return rgb;
				},
				_rgb_to_hsv = function(rgb) {
					var minVal = Math.min(rgb.r, rgb.g, rgb.b),
						maxVal = Math.max(rgb.r, rgb.g, rgb.b),
						delta = maxVal - minVal,
						del_R, del_G, del_B,
						hsv = {
							h: 0,
							s: 0,
							v: maxVal
						};

					if (delta === 0) {
						hsv.h = 0;
						hsv.s = 0;
					} else {
						hsv.s = delta / maxVal;

						del_R = (((maxVal - rgb.r) / 6) + (delta / 2)) / delta;
						del_G = (((maxVal - rgb.g) / 6) + (delta / 2)) / delta;
						del_B = (((maxVal - rgb.b) / 6) + (delta / 2)) / delta;

						if (rgb.r === maxVal) {
							hsv.h = del_B - del_G;
						} else if (rgb.g === maxVal) {
							hsv.h = (1 / 3) + del_R - del_B;
						} else if (rgb.b === maxVal) {
							hsv.h = (2 / 3) + del_G - del_R;
						}

						if (hsv.h < 0) {
							hsv.h += 1;
						} else if (hsv.h > 1) {
							hsv.h -= 1;
						}
					}

					return hsv;
				},
				_hsv_to_rgb = function(hsv) {
					var rgb = {
							r: 0,
							g: 0,
							b: 0
						},
						var_h,
						var_i,
						var_1,
						var_2,
						var_3;

					if (hsv.s === 0) {
						rgb.r = rgb.g = rgb.b = hsv.v;
					} else {
						var_h = hsv.h === 1 ? 0 : hsv.h * 6;
						var_i = Math.floor(var_h);
						var_1 = hsv.v * (1 - hsv.s);
						var_2 = hsv.v * (1 - hsv.s * (var_h - var_i));
						var_3 = hsv.v * (1 - hsv.s * (1 - (var_h - var_i)));

						if (var_i === 0) {
							rgb.r = hsv.v;
							rgb.g = var_3;
							rgb.b = var_1;
						} else if (var_i === 1) {
							rgb.r = var_2;
							rgb.g = hsv.v;
							rgb.b = var_1;
						} else if (var_i === 2) {
							rgb.r = var_1;
							rgb.g = hsv.v;
							rgb.b = var_3;
						} else if (var_i === 3) {
							rgb.r = var_1;
							rgb.g = var_2;
							rgb.b = hsv.v;
						} else if (var_i === 4) {
							rgb.r = var_3;
							rgb.g = var_1;
							rgb.b = hsv.v;
						} else {
							rgb.r = hsv.v;
							rgb.g = var_1;
							rgb.b = var_2;
						}
					}

					return rgb;
				},
				_rgb_to_hsl = function(rgb) {
					var minVal = Math.min(rgb.r, rgb.g, rgb.b),
						maxVal = Math.max(rgb.r, rgb.g, rgb.b),
						delta = maxVal - minVal,
						del_R, del_G, del_B,
						hsl = {
							h: 0,
							s: 0,
							l: (maxVal + minVal) / 2
						};

					if (delta === 0) {
						hsl.h = 0;
						hsl.s = 0;
					} else {
						hsl.s = hsl.l < 0.5 ? delta / (maxVal + minVal) : delta / (2 - maxVal - minVal);

						del_R = (((maxVal - rgb.r) / 6) + (delta / 2)) / delta;
						del_G = (((maxVal - rgb.g) / 6) + (delta / 2)) / delta;
						del_B = (((maxVal - rgb.b) / 6) + (delta / 2)) / delta;

						if (rgb.r === maxVal) {
							hsl.h = del_B - del_G;
						} else if (rgb.g === maxVal) {
							hsl.h = (1 / 3) + del_R - del_B;
						} else if (rgb.b === maxVal) {
							hsl.h = (2 / 3) + del_G - del_R;
						}

						if (hsl.h < 0) {
							hsl.h += 1;
						} else if (hsl.h > 1) {
							hsl.h -= 1;
						}
					}

					return hsl;
				},
				_hsl_to_rgb = function(hsl) {
					var var_1,
						var_2,
						hue_to_rgb	= function(v1, v2, vH) {
										if (vH < 0) {
											vH += 1;
										}
										if (vH > 1) {
											vH -= 1;
										}
										if ((6 * vH) < 1) {
											return v1 + (v2 - v1) * 6 * vH;
										}
										if ((2 * vH) < 1) {
											return v2;
										}
										if ((3 * vH) < 2) {
											return v1 + (v2 - v1) * ((2 / 3) - vH) * 6;
										}
										return v1;
									};

					if (hsl.s === 0) {
						return {
							r: hsl.l,
							g: hsl.l,
							b: hsl.l
						};
					}

					var_2 = (hsl.l < 0.5) ? hsl.l * (1 + hsl.s) : (hsl.l + hsl.s) - (hsl.s * hsl.l);
					var_1 = 2 * hsl.l - var_2;

					return {
						r: hue_to_rgb(var_1, var_2, hsl.h + (1 / 3)),
						g: hue_to_rgb(var_1, var_2, hsl.h),
						b: hue_to_rgb(var_1, var_2, hsl.h - (1 / 3))
					};
				},
				_xyz_to_lab = function(xyz) {
					var x = xyz.x / illuminant[0],
						y = xyz.y / illuminant[1],
						z = xyz.z / illuminant[2];

					x = (x > 0.008856) ? Math.pow(x, (1/3)) : (7.787 * x) + (16/116);
					y = (y > 0.008856) ? Math.pow(y, (1/3)) : (7.787 * y) + (16/116);
					z = (z > 0.008856) ? Math.pow(z, (1/3)) : (7.787 * z) + (16/116);

					return {
						l: ((116 * y) - 16) / 100,	// [0,100]
						a: ((500 * (x - y)) + 128) / 255,	// [-128,127]
						b: ((200 * (y - z))	+ 128) / 255	// [-128,127]
					};
				},
				_lab_to_xyz = function(lab) {
					var lab2 = {
							l: lab.l * 100,
							a: (lab.a * 255) - 128,
							b: (lab.b * 255) - 128
						},
						xyz = {
							x: 0,
							y: (lab2.l + 16) / 116,
							z: 0
						};

					xyz.x = lab2.a / 500 + xyz.y;
					xyz.z = xyz.y - lab2.b / 200;

					xyz.x = (Math.pow(xyz.x, 3) > 0.008856) ? Math.pow(xyz.x, 3) : (xyz.x - 16 / 116) / 7.787;
					xyz.y = (Math.pow(xyz.y, 3) > 0.008856) ? Math.pow(xyz.y, 3) : (xyz.y - 16 / 116) / 7.787;
					xyz.z = (Math.pow(xyz.z, 3) > 0.008856) ? Math.pow(xyz.z, 3) : (xyz.z - 16 / 116) / 7.787;

					xyz.x *= illuminant[0];
					xyz.y *= illuminant[1];
					xyz.z *= illuminant[2];

					return xyz;
				},
				_rgb_to_cmy = function(rgb) {
					return {
						c: 1 - (rgb.r),
						m: 1 - (rgb.g),
						y: 1 - (rgb.b)
					};
				},
				_cmy_to_rgb = function(cmy) {
					return {
						r: 1 - (cmy.c),
						g: 1 - (cmy.m),
						b: 1 - (cmy.y)
					};
				},
				_cmy_to_cmyk = function(cmy) {
					var K = 1;

					if (cmy.c < K) {
						K = cmy.c;
					}
					if (cmy.m < K) {
						K = cmy.m;
					}
					if (cmy.y < K) {
						K = cmy.y;
					}

					if (K === 1) {
						return {
							c: 0,
							m: 0,
							y: 0,
							k: 1
						};
					}

					return {
						c: (cmy.c - K) / (1 - K),
						m: (cmy.m - K) / (1 - K),
						y: (cmy.y - K) / (1 - K),
						k: K
					};
				},
				_cmyk_to_cmy = function(cmyk) {
					return {
						c: cmyk.c * (1 - cmyk.k) + cmyk.k,
						m: cmyk.m * (1 - cmyk.k) + cmyk.k,
						y: cmyk.y * (1 - cmyk.k) + cmyk.k
					};
				};

			this.set = false;

			this.setAlpha = function(_a) {
				if (_a !== null) {
					a = _clip(_a);
				}
				this.set = true;

				return this;
			};

			this.getAlpha = function() {
				return a;
			};

			this.setRGB = function(r, g, b) {
				spaces = { rgb: this.getRGB() };
				if (r !== null) {
					spaces.rgb.r = _clip(r);
				}
				if (g !== null) {
					spaces.rgb.g = _clip(g);
				}
				if (b !== null) {
					spaces.rgb.b = _clip(b);
				}
				this.set = true;
				
				return this;
			};
			
			this.getChannel = function(channel) {
				switch (channel) {
					case 'h':
					case 's':
					case 'v':
						return this.getHSV()[channel];

					case 'r':
					case 'g':
					case 'b':
						return this.getRGB()[channel];

					case 'a':
						return this.getAlpha();
				}			
				
				return null;
			};
			
			this.setChannel = function(channel, value) {
				switch (channel) {
					case 'h':
						return this.setHSV(value, null, null);
						
					case 's':
						return this.setHSV(null, value, null);
						
					case 'v':
						return this.setHSV(null, null, value);

					case 'r':
						return this.setRGB(value, null, null);
						
					case 'g':
						return this.setRGB(null, value, null);
						
					case 'b':
						return this.setRGB(null, null, value);

					case 'a':
						return this.setAlpha(value);
				}
				
				return this;
			};

			this.setHSV = function(h, s, v) {
				spaces = {hsv: this.getHSV()};
				if (h !== null) {
					spaces.hsv.h = _clip(h);
				}
				if (s !== null)	{
					spaces.hsv.s = _clip(s);
				}
				if (v !== null)	{
					spaces.hsv.v = _clip(v);
				}
				this.set = true;

				return this;
			};

			this.setHSL = function(h, s, l) {
				spaces = {hsl: this.getHSL()};
				if (h !== null)	{
					spaces.hsl.h = _clip(h);
				}
				if (s !== null) {
					spaces.hsl.s = _clip(s);
				}
				if (l !== null) {
					spaces.hsl.l = _clip(l);
				}
				this.set = true;

				return this;
			};

			this.setLAB = function(l, a, b) {
				spaces = {lab: this.getLAB()};
				if (l !== null) {
					spaces.lab.l = _clip(l);
				}
				if (a !== null) {
					spaces.lab.a = _clip(a);
				}
				if (b !== null) {
					spaces.lab.b = _clip(b);
				}
				this.set = true;

				return this;
			};

			this.setCMYK = function(c, m, y, k) {
				spaces = {cmyk: this.getCMYK()};
				if (c !== null) {
					spaces.cmyk.c = _clip(c);
				}
				if (m !== null) {
					spaces.cmyk.m = _clip(m);
				}
				if (y !== null) {
					spaces.cmyk.y = _clip(y);
				}
				if (k !== null) {
					spaces.cmyk.k = _clip(k);
				}
				this.set = true;

				return this;
			};

			this.getRGB = function() {
				if (!spaces.rgb) {
					spaces.rgb	= spaces.lab ?	_xyz_to_rgb(_lab_to_xyz(spaces.lab))
								: spaces.hsv ?	_hsv_to_rgb(spaces.hsv)
								: spaces.hsl ?	_hsl_to_rgb(spaces.hsl)
								: spaces.cmyk ?	_cmy_to_rgb(_cmyk_to_cmy(spaces.cmyk))
								: {r: 0, g: 0, b: 0};
					spaces.rgb.r = _clip(spaces.rgb.r);
					spaces.rgb.g = _clip(spaces.rgb.g);
					spaces.rgb.b = _clip(spaces.rgb.b);
				}
				return $.extend({}, spaces.rgb);
			};

			this.getHSV = function() {
				if (!spaces.hsv) {
					spaces.hsv	= spaces.lab ? _rgb_to_hsv(this.getRGB())
								: spaces.rgb ?	_rgb_to_hsv(spaces.rgb)
								: spaces.hsl ?	_rgb_to_hsv(this.getRGB())
								: spaces.cmyk ?	_rgb_to_hsv(this.getRGB())
								: {h: 0, s: 0, v: 0};
					spaces.hsv.h = _clip(spaces.hsv.h);
					spaces.hsv.s = _clip(spaces.hsv.s);
					spaces.hsv.v = _clip(spaces.hsv.v);
				}
				return $.extend({}, spaces.hsv);
			};

			this.getHSL = function() {
				if (!spaces.hsl) {
					spaces.hsl	= spaces.rgb ?	_rgb_to_hsl(spaces.rgb)
								: spaces.hsv ?	_rgb_to_hsl(this.getRGB())
								: spaces.cmyk ?	_rgb_to_hsl(this.getRGB())
								: spaces.hsv ?	_rgb_to_hsl(this.getRGB())
								: {h: 0, s: 0, l: 0};
					spaces.hsl.h = _clip(spaces.hsl.h);
					spaces.hsl.s = _clip(spaces.hsl.s);
					spaces.hsl.l = _clip(spaces.hsl.l);
				}
				return $.extend({}, spaces.hsl);
			};

			this.getCMYK = function() {
				if (!spaces.cmyk) {
					spaces.cmyk	= spaces.rgb ?	_cmy_to_cmyk(_rgb_to_cmy(spaces.rgb))
								: spaces.hsv ?	_cmy_to_cmyk(_rgb_to_cmy(this.getRGB()))
								: spaces.hsl ?	_cmy_to_cmyk(_rgb_to_cmy(this.getRGB()))
								: spaces.lab ?	_cmy_to_cmyk(_rgb_to_cmy(this.getRGB()))
								: {c: 0, m: 0, y: 0, k: 1};
					spaces.cmyk.c = _clip(spaces.cmyk.c);
					spaces.cmyk.m = _clip(spaces.cmyk.m);
					spaces.cmyk.y = _clip(spaces.cmyk.y);
					spaces.cmyk.k = _clip(spaces.cmyk.k);
				}
				return $.extend({}, spaces.cmyk);
			};

			this.getLAB = function() {
				if (!spaces.lab) {
					spaces.lab	= spaces.rgb ?	_xyz_to_lab(_rgb_to_xyz(spaces.rgb))
								: spaces.hsv ?	_xyz_to_lab(_rgb_to_xyz(this.getRGB()))
								: spaces.hsl ?	_xyz_to_lab(_rgb_to_xyz(this.getRGB()))
								: spaces.cmyk ?	_xyz_to_lab(_rgb_to_xyz(this.getRGB()))
								: {l: 0, a: 0, b: 0};
					spaces.lab.l = _clip(spaces.lab.l);
					spaces.lab.a = _clip(spaces.lab.a);
					spaces.lab.b = _clip(spaces.lab.b);
				}
				return $.extend({}, spaces.lab);
			};

			this.getChannels = function() {
				return {
					r:	this.getRGB().r,
					g:	this.getRGB().g,
					b:	this.getRGB().b,
					a:	this.getAlpha(),
					h:	this.getHSV().h,
					s:	this.getHSV().s,
					v:	this.getHSV().v,
					c:	this.getCMYK().c,
					m:	this.getCMYK().m,
					y:	this.getCMYK().y,
					k:	this.getCMYK().k,
					L:	this.getLAB().l,
					A:	this.getLAB().a,
					B:	this.getLAB().b
				};
			};

			this.getSpaces = function() {
				return $.extend(true, {}, spaces);
			};

			this.distance = function(color) {
				var space	= 'lab',
					getter	= 'get'+space.toUpperCase(),
					a = this[getter](),
					b = color[getter](),
					distance = 0,
					channel;

				for (channel in a) {
					distance += Math.pow(a[channel] - b[channel], 2);
				}

				return distance;
			};

			this.equals = function(color) {
				if (color) {
					var a = this.getRGB(),
						b = color.getRGB();

					return this.set === color.set
						&& this.getAlpha() === color.getAlpha()
						&& a.r === b.r
						&& a.g === b.g
						&& a.b === b.b;
				}
				return false;
			};

			this.limit = function(steps) {
				steps -= 1;
				var rgb = this.getRGB();
				this.setRGB(
					Math.round(rgb.r * steps) / steps,
					Math.round(rgb.g * steps) / steps,
					Math.round(rgb.b * steps) / steps
				);
			};

			this.toHex = function() {
				var rgb = this.getRGB();
				return _hexify(rgb.r * 255) + _hexify(rgb.g * 255) + _hexify(rgb.b * 255);
			};

			this.toCSS = function() {
				return '#' + this.toHex();
			};

			this.copy = function() {
				var color = new $.colorpicker.Color(this.getSpaces(), this.getAlpha());
				color.set = this.set;
				return color;
			};

			// Construct
			if (args.length === 2) {
				spaces = args[0];
				this.setAlpha(args[1] === 0 ? 0 : args[1] || 1);
				this.set = true;
			}
			if (args.length > 2) {
				this.setRGB(args[0], args[1], args[2]);
				this.setAlpha(args[3] === 0 ? 0 : args[3] || 1);
				this.set = true;
			}
		};
	}();

	$.widget("vanderlee.colorpicker", {
		options: {
			alpha:				false,		// Show alpha controls and mode
			altAlpha:			true,		// change opacity of altField as well?
			altField:			'',			// selector for DOM elements which change background color on change.
			altOnChange:		true,		// true to update on each change, false to update only on close.
			altProperties:		'background-color',	// comma separated list of any of 'background-color', 'color', 'border-color', 'outline-color'
			autoOpen:			false,		// Open dialog automatically upon creation
			buttonClass:		null,		// If set, the button will get this/these classname(s).
			buttonColorize:		false,
			buttonImage:		'',
			buttonImageOnly:	false,
			buttonText:			null,		// Text on the button and/or title of button image.
			closeOnEscape:		true,		// Close the dialog when the escape key is pressed.
			closeOnOutside:		true,		// Close the dialog when clicking outside the dialog (not for inline)
			color:				'#00FF00',	// Initial color (for inline only)
			colorFormat:		'HEX',		// Format string for output color format
			disabled:			false,		// Disable or enable the colorpicker initially
			draggable:			true,		// Make popup dialog draggable if header is visible.
			containment:		null,		// Constrains dragging to within the bounds of the specified element or region.
			duration:			'fast',
			hideOn:				'button',	// 'focus', 'click', 'button', 'alt', 'all'
			hsv:				true,		// Show HSV controls and modes
			inline:				true,		// Show any divs as inline by default
			inlineFrame:		true,		// Show a border and background when inline.
			layout: {
				map:		[0, 0, 1, 5],	// Left, Top, Width, Height (in table cells).
				bar:		[1, 0, 1, 5],
				preview:	[2, 0, 1, 1],
				hsv:		[2, 1, 1, 1],
				rgb:		[2, 2, 1, 1],
				alpha:		[2, 3, 1, 1],
				hex:		[2, 4, 1, 1],
				lab:		[3, 1, 1, 1],
				cmyk:		[3, 2, 1, 2],
				swatches:	[4, 0, 1, 5]
			},
			limit:				'',			// Limit color "resolution": '', 'websafe', 'nibble', 'binary', 'name'
			modal:				false,		// Modal dialog?
			mode:				'h',		// Initial editing mode, h, s, v, r, g, b or a
			okOnEnter:			false,		// Close (with OK) when pressing the enter key
			parts:				'',			// leave empty for automatic selection
			part: {
				map:		{ size: 256 },
				bar:		{ size: 256 }
			},			// options per part
			position:			null,
			regional:			'',
			revert:				false,		// Revert color upon non
			rgb:				true,		// Show RGB controls and modes
			showAnim:			'fadeIn',
			showCancelButton:	true,
			showNoneButton:		false,
			showCloseButton:	true,
			showOn:				'focus click alt',		// 'focus', 'click', 'button', 'alt', 'all'
			showOptions:		{},
			swatches:			null,		// null for default or kv-object or names swatches set
			swatchesWidth:		84,			// width (in number of pixels) of swatches box.
			title:				null,

			cancel:             null,
            close:              null,
			init:				null,
            ok:                 null,
			open:               null,
			select:             null,
			stop:				null
		},
		
		_create: function () {
			var that = this,
				text;

			that.colorpicker_index = _colorpicker_index++;

			that.widgetEventPrefix = 'colorpicker';

			that.opened		= false;
			that.generated	= false;
			that.inline		= false;
			that.changed	= false;

			that.dialog		= null;
			that.button		= null;
			that.image		= null;
			that.overlay	= null;
			
			that.events = {
				window_resize:			null,
				document_keydown:		null,
				document_click_html:	null
			};

			that.mode		= that.options.mode;

			if (that.element.is('input') || that.options.inline === false) {
				// Initial color
				that._setColor(that.element.is('input') ? that.element.val() : that.options.color);
				that._callback('init');

				// showOn focus
				if (/\bfocus|all|both\b/.test(that.options.showOn)) {
					that.element.on('focus', function () {
						that.open();
					});
				}
				if (/\bfocus|all|both\b/.test(that.options.hideOn)) {
					that.element.on('focusout', function (e) {
						that.close();
					});
				}

				// showOn click
				if (/\bclick|all|both\b/.test(that.options.showOn)) {
					that.element.on('click', function (e) {						
						if (that.opened && /\bclick|all|both\b/.test(that.options.hideOn)) {
							that.close();
						} else {
							that.open();
						}
					});
				}

				// showOn button
				if (/\bbutton|all|both\b/.test(that.options.showOn)) {
					if (that.options.buttonImage !== '') {
						text = that.options.buttonText || that._getRegional('button');

						that.image = $('<img/>').attr({
							'src':		that.options.buttonImage,
							'alt':		text,
							'title':	text
						});
						if (that.options.buttonClass) {
							that.image.attr('class', that.options.buttonClass);
						}

						that._setImageBackground();
					}

					if (that.options.buttonImageOnly && that.image) {
						that.button = that.image;
					} else {
						that.button = $('<button type="button"></button>').html(that.image || that.options.buttonText).button();
						that.image = that.image ? $('img', that.button).first() : null;
					}
					that.button.insertAfter(that.element).click(function () {
						if (!that.options.disabled) {
							if (that.opened && /\bbutton|all|both\b/.test(that.options.hideOn)) {
								that.close();
							} else {
								that.open();
							}
						}
					});
				}

				// showOn alt
				if (/\balt|all|both\b/.test(that.options.showOn)) {					
					$(that.options.altField).on('click', function () {
						if (that.opened && /\balt|all|both\b/.test(that.options.hideOn)) {
							that.close();
						} else {
							that.open();
						}
					});
				}

				if (that.options.autoOpen) {
					that.open();
				}

			} else {
				that.inline = true;

				that._generate();
				that.opened = true;
			}

			// Disable Widget-style
			(that.element.is(':disabled') || that.options.disabled) && that.disable();

			return this;
		},

		_setOption: function(key, value) {
			switch (key) {
				case 'disabled':
					this[value ? 'disable' : 'enable']();
					break;

				case 'swatches':
					this.options.swatches = value;
					this.parts.swatches.init();
					break;
			}

			$.Widget.prototype._setOption.apply(this, arguments);
		},

		enable: function () {
			//$.Widget.prototype.enable.call(this);
			this.element && this.element.prop('disabled', false);
			this.button && this.button.prop('disabled', false);
			this.dialog && this.dialog.removeClass('ui-colorpicker-disabled');
			this.options.disabled = false;

			this.parts && $.each(this.parts, function (index, part) {
				part.disable && part.disable(false);
			});
		},
		
		disable: function () {
			//$.Widget.prototype.disable.call(this);
			this.element && this.element.prop('disabled', true);
			this.button && this.button.prop('disabled', true);
			this.dialog && this.dialog.addClass('ui-colorpicker-disabled');
			this.options.disabled = true;

			this.parts && $.each(this.parts, function (index, part) {
				part.disable && part.disable(true);
			});
		},

		_setImageBackground: function() {
			if (this.image && this.options.buttonColorize) {
				this.image.css('background-color', this.color.set? this._formatColor('RGBA', this.color) : '');
			}
		},

		/**
		 * If an alternate field is specified, set it according to the current color.
		 */
		_setAltField: function () {
			if (this.options.altOnChange && this.options.altField && this.options.altProperties) {
				var index,
					property,
					properties = this.options.altProperties.split(',');

				for (index = 0; index <= properties.length; ++index) {
					property = $.trim(properties[index]);
					switch (property) {
						case 'color':
						case 'fill':
						case 'stroke':
						case 'background-color':
						case 'backgroundColor':
						case 'outline-color':
						case 'border-color':
							$(this.options.altField).css(property, this.color.set? this.color.toCSS() : '');
							break;
					}
				}

				this.options.altAlpha && 
					$(this.options.altField).css('opacity', this.color.set? this.color.getAlpha() : '');
			}
		},

		_setColor: function(text) {
			this.color			= this._parseColor(text) || new $.colorpicker.Color();
			this.currentColor	= this.color.copy();

			this._setImageBackground();
			this._setAltField();
		},

		setColor: function(text) {
			this._setColor(text);
			this._change();
		},

		getColor: function(format) {
			return this._formatColor(format || this.options.colorFormat, this.color);
		},

		_generateInline: function() {
			var that = this;

			$(that.element).html(that.options.inlineFrame ? _container_inlineFrame : _container_inline);

			that.dialog = $('.ui-colorpicker', that.element);
		},

		_generatePopup: function() {
			var that = this;

			that.dialog = $(_container_popup).appendTo('body');

			// Close on clicking outside window and controls
			if (that.events.document_click_html === null) {
				$(document).on('touchstart click', 'html', that.events.document_click_html = function (event) {
					if (!that.opened || event.target === that.element[0] || that.overlay) {
						return;
					}

					// Check if clicked on any part of dialog
					if (that.dialog.is(event.target) || that.dialog.has(event.target).length > 0) {
						that.element.blur();	// inside window!
						return;
					}

					// Check if clicked on known external elements
					var p,
						parents = $(event.target).parents();
					// add the event.target in case of buttonImageOnly and closeOnOutside both are set to true
					parents.push(event.target);
					for (p = 0; p <= parents.length; ++p) {
						// button
						if (that.button !== null && parents[p] === that.button[0]) {
							return;
						}
						// showOn alt
						if (/\balt|all|both\b/.test(that.options.showOn) && $(that.options.altField).is(parents[p])) {
							return;
						}
					}

					// no closeOnOutside
					if (!that.options.closeOnOutside) {
						return;
					}

					that.close(that.options.revert);
				});
			}

			if (that.events.document_keydown === null) {
				$(document).on('keydown', that.events.document_keydown = function (event) {
					// close on ESC key
					if (that.opened && event.keyCode === 27 && that.options.closeOnEscape) {
						that.close(that.options.revert);
					}

					// OK on Enter key
					if (that.opened && event.keyCode === 13 && that.options.okOnEnter) {
						that.close();
					}
				});
			}

			// Close (with OK) on tab key in element
			that.element.keydown(function (event) {
				if (event.keyCode === 9) {
					that.close();
				}
			}).keyup(function (event) {
				var color = that._parseColor(that.element.val());
				if (color && !that.color.equals(color)) {
					that.color = color;
					that._change();
				}
			});
		},

		_generate: function () {
			var that = this,
				index,
				part,
				parts_list,
				layout_parts,
				table,
				classes;

			that._setColor(that.inline || !that.element.is('input') ? that.options.color : that.element.val());

			that[that.inline ? '_generateInline' : '_generatePopup']();

			// Determine the parts to include in this colorpicker
			if (typeof that.options.parts === 'string') {
				if ($.colorpicker.partslists[that.options.parts]) {
					parts_list = $.colorpicker.partslists[that.options.parts];
				} else {
					// automatic
					parts_list = $.colorpicker.partslists[that.inline ? 'inline' : 'popup'];
				}
			} else {
				parts_list = that.options.parts;
			}

			// Add any parts to the internal parts list
			that.parts = {};
			$.each(parts_list, function(index, part) {
				if ($.colorpicker.parts[part]) {
					that.parts[part] = new $.colorpicker.parts[part](that);
				}
			});

			if (!that.generated) {
				layout_parts = [];

				$.each(that.options.layout, function(part, pos) {
					if (that.parts[part]) {
						layout_parts.push({
							'part': part,
							'pos':  pos
						});
					}
				});

				table = $(_layoutTable(layout_parts, function(cell, x, y) {
					classes = ['ui-colorpicker-' + cell.part + '-container'];

					if (x > 0) {
						classes.push('ui-colorpicker-padding-left');
					}

					if (y > 0) {
						classes.push('ui-colorpicker-padding-top');
					}

					return '<td  class="' + classes.join(' ') + '"'
						+ (cell.pos[2] > 1 ? ' colspan="' + cell.pos[2] + '"' : '')
						+ (cell.pos[3] > 1 ? ' rowspan="' + cell.pos[3] + '"' : '')
						+ ' valign="top"></td>';
				})).appendTo(that.dialog);
				if (that.options.inlineFrame) {
					table.addClass('ui-dialog-content ui-widget-content');
				}

				that._initAllParts();
				that._updateAllParts();
				that.generated = true;
			}
		},

		_effectGeneric: function (element, show, slide, fade, callback) {
			var that = this;

			if ($.effects && $.effects[that.options.showAnim]) {
				element[show](that.options.showAnim, that.options.showOptions, that.options.duration, callback);
			} else {
				element[(that.options.showAnim === 'slideDown' ?
								slide
							:	(that.options.showAnim === 'fadeIn' ?
									fade
								:	show))]((that.options.showAnim ? that.options.duration : null), callback);
				if ($.isFunction(callback) && (!that.options.showAnim || !that.options.duration)) {
					callback();
				}
			}
		},

		_effectShow: function(element, callback) {
			this._effectGeneric(element, 'show', 'slideDown', 'fadeIn', callback);
		},

		_effectHide: function(element, callback) {
			this._effectGeneric(element, 'hide', 'slideUp', 'fadeOut', callback);
		},
				
		open: function() {
			var that = this,
				offset,
				bottom, right,
				height, width,
				x, y,
				zIndex,
				element,
				position;

			if (!that.opened) {
				that._generate();
				
				if (that.element.is(':hidden')) {
					element = $('<div/>').insertBefore(that.element);
				} else {
					element = that.element;
				}			
				
				if (that.element.is(':hidden')) {
					element.remove();
				}
				
				// Automatically find highest z-index.
				zIndex = 0;
				$(that.element[0]).parents().each(function() {
					var z = $(this).css('z-index');
					if ((typeof(z) === 'number' || typeof(z) === 'string') && z !== '' && !isNaN(z)) {
						if (z > zIndex) {
							zIndex = parseInt(z, 10);
							return false;
						}
					}
					else {
						$(this).siblings().each(function() {
							var z = $(this).css('z-index');
							if ((typeof(z) === 'number' || typeof(z) === 'string') && z !== '' && !isNaN(z)) {
								if (z > zIndex) {
									zIndex = parseInt(z, 10);
								}
							}
						});
					}
				});

				zIndex += 2;
				that.dialog.css('z-index', zIndex);
								
				if (that.options.modal) {
					that.overlay = $('<div class="ui-widget-overlay"></div>').appendTo('body').css('z-index', zIndex - 1);										

					if (that.events.window_resize !== null) {
						$(window).off('resize', that.events.window_resize);					
					}
					
					that.events.window_resize = function() {
						if (that.overlay) {
							that.overlay.width($(document).width());
							that.overlay.height($(document).height());					
						}
					},
															
					$(window).on('resize', that.events.window_resize);
					that.events.window_resize();			
				}

				that._effectShow(this.dialog);

				if (that.options.position) {
					position = $.extend({}, that.options.position);
					if (position.of === 'element') {
						position.of = element;
					}
				} else {
					position = {
						my:			'left top',
						at:			'left bottom',
						of:			element,
						collision:	'flip'
					};
				}
				that.dialog.position(position);
				
				that.opened = true;
				that._callback('open');

				// Without waiting for domready the width of the map is 0 and we
				// wind up with the cursor stuck in the upper left corner
				$(function() {
					that._repaintAllParts();
				});
			}
		},

		close: function (cancel) {
			var that = this;

			if (!that.opened) {
				return;
			}				
				
            if (cancel) {
				that.color = that.currentColor.copy();
                that._change();
                that._callback('cancel');
            } else {
				that.currentColor	= that.color.copy();
                that._callback('ok');
            }
			that.changed		= false;

			if (that.overlay) {
				$(window).off('resize', that.events.window_resize);					
				that.overlay.remove();
			}
			
			// tear down the interface
			that._effectHide(that.dialog, function () {
				that.dialog.remove();
				that.dialog		= null;
				that.generated	= false;

				that.opened		= false;
				that._callback('close');
			});
		},

		destroy: function() {
			var that = this;
			if (that.events.document_click_html !== null) {
				$(document).off('touchstart click', 'html', that.events.document_click_html);
			}
			
			if (that.events.document_keydown !== null) {
				$(document).off('keydown', that.events.document_keydown);
			}
			
			if (that.events.window_resize !== null) {
				$(window).off('resize', that.events.window_resize);					
			}			
			
			this.element.off();

			if (this.overlay) {
				this.overlay.remove();
			}
			
			if (this.dialog !== null) {
				this.dialog.remove();
			}
			
			if (this.image !== null) {
				this.image.remove();
			}

			if (this.button !== null) {
				this.button.remove();
			}
		},

		_callback: function (callback) {
			var that = this,
				data,
				lab;

			if (that.color.set) {
				data = {
					formatted: that._formatColor(that.options.colorFormat, that.color),
					colorPicker: that
				};

				data.hex	= that.color.toHex();
				data.css	= that.color.toCSS();
				data.a		= that.color.getAlpha();
				data.rgb	= that.color.getRGB();
				data.hsv	= that.color.getHSV();
				data.cmyk	= that.color.getCMYK();
				data.hsl	= that.color.getHSL();

				lab = that.color.getLAB();
				lab.a = (lab.a * 2) - 1;
				lab.b = (lab.b * 2) - 1;
				data.lab	= lab;

				return that._trigger(callback, null, data);
			} else {
				return that._trigger(callback, null, {
					formatted: '',
					colorPicker: that
				});
			}
		},

		_initAllParts: function () {
			$.each(this.parts, function (index, part) {
				if (part.init) {
					part.init();
				}
			});
		},

		_updateAllParts: function () {
			$.each(this.parts, function (index, part) {
				if (part.update) {
					part.update();
				}
			});
		},

		_repaintAllParts: function () {
			$.each(this.parts, function (index, part) {
				if (part.repaint) {
					part.repaint();
				}
			});
		},
		
		_change: function (stoppedChanging /* = true */) {
			// Limit color palette
			if (this.color.set && this.options.limit && $.colorpicker.limits[this.options.limit]) {
				$.colorpicker.limits[this.options.limit](this.color, this);
			}

			// Set changed if different from starting color
			this.changed = !this.color.equals(this.currentColor);

			// update input element content
			if (!this.inline) {
				if (!this.color.set) {
					if (this.element.val() !== '') {
						this.element.val('').change();
					}
				} else if (!this.color.equals(this._parseColor(this.element.val()))) {
					this.element.val(this._formatColor(this.options.colorFormat, this.color)).change();
				}

				this._setImageBackground();
			}

			// Set the alt field
			this._setAltField();

			// update color option
			this.options.color = this.color.set ? this.color.toCSS() : '';

			if (this.opened) {
				this._repaintAllParts();
			}

			// callbacks
			this._callback('select');

			if (typeof stoppedChanging === 'undefined' ? true : !!stoppedChanging) {
				this._callback('stop');
			}
		},

		// This will be deprecated by jQueryUI 1.9 widget
		_hoverable: function (e) {
			e.hover(function () {
				e.addClass("ui-state-hover");
			}, function () {
				e.removeClass("ui-state-hover");
			});
		},

		// This will be deprecated by jQueryUI 1.9 widget
		_focusable: function (e) {
			e.focus(function () {
				e.addClass("ui-state-focus");
			}).blur(function () {
				e.removeClass("ui-state-focus");
			});
		},

		_getRegional: function(name) {
			return $.colorpicker.regional[this.options.regional][name] !== undefined ?
				$.colorpicker.regional[this.options.regional][name] : $.colorpicker.regional[''][name];
        },

		_getSwatches: function() {
			if (typeof(this.options.swatches) === 'string') {
				return $.colorpicker.swatches[this.options.swatches];
			}

			if ($.isPlainObject(this.options.swatches)) {
				return this.options.swatches;
			}

			return $.colorpicker.swatches.html;
		},
		
		_eachSwatch: function (callback) {
			var currentSwatches = this._getSwatches(),
				name;
			$.each(currentSwatches, function (nameOrIndex, swatch) {
				name = $.isArray(currentSwatches) ? swatch.name : nameOrIndex;
				return callback(name, swatch);
			});
		},

		_getSwatch: function(name) {
			var swatch = false;

			this._eachSwatch(function(swatchName, current) {
				if (swatchName.toLowerCase() == name.toLowerCase()) {
					swatch = current;
					return false;
				}
			});

			return swatch;
        },
		
		_parseFormat: function(format, text) {
			var that = this,
				typeRegexps = {
					x:	function() {return '([0-9a-fA-F]{2})';}
				,	d:	function() {return '([12]?[0-9]{1,2})';}
				,	f:	function() {return '([0-9]*\\.?[0-9]*)';}
				,	p:	function() {return '([0-9]*\\.?[0-9]*)';}
				},
				typeConverters = {
					x:	function(v)	{return parseInt(v, 16) / 255.;}
				,	d:	function(v)	{return v / 255.;}
				,	f:	function(v)	{return v;}
				,	p:	function(v)	{return v * 0.01;}
				},
				setters = {
					r:	'setRGB'
				,	g:	'setRGB'
				,	b:	'setRGB'
				,	h:	'setHSV'
				,	s:	'setHSV'
				,	v:	'setHSV'
				,	c:	'setCMYK'
				,	m:	'setCMYK'
				,	y:	'setCMYK'
				,	k:	'setCMYK'
				,	L:	'setLAB'
				,	A:	'setLAB'
				,	B:	'setLAB'
				},
				setterChannels = {
					setRGB:		[ 'r', 'g', 'b']
				,	setHSV:		[ 'h', 's', 'v' ]
				,	setCMYK:	[ 'c', 'm', 'y', 'k' ]
				,	setLAB:		[ 'L', 'A', 'B' ]
				},
				channels = [],
				converters = [],						
				setter = null,
				color,
				pattern;

			// Construct pattern
			pattern = format.replace(/[()\\^$.|?*+[\]]/g, function(m) {
				return '\\'+m;
			});


			pattern = pattern.replace(/\\?[argbhsvcmykLAB][xdfp]/g, function(variable) {
				if (variable.match(/^\\/)) {
					return variable.slice(1);
				}

				var channel = variable.charAt(0),
					type = variable.charAt(1);

				channels.push(channel);
				converters.push(typeConverters[type]);
				if (setters[channel]) {
					setter = setters[channel];
				}

				return typeRegexps[type]();
			});

			if (setter) {
				var values = text.match(new RegExp(pattern));
				if (values) {
					var args = [],
						channelIndex;
					
					values.shift();
									
					$.each(setterChannels[setter], function(index, channel) {
						channelIndex = $.inArray(channel, channels);
						args[index] = converters[channelIndex](values[channelIndex]);
					});

					color = new $.colorpicker.Color();
					color[setter].apply(color, args);
				}
			}
			
			return color;
		},

        _parseColor: function(text) {
            var that = this,
				color;
		
			var formats = $.isArray(that.options.colorFormat)
					? that.options.colorFormat
					: [ that.options.colorFormat ];

			$.each(formats, function(index, format) {
				if ($.colorpicker.parsers[format]) {
					color = $.colorpicker.parsers[format](text, that);
				} else {
					color = that._parseFormat(format, text);
				}
			
				if (color) {
					return false;
				}
			});
			
			if (!color) {
				// fallback; check all registered parsers
				$.each($.colorpicker.parsers, function(name, parser) {
					color = parser(text, that);
					if (color) {
						return false;
					}
				});
			}

			if (color) {
				return color;
			}

			return false;
        },

		_exactName: function(color) {
			var name	= false;

			this._eachSwatch(function(n, swatch) {
				if (color.equals(new $.colorpicker.Color(swatch.r, swatch.g, swatch.b))) {
					name = n;
					return false;
				}
			});

			return name;
		},

		_closestName: function(color) {
			var rgb			= color.getRGB(),
				distance	= null,
				name		= false,
				d;

			this._eachSwatch(function(n, swatch) {
				d = color.distance(new $.colorpicker.Color(swatch.r, swatch.g, swatch.b));
				if (d < distance || distance === null) {
					name = n;
					if (d <= 1e-20) {	// effectively 0 by maximum rounding error
						return false;	// can't get much closer than 0
					}
					distance = d;	// safety net
				}
			});

			return name;
		},

		_formatColor: function (formats, color) {			
			var that		= this,
				text		= null,
				types		= {	'x':	function(v) {return _intToHex(v * 255);}
							,	'd':	function(v) {return Math.round(v * 255);}
							,	'f':	function(v) {return v;}
							,	'p':	function(v) {return v * 100.;}
							},
				channels	= color.getChannels();

			if (!$.isArray(formats)) {
				formats = [formats];
			}

			$.each(formats, function(index, format) {
				if ($.colorpicker.writers[format]) {
					text = $.colorpicker.writers[format](color, that);		
					return (text === false);
				} else {
					text = format.replace(/\\?[argbhsvcmykLAB][xdfp]/g, function(m) {
						if (m.match(/^\\/)) {
							return m.slice(1);
						}
						return types[m.charAt(1)](channels[m.charAt(0)]);
					});
					return false;
				}
			});
			
			return text;
		}
	});
	
	return $.vanderlee.colorpicker;
}));
