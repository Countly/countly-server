'use strict';

/* jshint undef: true, unused: true */
/* globals m */

window.component('segmented', function(segmented) {
	var t = window.components.t, count = 0;
	
	segmented.controller = function(opts){
		if (!(this instanceof segmented.controller)) {
			return new segmented.controller(opts);
		}

		this.opts = opts;
		this.value = typeof opts.value === 'function' ? opts.value : m.prop(opts.value);
		this.options = m.prop(opts.options.map(window.components.selector.Option));
		this.id = 'comp-segmented-' + count++;
	};
	segmented.view = function(ctrl){
		return m(ctrl.opts.legacy ? '.button-selector.btn-header' : '.comp-segmented' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), ctrl.options().map(function(o){
			var opts = {name: ctrl.id, 
				'data-value': o.value(), 
				onclick: function() {
					ctrl.value(this.attributes['data-value'].value);
					if (ctrl.opts.onchange) { ctrl.opts.onchange(ctrl.value()); }
					// m.withAttr('data-value', ctrl.value)
				}
			};
			if (('' + ctrl.value()) === ('' + o.value())) {
				opts.class = 'active';
			}

			return m(ctrl.opts.legacy ? '.button' : '.comp-segmented-option', opts, o.view ? o.view() : o.title());
		}));
	};
});
