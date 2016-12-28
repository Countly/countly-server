'use strict';

/* jshint undef: true, unused: true */
/* globals m, CountlyHelpers */

window.component('credentials', function(credentials) {
	var components = window.components, 
		t = components.t;

	credentials.Credentials = function(data) {
		if (!(this instanceof credentials.Credentials)) {
			return new credentials.Credentials(data);
		}
		this._id = m.prop(data._id);
		this.type = m.prop(data.type);
		this.toJSON = function() {
			return {
				_id: this._id(),
				type: this.type()
			};
		};
	};

	credentials.app_component = function(platform, app) {
		return {
			controller: function(){
				this.platform = platform;
				this.app = app;
				this.creds = new credentials.Credentials(app[platform] && app[platform].length ? app[platform][0] : {type: platform === 'apn' ? 'apn_universal' : 'gcm'});

				this.remove = function(ev) {
					ev.preventDefault();
					this.app[this.platform] = [];
					this.creds = new credentials.Credentials({type: this.creds.type()});
				}.bind(this);

				this.cert = m.prop();
				this.passphrase = m.prop('');
				this.key = m.prop();

				this.validate = function(ev) {
					ev.preventDefault();
					if (!ev.target.attributes.disabled || ev.target.attributes.disabled.value === 'true') {
						return;
					}
					if (this.platform === 'apn') {
						if (this.cert() && this.cert().length === 1) {
							var reader = new window.FileReader();
							reader.addEventListener('load', function(){
								this._validate('i', this.creds.type(), reader.result, this.passphrase());
							}.bind(this));
							reader.readAsDataURL(this.cert()[0]);
						}
					} else {
						this._validate('a', this.creds.type(), this.key(), '');
					}
				}.bind(this);

				this._validate = function(platform, type, data, passphrase) {
					var loading = CountlyHelpers.loading(t('pu.validating'));
					components.push.remoteValidate(platform, type, data, passphrase).then(function(data){
						CountlyHelpers.removeDialog(loading);
						this.creds._id(data.cid);
					}.bind(this), function(err){
						// this.cert(null);
						// this.passphrase('');
						// this.key('');
						err = err.error || err;
						CountlyHelpers.removeDialog(loading);
						CountlyHelpers.alert(t('pu.validation.error') + ' ' + t('pu.validation.error.' + err, err));
					}.bind(this));
				};
			},
			view: function(ctrl){
				var edit = m('.comp-credentials-edit', [
					ctrl.creds._id() ? 
						m('div.existing', [
							m('.comp-credentials-type', t('pu.creds.type.' + ctrl.creds.type())),
							m('a.remove[href=#]', {onclick: ctrl.remove}, t('pu.remove'))
						])
						: m('div', [
							m('.comp-credentials-type', t('pu.creds.set.' + ctrl.creds.type())),
							ctrl.platform === 'apn' ? 
								m('.form', [
									m('input[type=file]', {onchange: m.withAttr('files', ctrl.cert)}),
									m('br'),
									m('input[type=text]', {oninput: m.withAttr('value', ctrl.passphrase), placeholder: t('pu.creds.pass')}),
									m('a.icon-button.light[href=#]', {onclick: ctrl.validate, disabled: !ctrl.cert()}, t('pu.validate'))
								])
								: m('.form', [
									m('input[type=text]', {oninput: m.withAttr('value', ctrl.key)}),
									m('a.icon-button.light[href=#]', {onclick: ctrl.validate, disabled: !ctrl.key()}, t('pu.validate'))
								])
						])
				]);
				return m('.comp-credentials', [
					ctrl.app._id ? 
						m('div', [
							m('.read', [
								ctrl.creds._id() ? 
									m('.comp-credentials-type', t('pu.creds.type.' + ctrl.creds.type()))
									: m('.comp-credentials-type.none', t('pu.creds.none'))
							]),
							m('.edit', [
								edit
							])
						])
						: 
						edit
				]);
			}
		};
	};
});
