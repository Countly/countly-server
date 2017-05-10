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
		this.valueHTML = typeof opts.valueHTML === 'function' ? opts.valueHTML : m.prop(opts.valueHTML);
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
		this.forcefocus = m.prop(false);
	};
	emoji.view = function(ctrl){
		return m('.emoji' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), {key: ctrl.opts.key ? 'emoji-' + ctrl.opts.key : undefined}, [
			m('div[contenteditable=true]' + (ctrl.opts.textarea ? '.textarea' : '.input'), {
				key: ctrl.opts.key ? 'emoji-ce-' + ctrl.opts.key : undefined,
				config: function(element, isInitialized){
					if (!isInitialized) {
						if (ctrl.value()) {
							element.innerHTML = ctrl.valueHTML();
						}
						ctrl.picker().listenOn(element.parentElement.querySelector('a'), element.parentElement, element);
					} else if (ctrl.forcefocus()) {
						element.focus();
						if (typeof window.getSelection != 'undefined' && typeof document.createRange != 'undefined') {
							var range = document.createRange();
							range.selectNodeContents(element);
							range.collapse(false);
							var sel = window.getSelection();
							sel.removeAllRanges();
							sel.addRange(range);
						} else if (typeof document.body.createTextRange != 'undefined') {
							var textRange = document.body.createTextRange();
							textRange.moveToElementText(element);
							textRange.collapse(false);
							textRange.select();
						}					
					}
				}, 
				oninput: function(){
					ctrl.valueHTML(this.innerHTML);
					ctrl.value(ctrl.picker().getText());
				},
				onkeyup: function(){
					ctrl.valueHTML(this.innerHTML);
					ctrl.value(ctrl.picker().getText());
				},
				onfocus: function(){
					ctrl.forcefocus(true);
				},
				onblur: function(){
					ctrl.forcefocus(false);
				},
				// onfocus: ctrl.focus.bind(ctrl, true),
				// onblur: ctrl.focus.bind(ctrl, false),
			}, !ctrl.value() && !ctrl.forcefocus() ? 
				m('div.placeholder', {
					config: function(el) {
						el.innerHTML = typeof ctrl.opts.placeholder === 'function' ? ctrl.opts.placeholder() : ctrl.opts.placeholder || '';
					}
				}) 
				: undefined),
			m('a.fa.fa-smile-o')
		]);
	};
});
