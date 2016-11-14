'use strict';

/* jshint undef: true, unused: true */
/* globals m */

if (!window.components) {
	window.components = {};
}

if (!window.components.slider) {

	var defaultWidth = function() {
		return Math.min(document.body.clientWidth - document.getElementById('sidebar').clientWidth, 768);
	};

	var slider = window.components.slider = {
		Slider: function(data) {
			this.title = m.prop(data.title || '');
			this.desc = m.prop(data.desc || '');
			this.loadingTitle = m.prop(data.loadingTitle || '');
			this.loadingDesc = m.prop(data.loadingDesc || '');
		},

		show: function(opts){
			var el = document.createElement('div');
			el.className = 'comp-slider comp-slider-closed' + (opts.class ? '.' + opts.class : '');
			document.body.appendChild(el);

			var contr = m.mount(el, {
				controller: function() {
					var prev = document.body.onresize;
					
					this.model = new slider.Slider(opts);

					this.close = function(ev){
						ev.preventDefault();
						el.className = 'comp-slider comp-slider-closed';
						setTimeout(function(){
							document.body.removeChild(document.getElementsByClassName('comp-slider')[0]);
							document.body.onresize = prev;
						}, 600);
						if (opts.onclose) { opts.onclose(this.model); }
					}.bind(this);

					this.setWidth = function(width) {
						el.style.width = width + 'px';
					};
				
					this.onresize = function() {
						if (prev) { prev(); }
						this.setWidth(opts.width || defaultWidth());
					}.bind(this);

					document.body.onresize = this.onresize;

					this.setWidth(opts.width || defaultWidth());

					this.loading = function(loading) {
						document.getElementsByClassName('comp-slider')[0].className = 'comp-slider' + (loading ? ' loading' : '');
					};
				},
				
				view: function(ctrl){
					return m('div.comp-slider-inner', [
						m('.loadable', [
							m('div.comp-slider-title', [
								typeof ctrl.model.title() === 'function' ? ctrl.model.title()() : ctrl.model.title() ? m('h3', ctrl.model.title()) : '',
								typeof ctrl.model.desc() === 'function' ? ctrl.model.desc()() : ctrl.model.desc() ? m('h5', ctrl.model.desc()) : '',
								m('a.comp-slider-close.ion-close', {href: '#', onclick: ctrl.close})
							]),
							m('div.comp-slider-content', m.component(opts.component, opts.componentOpts)),
						]),
						opts.loadingTitle ? 
						m('.loader', [
							m('img[src="/images/loading.png"]'),
							m('div', [
								m('h3', typeof ctrl.model.loadingTitle() === 'function' ? ctrl.model.loadingTitle()() : ctrl.model.loadingTitle()),
								m('h6', typeof ctrl.model.loadingDesc() === 'function' ? ctrl.model.loadingDesc()() : ctrl.model.loadingDesc())
							])
						]) : ''
					]);
				}
			});

			el.className = 'comp-slider';
			return contr;
		},
	};

}