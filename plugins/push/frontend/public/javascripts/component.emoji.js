'use strict';

/* jshint undef: true, unused: true */
/* globals m, window, document */

window.component('emoji', function(emoji) {
    var C = window.components,
        t = C.t,
        OPEN, OPEN_CUST,
        isInvalid = function(ctrl, dom){
            if (OPEN) {
                var f = falValue(),
                    k = keyValue();

                if (k === undefined || k === null || k === '') {
                    if (ctrl.persPanel.className.indexOf('acked-key') !== -1) {
                        dom.parentNode.removeChild(dom);
                    } else {
                        ctrl.persPanel.className = ctrl.persPanel.className + ' acked-key';
                        return true;
                    }
                } else if (f === undefined || f === null || f === '') {
                    if (ctrl.persPanel.className.indexOf('acked-fal') !== -1) {
                        dom.parentNode.removeChild(dom);
                    } else {
                        ctrl.persPanel.className = ctrl.persPanel.className + ' acked-fal';
                        return true;
                    }
                }

                return false;
            }
        },
        appendCustom = function(ctrl, dom, append){
            var range, open = !dom; 

            if (!dom) {
                dom = document.createElement('span');
                if (!append) {
                    range = window.getSelection().getRangeAt(0);
                }
            }

            dom.setAttribute('contenteditable', 'false');
            dom.addEventListener('click', function(ev){ 
                m.startComputation();
                ev.stopPropagation();
				
                if (OPEN) {
                    if (isInvalid(ctrl, dom)) {
                        m.endComputation();
                        return;
                    }

                    OPEN.persOpen(false);
                    OPEN.onToggle(false);
                    if (OPEN_CUST === dom) {
                        OPEN.persPanel.className = 'pers-panel';
                        OPEN = undefined;
                        OPEN_CUST = undefined;
                        m.endComputation();
                        return;
                    }
                }

                if (ctrl.picker() && ctrl.picker().picker_open) {
                    ctrl.picker().picker_open = false;
                }

                OPEN = ctrl;
                OPEN_CUST = dom;
                ctrl.persOpen(true);
                ctrl.onToggle(true);
                ctrl.persPanel.className = 'pers-panel open centered';
                ctrl.persPanel.style.right = (dom.parentNode.clientWidth - dom.offsetWidth / 2 - dom.offsetLeft - 340 / 2 - 18) + 'px';
                ctrl.persPanel.style.top = (dom.offsetHeight + dom.offsetTop + 7) + 'px';
                m.endComputation();
            });

            if (range) {
                range.deleteContents();
                range.insertNode(dom);
            } else if (append && !dom.parentNode) {
                ctrl.element.appendChild(dom);
            }

            if (dom.parentNode.className === 'pers') {
                var p = dom.parentNode;
                p.removeChild(dom);
                p.parentNode.appendChild(dom);
            }

            OPEN = ctrl;
            OPEN_CUST = dom;
            resetCustom();
            ctrl.persOpen(open);
            ctrl.onToggle(open);
            if (ctrl.persPanel) {
                ctrl.persPanel.className = 'pers-panel ' + (open ? 'open' : '') + ' centered';
                ctrl.persPanel.style.right = (dom.parentNode.clientWidth - dom.offsetWidth / 2 - dom.offsetLeft - 340 / 2 - 18) + 'px';
                ctrl.persPanel.style.top = (dom.offsetHeight + dom.offsetTop + 7) + 'px';
            }
        },

        resetCustom = function(){
            if (OPEN_CUST) {
                if (OPEN.closeElement) {
                    OPEN.closeElement.style.display = 'none';
                }
	
                var f = falValue(),
                    c = capValue(),
                    k = keyValue();

                if (k) {
                    var title = OPEN.persOpts.filter(function(o){return o.value() === k;})[0].title().toLowerCase();
                    if (c) {
                        title = title.substr(0, 1).toUpperCase() + title.substr(1);
                    }
                    OPEN_CUST.innerHTML = title + ' | ' + (f || '');
                    OPEN_CUST.className = 'pers';
                    if (f && OPEN.picker().editor) {
                        var html = OPEN.element.innerHTML;
                        if (html === '<br>') {
                            html = '';
                        }
                        OPEN.valueHTML(html);
                        OPEN.value(OPEN.picker().getText());
                        OPEN.valuePers(OPEN.getPersonalization());
                        OPEN.valuePersDef(OPEN.getPersonalizationDef());
                        OPEN.closeElement.style.display = 'inline-block';
                        return;
                    }
                } else {
                    OPEN_CUST.innerHTML = 'Select property | ' + (f || '');
                    OPEN_CUST.className = 'pers placeholder';
                }

                if (OPEN.picker().editor) {
                    var html = OPEN.element.innerHTML;
                    if (html === '<br>') {
                        html = '';
                    }
                    OPEN.valueHTML(html);
                    OPEN.value(OPEN.picker().getText());
                    OPEN.valuePers(OPEN.getPersonalization(OPEN_CUST));
                    OPEN.valuePersDef(OPEN.getPersonalizationDef(OPEN_CUST));
                }
            }
        },

        attrValue = function(name, bool) {
            return function(){
                if (OPEN_CUST) {
                    var v;
                    if (arguments.length) {
                        v = arguments[0];
                        OPEN_CUST.setAttribute(name, v);
                        resetCustom();
                    }
                    v = OPEN_CUST.getAttribute(name);
                    return bool ? v === 'true' : v;
                }
            };
        },

        keyValue = attrValue('data-key'),
        falValue = attrValue('data-fallback'),
        capValue = attrValue('data-capital', true);

    emoji.controller = function(opts){
        if (!(this instanceof emoji.controller)) {
            return new emoji.controller(opts);
        }

        this.opts = opts;
        // this.value = function() {
        // 	if (arguments.length) {
        // 		opts.value(arguments[0]);
        // 	}
        // 	if (!this.persOpts || !this.element) {
        // 		return opts.value();
        // 	}
        // 	var text = '', customs = {};
        // 	for (var i = 0; i < this.element.children.length; i++) {
        // 		var c = this.element.children[i];
        // 		if (c.nodeType === Node.TEXT_NODE) {
        // 			text += c.textContent;
        // 		} else if (c.cust) {
        // 			customs[text.length] = {
        // 				f: c.cust.fallback,
        // 				c: c.cust.capital,
        // 				k: c.cust.key
        // 			};
        // 		}
        // 	}
        // 	return [text, customs];
        // };
        this.value = typeof opts.value === 'function' ? opts.value : m.prop(opts.value);
        this.valueHTML = typeof opts.valueHTML === 'function' ? opts.valueHTML : m.prop(opts.valueHTML);
        this.valuePers = typeof opts.valuePers === 'function' ? opts.valuePers : m.prop(opts.valuePers);
        this.valuePersDef = typeof opts.valuePersDef === 'function' ? opts.valuePersDef : m.prop(opts.valuePersDef);
        this.valueCompiled = opts.valueCompiled;

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

		this.persOpen = m.prop(false);
        this.onToggle = opts.onToggle || function(){};
		this.persOpts = opts.persOpts;
		this.isPersonalizationAvailable = function () {
			return !!opts.persOpts;
		};

        this.close = function(drop){
            var closed = false;

            if (this._picker && this._picker.picker_open) {
                this._picker.picker_open = false;
                closed = true;
            }

            if (OPEN) {
                if (isInvalid(OPEN, OPEN_CUST)) {
                    this.deleteBtnClick();
                } else {
                    OPEN.persPanel.className = 'pers-panel centered asd';
                    OPEN.persOpen(undefined);
                    OPEN.onToggle(false);
                    OPEN = OPEN_CUST = undefined;
                }
                closed = true;
            }

            return closed;
        };


		if (this.isPersonalizationAvailable()) {
			this.getPersonalization = function(exclude) {
				var ret = {}, index = 0;
				(this.element && this.element.childNodes || []).forEach(function(el){
					if (el.nodeType === 1 && el.tagName.toLowerCase() === 'span' && el.className && el.className.indexOf('pers') !== -1 && (!exclude || exclude !== el)) {
						ret[index] = {
							f: el.getAttribute('data-fallback'),
							c: el.getAttribute('data-capital') === 'true',
							k: el.getAttribute('data-key'),
						};
					} else if (el.nodeType === 3) {
						index += el.textContent.length;
					}
				});
				return ret;
			};
			
			this.getPersonalizationDef = function(exclude) {
				var ret = '';
				(this.element && this.element.childNodes || []).forEach(function(el){
					if (el.nodeType === 1 && el.tagName.toLowerCase() === 'span' && el.className && el.className.indexOf('pers') !== -1 && (!exclude || exclude !== el)) {
						var c = el.getAttribute('data-capital') === 'true',
							f = el.getAttribute('data-fallback');
						if (c && f) {
							ret += f.substr(0, 1).toUpperCase() + f.substr(1);
						} else {
							ret += (f || '');
						}
					} else if (el.nodeType === 3) {
						ret += el.textContent;
					}
				});
				return ret;
			};

			this.persCtrl = new C.singleselect.controller({
				options: this.persOpts,
				value: keyValue,
				placeholder: t('pu.po.tab2.varpl'),
			});
			
			this.inputClick = function(){
				if (OPEN) {
					if (!OPEN_CUST.parentNode) {
						OPEN = OPEN_CUST = undefined;
						return;
					}
					if (isInvalid(OPEN, OPEN_CUST)) {
						return;
					}

					OPEN.persOpen(undefined);
                    OPEN.onToggle(false);
					OPEN = OPEN_CUST = undefined;
				}
			};

            this.closeBtnClick = function(ev){
                ev.preventDefault();
                this.close();
            }.bind(this);

			this.deleteBtnClick = function(ev){
				if (ev) { ev.preventDefault(); }
				if (OPEN) {
					var o = OPEN;
					OPEN_CUST.parentNode.removeChild(OPEN_CUST);
					OPEN.persOpen(undefined);
                    OPEN.onToggle(false);
					OPEN = OPEN_CUST = undefined;

					o.valueHTML(o.element.innerHTML);
					o.value(o.picker().getText());
					o.valuePers(o.getPersonalization());
					o.valuePersDef(o.getPersonalizationDef());
				}
			};

			this.persBtnClick = function(opt, ev){
				ev.preventDefault();
				if (OPEN) {
					if (!OPEN_CUST.parentNode) {
						OPEN = OPEN_CUST = undefined;
						return;
					}
					if (isInvalid(OPEN, OPEN_CUST)) {
						return;
					}

					OPEN.persOpen(undefined);
                    OPEN.onToggle(false);
					if (OPEN === this) {
						OPEN = undefined;
						OPEN_CUST = undefined;
						return;
					}
				}

				if (this.picker() && this.picker().picker_open) {
					this.picker().picker_open = false;
				}

				var target = window.getSelection().anchorNode;
				while (target.parentNode) {
					if (target === this.element) {
						return appendCustom(this);
					} else {
						target = target.parentNode;
					}
				}

				if (!OPEN) {
					appendCustom(this, null, true);
				}
			}.bind(this);
		}
    };
    emoji.view = function(ctrl){
        return m('.emoji' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), {key: ctrl.opts.key ? 'emoji-' + ctrl.opts.key : undefined}, [
            m('div[contenteditable=true]' + (ctrl.opts.textarea ? '.textarea' : '.input'), {
                key: ctrl.opts.key ? 'emoji-ce-' + ctrl.opts.key : undefined,
                config: function(element, isInitialized) {
                    if (!isInitialized) {
                        ctrl.element = element;
                        if (ctrl.valueCompiled()) {
                            element.innerHTML = ctrl.valueHTML() || ctrl.valueCompiled();
                            element.querySelectorAll('.pers').forEach(function(el){
                                appendCustom(ctrl, el);
                            });
                        }
                        ctrl.picker().listenOn(element.parentElement.querySelector('a.fa-smile-o'), element.parentElement, element);
                        element.parentElement.querySelector('a.fa-smile-o').addEventListener('click', function(){
                            setTimeout(function(){ ctrl.onToggle(!!document.querySelector('#emoji-picker')); }, 10);
                        });
                    } else if (ctrl.forcefocus()) {
                        if (!ctrl.picker().editor) {
                            ctrl.picker().listenOn(element.parentElement.querySelector('a.fa-smile-o'), element.parentElement, element);
                            element.parentElement.querySelector('a.fa-smile-o').addEventListener('click', function(){
                                setTimeout(function(){ ctrl.onToggle(!!document.querySelector('#emoji-picker')); }, 10);
                            });
                        }
                        if (ctrl.value() !== ctrl.picker().getText()) {
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
                    }
                }, 
                oninput: function(){
                    var html = this.innerHTML;
                    if (html === '<br>') {
                        html = '';
                    }
                    ctrl.valueHTML(html);
                    ctrl.value(ctrl.picker().getText());
					if (ctrl.isPersonalizationAvailable()) {
						ctrl.valuePers(ctrl.getPersonalization());
						ctrl.valuePersDef(ctrl.getPersonalizationDef());
					}
                },
                onkeydown: function(ev){
                    if (ev.key === 'Enter') {
                        ev.preventDefault();
                    }
                },
                onkeyup: function(){
                    if (ctrl.value() !== ctrl.picker().getText()) {
                        var html = this.innerHTML;
                        if (html === '<br>') {
                            html = '';
                        }
                        ctrl.valueHTML(html);
                        ctrl.value(ctrl.picker().getText());
                    }
					if (ctrl.isPersonalizationAvailable()) {
						ctrl.valuePers(ctrl.getPersonalization());
						ctrl.valuePersDef(ctrl.getPersonalizationDef());
					}
                },
                onfocus: function(){
                    ctrl.forcefocus(true);
                },
                onblur: function(){
                    ctrl.forcefocus(false);
                },
                onclick: ctrl.inputClick
                // onfocus: ctrl.focus.bind(ctrl, true),
                // onblur: ctrl.focus.bind(ctrl, false),
			}, !ctrl.value() && (!ctrl.isPersonalizationAvailable() || !Object.keys(ctrl.getPersonalization()).length) && !ctrl.forcefocus() ? 
                m('div.placeholder', {
                    key: 'pl' + Math.random(),
                    config: function(el) {
                        el.innerHTML = typeof ctrl.opts.placeholder === 'function' ? ctrl.opts.placeholder() : ctrl.opts.placeholder || '';
                    }
                }) 
                : undefined),
			ctrl.isPersonalizationAvailable() ? m('a.pers', {title: t('pu.po.tt.pers'), config: C.tooltip.configF, onmousedown: ctrl.persBtnClick.bind(ctrl, null)}, '{{') : '',
			ctrl.isPersonalizationAvailable() ? m('.pers-panel.centered', {class: (ctrl.persOpen() ? 'open' : ''), config: function(el){ ctrl.persPanel = el; }}, [
                m('label', t('pu.po.tab2.variable')),
                C.singleselect.view(ctrl.persCtrl),
                m('input[type=checkbox][name=pers-capital]', {checked: capValue(), onchange: function(){
                    capValue(!capValue());
                }}), m('label.check[for=pers-capital]', t('pu.po.tab2.capital')),
                m('label', t('pu.po.tab2.fallback')),
                m('input[type=text]', {value: falValue(), oninput: m.withAttr('value', falValue), placeholder: t('pu.po.tab2.fallpl')}),
                m('.help', t('pu.po.tab2.help')),
                m('.btns', [
                    m('a.delete[href=#]', {onclick: ctrl.deleteBtnClick}, t('pu.po.delete')),
                    m('a.close.icon-button.light[href=#]', {config: function(el){ ctrl.closeElement = el; }, onclick: ctrl.closeBtnClick}, t('pu.po.close')),
                ])
            ]) : '',
            m('a.fa.fa-smile-o', C.tooltip.config(t('pu.po.tt.emoji')))
        ]);
    };
});
