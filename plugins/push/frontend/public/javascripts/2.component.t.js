'use strict';

/* jshint undef: true, unused: true */
/* globals m */

if (!window.components) {
	window.components = {};
}

if (!window.components.t) {
	var overrides = {};

	window.components.t = function(key, def) {
		return (key in overrides) ? overrides[key] : window.jQuery.i18n.map[key] || (typeof def === 'undefined' ? key : def);
	};

	window.components.t.set = function(key, text) {
		overrides[key] = text;
	};

	window.components.t.p = function() {
		return window.jQuery.i18n.prop.apply(window.jQuery.i18n, arguments);
	};

	window.components.t.n = function(key, count) {
		if (count == 1) {
			return window.jQuery.i18n.prop(key + '.s', count);
		} else {
			return window.jQuery.i18n.prop(key + '.m', count);
		}
	};
}

