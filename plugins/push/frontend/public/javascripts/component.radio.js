'use strict';

/* jshint undef: true, unused: true */
/* globals m */

window.component('radio', function(radio) {
	var t = window.components.t, count = 0;
	
	radio.controller = function(opts){
		if (!(this instanceof radio.controller)) {
			return new radio.controller(opts);
		}

		this.opts = opts;
		this.value = typeof opts.value === 'function' ? opts.value : m.prop(opts.value);
		this.options = m.prop(opts.options.map(window.components.selector.Option));
		this.id = 'comp-radio-' + count++;
	};
	radio.view = function(ctrl){
		return m('.comp-radio' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), ctrl.options().map(function(o){
			var opts = {name: ctrl.id, 
				value: o.value(), 
				onchange: m.withAttr('checked', ctrl.value)
			};
			if (('' + ctrl.value()) === ('' + o.value())) {
				opts.checked = 'checked';
			}

			return m('.comp-radio-option', {class: opts.checked ? 'active' : '', onclick: ctrl.value.bind(ctrl, o.value())}, [
				m('input[type="radio"]', opts), 
				m('label', o.title()), 
				o.desc() ? m('span.help', o.desc()) : '',
				o.view ? o.view() : ''
			]);
		}));
	};
});
