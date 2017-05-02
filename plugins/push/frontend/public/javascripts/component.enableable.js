'use strict';

/* jshint undef: true, unused: true */
/* globals m */

window.component('enableable', function(enableable) {
	enableable.id = 0;
	enableable.controller = function(opts){
		if (!(this instanceof enableable.controller)) {
			return new enableable.controller(opts);
		}

		this.opts = opts;
		this.id = 'enableable_' + enableable.id++;
		this.open = typeof opts.open === 'function' ? opts.open : m.prop(opts.open || false);
		this.view = opts.view;
	};
	enableable.view = function(ctrl){
		return m('.comp-enableable' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), [
			m('h4', [
				ctrl.opts.title,
				m('.on-off-switch', [
					m('input[type=checkbox][id=' + ctrl.id + '].on-off-switch-checkbox', {checked: ctrl.open(), onchange: m.withAttr('checked', ctrl.open)}),
					m('label[for=' + ctrl.id + '].on-off-switch-label')
				])
			]),
			m('div', {class: ctrl.open() ? 'open' : 'closed'}, ctrl.view())
		]);
	};
});
