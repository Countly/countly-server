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
		this.value = opts.value;
		this.date = m.prop(opts.defaultDate ? new Date(opts.defaultDate.getTime()) : new Date());
		this.open = opts.open || m.prop(false);
		this.valueFormatter = opts.valueFormatter || function(d) { return moment(d).format('DD.MM.YYYY, HH:mm'); };
		this.disabled = opts.disabled || function(){ return false; };

		this.setHours = function(v){
			v = parseInt(v);
		
			if (isNaN(v)) {
				return;
			}

			this.date().setHours(Math.max(0, Math.min(23, v)));
		}.bind(this);

		this.setMinutes = function(v){
			v = parseInt(v);

			if (isNaN(v)) {
				return;
			}

			this.date().setMinutes(Math.max(0, Math.min(59, v)));
		}.bind(this);

		this.hours = function(){
			return ('00' + this.date().getHours()).slice(-2);
		};

		this.minutes = function(){
			return ('00' + this.date().getMinutes()).slice(-2);
		};

		this.apply = function(ev){
			ev.stopPropagation();
			this.value(new Date(this.date().getTime()));
			this.open(false);
		}.bind(this);

		this.clear = function(ev){
			ev.stopPropagation();
			this.value(undefined);
			this.open(false);
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
			m('.comp-datepicker-head', {onclick: function(ev) {
				if (ctrl.opts.onclick) {
					ctrl.opts.onclick(ev);
				}
				ctrl.open(!ctrl.open());
			}}, [
				m('i.material-icons', {}, 'date_range'),
				ctrl.value() ? 
					m('span.formatted', ctrl.valueFormatter(ctrl.value())) :
					m('span.formatted', t('datepicker.dt.click')),
				m('span.ion-chevron-down'),
			]),
			m('.picker', {
				class : ctrl.opts.position === "top" ? "on-top" : "",
				config: function(element, isInitialized) {
					if (!isInitialized) {
						var parent = element.parentElement.clientWidth || 180;
						element.style['margin-left'] = (parent - 205 - 10) + 'px';
					}
				}
			}, [
				m('.comp-datepicker-ui-picker', {config: datepicker.config(ctrl)}),
				m('.comp-datepicker-time', [
					m('span.comp-datepicker-time-label', t('datepicker.pick-time') + ': '),
					m('input[type=number][min=0][max=23]', {value: ctrl.hours(), oninput: m.withAttr('value', ctrl.setHours)}),
					m('span.comp-datepicker-time-spacer', ':'),
					m('input[type=number][min=0][max=59]', {value: ctrl.minutes(), oninput: m.withAttr('value', ctrl.setMinutes)})
				]),
				m('.comp-datepicker-apply', [
					m('div', [
						m('.icon-button.dark', { onclick: ctrl.clear }, t('datepicker.clear')),
						m('.icon-button.green', { onclick: ctrl.apply }, t('datepicker.apply'))
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
						minDate: ctrl.opts.minDate,
						maxDate: ctrl.opts.maxDate,
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
							ctrl.date(date);
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