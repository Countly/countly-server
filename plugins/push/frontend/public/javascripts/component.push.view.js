'use strict';

/* jshint undef: true, unused: true */
/* globals m, moment */

if (!window.components) {
	window.components = {};
}

if (!window.components.push) {
	window.components.push = {};
}

if (!window.components.push.view) {

	var t = window.components.t,
	view = window.components.push.view = {
		show: function(message){
			debugger;
			message = new window.components.push.Message(message);
			view.slider = window.components.slider.show({
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
				component: window.components.push.view, 
				componentOpts: message,
				loadingTitle: t('pu.po.loading'),
				loadingDesc: t('pu.po.loading-desc'),
			});
		},

		controller: function(message){
			this.message = message;
		},
		
		view: function(ctrl) {
			return m('div.comp-push', [
				m('h4', t('pu.po.tab3.view')),
				m.component(window.components.push.view.contents, {message: ctrl.message}),
			]);
		},

		contents: {
			controller: function(opts){
				this.message = opts.message;
				this.isView = opts.isView;
				this.locales = {
					controller: function(){
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

						this.tabs = new window.components.tabs.controller(locales, {ontab: this.ontab});
					},
					view: function(ctrl){
						return m('.comp-push-locales', [
							window.components.tabs.view(ctrl.tabs),
						]);
					},
				};		
			},

			view: function(ctrl) {
				return m('.comp-push-view', [
					m('.comp-push-view-table', [
						m('.comp-push-view-row', [
							m('span', t('pu.po.tab3.apps')),
							m('div', ctrl.message.appNames().join(', '))
						]),
						m('.comp-push-view-row', [
							m('span', t('pu.po.tab3.platforms')),
							m('div', ctrl.message.platforms().map(function(p){ return t('pu.platform.' + p); }).join(', '))
						]),
						m('.comp-push-view-row', [
							m('span', t('pu.po.tab3.type')),
							m('div', t('pu.po.tab3.type.' + ctrl.message.type()))
						]),
						m('.comp-push-view-row', [
							m('span', t('pu.po.tab3.audience')),
							m('div', ctrl.message.count() ? ctrl.message.count().TOTALLY : ctrl.message.result.processed())
						]),
						m('.comp-push-view-row', [
							m('span', t('pu.po.tab3.test')),
							m('div', t('pu.po.tab3.test.' + !!ctrl.message.test()))
						]),
						m('.comp-push-view-row', [
							m('span', t('pu.po.tab3.date')),
							m('div', ctrl.message.date() ? moment(ctrl.message.date()).format('DD.MM.YYYY, HH:mm') : t('pu.po.tab3.date.now'))
						]),
						ctrl.message.location() ? m('.comp-push-view-row', [
							m('span', t('pu.po.tab3.location')),
							m('div', ctrl.message.location())
						]) : '',
					]),

					m('h6.comp-push-space-top', t('pu.po.tab3.message')),
					m.component(ctrl.locales),
				]);
			}
		}
	};
}

