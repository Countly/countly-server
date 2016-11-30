'use strict';

/* jshint undef: true, unused: true */
/* globals m, components, $, countlyView, countlyGlobal, countlyCommon, CountlyHelpers */

window.component('push.dash', function(dash) {
	var t = window.components.t;
	
	dash.controller = function() {
		this.period = m.prop('monthly');
		this.source = m.prop('dash');
		this.messages = m.prop([]);
		this.data = m.prop();

		components.push.remoteDashboard(countlyCommon.ACTIVE_APP_ID).then(function(data){
			m.startComputation();
			['sent', 'actions'].forEach(function(ev) {
				ev = data[ev];

				['weekly', 'monthly'].forEach(function(period){
					if (period === 'weekly') {
						period = ev[period];
						
						var len = Math.floor(period.data.length / 2);
						period.data = period.data.slice(len);
						period.keys = period.keys.slice(len);
					} else {
						period = ev[period];
					}

					period.total = period.data.reduce(function(a, b){ return a + b; });
				});
			});
			// data.sent.weekly.total = data.sent.weekly
			// data.sent.weekly.data.splice(Math.floor(data.sent.weekly.data.length / 2));
			// data.sent.weekly.keys.splice(Math.floor(data.sent.weekly.keys.length / 2));
			// data.actions.weekly.data.splice(Math.floor(data.actions.weekly.data.length / 2));
			// data.actions.weekly.keys.splice(Math.floor(data.actions.weekly.keys.length / 2));
			this.data(data);
			m.endComputation();
		}.bind(this), console.log);

		this.dataDP = function(){
			return {
				dp: [
					{label: t('pu.dash.metrics.sent'), data: this.data() ? this.data().sent[this.period()].data.map(function(d, i){ return [i, d]; }) : []},
					{label: t('pu.dash.metrics.acti'), data: this.data() ? this.data().actions[this.period()].data.map(function(d, i){ return [i, d]; }) : []},
				],
				ticks: this.data() ? this.data().sent[this.period()].keys.map(function(d, i){ return [i, d]; }) : []
			};
		};
		this.chartConfig = function(element, isInitialized){
			// element.style.height = element.clientWidth * 1 / 4 + 'px';
			element.style.height = '300px';
			// if (!isInitialized) {
				countlyCommon.drawGraph(this.dataDP(), element, 'bar', {legend: {show: false}});
			// }
		}.bind(this);
		this.tableConfig = function(element, isInitialized){
			if (!isInitialized) {
				var unprop = function(name, def, x, val, val2) { 
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
					fnServerData: function(sSource, aoData, fnCallback) {
						$.ajax({
							dataType: 'jsonp',
							type: 'POST',
							url: sSource,
							data: aoData,
							success: function(data) {
								data.aaData = this.messages(data.aaData.map(components.push.Message));
								fnCallback(data);
							}.bind(this)
						});
					}.bind(this),
					fnServerParams: function(aoData) {
						aoData.forEach(function(d){
							if (d.name === 'iSortCol_0') {
								d.value = ['messagePerLocale.default', 'appNames', 'result.status', 'created', 'created', 'date', 'date'][d.value];
							}
						});
						aoData.push( { name: 'source', value: this.source() } );
					}.bind(this),
					oLanguage: {
						sZeroRecords: t('pu.t.nothing'),
						sEmptyTable: t('pu.t.nothing'),
						sSearch: t('pu.t.search')
					},
					fnRowCallback: function(nRow, aData) {
						$(nRow).attr('mid', aData._id());
					},
					aoColumns: [
						{ mData: unprop.bind(null, 'messagePerLocale.default', ''), sName: 'message', mRender: CountlyHelpers.clip(), sTitle: t('pu.t.message') },
						{ mData: function(x){ return x.appNames().join(', '); }, sName: 'apps', sType: 'string', mRender: CountlyHelpers.clip(), sTitle: t('pu.t.apps'), bSearchable: false },
						{ mData: unprop.bind(null, 'result'), sName: 'status', sType: 'string', mRender:function(d, type, result) { 
							result = result.result;
							if (result.sending() && result.found) {
								return '<div class="bar" data-desc="' + d + '%">' +
										 '<div class="bar-inner" style="width:' + result.percentSent() + '%;" data-item="' + result.percentSent() + '%"></div>' +
										 '<div class="bar-inner" style="width:' + (100 - result.percentSent()) + '%;" data-item="' + (100 - result.percentSent()) + '%"></div> ' +
									 '</div>' +
									 '<div class="percent-text">' + t.p('push.count.sending', result.percentSent(), result.total() - (result.processed() - result.sent())) + '</div>';
							} else {
								return '<span>' + t('push.message.status.' + result.status()) + '</span>';
							}
						}, sTitle: t('pu.t.status'), bSearchable: false },
						{ mData: unprop.bind(null, 'dates.createdSeconds'), bVisible: false, sType: 'numeric', bSearchable: false },
						{ mData: unprop.bind(null, 'dates.created'), sName: 'created', sType: 'date', iDataSort: 3, sTitle: t('pu.t.created'), mRender: function(x){ return x.dates().created; }, bSearchable: false},
						{ mData: unprop.bind(null, 'dates.dateSeconds'), bVisible: false, sType: 'numeric', bSearchable: false },
						{ mData: unprop.bind(null, 'dates'), sName: 'sent', sType: 'string', iDataSort: 5, sTitle: t('pu.t.sent-scheduled'), mRender: function(local){
							var dates = local.dates();
							return dates.sent || dates.date;
						}, bSearchable: false }
					],
					aaSorting: [[4, 'asc']]
				}));

				this.dtable.find('tbody').on('click', 'tr', function (ev){
					var tr = null;
					do {
						tr = (tr || ev.target).parentElement;
					} while (tr && tr.tagName !== 'TR');

					if (tr) {
						var id = tr.attributes.mid.value,
							message = this.messages().filter(function(m){ return m._id() === id; });
						if (message.length) {
							m.startComputation();
							components.push.view.show(message[0]);
							m.endComputation();
						}
					}

				}.bind(this));
			}
		}.bind(this);

		this.refresh = function(){
			this.dtable.fnDraw(false);
		}.bind(this);

		this.message = function(ev) {
			ev.preventDefault();
			components.push.popup.show({apps: [countlyCommon.ACTIVE_APP_ID]});
		};
	};
	dash.view = function(ctrl){
		return m('.push-overview', [
			m.component(components.widget, {
				header: {
					title: 'pu.dash.users', 
					view: m('a.icon-button.btn-header.green[href=#]', {onclick: ctrl.message}, t('pu.dash.create'))
				},
				footer: {
					config: {class: 'condensed'},
					bignumbers: [
						{title: 'pu.dash.users.total', number: ctrl.data().users || 0},
						{title: 'pu.dash.users.enabl', number: ctrl.data().enabled || 0},
					]
				}
			}),

			m.component(components.widget, {
				header: {
					title: 'pu.dash.metrics',
					control: {
						component: components.segmented, 
						opts: {value: ctrl.period, options: [
							{value: 'weekly', title: t('pu.dash.weekly')},
							{value: 'monthly', title: t('pu.dash.monthly')}
						]}
					}
				},
				content: {
					view: m('.chart', {config: ctrl.chartConfig})
				},
				footer: {
					bignumbers: [
						{title: 'pu.dash.metrics.sent', number: ctrl.data() ? ctrl.data().sent[ctrl.period()].total : 0, color: true},
						{title: 'pu.dash.metrics.acti', number: ctrl.data() ? ctrl.data().actions[ctrl.period()].total : 0, color: true},
					]
				}
			}),

			m.component(components.widget, {
				header: {
					title: 'pu.dash.messages',
					control: {
						component: components.segmented, 
						opts: {class: 'large', value: ctrl.source, options: [
							{value: '', title: t('pu.dash.messages.all')},
							{value: 'api', title: t('pu.dash.messages.api')},
							{value: 'dash', title: t('pu.dash.messages.dash')}
						], onchange: ctrl.refresh}
					}
				},
				content: {
					view: m('table.d-table', {config: ctrl.tableConfig})
				}
			}),

		]);
	};
});

window.MessagingDashboardView = countlyView.extend({
	showOnGraph: 2,
	initialize:function () {
	},
	renderCommon:function () {
		// if (!this.mounted) {
			this.mounted = m.mount($('<div />').appendTo($(this.el))[0], components.push.dash);
		// }
	},
	refresh: function(){
		if (this.mounted) { this.mounted.refresh(); }
	}
});