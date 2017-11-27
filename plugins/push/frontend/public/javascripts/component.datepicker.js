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

		this.setHours = function(v){
			
			if(isNaN(parseInt(v)))
				return;

			if(v > 23)
				v = v % 10;
			this.value().setHours(parseInt(v));
		}.bind(this);

		this.setMinutes = function(v){
			if(isNaN(parseInt(v)))
				return;

			if(v > 59)
				v = v % 10;
			this.value().setMinutes(parseInt(v));
		}.bind(this);

		this.hours = function(){
			var hours = this.value() ? this.value().getHours() : new Date().getHours();
			return hours > 9 ? hours : "0" + hours.toString();
		}

		this.minutes = function(){
			var minutes = this.value() ? this.value().getMinutes() : new Date().getMinutes();
			return minutes > 9 ? minutes : "0" + minutes.toString();
		}

		this.ontz = function(ev) {
			if (ev && ev instanceof MouseEvent && ev.target.tagName.toLowerCase() === 'input') {
				return true;
			}
			this.tz(!this.tz());
			return true;
		}.bind(this);

	};

	datepicker.view = function(ctrl){
		return m('.comp-datepicker' + (ctrl.opts.class ? '.' + ctrl.opts.class : ''), 
		{
			class: ctrl.open() ? 'active' : '',
			config : function(elm){
				
				$(window).unbind('click.' + ctrl.opts.id).bind('click.' + ctrl.opts.id,  function(e){
					var container = $(elm);
					if (container && !container.is(e.target) && container.has(e.target).length === 0) {
                        ctrl.open(false);
                    }
				});
			}
		}, [
			m('.comp-datepicker-head', ctrl.disabled() ? {} : {onclick: ctrl.open.bind(ctrl, !ctrl.open())}, [
				m('i.material-icons', {}, 'date_range'),
				ctrl.value() ? 
					m('span.formatted', ctrl.valueFormatter(ctrl.value())) :
					m('span.formatted', t('datepicker.dt.click')),
				m('span.ion-chevron-down'),
			]),
			m('.picker', {
				class : ctrl.opts.position === "top" ? "on-top" : ""
			}, [
				m('.comp-datepicker-ui-picker', {config: datepicker.config(ctrl)}),
				m('.comp-datepicker-time', [
					m('span.comp-datepicker-time-label', t('datepicker.pick-time') + ': '),
					m('input[type=number][min=0][max=23]', {value: ctrl.hours(), oninput: m.withAttr('value', ctrl.setHours)}),
					m('span.comp-datepicker-time-spacer', ':'),
					m('input[type=number][min=0][max=59]', {value: ctrl.minutes(), oninput: m.withAttr('value', ctrl.setMinutes)})
				]),
				ctrl.tz ? 
					m('.comp-datepicker-tz', {onclick: ctrl.ontz}, [
						m('input[type=checkbox]', {onclick: ctrl.ontz, checked: ctrl.tz() ? 'checked' : undefined, onchange: ctrl.ontz}),
						m('label', t('datepicker.tz'))
					])
					: '',
				m('.comp-datepicker-apply', [
					m('div', [
						m('.icon-button.green', { onclick: ctrl.open.bind(ctrl, false) }, t('datepicker.apply'))
					])
				])
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