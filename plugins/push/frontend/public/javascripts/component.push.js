'use strict';

/* jshint undef: true, unused: true */
/* globals m, moment */

if (!window.components) {
	window.components = {};
}

if (!window.components.push) {
	window.components.push = {};
}

if (!window.components.push.popup) {
	// setTimeout(function(){
		// window.components.push.popup.show();
	// }, 300);

	// window.countlyGeo = {};

	var C = {
		TYPE: {
			MESSAGE: 'message',
			DATA: 'data',
		},

		TAB: {
			APPS: 0,
			PLATFORMS: 1,
			TIME_N_LOC: 2,
			MESSAGE: 3
		},

		PLATFORMS: {
			IOS: 'i',
			ANDROID: 'a'
		}
	}, URL_REGEXP = new RegExp( "([A-Za-z][A-Za-z0-9+\\-.]*):(?:(//)(?:((?:[A-Za-z0-9\\-._~!$&'()*+,;=:]|%[0-9A-Fa-f]{2})*)@)?((?:\\[(?:(?:(?:(?:[0-9A-Fa-f]{1,4}:){6}|::(?:[0-9A-Fa-f]{1,4}:){5}|(?:[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,1}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){3}|(?:(?:[0-9A-Fa-f]{1,4}:){0,2}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){2}|(?:(?:[0-9A-Fa-f]{1,4}:){0,3}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}:|(?:(?:[0-9A-Fa-f]{1,4}:){0,4}[0-9A-Fa-f]{1,4})?::)(?:[0-9A-Fa-f]{1,4}:[0-9A-Fa-f]{1,4}|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4})?::)|[Vv][0-9A-Fa-f]+\\.[A-Za-z0-9\\-._~!$&'()*+,;=:]+)\\]|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[A-Za-z0-9\\-._~!$&'()*+,;=]|%[0-9A-Fa-f]{2})*))(?::([0-9]*))?((?:/(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)|/((?:(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)?)|((?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)|)(?:\\?((?:[A-Za-z0-9\\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*))?(?:\\#((?:[A-Za-z0-9\\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*))?"),
	t = window.components.t;

	var push = window.components.push;

	var locations = [];

	var vprop = function(val, validator, errorText) {
		var prop = m.prop(), 
			f = function() {
				if (arguments.length) {
					f.valid = validator(arguments[0]);
					return prop(arguments[0]);
				} else {
					return prop();
				}
			};
		f.errorText = errorText;
		f(val);
		return f;
	};

	push.Message = function(data) {
		this._id = m.prop(data._id);
		this.type = m.prop(data.type || C.TYPE.MESSAGE);
		this.apps = m.prop(data.apps || []);
		this.platforms = m.prop(data.platforms || []);
		this.date = m.prop(data.date);
		this.sent = m.prop(data.sent);
		this.sound = vprop(data.sound || 'default', function(v){ return !!v; }, t('pu.po.tab2.extras.sound.invalid'));
		this.badge = vprop(data.badge, function(v){ return v && (v + '') === (parseInt(v) + ''); }, t('pu.po.tab2.extras.badge.invalid'));
		this.url = vprop(data.url, function(v){ return v && URL_REGEXP.test(v); }, t('pu.po.tab2.extras.url.invalid'));
		this.location = m.prop(data.location);
		this.data = vprop(data.data, function(v){
			try {
				var o = window.jsonlite.parse(v);
				return o && typeof o === 'object';
			} catch(e){
				return false;
			}
		}, t('pu.po.tab2.extras.data.invalid'));
		this.test = m.prop(typeof data.test === 'undefined' ? false : data.test);

		this.userConditions = m.prop(data.userConditions);
		this.drillConditions = m.prop(data.drillConditions);
		this.geo = m.prop(data.geo || '');

		this.count = m.prop();
		this.locales = m.prop(data.locales);
		this.messagePerLocale = m.prop(data.messagePerLocale || {});

		this.result = new push.MessageResult(data.result || {});

		this.expiryDate = m.prop(data.expiryDate);
		this.appNames = m.prop(data.appNames || []);
		this.created = m.prop(data.created);
		this.saved = m.prop(false);

		this.availablePlatforms = function() {
			var platofrms = [];
			this.apps().forEach(function(id){
				var a = window.countlyGlobal.apps[id];
				if (a.apn && (a.apn.universal || a.apn.prod || a.apn.dev) && platofrms.indexOf(C.PLATFORMS.IOS) === -1) { platofrms.push(C.PLATFORMS.IOS); } 
				if (a.gcm && (a.gcm.key) && platofrms.indexOf(C.PLATFORMS.ANDROID) === -1) { platofrms.push(C.PLATFORMS.ANDROID); } 
			});
			return platofrms;
		};

		this.schedule = m.prop(false);

		// ID of tokens collection built when building audience
		this.buildId = m.prop();

		this.ack = m.prop(false);
		
		// Build audience
		this.audience = function() {
			return m.request({
				method: 'GET',
				url: window.countlyCommon.API_URL + '/i/pushes/audience',
				data: {
					api_key: window.countlyGlobal.member.api_key,
					args: JSON.stringify({
						apps: this.apps(),
						platforms: this.platforms(),
						userConditions: this.userConditions(),
						drillConditions: this.drillConditions(),
						test: this.test()
					})
				}
			});
		};

		this.remoteBuild = function() {
			return m.request({
				method: 'GET',
				url: window.countlyCommon.API_URL + '/i/pushes/build',
				data: {
					api_key: window.countlyGlobal.member.api_key,
					build: this.buildId(),
					args: JSON.stringify({
						apps: this.apps(),
						platforms: this.platforms(),
						userConditions: this.userConditions(),
						drillConditions: this.drillConditions(),
						test: this.test()
					})
				}
			});
		};

		// Clean audience built previously
		this.remoteClean = function() {
			if (this.buildId()) {
				return m.request({
					method: 'GET',
					url: window.countlyCommon.API_URL + '/i/pushes/clean',
					data: {
						api_key: window.countlyGlobal.member.api_key,
						build: this.buildId()
					}
				}).then(this.buildId.bind(this, undefined));
			} else {
				return Promise.resolve();
			}
		};

		this.setCount = function(count) {
			var locales = [];
			for (var k in count) if (k !== 'TOTALLY') {
				for (var l in count[k]) if (l !== 'TOTALLY') {
					var ll = locales.filter(function(loc){ return loc.value === l; });
					if (ll.length) {
						ll[0].count += count[k][l];
					} else {
						var title = l === 'default' ? 'Default' : window.countlyGlobalLang.languages[l] ? window.countlyGlobalLang.languages[l].englishName : l;
						locales.push({value: l, title: title, count: count[k][l]});
					}
				}
			}
			var sum = 0;
			locales.forEach(function(l){ sum += l.count; });
			locales.sort(function(a, b){ return b.count - a.count; });
			locales.unshift({value: 'default', title: 'Default', count: sum});
			locales.forEach(function(l){ l.percent = Math.round(l.count / sum * 100); });

			this.count(count);
			this.locales(locales);
		};
	};

	push.MessageResult = function(data) {
		this.status = m.prop(data.status || 0);
		this.total = m.prop(data.total || 0);
		this.processed = m.prop(data.processed || 0);
		this.sent = m.prop(data.sent || 0);
		this.error = m.prop(data.error);
	};

	push.popup = {
		show: function(prefilled){
			var message = new push.Message(prefilled || {});
			push.popup.slider = window.components.slider.show({
				title: function(){
					var els = [
						t('pu.po.title')
					];
					if (message.count()) {
						els.push(m('span.count.ion-person', 'Recipients: ' + message.count().TOTALLY));
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
		},

		controller: function(message){
			var popup = this, apps = [];

			t.set('pu.po.tab1.title', t('pu.po.tab1.title.' + !!window.countlyGeo));
		
			this.message = message;
			this.renderTab = function(i, active) {
				return m('.comp-push-tab', {class: active && !popup.warnNoUsers() ? 'active' : ''}, [
					popup.warnNoUsers() ? 
						i < 2 ? m('svg.comp-push-tab-warn[width=21][height=18]', m('path[fill="#FF9E43"][d="M20,18c0.6,0,0.8-0.4,0.5-0.9L11,0.9c-0.3-0.5-0.7-0.5-1,0L0.5,17.1C0.2,17.6,0.4,18,1,18H20zM10,13h2v2h-2V13z M10,8h2v4h-2V8z"]')) : m('.comp-push-tab-num', i + 1)
						: i < this.tabs.tab() ? m('.comp-push-tab-num.ion-checkmark') : m('.comp-push-tab-num', i + 1),
					m('.comp-push-tab-title', t('pu.po.tab' + i + '.title')),
					m('.comp-push-tab-desc', t('pu.po.tab' + i + '.desc'))
				]);
			};

			for (var k in window.countlyGlobal.apps) {
				var a = window.countlyGlobal.apps[k];
				apps.push(window.components.selector.Option({value: a._id, title: a.name, selected: message.apps().indexOf(a._id) !== -1}));
			}

			this.previewPlatform = m.prop(C.PLATFORMS.IOS);
			this.warnNoUsers = m.prop(false);
			
			this.tabenabled = function(tab) {
				if (this.tabs.tab() >= tab) {
					return true;
				}

				var enabled = true;
				switch (tab) {
					/* falls through */
					case 3:
						if (message.type() === C.TYPE.MESSAGE) {
							enabled = enabled && message.messagePerLocale().default;
						} else if (message.type() === C.TYPE.DATA) {
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

			this.next = function(ev, tab) {
				if (ev) { ev.preventDefault(); }

				tab = typeof tab === 'undefined' ? this.tabs.tab() + 1 : tab;
				if (this.tabenabled(tab)) {
					if (tab === 2 && !message.count()) {
						push.popup.slider.loading(true);
						message.audience().then(function(count){
							setTimeout(function(){
								m.startComputation();
								push.popup.slider.loading(false);

								if (!count || !count.TOTALLY) {
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
													m('a[href=#]', {onclick: swtch.bind(popup, 0)}, t('pu.po.no-users-try-change-apps')),
													locations.length ? 
														m('span', [
															' ' + t('pu.po.no-users-try-change-or') + ' ',
															m('a[href=#]', {onclick: swtch.bind(popup, 1)}, t('pu.po.no-users-try-change-loc')),
															'.'
														]) 
														: '.',
													m('br'),
													m('a.btn-next[href=#]', {onclick: swtch.bind(popup, 0)}, t('pu.po.no-users-start-over'))
												])
											]);
										}
									};
								} else {
									message.setCount(count);
									if (this.tabenabled(tab)) {
										popup.tabs.set(tab);
									}
								}
								m.endComputation();
							}.bind(this), 200);
						}.bind(this), push.popup.slider.loading.bind(push.popup.slider, false));
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
				push.popup.slider.loading(true);
				setTimeout(function(){
					m.startComputation();
					message.saved(true);
					m.endComputation();

					setTimeout(function(){
						m.startComputation();
						push.popup.slider.loading(false);
						m.endComputation();
					}, 1000);
				}, 1000);

			}.bind(this);

			var activeLocale = m.prop();
			var locales = {
				controller: function(){
					var locales, self = this;
					
					locales = message.locales().map(function(l, i){
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
									m('svg[width=21][height=18]', m('path[fill="#FF9E43"][d="M20,18c0.6,0,0.8-0.4,0.5-0.9L11,0.9c-0.3-0.5-0.7-0.5-1,0L0.5,17.1C0.2,17.6,0.4,18,1,18H20zM10,13h2v2h-2V13z M10,8h2v4h-2V8z"]', m('title', t('pu.po.tab2.default-message.invalid')))) 
									: ''
							]);
						};
						return l;
					});

					this.text = m.prop();
					this.ontab = function(tab){
						activeLocale(locales[tab].value);
						this.text(message.messagePerLocale()[locales[tab].value]);
					}.bind(this);
					this.ontext = function(text) {
						this.text(text);
						if (text) {
							message.messagePerLocale()[locales[this.tabs.tab()].value] = text;
						} else {
							delete message.messagePerLocale()[locales[this.tabs.tab()].value];
						}
					}.bind(this);
					this.tabs = new window.components.tabs.controller(locales, {ontab: this.ontab});
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
								m('svg[width=21][height=18]', m('path[fill="#FF9E43"][d="M20,18c0.6,0,0.8-0.4,0.5-0.9L11,0.9c-0.3-0.5-0.7-0.5-1,0L0.5,17.1C0.2,17.6,0.4,18,1,18H20zM10,13h2v2h-2V13z M10,8h2v4h-2V8z"]', ctrl.value.errorText ? m('title', ctrl.value.errorText) : ''))
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
									message.count(undefined);
									message.apps(opts.map(function(o){ return o.value(); }));
									message.appNames(opts.map(function(o){ return o.title(); }));
									if (!message.apps().length) {
										message.platforms([]);
									} else {
										var available = message.availablePlatforms();
										for (var i in message.platforms()) {
											if (available.indexOf(message.platforms()[i]) === -1) {
												message.platforms().splice(i, 1);
											}
										}
									}
								}
							}),
							onplatform: function(p, ev){
								if (ev instanceof MouseEvent && ev.target.tagName.toLowerCase() === 'input') {
									return true;
								}
								message.count(undefined);
								var i = message.platforms().indexOf(p);
								if (i === -1) {
									message.platforms().push(p);
								} else {
									message.platforms().splice(i, 1);
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
												message.count(undefined);
												return message.test(arguments[0]);
											}
											return message.test();
										}}),
									]),
								]),
							]),
							m('.btns', [
								m('a.btn-prev', {href: '#', onclick: function(ev){ push.popup.slider.close(ev); }}, t('pu.po.close')),
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
									return m.component(window.components.datepicker, {date: message.date, tz: m.prop()});
								}}
							], value: message.schedule}),
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
					view: function(){ 
						var d = moment();
						return m('.comp-push-tab-content', [
							m('.comp-push-panels', [
								m('.comp-push-panel.comp-push-panel-compose-left.comp-push-compose', [
									m('h4', t('pu.po.tab2.message')),
									m('h6', t('pu.po.tab2.type')),
									m.component(window.components.segmented, {options: [
										{value: C.TYPE.MESSAGE, title: t('pu.type.message')},
										{value: C.TYPE.DATA, title: t('pu.type.data')},
									], value: message.type, class: 'comp-push-message-type'}),
									message.type() === C.TYPE.MESSAGE ? 
										m('.comp-push-message.comp-push-space-top', [
											m.component(locales) 
										]) : '',
								]),
								message.type() === C.TYPE.MESSAGE ? 
									m('.comp-push-panel.comp-push-panel-compose-right.comp-push-preview', [
										m('h4', t('pu.po.tab2.preview')),
										m('h6', t('pu.po.tab2.preview-desc')),
										message.platforms().length > 1 ? 
											m.component(window.components.segmented, {options: [
												{value: C.PLATFORMS.IOS, title: t('pu.platform.i')},
												{value: C.PLATFORMS.ANDROID, title: t('pu.platform.a')},
											], value: popup.previewPlatform})
											: '',
										m('.preview.preview-' + popup.previewPlatform(), [
											m('img', {src: '/images/preview.' + popup.previewPlatform() + '.png'}),
											m('.preview-time', d.format('H:mm')),
											m('.preview-date', d.format("dddd, MMMM DD")),
											m('.preview-message', [
												m('img', {src: 'appimages/' + message.apps()[0] + '.png'}),
												m('.preview-message-title', [
													m('span.preview-message-app', window.countlyGlobal.apps[message.apps()[0]].name),
													m('span.preview-message-date', popup.previewPlatform() === C.PLATFORMS.IOS ? 'now' : d.format('LT')),
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
							m('label', {onclick: function(){ message.ack(!message.ack()); }}, t.n('pu.po.confirm', message.count().TOTALLY)),
							m('.btns.final', [
								m('a.btn-prev', {href: '#', onclick: popup.prev}, t('pu.po.prev')),
								m('a.btn-next', {href: '#', onclick: popup.send, disabled: message.ack() ? false : 'disabled'}, t('pu.po.send'))
							])
						]);
					}
				},
			], {stepbystep: true, tabenabled: this.tabenabled, tabset: this.next});

		},
		
		view: function(ctrl) {
			return m('div.comp-push', window.components.tabs.view(ctrl.tabs));
		},
	};

}