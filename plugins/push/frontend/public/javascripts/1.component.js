'use strict';

/* jshint undef: true, unused: true */

if (!window.component) {
	window.dot = function(obj, is, value, deep) {
		if (typeof is === 'string') {
			return window.dot(obj, is.split('.'), value, deep);
		} else if (is.length === 1 && value !== undefined) {
			obj[is[0]] = value;
			return value;
		} else if (is.length === 0) {
			return obj;
		} else if (!obj) {
			return obj;
		} else {
			if (deep && value && !(is[0] in obj)) { obj[is[0]] = {}; }
			var next = obj[is[0]];
			return window.dot(typeof next === 'function' ? next.apply(obj) : next, is.slice(1), value, deep);
		}
	};

	window.component = function(name, obj) {
		if (!window.components) {
			window.components = {};
		}
		if (typeof obj === 'function') {
			obj(window.dot(window.components, name) || window.dot(window.components, name, {}, true));
		} else {
			return window.dot(window.components, name) || window.dot(window.components, name, obj, true);
		}
	};

	window.vprop = function(val, validator, errorText) {
		var prop = m.prop(), 
			f = function() {
				if (arguments.length) {
					f.valid = validator(arguments[0]);
					return prop(arguments[0]);
				} else {
					return prop();
				}
			};
		f.errorText = errorText;
		f(val);
		return f;
	};
}
