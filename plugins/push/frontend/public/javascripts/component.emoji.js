'use strict';

/* jshint undef: true, unused: true */
/* globals m */

window.component('emoji', function(emoji) {
	emoji.controller = function(opts){
		if (!(this instanceof emoji.controller)) {
			return new emoji.controller(opts);
		}

		this.opts = opts;
		this.value = typeof opts.value === 'function' ? opts.value : m.prop(opts.value);
		this.picker = function(){
			if (!this._picker) {
				this._picker = new window.EmojiPicker({
					sheets: {
						apple   : '/images/push/sheet_apple_64_indexed_128.png',
						google  : '/images/push/sheet_google_64_indexed_128.png',
						twitter : '/images/push/sheet_twitter_64_indexed_128.png',
						emojione: '/images/push/sheet_emojione_64_indexed_128.png'
					},
					show_icon_tooltips: false,
					default_footer_message: null,
					prevent_new_line: !opts.textarea
				});
			}
			return this._picker;
		};
	};
	emoji.view = function(ctrl){
		return m('.emoji' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), {key: ctrl.opts.key ? 'emoji-' + ctrl.opts.key : undefined}, [
			m('div[contenteditable=true]' + (ctrl.opts.textarea ? '.textarea' : '.input'), {
				key: ctrl.opts.key ? 'emoji-ce-' + ctrl.opts.key : undefined,
				config: function(element, isInitialized){
					if (!isInitialized) {
						element.textContent = ctrl.value();
						ctrl.picker().listenOn(element.parentElement.querySelector('a'), element.parentElement, element);
					}
				}, 
				oninput: function(){
					ctrl.value(ctrl.picker().getText());
				},
				placeholder: typeof ctrl.opts.placeholder === 'function' ? ctrl.opts.placeholder() : ctrl.opts.placeholder || ''
			}),
			m('a.fa.fa-smile-o')
		]);
	};
});
