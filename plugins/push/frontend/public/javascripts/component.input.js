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
		var pls = (typeof ctrl.opts.placeholder === 'function' ? ctrl.opts.placeholder() : ctrl.opts.placeholder) || '';

		return m('input.comp-input' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), {placeholder: pls, value: ctrl.value() || '', oninput: function(ev){
			ctrl.value(ev.target.value);
			if (ctrl.opts.onchange) { ctrl.opts.onchange(ctrl.value()); }
		}});
	};
});
