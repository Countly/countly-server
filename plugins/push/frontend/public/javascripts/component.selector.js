'use strict';

/* jshint undef: true, unused: true */
/* globals m */

window.component('selector', function(selector) {
	var t = window.components.t;
	
	selector.Option = function(data){
		if (data instanceof selector.Option) {
			return data;
		} else if (!(this instanceof selector.Option)) {
			return new selector.Option(data);
		}
		this.value = m.prop(data.value);
		this.title = m.prop(data.title);
		this.desc = m.prop(data.desc);
		this.view = data.view;
		this.selected = m.prop(data.selected || false);
	};
	selector.controller = function(opts){
		if (!(this instanceof selector.controller)) {
			return new selector.controller(opts);
		}

		this.opts = opts;
		this.title = m.prop(opts.title || 'Selector');
		this.addTitle = m.prop(opts.addTitle || 'Add');
		this.searchPlaceholder = m.prop(opts.searchPlaceholder || 'Search ...');
		this.options = m.prop(opts.options.map(selector.Option));
		this.selected = this.options().filter.bind(this.options(), function(o){ return o.selected(); });

		this.adding = m.prop(false);
		this.search = m.prop('');

		this.addToggle = function(ev){
			ev.preventDefault();
			this.search('');
			this.adding(!this.adding());
		}.bind(this);

		this.remove = function(value){
			for (var i = this.selected().length - 1; i >= 0; i--) {
				var o = this.selected()[i];
				if (('' + o.value()) === value) {
					o.selected(false);
					if (opts.onchange) { opts.onchange(this.selected()); }
					break;
				}
			}
		}.bind(this);

		this.checkbox = function(ev){
			for (var i = this.options().length - 1; i >= 0; i--) {
				var o = this.options()[i];
				if (('' + o.value()) === ev.target.value) {
					o.selected(ev.target.checked);
					if (opts.onchange) { opts.onchange(this.selected()); }
					break;
				}
			}
		}.bind(this);
	};
	selector.view = function(ctrl){
		return m('.comp-selector' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), [
			m('.comp-selector-title', [ctrl.title(), m('a.ion-plus', {href: '#', onclick: ctrl.addToggle})]),
			m('.comp-selector-selected', ctrl.selected().length ? ctrl.selected().map(function(o){
				return m('.comp-selector-option.selected', [
					m('span.ion-close', {'data-value': o.value(), onclick: m.withAttr('data-value', ctrl.remove)}), 
					o.title()
				]);
			}) : m('span.help', 'Select one or more apps to proceed')),
			// m('a.comp-selector-add-btn', {href: '#', onclick: ctrl.addToggle}, ctrl.addTitle()),
			m('.comp-selector-add', {class: ctrl.adding() ? 'active' : ''}, [
				m('.comp-selector-title', [ctrl.addTitle(), m('a.ion-plus', {href: '#', onclick: ctrl.addToggle})] ),
				m('.comp-selector-add-search', [
					m('span.ion-search'),
					m('input', {onkeyup: m.withAttr('value', ctrl.search), value: ctrl.search()}),
				]),
				m('.comp-selector-search-values', ctrl.options().filter(function(o){ 
					return ('' + o.value()).toLowerCase().indexOf(ctrl.search().toLowerCase()) !== -1 || ('' + (o.title() || '')).toLowerCase().indexOf(ctrl.search().toLowerCase()) !== -1; 
				}).map(function(o){
					return m('.comp-selector-option', {'data-value': o.value()}, [
						m('input[type="checkbox"]', o.selected() ? {checked: 'checked', value: o.value(), onchange: ctrl.checkbox} : {value: o.value(), onchange: ctrl.checkbox}),
						o.title()
					]);
				}))
			]),
		]);
	};
});
