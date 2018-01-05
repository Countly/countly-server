'use strict';

/* jshint undef: true, unused: true */
/* globals m */

window.component('delay', function(delay) {
	var MS_IN_HOUR = delay.MS_IN_HOUR = 1000 * 60 * 60,
		MS_IN_DAY = delay.MS_IN_DAY = MS_IN_HOUR * 24,
		t = window.components.t;

	delay.controller = function(opts){
		if (!(this instanceof delay.controller)) {
			return new delay.controller(opts);
		}

		this.opts = opts;
		this.value = typeof opts.value === 'function' ? opts.value : m.prop(opts.value || 0);
		this.days = m.prop(0);
		this.hours = m.prop(0);

		this.set = function(){
			this.days(Math.floor((this.value() || 0) / MS_IN_DAY));
			this.hours(Math.floor(((this.value() || 0) - this.days() * MS_IN_DAY) / MS_IN_HOUR));
		}.bind(this);

		this.reset = function() {
			this.days(parseInt(this.days()));
			this.hours(parseInt(this.hours()));

			if (isNaN(this.days()) || this.days() < 0) {
				this.days(0);
			}
			if (isNaN(this.hours()) || this.hours() < 0) {
				this.hours(0);
			}

			this.value(MS_IN_HOUR * (this.hours() || 0) + MS_IN_DAY * (this.days() || 0));
			this.days(Math.floor(this.value() / MS_IN_DAY));
			this.hours(Math.floor((this.value() - this.days() * MS_IN_DAY) / MS_IN_HOUR));
		}.bind(this);

		this.set();
	};
	delay.view = function(ctrl){
		return m('.comp-delay' + (ctrl.opts.class ? '.' + ctrl.opts.class : '') + (ctrl.opts.days && ctrl.opts.hours ? '' : '.single'), [
			ctrl.opts.days ?
				m('input[type=number][min=0].comp-delay-days', {value: ctrl.days(), oninput: m.withAttr('value', ctrl.days), onblur: ctrl.reset, placeholder: '0'})
				: '',
			ctrl.opts.days ?
				m('label.comp-delay-days', t.n('pu.days', ctrl.days()))
				: '',

			ctrl.opts.hours ?
				m('input[type="number"][min=0].comp-delay-hours', {value: ctrl.hours(), oninput: m.withAttr('value', ctrl.hours), onblur: ctrl.reset, placeholder: '0'})
				: '',
			ctrl.opts.hours ?
				m('label.comp-delay-hours', t.n('pu.hours', ctrl.hours()))
				: ''
		]);
	};
});
