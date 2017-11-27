'use strict';

/* jshint undef: true, unused: true */
/* globals m, components, $, countlyView, countlyGlobal, countlyCommon, CountlyHelpers */

window.component('push.dash', function (dash) {
	var t = window.components.t,
		PUSH = window.components.push;

	dash.controller = function () {
		this.app_id = countlyCommon.ACTIVE_APP_ID;
		this.period = m.prop('monthly');
		this.source = m.prop('dash');
		this.messages = m.prop([]);
		var dt = m.prop({
			users: 0,
			enabled: 0,
			geos: [],
			location: null,
			sent: { monthly: { data: [], keys: [], total: 0 }, weekly: { data: [], keys: [], total: 0 } },
			actions: { monthly: { data: [], keys: [], total: 0 }, weekly: { data: [], keys: [], total: 0 } },
		})
		this.data = function () {
			if (arguments.length) {
				var data = arguments[0];
				if (data) {
					['sent', 'actions'].forEach(function (ev) {
						ev = data[ev];

						['weekly', 'monthly'].forEach(function (period) {
							if (typeof ev[period].total !== 'undefined') {
								return;
							}

							if (period === 'weekly') {
								period = ev[period];

								var len = Math.floor(period.data.length / 2);
								period.data = period.data.slice(len);
								period.keys = period.keys.slice(len);
							} else {
								period = ev[period];
							}

							period.total = period.data.reduce(function (a, b) { return a + b; });
						});
					});
					dt(data);
				}
			}
			return dt();
		};

		setTimeout(function () {
			components.push.remoteDashboard(this.app_id).then(this.data, console.log);
		}.bind(this), 1);

		this.dataDP = function () {
			return {
				dp: [
					{ label: t('pu.dash.metrics.sent'), data: this.data() ? this.data().sent[this.period()].data.map(function (d, i) { return [i, d]; }) : [] },
					{ label: t('pu.dash.metrics.acti'), data: this.data() ? this.data().actions[this.period()].data.map(function (d, i) { return [i, d]; }) : [] },
				],
				ticks: this.data() ? this.data().sent[this.period()].keys.map(function (d, i) { return [i, d]; }) : []
			};
		};
		this.chartConfig = function (element, isInitialized) {
			// element.style.height = element.clientWidth * 1 / 4 + 'px';
			element.style.height = '300px';
			// if (!isInitialized) {
			countlyCommon.drawGraph(this.dataDP(), element, 'bar', { legend: { show: false } });
			// }
		}.bind(this);
		this.tableConfig = function (element, isInitialized, context) {
			if (!isInitialized) {
				context.onunload = function () {
					if (this.dtable) {
						try {
							this.dtable.fnDestroy(true);
						} catch (e) { }
						this.dtable = null;
					}
				}.bind(this);
				var unprop = function (name, def, x, val, val2) {
					if (x === 'set') {
						return val;
					} else if (val === 'set') {
						return val2;
					}
					if (x === undefined) {
						x = def;
					}
					var v = window.dot(x, name);
					return typeof v === 'undefined' ? def : typeof v === 'function' ? v() || def : v || def;
				};

				this.dtable = $(element).dataTable($.extend({}, $.fn.dataTable.defaults, {
					bServerSide: true,
					iDisplayLength: 10,
					sAjaxSource: countlyCommon.API_PARTS.data.r + '/pushes/all?api_key=' + countlyGlobal.member.api_key + '&app_id=' + countlyCommon.ACTIVE_APP_ID,
					fnServerData: function (sSource, aoData, fnCallback) {
						$.ajax({
							dataType: 'jsonp',
							type: 'POST',
							url: sSource,
							data: aoData,
							success: function (data) {
								data.aaData = this.messages(data.aaData.map(components.push.Message));
								fnCallback(data);
							}.bind(this)
						});
					}.bind(this),
					fnServerParams: function (aoData) {
						aoData.forEach(function (d) {
							if (d.name === 'iSortCol_0') {
								d.value = ['messagePerLocale.default', 'appNames', 'result.status', 'created', 'created', 'date', 'date'][d.value];
							}
						});
						aoData.push({ name: 'source', value: this.source() });
					}.bind(this),
					oLanguage: {
						sZeroRecords: t('pu.t.nothing'),
						sEmptyTable: t('pu.t.nothing'),
						sSearch: t('pu.t.search')
					},
					fnRowCallback: function (nRow, aData) {
						$(nRow).attr('mid', aData._id());
					},
					aoColumns: [
						{ mData: unprop.bind(null, 'messagePerLocale.default', ''), sName: 'message', mRender: CountlyHelpers.clip(null, t('push.no-message')), sTitle: t('pu.t.message') },
						{ mData: function (x) { return x.appNames().join(', '); }, sName: 'apps', sType: 'string', mRender: CountlyHelpers.clip(), sTitle: t('pu.t.apps'), bSearchable: false },
						{
							mData: unprop.bind(null, 'result'), sName: 'status', sType: 'string', mRender: function (d, type, result) {
								var s = result.result.status(),
									override;
								if (PUSH.statusers) {
									PUSH.statusers.forEach(function (statuser) {
										var o = statuser(result.___data);
										if (o) {
											override = o;
										}
									});
								}
								return '<span>' + (override || t('push.message.status.' + s)) + '</span>';
							}, sTitle: t('pu.t.status'), bSearchable: false
						},
						{ mData: unprop.bind(null, 'dates.createdSeconds'), bVisible: false, sType: 'numeric', bSearchable: false },
						{ mData: unprop.bind(null, 'dates.created'), sName: 'created', sType: 'date', iDataSort: 3, sTitle: t('pu.t.created'), mRender: function (x) { return x.dates().created; }, bSearchable: false },
						{ mData: unprop.bind(null, 'dates.dateSeconds'), bVisible: false, sType: 'numeric', bSearchable: false },
						{
							mData: unprop.bind(null, 'dates'), sName: 'sent', sType: 'string', iDataSort: 5, sTitle: t('pu.t.sent-scheduled'), mRender: function (local) {
								var dates = local.dates();
								return dates.sent || dates.date || '';
							}, bSearchable: false
						},
						{
							mData: unprop.bind(null, 'result'), sName: 'result', sType: 'string', iDataSort: 5, sTitle: t('pu.t.result'), mRender: function (local) {
								var result = local.result;
								return (result.sent() || 0) + ' / ' + (result.actioned() || 0);
							}, bSearchable: false
						}
					],
					aaSorting: [[4, 'asc']]
				}));

				this.dtable.find('tbody').on('click', 'tr', function (ev) {
					var tr = null;
					do {
						tr = (tr || ev.target).parentElement;
					} while (tr && tr.tagName !== 'TR');

					if (tr) {
						var id = tr.attributes.mid.value,
							message = this.messages().filter(function (m) { return m._id() === id; });
						if (message.length) {
							m.startComputation();
							components.push.view.show(message[0]);
							m.endComputation();
						}
					}

				}.bind(this));
			}
		}.bind(this);

		this.refresh = function () {
			if (this.dtable) {
				this.dtable.fnDraw(false);
			}
			components.push.remoteDashboard(this.app_id).then(this.data, console.log);
		}.bind(this);

		this.message = function (ev) {
			ev.preventDefault();
			self.pushDrawerMenuOpen = false;
			components.push.popup.show({ apps: [countlyCommon.ACTIVE_APP_ID] });
		};

		this.autoMessage = function (e) {
			e.preventDefault();
			self.pushDrawerMenuOpen = false;
			components.push.automated.popup.show({ apps: [countlyCommon.ACTIVE_APP_ID] });
		};

		this.pushDrawerMenuOpen = false;
		var self = this;


		this.messageMenu = function (e) {
			e.preventDefault();
			self.pushDrawerMenuOpen = !self.pushDrawerMenuOpen;
		}
	
		this.checkIfEE = function () {
			return countlyGlobal.plugins.indexOf('automated_push') >= 0;
		}
	};
	dash.view = function (ctrl) {
		return m('.push-overview', [

				m.component(components.widget, {
					header: {
						title: 'pu.dash.users',
						view: (countlyGlobal.member.global_admin || (countlyGlobal.member.admin_of && countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1)) ?
							[
								m('div', {
									style: {
										overflow: "initial",
										position: "relative",
										width: "500px",
										height: "37px",
										float: "right",
										marginRight: "5px"
									}
								}, [	m('a.icon-button.btn-header.push-group.green[href=#]', {
											id : "push-group-button",
											onclick: ctrl.messageMenu,
											style: { marginRight: "0px" }
										}, t('pu.dash.btn-group.create-message')),
										ctrl.pushDrawerMenuOpen ?
											ctrl.checkIfEE() ?
											m('div.push-group-menu.ee-menu', [
												m('div.auto-push-image', { onclick: ctrl.autoMessage }, [
													m('div.title', t('pu.dash.btn-group.automated-message')),
													m('div.description', t('pu.dash.btn-group.automated-message-desc')),
												]),
												m('div.one-time', { onclick: ctrl.message }, [
													m('div', [
															m('div.title', t('pu.dash.btn-group.one-time-message')),
															m('div.description', t('pu.dash.btn-group.one-time-message-desc'))
														])
												]),
											]) :
												m('div.push-group-menu', [
													m('div.not-available.auto-push-image', [
														m('div.header', t('pu.dash.btn-group-available-in-enterprise')),
														m('div.body', [
															m('div.title', t('pu.dash.btn-group.automated-message')),
															m('div.description', t('pu.dash.btn-group.automated-message-desc')),
															m('a.url', t('Learn more about automation'))
														])
													]),
													m('div.one-time', { onclick: ctrl.message }, [
														m('div', {
															style: {
																boxSizing: "border-box",
																paddingLeft: "10px"
															}
														}, [
																m('div.title', t('pu.dash.btn-group.one-time-message')),
																m('div.description', t('pu.dash.btn-group.one-time-message-desc'))
															])
													]),
												]) : ""

									])
							]
							: ''
					},
					footer: {
						config: { class: 'condensed' },
						bignumbers: [
							{ title: 'pu.dash.users.total', number: ctrl.data().users || 0, help: 'help.dashboard.total-users' },
							{ title: 'pu.dash.users.enabl', number: ctrl.data().enabled || 0, help: 'help.dashboard.messaging-users' },
						]
					}
				}),

				m.component(components.widget, {
					header: {
						title: 'pu.dash.metrics',
						control: {
							component: components.segmented,
							opts: {
								value: ctrl.period, options: [
									{ value: 'weekly', title: t('pu.dash.weekly') },
									{ value: 'monthly', title: t('pu.dash.monthly') }
								], legacy: true
							}
						}
					},
					content: {
						view: m('.chart', { config: ctrl.chartConfig })
					},
					footer: {
						bignumbers: [
							{ title: 'pu.dash.metrics.sent', number: ctrl.data() ? ctrl.data().sent[ctrl.period()].total : 0, color: true, help: 'help.dashboard.push.sent' },
							{ title: 'pu.dash.metrics.acti', number: ctrl.data() ? ctrl.data().actions[ctrl.period()].total : 0, color: true, help: 'help.dashboard.push.actions' },
						]
					}
				}),

				m.component(components.widget, {
					header: {
						title: 'pu.dash.messages',
						control: {
							component: components.segmented,
							opts: {
								class: 'large', value: ctrl.source, options: [
									{ value: '', title: t('pu.dash.messages.all') },
									{ value: 'api', title: t('pu.dash.messages.api') },
									{ value: 'dash', title: t('pu.dash.messages.dash') }
								], onchange: ctrl.refresh, legacy: true
							}
						}
					},
					content: {
						view: m('table.d-table', { config: ctrl.tableConfig })
					}
				}),

			]);
	};
});

window.MessagingDashboardView = countlyView.extend({
	showOnGraph: 2,
	initialize: function () {
	},
	renderCommon: function () {
		if (this.mounted && this.mounted.app_id !== countlyCommon.ACTIVE_APP_ID) {
			this.destroy();
		}
		if (!this.mounted) {
			this.div = $('<div />').appendTo($(this.el))[0];
			this.mounted = m.mount(this.div, components.push.dash);
		}
		setTimeout(function () {
			if ($("#help-toggle").hasClass("active")) {
				$('.help-zone-vb').tipsy({
					gravity: $.fn.tipsy.autoNS, trigger: 'manual', title: function () {
						return ($(this).data("help")) ? $(this).data("help") : "";
					}, fade: true, offset: 5, cssClass: 'yellow', opacity: 1, html: true
				});
				$('.help-zone-vs').tipsy({
					gravity: $.fn.tipsy.autoNS, trigger: 'manual', title: function () {
						return ($(this).data("help")) ? $(this).data("help") : "";
					}, fade: true, offset: 5, cssClass: 'yellow narrow', opacity: 1, html: true
				});

				$.idleTimer('destroy');
				clearInterval(self.refreshActiveView);
				$(".help-zone-vs, .help-zone-vb").hover(
					function () {
						$(this).tipsy("show");
					},
					function () {
						$(this).tipsy("hide");
					}
				);
			}
		}, 500);
	},
	refresh: function () {
		if (this.mounted) { this.mounted.refresh(true); }
	},

	destroy: function () {
		if (this.mounted) {
			m.mount(this.div, null);
			this.mounted = null;
		}
	}

});

window.app.messagingDashboardView = new window.MessagingDashboardView();

window.app.route('/messaging', 'messagingDashboardView', function () {
	this.renderWhenReady(this.messagingDashboardView);
});
