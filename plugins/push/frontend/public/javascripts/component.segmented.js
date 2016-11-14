'use strict';

/* jshint undef: true, unused: true */
/* globals m */

if (!window.components) {
	window.components = {};
}

if (!window.components.segmented) {
	var count = 0;

	var segmented = window.components.segmented = {

		controller: function(opts){
			if (!(this instanceof segmented.controller)) {
				return new segmented.controller(opts);
			}

			this.opts = opts;
			this.value = typeof opts.value === 'function' ? opts.value : m.prop(opts.value);
			this.options = m.prop(opts.options.map(window.components.selector.Option));
			this.id = 'comp-segmented-' + count++;
		},
		
		view: function(ctrl){
			return m('.comp-segmented' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), ctrl.options().map(function(o){
				var opts = {name: ctrl.id, 
					'data-value': o.value(), 
					onclick: m.withAttr('data-value', ctrl.value)
				};
				if (('' + ctrl.value()) === ('' + o.value())) {
					opts.class = 'active';
				}

				return m('.comp-segmented-option', opts, o.view ? o.view() : o.title());
			}));
		}
	};
}

