'use strict';

/* jshint undef: true, unused: true */
/* globals m */

if (!window.components) {
	window.components = {};
}

if (!window.components.slider) {

	var defaultWidth = function() {
		return Math.min(document.body.clientWidth - document.getElementById('sidebar').clientWidth, 768);
	}, CLS = 'comp-slider comp-tt-bounding';

	var slider = window.components.slider = {
		Slider: function(data) {
			this.key = data.key || '';
			this.class = data.class || '';
			this.width = data.width;
			this.onclose = data.onclose;
			this.title = m.prop(data.title || '');
			this.desc = m.prop(data.desc || '');
			this.loadingTitle = m.prop(data.loadingTitle || '');
			this.loadingDesc = m.prop(data.loadingDesc || '');
			this.component = data.component;
			this.componentOpts = data.componentOpts;
		},

		controller: function() {
			this.config = function(el, isInitialized) {
				if (!isInitialized) {
					this.el = document.body.querySelector('.comp-slider');
					this.overflow = document.body.style.overflow || 'auto';
					this.el.onmouseover = function() {
						document.body.style.overflow = 'hidden';
					};
					this.el.onmouseout = function() {
						document.body.style.overflow = this.overflow;
					}.bind(this);
					// this.el.onmousewheel = function(ev) {
					// 	if (ev.target === el) {
					// 		ev.stopPropagation();
					// 		if (ev.deltaY < 0 && ev.target.scrollTop <= 0) { ev.preventDefault(); }
					// 		else if (ev.deltaY > 0 && ev.target.scrollTop + ev.target.offsetHeight >= ev.target.scrollHeight) { ev.preventDefault(); }
					// 	}
					// };
				}
			}.bind(this);

			this.show = function(model) {
				this.model = model;
				this.setWidth(this.model.width || defaultWidth());
				this.el.className = CLS + this.model.class;
				return this;
			};

			this.close = function(ev){
				if (ev) { ev.preventDefault(); }
				if (this.model) {
					if (this.model.onclose) { this.model.onclose(this.model); }
				}
				this.el.className = CLS + ' comp-slider-closed';
				this.model = null;
				document.body.style.overflow = this.overflow;
				return this;
			}.bind(this);

			this.setWidth = function(width) {
				this.el.style.width = width + 'px';

				var btns = this.el.querySelector('.btns');
				if (btns) { btns.style.width = width + 'px'; }
			};
			
			var prev = document.body.onresize;
			this.onresize = function() {
				if (prev) { prev(); }
				if (this.model) this.setWidth(this.model.width || defaultWidth());
			}.bind(this);
			document.body.onresize = this.onresize;

			this.loading = function(loading) {
				this.el.className = [CLS, (loading ? ' loading' : ''), this.model.class].join(' ');
			};

			slider.instance = this;
		},

		view: function(ctrl) {
			return m('div.comp-slider-inner', {config: ctrl.config, key: ctrl.model ? ctrl.model.key : 'neow'}, 
				ctrl.model ? 
					[
						m('.loadable', [
							m('div.comp-slider-title', [
								typeof ctrl.model.title() === 'function' ? ctrl.model.title()() : ctrl.model.title() ? m('h3', ctrl.model.title()) : '',
								typeof ctrl.model.desc() === 'function' ? ctrl.model.desc()() : ctrl.model.desc() ? m('h5', ctrl.model.desc()) : '',
								m('a.comp-slider-close.ion-close', {href: '#', onclick: ctrl.close})
							]),
							m('div.comp-slider-content', m.component(ctrl.model.component, ctrl.model.componentOpts)),
						]),
						ctrl.model.loadingTitle() ? 
							m('.loader', [
								m('.loading-bars'),
								m('div', [
									m('h3', typeof ctrl.model.loadingTitle() === 'function' ? ctrl.model.loadingTitle()() : ctrl.model.loadingTitle()),
									m('h6', typeof ctrl.model.loadingDesc() === 'function' ? ctrl.model.loadingDesc()() : ctrl.model.loadingDesc())
								])
							]) : ''
					]
					: ''
			);
		},

		show: function(opts){
			if (slider.instance.model) {
				slider.instance.close();
				setTimeout(function(){
					m.startComputation();
					slider.instance.show(new slider.Slider(opts));
					m.endComputation();
				}, 300);
			} else {
				slider.instance.show(new slider.Slider(opts));
			}
		},
	};

	var el = document.createElement('div');
	el.className = CLS + ' comp-slider-closed';
	document.body.appendChild(el);
	m.mount(el, window.components.slider);

}