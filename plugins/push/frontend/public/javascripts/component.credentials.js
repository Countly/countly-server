'use strict';

/* jshint undef: true, unused: true */
/* globals m, CountlyHelpers */

window.component('credentials', function(credentials) {
	var components = window.components, 
		t = components.t,
		SEPARATOR = '[CLY]';

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

	credentials.app_component = function(platform, app, type) {
		return {
			controller: function(){
				this.platform = platform;
				this.app = app;
				this.creds = new credentials.Credentials(app[platform] && app[platform].length ? app[platform][0] : {type: type ? type : platform === 'apn' ? 'apn_token' : 'gcm'});

				this.remove = function(ev) {
					ev.preventDefault();
					this.app[this.platform] = [];
					this.creds = new credentials.Credentials({type: this.creds.type()});
				}.bind(this);

				this._cert = m.prop();
				this.cert = function(v){
					if (typeof v !== 'undefined' && v.length === 1) {
						var match = v[0].name.match(/AuthKey_([A-Z0-9]{10})\.p8/);
						if (match && match[1] && !this.apn_key()) {
							this.apn_key(match[1]);
						}
						this._cert(v);
					}
					return this._cert();
				}.bind(this);
				this.passphrase = m.prop('');
				this.key = m.prop();

				if (platform === 'apn') {
					this.apn_key = m.prop('');
					this.apn_team = m.prop('');
					this.apn_bundle = m.prop('');

					this.apn_type = new components.segmented.controller({
						value: this.creds.type,
						options: [
							{value: 'apn_token', title: t('pu.creds.apn.type.apn_token')},
							{value: 'apn_universal', title: t('pu.creds.apn.type.apn_universal')}
						]
					});
				}

				this.isReadyForValidation = function(){
					if (this.creds.type() === 'gcm') {
						return !!this.key();
					} else if (this.creds.type() === 'apn_universal') {
						return !!this.cert() && this.cert().length === 1 && this.cert()[0].name.endsWith('.p12');
					} else if (this.creds.type() === 'apn_token') {
						return !!this.cert() && this.cert().length === 1 && this.cert()[0].name.endsWith('.p8') && this.apn_key() && this.apn_team() && this.apn_bundle();
					} else {
						return false;
					}
				}.bind(this);

				this.validate = function(ev) {
					ev.preventDefault();
					if (!ev.target.attributes.disabled || ev.target.attributes.disabled.value === 'true') {
						return;
					}
					if (this.platform === 'apn') {
						if (this.cert() && this.cert().length === 1) {
							var reader = new window.FileReader();
							reader.addEventListener('load', function(){
								var secret = this.creds.type() === 'apn_universal' ? this.passphrase() : [this.apn_key(), this.apn_team(), this.apn_bundle()].join(SEPARATOR);
								this._validate('i', this.creds.type(), reader.result, secret);
							}.bind(this));
							reader.readAsDataURL(this.cert()[0]);
						}
					} else {
						this._validate('a', this.creds.type(), this.key(), '');
					}
				}.bind(this);

				this._validate = function(platform, type, data, secret) {
					var loading = CountlyHelpers.loading(t('pu.validating'));
					components.push.remoteValidate(platform, type, data, secret).then(function(data){
						CountlyHelpers.removeDialog(loading);
						this.creds._id(data.cid);
					}.bind(this), function(err){
						// this.cert(null);
						// this.passphrase('');
						// this.key('');
						err = err.error || err.result || err;
						CountlyHelpers.removeDialog(loading);
						CountlyHelpers.alert(t('pu.validation.error') + ' ' + t('pu.validation.error.' + err, t('push.errorCode.' + err + '.desc', err)));
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
							// m('.comp-credentials-type', t('pu.creds.set.' + ctrl.creds.type())),
							ctrl.platform === 'apn' ? 
								m('.form', [
									components.segmented.view(ctrl.apn_type),
									m('br'),
									ctrl.creds.type() === 'apn_universal' ? 
										m('.comp-push-box', [
											m('.comp-push-box-cell', [m('label', t('pu.creds.cert')), m('input[type=file]', {onchange: m.withAttr('files', ctrl.cert)})]),
											m('.comp-push-box-cell', [m('label', t('pu.creds.pass')), m('input[type=password]', {oninput: m.withAttr('value', ctrl.passphrase), placeholder: t('pu.creds.pass')})]),
										])
										: m('.comp-push-box', [
											m('.comp-push-box-cell', [m('label', t('pu.creds.auth_key')), m('input[type=file]', {onchange: m.withAttr('files', ctrl.cert)})]),
											m('.comp-push-box-cell', [m('label', t('pu.creds.key_id')), m('input[type=text]', {value: ctrl.apn_key(), oninput: m.withAttr('value', ctrl.apn_key), placeholder: t('pu.creds.key_id')})]),
											m('.comp-push-box-cell', [m('label', t('pu.creds.team_id')), m('input[type=text]', {value: ctrl.apn_team(), oninput: m.withAttr('value', ctrl.apn_team), placeholder: t('pu.creds.team_id')})]),
											m('.comp-push-box-cell', [m('label', t('pu.creds.bundle_id')), m('input[type=text]', {value: ctrl.apn_bundle(), oninput: m.withAttr('value', ctrl.apn_bundle), placeholder: t('pu.creds.bundle_id')})]),
										]),
									m('br.clearfix'),
									m('a.icon-button.light[href=#]', {onclick: ctrl.validate, disabled: !ctrl.isReadyForValidation()}, t('pu.validate'))
								])
								: m('.form', [
									m('input[type=text]', {oninput: m.withAttr('value', ctrl.key), placeholder: t('pu.creds.set.gcm')}),
									m('a.icon-button.light[href=#]', {onclick: ctrl.validate, disabled: !ctrl.isReadyForValidation()}, t('pu.validate'))
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
