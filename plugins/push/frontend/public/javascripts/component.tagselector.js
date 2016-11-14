'use strict';

/* jshint undef: true, unused: true */
/* globals m */

if (!window.components) {
	window.components = {};
}

if (!window.components.tagselector) {
	var tagselector = window.components.tagselector = {
		controller: function(opts){
			if (!(this instanceof tagselector.controller)) {
				return new tagselector.controller(opts);
			}

			this.opts = opts;
			this.placeholder = m.prop(opts.placeholder || 'Nothing to select from ...');
			this.searchPlaceholder = m.prop(opts.searchPlaceholder || 'Type to search ...');
			this.options = m.prop(opts.options.map(window.components.selector.Option));
			this.selected = this.options().filter.bind(this.options(), function(o){ return o.selected(); });
			this.searched = this.options().filter.bind(this.options(), function(o){ 
				return !o.selected() && (('' + o.value()).toLowerCase().indexOf(this.search().toLowerCase()) !== -1 || ('' + (o.title() || '')).toLowerCase().indexOf(this.search().toLowerCase()) !== -1); 
			}.bind(this));

			this.search = m.prop('');

			this.toggle = function(value){
				this.options().forEach(function(o){
					if (('' + o.value()) === value) {
						if (!o.selected()) { this.search(''); }
						o.selected(!o.selected());
						if (opts.onchange) { opts.onchange(this.selected()); }
					}
				}.bind(this));
			}.bind(this);

			this.onsearch = function(ev) {
				// debugger
				if (typeof ev === 'string') {
					this.search(ev);
				} else {
					if (ev.keyCode === 13 && this.searched().length === 1) {
						this.toggle(this.searched()[0].value());
						this.search('');
						return false;
					} else if (ev.keyCode === 27) {
						this.search('');
						return false;
					} else {
						return true;
					}
				}
			}.bind(this);
		},

		view: function(ctrl){
			return m('.comp-tagselector' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), [
				m('.comp-tagselector-selected', ctrl.selected().map(function(o){
					return m('.comp-tagselector-option.selected', [
						o.title(),
						m('span.ion-close', {'data-value': o.value(), onclick: m.withAttr('data-value', ctrl.toggle)})
					]);
				}).concat([m('input.comp-tagselector-search', {placeholder: ctrl.searchPlaceholder(), key: 'comp-tagselector-search', oninput: m.withAttr('value', ctrl.onsearch), onkeydown: ctrl.onsearch, value: ctrl.search()})])),

				m('.comp-tagselector-options', 
					m('div', m('div', ctrl.searched().map(function(o){
						return m('.comp-tagselector-option', {'data-value': o.value(), onclick: m.withAttr('data-value', ctrl.toggle)}, o.title());
					})))
				)
			]);
		},
	};
}