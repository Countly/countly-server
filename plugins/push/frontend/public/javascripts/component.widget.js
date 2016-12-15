'use strict';

/* jshint undef: true, unused: true */
/* globals m */

window.component('widget', function(widget) {
	var t = window.components.t;
	
	widget.view = function(ctrl, opts){
		Object.keys(opts).forEach(function(k) {
			opts[k].config = opts[k].config || {};
			if (opts[k].help) {
				opts[k].config = window.components.tooltip.config(opts[k].help, opts[k].config);
			}
		});
		if (opts.footer && opts.footer.bignumbers) {
			opts.footer.config.class = (opts.footer.config.class || '') + ' big-numbers-v2';
		}
		return m('.widget', [
			opts.header ? 
				m('.widget-header', opts.header.config, [
					opts.header.title ? 
						m('.left', m('.title', t(opts.header.title)))
						: '',
					opts.header.control ? 
						m.component(opts.header.control.component, opts.header.control.opts)
						: '',
					opts.header.view ? 
						opts.header.view
						: ''
				])
				: '',
			opts.content ? 
				m('.widget-content', opts.content.config, opts.content.view)
				: '',
			opts.footer ? 
				m('.widget-footer', opts.footer.config, [
					opts.footer.view ? 
						opts.footer.view
						: '',
						opts.footer.bignumbers ? 
							m('.big-numbers-container', opts.footer.bignumbers.map(function(n){
								n.config = n.config || {};
								if (n.help) {
									// n.config.class = (n.class || '') + ' help-zone-vs';
									// n.config['data-help-localize'] = n.help;
									n.config = window.components.tooltip.config(t(n.help), {class: 'help'});
								}
								return m('.big-numbers.two-columns', n.config, m('.inner', [
									typeof n.color !== 'undefined' ?
										m('.color')
										: '',
									n.title ? 
										m('.select', t(n.title))
										: '',
									typeof n.number !== 'undefined' ? 
										m('.number', n.number)
										: '',
									n.trend ? 
										m('.trend', {style: {'background-image': "url('./images/dashboard/{{" + n.trend + "}}trend.png')"}})
										: ''
								]));
							}))
							: '',
				])
				: ''
		]);
	};
});
