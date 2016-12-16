'use strict';

/* jshint undef: true, unused: true */
/* globals m, moment, jQuery, $ */

window.component('datepicker', function(datepicker) {
	var t = window.components.t;
	
	datepicker.controller = function(opts){
		if (!(this instanceof datepicker.controller)) {
			return new datepicker.controller(opts);
		}
		this.opts = opts;
		this.value = opts.date;
		this.open = opts.open || m.prop(false);
		this.tz = opts.tz;
		this.valueFormatter = opts.valueFormatter || function(d) { return moment(d).format('DD.MM.YYYY, HH:mm'); };
		this.disabled = opts.disabled || function(){ return false; };

		// if (!this.value() && opts.defaultDate) {
		// 	this.value(opts.defaultDate);
		// }

		this.hours = function(v) {
			if (this.value()) {
				if (v) {
					if (this.value() && !isNaN(parseInt(v))) {
						this.value().setHours(parseInt(v));
						return parseInt(v);
					}
				} else {
					return this.value().getHours();
				}
			}
			return new Date().getHours();
		}.bind(this);

		this.minutes = function(v) {
			if (this.value()) {
				if (v) {
					if (this.value() && !isNaN(parseInt(v))) {
						this.value().setMinutes(parseInt(v));
						return parseInt(v);
					}
				} else {
					return this.value().getMinutes();
				}
			}
			return 0;
		}.bind(this);

		this.ontz = function(ev) {
			if (ev && ev instanceof MouseEvent && ev.target.tagName.toLowerCase() === 'input') {
				return true;
			}
			this.tz(!this.tz());
			return true;
		}.bind(this);

	};

	datepicker.view = function(ctrl){
		return m('.comp-datepicker' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), {class: ctrl.open() ? 'active' : ''}, [
			m('.comp-datepicker-head', ctrl.disabled() ? {} : {onclick: ctrl.open.bind(ctrl, !ctrl.open())}, [
				m('svg[width=17][height=15]', [
					m('rect[x="4"][y="0"][fill="#AAAAAA"][width="1.6"][height="3.5"]'),
					m('rect[x="11.3"][y="0"][fill="#AAAAAA"][width="1.6"][height="3.5"]'),
					m('rect[x="3.2"][y="5.3"][fill="#AAAAAA"][width="2.4"][height="2.6"]'),
					m('rect[x="7.3"][y="5.3"][fill="#AAAAAA"][width="2.4"][height="2.6"]'),
					m('rect[x="11.3"][y="5.3"][fill="#AAAAAA"][width="2.4"][height="2.6"]'),
					m('rect[x="3.2"][y="9.7"][fill="#AAAAAA"][width="2.4"][height="2.6"]'),
					m('rect[x="7.3"][y="9.7"][fill="#AAAAAA"][width="2.4"][height="2.6"]'),
					m('rect[x="11.3"][y="9.7"][fill="#AAAAAA"][width="2.4"][height="2.6"]'),
					m('path[fill="none"][stroke="#AAAAAA"][stroke-width="1"][d="M2,0.9h13c1.1,0,2,0.9,2,2V13c0,1.1-0.9,2-2,2H2c-1.1,0-2-0.9-2-2V2.9C0,1.8,0.9,0.9,2,0.9z"]')
				]),
				// m('img[src="/images/ico.cal.png"]'),
				ctrl.value() ? 
					m('span.formatted', ctrl.valueFormatter(ctrl.value())) :
					m('span.formatted', t('datepicker.dt.click')),
				m('span.ion-chevron-down'),
			]),
			m('.picker', [
				m('.comp-datepicker-ui-picker', {config: datepicker.config(ctrl)}),
				m('.comp-datepicker-time', [
					m('span.comp-datepicker-time-label', 'Time'),
					m('input[type=number][min=0][max=23]', {value: ctrl.hours(), oninput: m.withAttr('value', ctrl.hours)}),
					m('span.comp-datepicker-time-spacer', ':'),
					m('input[type=number][min=0][max=59]', {value: ctrl.minutes(), oninput: m.withAttr('value', ctrl.minutes)})
				]),
				ctrl.tz ? 
					m('.comp-datepicker-tz', {onclick: ctrl.ontz}, [
						m('input[type=checkbox]', {onclick: ctrl.ontz, checked: ctrl.tz() ? 'checked' : undefined, onchange: ctrl.ontz}),
						m('label', t('datepicker.tz'))
					])
					: ''
			])
		]);
	};

	datepicker.config = function(ctrl) {
		return function(element, isInitialized) {
			if (typeof jQuery !== 'undefined' && typeof jQuery.fn.datepicker !== 'undefined') {
				if (!isInitialized) {
					$(element).datepicker({
						defaultDate: ctrl.opts.defaultDate,
						numberOfMonths:1,
						showOtherMonths:true,
						minDate:new Date(),
						onSelect:function (selectedDate) {
							var instance = $(this).data("datepicker"),
								date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);

							if (ctrl.hours()) {
								date.setHours(ctrl.hours());
							}
							if (ctrl.minutes()) {
								date.setMinutes(ctrl.minutes());
							}

							m.startComputation();
							ctrl.value(date);
							m.endComputation();
						}
					});
				}
			} else {
				console.warn('ERROR: No jQuery found when initializing comp-datepicker');    
			}
		};
	};
});
