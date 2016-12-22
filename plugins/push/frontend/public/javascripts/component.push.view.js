'use strict';

/* jshint undef: true, unused: true */
/* globals m, moment */

window.component('push.view', function(view) {
	var components = window.components,
		t = components.t,
		push = components.push,
		ERROR_PARSER = /^([ia])([0-9]+)(\+(.+))?$/,
		HELP = {
			i: 'https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CommunicatingwithAPNs.html#//apple_ref/doc/uid/TP40008194-CH11-SW17',
			a: 'https://developers.google.com/cloud-messaging/http-server-ref#error-codes'
		};

	['push.errorCode.i405.desc', 'push.errorCode.i429.desc', 'push.errorCode.a200+MissingRegistration.desc', 'push.errorCode.a200+InvalidTtl.desc'].forEach(function(code){
		t.set(code, t('push.errorCodes.bug'));
	});
	
	view.show = function(message){
		message = message instanceof components.push.Message ? message : new components.push.Message(message);
		view.slider = components.slider.show({
			key: message._id(),
			title: function(){
				var els = [
					t('pu.po.view.title')
				];
				if (message.count()) {
					els.push(m('span.count.ion-person', 'Recipients: ' + message.count().TOTALLY));
				}
				var s = message.result.status();
				if (message.result.error()) {
					els.push(m('.status', [m('svg[viewBox="0 0 56 56"][width=20px][height=20px]', [
						m('circle[fill="#D54043"][cx=28][cy=28][r=28]'),
						m('path[fill="#FFFFFF"][d=M40.9,16.1L40.9,16.1c1.4,1.4,1.4,3.6,0,4.9L21.1,40.9c-1.4,1.4-3.6,1.4-4.9,0l0,0c-1.4-1.4-1.4-3.6,0-4.9l19.8-19.8C37.3,14.8,39.5,14.8,40.9,16.1z]'),
						m('path[fill="#FFFFFF"][d=M40.9,40.9L40.9,40.9c-1.4,1.4-3.6,1.4-4.9,0L16.1,21.1c-1.4-1.4-1.4-3.6,0-4.9l0,0c1.4-1.4,3.6-1.4,4.9,0l19.8,19.8C42.2,37.3,42.2,39.5,40.9,40.9z]'),
					]), t('push.message.status.' + s)]));
				} else if (message.result.sending()) {
					els.push(m('.status', [m('svg[viewBox="0 0 56 56"][width=20px][height=20px]', [
						m('circle[fill="#50A1EA"][cx=28][cy=28][r=28]'),
						m('circle[fill="#F9F9F9"][cx=14][cy=29][r=5]'),
						m('circle[fill="#ABCBFF"][cx=28][cy=29][r=5]'),
						m('circle[fill="#6EA6FB"][cx=42][cy=29][r=5]'),
					]), t('push.message.status.' + s)]));
				} else if (message.result.scheduled()) {
					els.push(m('.status', [m('svg[viewBox="0 0 56 56"][width=20px][height=20px]', [
						m('circle[fill="#50A1EA"][cx=28][cy=28][r=28]'),
						m('rect[fill="#F9F9F9"][x=24][y=10][width=7][height=22]'),
						m('rect[fill="#F9F9F9"][x=24][y=27][width=21][height=7]'),
					]), t('push.message.status.' + s)]));
				} else if (message.result.isSent()) {
					els.push(m('.status', [m('svg[viewBox="0 0 56 56"][width=20px][height=20px]', [
						m('circle[fill="#2FA732"][cx=28][cy=28][r=28]'),
						m('polyline[stroke="#FFFFFF"][fill=none][stroke-width=6][stroke-linecap=round][stroke-linejoin=round][points=15,29.4 24.2,40 40.3,16.7]'),
					]), t('push.message.status.' + s)]));
				}
				return m('h3', els);
			}, 
			// desc: t('pu.po.view.desc'),
			// onclose: function() {
			// 	console.log('slider closed');
			// },
			component: components.push.view, 
			componentOpts: message,
			loadingTitle: t('pu.po.loading'),
			loadingDesc: t('pu.po.loading-desc'),
		});
	};

	view.controller = function(message){
		this.message = message;
	};
	view.view = function(ctrl){
		var r = ctrl.message.result, 
			ec = r.errorCodes() ? Object.keys(r.errorCodes()).sort() : [],
			ic = ec.filter(function(c){ return c.indexOf('i') === 0;}).length,
			ac = ec.filter(function(c){ return c.indexOf('a') === 0;}).length,
			fi = -1,
			fa = -1;

		ec.forEach(function(k, i) {
			if (fi === -1 && k.indexOf('i') === 0) { fi = i; }
			if (fi === -1 && k.indexOf('a') === 0) { fa= i; }
		});

		return m('div.comp-push', [
			r.error() ? 
				m('.comp-push-error', [
					m('svg[width=21][height=18]', m('path[fill="#FFFFFF"][d="M20,18c0.6,0,0.8-0.4,0.5-0.9L11,0.9c-0.3-0.5-0.7-0.5-1,0L0.5,17.1C0.2,17.6,0.4,18,1,18H20zM10,13h2v2h-2V13z M10,8h2v4h-2V8z"]')),
					m.trust(t('push.error.' + r.error().toLowerCase(), r.error()))
				])
				: '',
			r.sent() > 0 || !r.error() ? 
				m('div', [
					m('h4', t('pu.po.metrics')),
					m('.comp-push-view-table.comp-push-metrics', [
						r.sending() ? 
							m.component(view.metric, {
								count: r.processed(),
								total: r.total(),
								color: '#53A3EB',
								title: t('pu.po.metrics.processed'),
								helpr: t('pu.po.metrics.processed.desc'),
								descr: [
									r.processed() === 0 ? '' : r.processed() === r.total() ? 
										t('pu.po.left.to.send.none') 
										: t.n('pu.po.left.to.send', r.total() - r.processed()),
									r.nextbatch() ? 
										t.p('pu.po.left.to.send.batch', moment(r.nextbatch()).format('HH:mm'))
										: ''
								].join('; ').replace(/; $/, '').replace(/^; /, '')
							})
							: 
							r.sent() > 0 || !r.error() ?
								m.component(view.metric, {
									count: r.sent(),
									total: r.total(),
									color: '#53A3EB',
									title: t('pu.po.metrics.sent'),
									helpr: t('pu.po.metrics.sent.desc'),
									descr: r.sent() === 0 ? 
										r.total() - r.sent() - r.errors() > 0 ? 
											t.n('pu.po.expired', r.total() - r.sent() - r.errors())
											: 
											t('pu.po.metrics.sent.none')
										: 
										r.sent() === r.total() ? 
											r.sent() === 1 ? t('pu.po.metrics.sent.one') : t('pu.po.metrics.sent.all')
											: 
											[
												r.total() - r.sent() - r.errors() > 0 ? 
													t.n('pu.po.expired', r.total() - r.sent() - r.errors())
													: '',
												r.errors() > 0 ? 
													t.n('pu.po.errors', r.errors())
													: '',
											].join('; ').replace(/; $/, '').replace(/^; /, '')
								})
								:
								'',

						r.actioned() > 0 ? 
							m.component(view.metric, {
								count: r.actioned(),
								total: r.sent(),
								color: '#FE8827',
								title: t('pu.po.metrics.actions'),
								helpr: t('pu.po.metrics.actions.desc'),
								descr: r.actioned() === r.sent() ? 
									t('pu.po.metrics.actions.all') 
									: t.n('pu.po.metrics.actions', r.actioned())
							})
							: ''

					])
				])
				: '',
			m('h4', t('pu.po.tab3.view')),
			m.component(components.push.view.contents, {message: ctrl.message, isView: true}),
			r.errorCodes() ? 
				m('div.comp-push-error-codes', [
					m('h4', t('push.errorCodes')),
					m('.comp-push-view-table', ec.map(function(k, i){
						var comps = k.match(ERROR_PARSER);
						if (comps && comps[1] && comps[2]) {
							return m('.comp-push-view-row', [
								m('.col-left', [
									m.trust(t('push.errorCode.' + comps[1] + comps[2])),
									comps[4] ?
										m('div', ' (' + comps[4] + ')')
										: ''
								]),
								m('.col-mid', r.errorCodes()[k]),
								m('.col-right', [
									t('push.errorCode.' + k + '.desc', m.trust(t('push.errorCode.' + comps[1] + comps[2] + '.desc', ''))),
									t('push.errorCode.' + k + '.desc', m.trust(t('push.errorCode.' + comps[1] + comps[2] + '.desc', ''))) ? m('br') : '',
									m('a[target=_blank]', {href: HELP[comps[1]]}, t('push.errorCode.link.' + comps[1])),
								])
							]);
						} else {
							return m('.comp-push-view-row', [
								m('.col-left', m.trust(t('push.errorCode.' + k))),
								m('.col-mid', r.errorCodes()[k]),
								m('.col-right', m.trust(t('push.errorCode.' + k + '.desc', ' ')))
							]);
						}
					}))
				])
				: '',
			m('.btns', [
				m('a.btn-prev.orange', {
					href: '#', 
					onclick: function(ev){ 
						ev.preventDefault();
						var json = ctrl.message.toJSON(false, true, true);
						delete json.date;
						components.push.popup.show(json);
					}
				}, t('pu.po.duplicate')),
				m('a.btn-next.red', {
					href: '#', 
					onclick: function(ev){ 
						ev.preventDefault();
						ctrl.message.remoteDelete().then(function(){
							components.slider.instance.close();
							if (window.app.activeView.mounted) {
								window.app.activeView.mounted.refresh();
							}
						});
					}
				}, t('pu.po.delete'))
			])
		]);
	};

	view.metric = {
		view: function(ctrl, opts) {
			opts.prc = Math.ceil(opts.count / opts.total * 100) + '%';
			return m('.comp-push-view-row', [
				m('.col-left', [
					m('h5', [
						opts.title, 
						opts.helpr ? m('i.fa.fa-info', components.tooltip.config(opts.helpr)) : ''
					]),
					opts.count === opts.total ? 
						m('span', m('b', opts.count))
						: m('span', [m('b', opts.count), t('of'), m('b', opts.total)])
				]),
				m('.col-right', [
					m('.comp-bar', [
						m('.percent', {style: {color: opts.color}}, opts.total === 0 ? 0 : opts.prc),
						m('.bar', m('.color', {style: {'background-color': opts.color, width: opts.prc}})),
						opts.descr ? m('.desc', m.trust(opts.descr)) : ''
					])
				])
			]);
		}
	};

	view.contents = {
		controller: function(opts) {
			this.message = opts.message;
			this.isView = opts.isView;
			this.locales = {
				controller: function() {
					var locales = [], self = this;
					locales = Object.keys(opts.message.messagePerLocale()).map(function(k, i){
						var title = k === 'default' ? 'Default' : window.countlyGlobalLang.languages[k] ? window.countlyGlobalLang.languages[k].englishName : k;
						return {
							value: k, 
							title: title,
							tab: function() {
								return m('div', {class: self.tabs.tab() === i ? 'active' : ''}, [
									m('span.comp-push-locale-count', opts.message.locales().length ? opts.message.locales().filter(function(l){ return l.value === k; })[0].percent : 0 + '%'),
									m('span.comp-push-locale-title', title)
								]);
							},
							view: function() {
								return m('div.textarea', opts.message.messagePerLocale()[k]);
							}
						};
					});

					this.tabs = new components.tabs.controller(locales, {ontab: this.ontab});
				},
				view: function(ctrl){
					return m('.comp-push-locales', [
						components.tabs.view(ctrl.tabs),
					]);
				},
			};		
		},

		view: function(ctrl) {
			var geo;
			if (ctrl.message.geo() && push.dashboard.geos) {
				push.dashboard.geos.forEach(function(loc){
					if (loc._id === ctrl.message.geo()) { geo = loc; }
				});
			}
			return m('.comp-push-view', [
				m('.comp-push-view-table', [
					m('.comp-push-view-row', [
						m('.col-left', t('pu.po.tab3.apps')),
						m('.col-right', ctrl.message.appNames().join(', '))
					]),
					m('.comp-push-view-row', [
						m('.col-left', t('pu.po.tab3.platforms')),
						m('.col-right', ctrl.message.platforms().map(function(p){ return t('pu.platform.' + p); }).join(', '))
					]),
					m('.comp-push-view-row', [
						m('.col-left', t('pu.po.tab3.type')),
						m('.col-right', t('pu.po.tab3.type.' + ctrl.message.type()))
					]),
					ctrl.isView ? 
						''
						: m('.comp-push-view-row', [
							m('.col-left', t('pu.po.tab3.audience')),
							m('.col-right', ctrl.message.count() || ctrl.message.result.processed())
						]),
					m('.comp-push-view-row', [
						m('.col-left', t('pu.po.tab3.test')),
						m('.col-right', t('pu.po.tab3.test.' + !!ctrl.message.test()))
					]),
					m('.comp-push-view-row', [
						m('.col-left', t('pu.po.tab3.date')),
						m('.col-right', (ctrl.message.date() ? moment(ctrl.message.date()).format('DD.MM.YYYY, HH:mm') : t('pu.po.tab3.date.now')) + (ctrl.message.tz() ? t('pu.po.tab3.date.intz') : ''))
					]),
					ctrl.message.result.isSent() ? 
						m('.comp-push-view-row', [
							m('.col-left', t('pu.po.tab3.date.sent')),
							m('.col-right', ctrl.message.sent() ? moment(ctrl.message.sent()).format('DD.MM.YYYY, HH:mm') : '')
						])
						: '',
					ctrl.message.geo() ? m('.comp-push-view-row', [
						m('.col-left', t('pu.po.tab3.location')),
						m('.col-right', geo ? geo.title : t('pu.po.tab3.location.unknown'))
					]) : '',
				]),

				ctrl.message.messagePerLocale() && ctrl.message.messagePerLocale().default ? 
					m('div', [
						m('h4.comp-push-space-top', t('pu.po.tab3.message')),
						m('.comp-push-view-message', ctrl.message.messagePerLocale().default)
						// Object.keys(ctrl.message.messagePerLocale()).length === 1 ? 
							// m('.comp-push-view-table', m('.comp-push-view-row', ctrl.message.messagePerLocale().default))
							// : 
							// m.component(ctrl.locales)
					])
					: '',
			]);
		}
	};
});
