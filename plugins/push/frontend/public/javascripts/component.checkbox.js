'use strict';

/* jshint undef: true, unused: true */
/* globals m */

window.component('checkbox', function(checkbox) {
	checkbox.id = 0;
	checkbox.controller = function(opts){
		if (!(this instanceof checkbox.controller)) {
			return new checkbox.controller(opts);
		}

		this.opts = opts;
		this.id = 'checkbox_' + checkbox.id++;
		if (opts.undeNullValue) {
			this.open = function(){
				if (arguments.length) {
					opts.undeNullValue(opts.undeNullValue() === undefined ? null : undefined);
					if (opts.undeNullOnChange) {
						opts.undeNullOnChange(opts.undeNullValue());
					}
				}
				return opts.undeNullValue() === null || opts.undeNullValue() !== undefined;
			};
		} else {
			this.open = typeof opts.open === 'function' ? opts.open : m.prop(opts.open || false);
		}
		this.config = function(el, isInitialized){
			if (!isInitialized) {
				el.onclick = function(ev) {
					if (ev.target.tagName.toLowerCase() === 'label' || ev.target.className.indexOf('comp-check') !== -1 || ev.target.className.indexOf('comp-view') !== -1) {
						m.startComputation();
						ev.stopPropagation();
						this.open(!this.open());
						m.endComputation();
					}
				}.bind(this);
			}
		}.bind(this);

	};
	checkbox.view = function(ctrl){
		var cldrn = [],
			input = m('input[type=checkbox]', {checked: ctrl.open(), onchange: m.withAttr('checked', ctrl.open)}),
			label = m('label', ctrl.opts.title),
			view = ctrl.opts.view ? ctrl.opts.view(ctrl.open()) : '';

		view = view.length ? view : [view];

		if (ctrl.opts.group) {
			cldrn.push(m('.comp-check.' + ctrl.opts.group, {onclick: ctrl.open.bind(null, !ctrl.open())}, {config: ctrl.config}, [input, label]));
			cldrn.push(m('.comp-view.' + ctrl.opts.group + (ctrl.open() ? '.comp-active' : '.comp-inactive'), {config: ctrl.config}, view));
		} else {
			cldrn.push(input);
			cldrn.push(label);
			cldrn = cldrn.concat(view);
		}
		return m('.comp-checkbox' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), cldrn);
	};
});
