'use strict';

/* jshint undef: true, unused: true */
/* globals m */

window.component('input', function(input) {
	input.controller = function(opts){
		if (!(this instanceof input.controller)) {
			return new input.controller(opts);
		}

		this.opts = opts;
		this.value = typeof opts.value === 'function' ? opts.value : m.prop(opts.value);
	};
	input.view = function(ctrl){
		return m('input.comp-input' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), {value: ctrl.value(), oninput: m.withAttr('value', ctrl.value)});
	};
});
