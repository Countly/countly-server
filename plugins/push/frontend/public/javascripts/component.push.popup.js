'use strict';

/* jshint undef: true, unused: true */
/* globals m, moment */

window.component('push.popup', function(popup) {
	var t = window.components.t,
		push = window.components.push;

	popup.show = function(prefilled){
		if (!push.dashboard) {
			return push.remoteDashboard(countlyCommon.ACTIVE_APP_ID).then(function(){
				popup.show(prefilled);
			});
		}
		m.startComputation();
		var message = new push.Message(prefilled || {});

		if (message.platforms().length && message.apps().length) {
			var found = false;
			message.platforms().forEach(function(p){
				message.apps().forEach(function(a){
					if (p === 'i' && window.countlyGlobal.apps[a] && window.countlyGlobal.apps[a].apn && window.countlyGlobal.apps[a].apn.length) {
						found = true;
					} else if (p === 'a' && window.countlyGlobal.apps[a] && window.countlyGlobal.apps[a].gcm && window.countlyGlobal.apps[a].gcm.length) {
						found = true;
					}
				});
			});

			if (!found) {
				return window.CountlyHelpers.alert(t('push.error.no-credentials'), 'red');
			}
		}

		push.popup.slider = window.components.slider.show({
			key: 'meow',
			title: function(){
				var els = [
					t('pu.po.title')
				];
				if (message.count()) {
					els.push(m('span.count.ion-person', [
						t.n('pu.po.recipients', message.count()),
						message.locales().length > 1 ? 
							''
							: m('span.warn', window.components.tooltip.config(t('pu.po.recipients.temporary')), push.ICON.WARN())
					]));
				}
				return m('h3', els);
			}, 
			desc: t('pu.po.desc'),
			// onclose: function() {
			// 	console.log('slider closed');
			// },
			component: window.components.push.popup, 
			componentOpts: message,
			loadingTitle: function(){
				return message.count() ? message.saved() ? t('pu.po.sent') : t('pu.po.sending') : t('pu.po.loading');
			},
			loadingDesc: function(){
				return message.count() ? message.saved() ? t('pu.po.sent-desc') : t('pu.po.sending-desc') : t('pu.po.loading-desc');
			},
		});
		m.endComputation();
	};

	popup.controller = function(message){
		var popup = this, apps = [];

		// t.set('pu.po.tab1.title', t('pu.po.tab1.title' + !!window.countlyGeo));
	
		this.message = message;
		this.renderTab = function(i, active) {
			return m('.comp-push-tab', {class: active && !popup.warnNoUsers() ? 'active' : ''}, [
				popup.warnNoUsers() ? 
					i < 2 ? push.ICON.WARN('comp-push-tab-warn') : m('.comp-push-tab-num', i + 1)
					// i < 2 ? m('svg.comp-push-tab-warn[width=21][height=18]', m('path[fill="#FF9E43"][d="M20,18c0.6,0,0.8-0.4,0.5-0.9L11,0.9c-0.3-0.5-0.7-0.5-1,0L0.5,17.1C0.2,17.6,0.4,18,1,18H20zM10,13h2v2h-2V13z M10,8h2v4h-2V8z"]')) : m('.comp-push-tab-num', i + 1)
					: i < this.tabs.tab() ? m('.comp-push-tab-num.ion-checkmark') : m('.comp-push-tab-num', i + 1),
				m('.comp-push-tab-title', t('pu.po.tab' + i + '.title')),
				m('.comp-push-tab-desc', t('pu.po.tab' + i + '.desc'))
			]);
		};

		for (var k in window.countlyGlobal.apps) {
			var a = window.countlyGlobal.apps[k];
			if ((a.apn && a.apn.length) || (a.gcm && a.gcm.length)) {
				apps.push(window.components.selector.Option({value: a._id, title: a.name, selected: message.apps().indexOf(a._id) !== -1}));
			}
		}

		this.previewPlatform = m.prop(message.platforms() && message.platforms().length ? message.platforms()[0] : push.C.PLATFORMS.IOS);
		this.warnNoUsers = m.prop(false);
		
		this.tabenabled = function(tab) {
			if (this.tabs.tab() >= tab) {
				return true;
			}

			var enabled = true;
			switch (tab) {
				/* falls through */
				case 3:
					if (message.type() === push.C.TYPE.MESSAGE) {
						enabled = enabled && message.messagePerLocale().default;
					} else if (message.type() === push.C.TYPE.DATA) {
						enabled = enabled && message.data.valid;
					}
					if ((message.sound() !== undefined && !message.sound.valid) || 
						(message.badge() !== undefined && !message.badge.valid) || 
						(message.url() !== undefined && !message.url.valid) || 
						(message.data() !== undefined && !message.data.valid)) {
						enabled = false;
					}
				/* falls through */
				case 2:
					if (message.schedule()) {
						enabled = enabled && !!message.date();
					}
				/* falls through */
				case 1:
					enabled = enabled && message.platforms().length && message.apps().length;
					break;
			}

			return enabled;
		}.bind(this);

		this.checkForNoUsers = function(final) {
			if (!message.count()) {
				this.warnNoUsers(true);

				var swtch = function(tab, ev) {
					ev.preventDefault();
					this.tabs.customComponent = null;
					this.warnNoUsers(false);
					popup.tabs.set(tab);
				};
				this.tabs.customComponent = {
					view: function() {
						return m('.comp-push-no-users', [
							m('.comp-push-no-users-zero', '0'),
							m('.comp-push-no-users-text', [
								t('pu.po.no-users'),
								m('br'),
								t('pu.po.no-users-try-change') + ' ',
								m('a[href=#]', {onclick: swtch.bind(popup, 0)}, t('pu.po.no-users-try-change-apps') + '.'),
								m('br'),
								m('a.btn-next[href=#]', {onclick: swtch.bind(popup, 0)}, t('pu.po.no-users-start-over'))
							])
						]);
					}
				};
			} else if (this.warnNoUsers()) {
				this.tabs.customComponent = null;
				this.warnNoUsers(false);
				popup.tabs.set(2);
			}

			if (final === true && localesController) {
				localesController.relocale();
			}
		};

		this.next = function(ev, tab) {
			if (ev) { ev.preventDefault(); }

			tab = typeof tab === 'undefined' ? this.tabs.tab() + 1 : tab;
			if (this.tabenabled(tab)) {
				if (tab === 2) {
					if (!message.schedule()) {
						message.date(undefined);
						message.tz(false);
					}
				}
				if (tab === 2 && !message.count()) {
					window.components.slider.instance.loading(true);
					message.remotePrepare(this.checkForNoUsers.bind(this, true)).then(function(){
						setTimeout(function(){
							m.startComputation();
							window.components.slider.instance.loading(false);
							this.checkForNoUsers();
							if (message.count() && this.tabenabled(tab)) {
								popup.tabs.set(tab);
							}
							m.endComputation();
						}.bind(this), 400);
					}.bind(this), window.components.slider.instance.loading.bind(window.components.slider.instance, false));
				} else  {
					this.tabs.customComponent = null;
					this.warnNoUsers(false);
					popup.tabs.set(tab);
				}
			}
		}.bind(this);

		this.prev = function(ev) {
			ev.preventDefault();
			if (this.tabs.tab() > 0) {
				this.tabs.set(popup.tabs.tab() - 1);
			}
		}.bind(this);

		this.send = function(ev) {
			ev.preventDefault();
			if (!message.ack()) { return; }
			window.components.slider.instance.loading(true);
			message.remoteCreate().then(function(){
				message.saved(true);

				setTimeout(function(){
					m.startComputation();
					window.components.slider.instance.close();
					if (window.app.activeView.mounted) {
						window.app.activeView.mounted.refresh();
					}

					m.endComputation();
				}, 1000);
			}, function(error){
				window.components.slider.instance.loading(false);
				window.alert(error.error || error.result || error);
			});
			// setTimeout(function(){
			// 	m.startComputation();
			// 	message.saved(true);
			// 	m.endComputation();

			// 	setTimeout(function(){
			// 		m.startComputation();
			// 		window.components.slider.instance.loading(false);
			// 		m.endComputation();
			// 	}, 1000);
			// }, 1000);

		}.bind(this);

		var activeLocale = m.prop(), localesController;
		var locales = {
			controller: function(){
				var self = this;
				
				this.text = m.prop();
				this.ontab = function(tab){
					activeLocale(this.locales[tab].value);
					this.text(message.messagePerLocale()[this.locales[tab].value]);
				}.bind(this);
				this.ontext = function(text) {
					this.text(text);
					if (text) {
						message.messagePerLocale()[this.locales[this.tabs.tab()].value] = text;
					} else {
						delete message.messagePerLocale()[this.locales[this.tabs.tab()].value];
					}
				}.bind(this);

				this.relocale = function() {
					this.locales = message.locales().map(function(l, i){
						l = Object.assign({}, l);
						l.tab = function() {
							return m('div', {class: self.tabs.tab() === i ? 'active' : ''}, [
								// message.locales()[l] ? m('.comp-push-tab-num.ion-checkmark') : 
								m('span.comp-push-locale-count', l.percent + '%'),
								m('span.comp-push-locale-title', l.title),
								message.messagePerLocale()[l.value] ? m('span.ion-checkmark') : ''
							]);
						};
						l.view = function() {
							return m('div', [
								m('textarea', {placeholder: t('pu.po.tab2.placeholder'), 'data-locale': l.value, value: message.messagePerLocale()[l.value] || '', onkeyup: m.withAttr('value', self.ontext)}),
								!message.messagePerLocale().default ? 
									m('.error', window.components.tooltip.config(t('pu.po.tab2.default-message.invalid')), push.ICON.WARN())
									: ''
							]);
						};
						return l;
					});
					this.tabs = new window.components.tabs.controller(this.locales, {ontab: this.ontab});
				};
				this.relocale();
				this.ontab(0);
			},
			view: function(ctrl){
				return m('.comp-push-locales', [
					window.components.tabs.view(ctrl.tabs),
				]);
			},
		};

		var extra = {
			controller: function(opts) {
				this.title = opts.title;
				this.value = opts.value;
				this.typ = opts.typ || 'text';
				this.oncheck = function(ev) {
					if (ev && ev instanceof MouseEvent && ev.target.tagName.toLowerCase() === 'input') {
						return true;
					}
					this.value(this.value() !== undefined ? undefined : (typeof opts.def === 'undefined' ? '' : opts.def));
					return true;
				}.bind(this);
				this.onchange = function(val) {
					if (opts.converter) {
						var v = opts.converter(val);
						if (v) {
							this.value(v);
						}
					}
				}.bind(this);
			},

			view: function(ctrl) {
				var check = {
					onchange: ctrl.oncheck
				};
				if (ctrl.value() !== undefined) { check.checked = 'checked'; }

				var inp = {
					value: ctrl.value() || '',
					oninput: m.withAttr('value', ctrl.value),
					onchange: m.withAttr('value', ctrl.onchange)
				};
				if (ctrl.value() === undefined) { inp.disabled = 'disabled'; }

				return m('.comp-push-extra', [
					m('.comp-push-extra-check', {onclick: ctrl.oncheck}, [
						m('input[type=checkbox]', check),
						m('label', ctrl.title)
					]),
					m('.comp-push-extra-value', {class: ctrl.value() === undefined ? '' : 'active', onclick: function(){
						if (ctrl.value() === undefined) { ctrl.oncheck(); }
					}}, [
						m('input[type=' + ctrl.typ + ']', inp),
						ctrl.value() !== undefined && !ctrl.value.valid ? 
							m('.error', window.components.tooltip.config(ctrl.value.errorText), push.ICON.WARN())
							: ''
					])
				]);
			}
		};

		this.tabs = new window.components.tabs.controller([
			// Apps & Platforms
			{
				tab: this.renderTab.bind(this, 0),
				controller: function() {
					return {
						appsSelector: window.components.tagselector.controller({
							options: apps,
							onchange: function(opts) {
								message.apps(opts.map(function(o){ return o.value(); }));
								message.appNames(opts.map(function(o){ return o.title(); }));
								if (!message.apps().length) {
									message.platforms([]);
								} else {
									message.platforms(message.availablePlatforms());
								}
							}
						}),
						onplatform: function(p, ev){
							if (ev instanceof MouseEvent && ev.target.tagName.toLowerCase() === 'input') {
								return true;
							}
							var i = message.platforms().indexOf(p);
							if (i === -1) {
								message.platforms(message.platforms().concat([p]));
							} else {
								message.platforms(message.platforms().filter(function(pl){ return pl !== p; }));
							}
							popup.previewPlatform(message.platforms()[0]);
							return true;
						},
					};
				},

				view: function(ctrl) {
					var platforms = message.availablePlatforms();
					return m('div.comp-push-tab-content', [
						m('.comp-push-panels.left-bigger', [
							m('.comp-push-panel', [
								m('h4', t('pu.po.tab0.select-apps')),
								m('h6', t('pu.po.tab0.select-apps-desc')),
								window.components.tagselector.view(ctrl.appsSelector)
							]),
							m('.comp-push-panel', [
								m('.comp-push-vert-panel', [
									m('h4', t('pu.po.tab0.select-platforms')),
									!platforms.length ? m('div.help.pulsating', t('pu.po.tab0.select-platforms-no')) : m('.platforms', [platforms.map(function(p){
										var o = {value: p, onchange: ctrl.onplatform.bind(ctrl, p)};
										if (message.platforms().indexOf(p) !== -1) {
											o.checked = 'checked';
										}
										return m('.comp-push-platform', {onclick: ctrl.onplatform.bind(ctrl, p)}, [
											m('input[type="checkbox"]', o),
											m('label', t('pu.platform.' + p))
										]);
									})])
								]),
								m('.comp-push-vert-panel', [
									m('h4', t('pu.po.tab1.testing')),
									m('h6', t('pu.po.tab1.testing-desc')),
									m.component(window.components.radio, {options: [
										{value: false, title: t('pu.po.tab1.testing-prod')},
										{value: true, title: t('pu.po.tab1.testing-test'), desc: t('pu.po.tab1.testing-test-desc')}
									], value: function(){
										if (arguments.length) {
											return message.test(arguments[0]);
										}
										return message.test();
									}}),
								]),
								push.dashboard.geos && push.dashboard.geos.length ? 
									m('.comp-push-vert-panel', [
										m('h4', t('pu.po.tab1.geos')),
										m('h6', t('pu.po.tab1.geos-desc')),
										m.component(window.components.select, {
											options: [{value: '', title: t('pu.po.tab1.geos.no')}].concat(push.dashboard.geos.map(function(geo){
												return {value: geo._id, title: geo.title};
											})), 
											value: message.geo
										}),
									])
									: '',
							]),
						]),
						m('.btns', [
							m('a.btn-prev', {href: '#', onclick: function(ev){ window.components.slider.instance.close(ev); }}, t('pu.po.close')),
							m('a.btn-next', {href: '#', onclick: popup.next, disabled: popup.tabenabled(1) ? false : 'disabled'}, t('pu.po.next'))
						])
					]);
				}
			},

			// Time & Location
			{
				tab: this.renderTab.bind(this, 1), 
				view: function() { 
					return m('.comp-push-tab-content', [
						m('h4', t('pu.po.tab1.scheduling')),
						m('h6', t('pu.po.tab1.scheduling-desc')),
						m.component(window.components.radio, {options: [
							{value: false, title: t('pu.po.tab1.scheduling-now'), desc: t('pu.po.tab1.scheduling-now-desc')},
							{value: true, title: t('pu.po.tab1.scheduling-date'), desc: t('pu.po.tab1.scheduling-date-desc'), view: function(){
								if (!this.datepicker) {
									var d = new Date(); 
									d.setHours(d.getHours() + 1); 
									d.setMinutes(0); 
									d.setSeconds(0); 
									d.setMilliseconds(0);
									this.datepicker = window.components.datepicker.controller({date: message.date, defaultDate: d});
								}
								return window.components.datepicker.view(this.datepicker);
							}.bind(this)}
						], value: function(){
							if (arguments.length) {
								message.schedule.apply(null, arguments);
								if (message.schedule()) {
									if (!message.date()) {
										message.date(this.datepicker.opts.defaultDate);
									}
								} else {
									message.date(null);
									this.datepicker.open(false);
								}
							} else {
								return message.schedule();
							}
						}.bind(this)}),
						message.date() ?
							m('div', [
								m('h4', t('pu.po.tab1.tz')),
								m('h6', [
									t('pu.po.tab1.tz-desc'), 
									m('span.warn', window.components.tooltip.config(t('pu.po.tab1.tz-yes-help')), push.ICON.WARN())
								]),
								m.component(window.components.radio, {options: [
									{value: false, title: t('pu.po.tab1.tz-no'), desc: t('pu.po.tab1.tz-no-desc')},
									{value: true, title: t('pu.po.tab1.tz-yes'), desc: t('pu.po.tab1.tz-yes-desc')}
								], value: message.tz}),
							])
							: '',
						m('.btns', [
							popup.tabs.tab() > 0 ? m('a.btn-prev', {href: '#', onclick: popup.prev}, t('pu.po.prev')) : '',
							m('a.btn-next', {href: '#', onclick: popup.next, disabled: popup.tabenabled(2) ? false : 'disabled'}, t('pu.po.next'))
						])
					]);
				}
			},
			// Message
			{
				tab: this.renderTab.bind(this, 2), 
				controller: function() {
					localesController = new locales.controller();
				},
				view: function(ctrl){ 
					var d = moment();
					return m('.comp-push-tab-content', [
						m('.comp-push-panels', [
							m('.comp-push-panel.comp-push-panel-compose-left.comp-push-compose', [
								m('h4', t('pu.po.tab2.message')),
								m('h6', t('pu.po.tab2.type')),
								m.component(window.components.segmented, {options: [
									{value: push.C.TYPE.MESSAGE, title: t('pu.type.message')},
									{value: push.C.TYPE.DATA, title: t('pu.type.data')},
								], value: message.type, class: 'comp-push-message-type'}),
								message.type() === push.C.TYPE.MESSAGE ? 
									m('.comp-push-message.comp-push-space-top', [
										locales.view(localesController) 
									]) : '',
							]),
							message.type() === push.C.TYPE.MESSAGE ? 
								m('.comp-push-panel.comp-push-panel-compose-right.comp-push-preview', [
									m('h4', t('pu.po.tab2.preview')),
									m('h6', t('pu.po.tab2.preview-desc')),
									// message.platforms().length > 1 ? 
										m.component(window.components.segmented, {options: [
											{value: push.C.PLATFORMS.IOS, title: t('pu.platform.i')},
											{value: push.C.PLATFORMS.ANDROID, title: t('pu.platform.a')},
										].filter(function(o){ return message.platforms().indexOf(o.value) !== -1; }), value: popup.previewPlatform}),
										// : '',
									m('.preview.preview-' + popup.previewPlatform(), [
										m('img', {src: '/images/push/preview.' + popup.previewPlatform() + '.png'}),
										m('.preview-time', d.format('H:mm')),
										m('.preview-date', d.format("dddd, MMMM DD")),
										m('.preview-message', [
											m('img', {src: 'appimages/' + message.apps()[0] + '.png'}),
											m('.preview-message-title', [
												m('span.preview-message-app', window.countlyGlobal.apps[message.apps()[0]].name),
												m('span.preview-message-date', popup.previewPlatform() === push.C.PLATFORMS.IOS ? 'now' : d.format('LT')),
											]),
											m('.preview-message-message', message.messagePerLocale()[activeLocale()] || t('pu.po.tab2.default-message'))
										])
									])
								]) : 
								''
						]),
						m('h6.comp-push-space-top', t('pu.po.tab2.extras')),
						m('.comp-push-extras', [
							m(extra, {title: t('pu.po.tab2.extras.sound'), value: message.sound, def: 'default'}),
							m(extra, {title: t('pu.po.tab2.extras.badge'), value: message.badge, def: '0', typ: 'number'}),
							m(extra, {title: t('pu.po.tab2.extras.url'), value: message.url}),
							m(extra, {title: t('pu.po.tab2.extras.data'), value: message.data, converter: function(val){ 
								try {
									var o = window.jsonlite.parse(val);
									return typeof o === 'object' ? JSON.stringify(o) : null;
								} catch(e){
									return null;
								}
							}}),
						]),
						m('.btns', [
							popup.tabs.tab() > 0 ? m('a.btn-prev', {href: '#', onclick: popup.prev}, t('pu.po.prev')) : '',
							m('a.btn-next', {href: '#', onclick: popup.next, disabled: popup.tabenabled(3) ? false : 'disabled'}, t('pu.po.next'))
						])
					]);
				}
			},
			{
				tab: this.renderTab.bind(this, 3), 
				view: function(){ 
					return m('.comp-push-tab-content', [
						m('h4', t('pu.po.tab3.review')),
						m('h6', t('pu.po.tab3.review-desc')),
						m.component(window.components.push.view.contents, {message: message}),
						m('h6.comp-push-space-top', t('pu.po.confirm')),
						m('input[type=checkbox]', {checked: message.ack() ? 'checked' : undefined, onchange: function(){ message.ack(!message.ack()); }}),
						m('label', {onclick: function(){ message.ack(!message.ack()); }}, t.n('pu.po.confirm', message.count())),
						m('.btns.final', [
							m('a.btn-prev', {href: '#', onclick: popup.prev}, t('pu.po.prev')),
							m('a.btn-next', {href: '#', onclick: popup.send, disabled: message.ack() ? false : 'disabled'}, t('pu.po.send'))
						])
					]);
				}
			},
		], {stepbystep: true, tabenabled: this.tabenabled, tabset: this.next});

	};
		
	popup.view = function(ctrl) {
		return m('div.comp-push', window.components.tabs.view(ctrl.tabs));
	};

});
