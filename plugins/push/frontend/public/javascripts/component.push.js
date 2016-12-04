'use strict';

/* jshint undef: true, unused: true */
/* globals m, moment, vprop */

window.component('push', function(push) {
	push.C = {
		TYPE: {
			MESSAGE: 'message',
			DATA: 'data',
		},

		TAB: {
			APPS: 0,
			PLATFORMS: 1,
			TIME_N_LOC: 2,
			MESSAGE: 3
		},

		PLATFORMS: {
			IOS: 'i',
			ANDROID: 'a'
		}
	};

	push.ICON = {
		WARN: function(cls){ 
			cls = cls ? '.' + cls : '';
			return m('svg' + cls + '[width=21][height=18]', m('path[fill="#FF9E43"][d="M20,18c0.6,0,0.8-0.4,0.5-0.9L11,0.9c-0.3-0.5-0.7-0.5-1,0L0.5,17.1C0.2,17.6,0.4,18,1,18H20zM10,13h2v2h-2V13z M10,8h2v4h-2V8z"]')); 
		}
	};

	var t = window.components.t,
		URL_REGEXP = new RegExp( "([A-Za-z][A-Za-z0-9+\\-.]*):(?:(//)(?:((?:[A-Za-z0-9\\-._~!$&'()*+,;=:]|%[0-9A-Fa-f]{2})*)@)?((?:\\[(?:(?:(?:(?:[0-9A-Fa-f]{1,4}:){6}|::(?:[0-9A-Fa-f]{1,4}:){5}|(?:[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,1}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){3}|(?:(?:[0-9A-Fa-f]{1,4}:){0,2}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){2}|(?:(?:[0-9A-Fa-f]{1,4}:){0,3}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}:|(?:(?:[0-9A-Fa-f]{1,4}:){0,4}[0-9A-Fa-f]{1,4})?::)(?:[0-9A-Fa-f]{1,4}:[0-9A-Fa-f]{1,4}|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4})?::)|[Vv][0-9A-Fa-f]+\\.[A-Za-z0-9\\-._~!$&'()*+,;=:]+)\\]|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[A-Za-z0-9\\-._~!$&'()*+,;=]|%[0-9A-Fa-f]{2})*))(?::([0-9]*))?((?:/(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)|/((?:(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)?)|((?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)|)(?:\\?((?:[A-Za-z0-9\\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*))?(?:\\#((?:[A-Za-z0-9\\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*))?");

	push.Message = function(data) {
		if (!(this instanceof push.Message)) {
			return new push.Message(data);
		}

		var buildClearingProp = function() {
			var prop = m.prop.apply(m, arguments);
			return function(){
				if (arguments.length) {
					this._id(undefined);
					this.count(undefined);
					this.locales([]);
					return prop.apply(null, arguments);
				}
				return prop();
			}.bind(this);
		}.bind(this);

		// ID of tokens build when building audience
		this._id = m.prop(data._id);
		this.type = m.prop(data.type || push.C.TYPE.MESSAGE);
		this.apps = buildClearingProp(data.apps || []);
		this.platforms = buildClearingProp(data.platforms || []);
		this.date = m.prop(data.date);
		this.sent = m.prop(data.sent);
		this.sound = vprop(data.sound || 'default', function(v){ return !!v; }, t('pu.po.tab2.extras.sound.invalid'));
		this.badge = vprop(data.badge, function(v){ return v && (v + '') === (parseInt(v) + ''); }, t('pu.po.tab2.extras.badge.invalid'));
		this.url = vprop(data.url, function(v){ return v && URL_REGEXP.test(v); }, t('pu.po.tab2.extras.url.invalid'));
		this.data = vprop(typeof data.data === 'object' ? JSON.stringify(data.data) : data.data, function(v){
			try {
				var o = window.jsonlite.parse(v);
				return o && typeof o === 'object';
			} catch(e){
				return false;
			}
		}, t('pu.po.tab2.extras.data.invalid'));
		this.test = buildClearingProp(typeof data.test === 'undefined' ? false : data.test);

		this.userConditions = buildClearingProp(data.userConditions === '{}' ? undefined : data.userConditions);
		this.drillConditions = buildClearingProp(data.drillConditions === '{}' ? undefined : data.drillConditions);
		this.geo = buildClearingProp(data.geo || '');

		this.count = m.prop();
		this.locales = m.prop(data.locales || []);
		this.messagePerLocale = m.prop(data.messagePerLocale || {});

		this.result = new push.MessageResult(data.result || {});

		this.expiryDate = m.prop(data.expiryDate);
		this.appNames = m.prop(data.appNames || []);
		this.created = m.prop(data.created);
		this.saved = m.prop(false);

		if (this.apps().length && !this.appNames().length) {
			this.appNames(this.apps().map(function(id){ return window.countlyGlobal.apps[id].name; }));
		}

		this.availablePlatforms = function() {
			var platofrms = [];
			this.apps().forEach(function(id){
				var a = window.countlyGlobal.apps[id];
				if (a.apn && (a.apn.universal || a.apn.prod || a.apn.dev) && platofrms.indexOf(push.C.PLATFORMS.IOS) === -1) { platofrms.push(push.C.PLATFORMS.IOS); } 
				if (a.gcm && (a.gcm.key) && platofrms.indexOf(push.C.PLATFORMS.ANDROID) === -1) { platofrms.push(push.C.PLATFORMS.ANDROID); } 
			});
			return platofrms;
		};
		if (this.apps().length && !this.platforms().length) {
			this.platforms(this.availablePlatforms());
		}

		this.schedule = m.prop(false);

		this.ack = m.prop(false);
		
		this.remotePrepare = function(onFullBuild) {
			return m.request({
				method: 'GET',
				url: window.countlyCommon.API_URL + '/i/pushes/prepare',
				data: {
					api_key: window.countlyGlobal.member.api_key,
					args: JSON.stringify(this.toJSON(true))
				}
			}).then(function(data){
				this.setBuild(data);
				if (data.build && data.build.count) {
					if (onFullBuild) { onFullBuild(); }
				} else if (this._id()) {
					setTimeout(this.remotePrepare.bind(this, onFullBuild), 1000);
				}
			}.bind(this));
		};

		this.toJSON = function(includeId, includeOthers) {
			var obj = {
				apps: this.apps(),
				platforms: this.platforms(),
				userConditions: this.userConditions(),
				drillConditions: this.drillConditions(),
				geo: this.geo(),
				test: this.test()
			};
			if (includeId) {
				obj._id = this._id();
			}
			if (includeOthers) {
				obj.type = this.type();
				obj.messagePerLocale = this.messagePerLocale();
				obj.locales = this.locales();
				obj.sound = this.sound();
				obj.badge = this.badge();
				obj.url = this.url();
				obj.source = 'dash';
				obj.tz = this.tz();

				if (this.data()) {
					obj.data = typeof this.data() === 'string' ? JSON.parse(this.data()) : this.data();
				}
			}
			return obj;
		};

		this.remoteCreate = function() {
			return m.request({
				method: 'GET',
				url: window.countlyCommon.API_URL + '/i/pushes/create',
				data: {
					api_key: window.countlyGlobal.member.api_key,
					args: JSON.stringify(this.toJSON(true, true))
				}
			}).then(function(resp){
				if (resp.error) { throw resp.error; }
				return resp;
			});
		};

		this.remoteDelete = function() {
			return m.request({
				method: 'GET',
				url: window.countlyCommon.API_URL + '/i/pushes/delete',
				data: {
					api_key: window.countlyGlobal.member.api_key,
					_id: this._id()
				}
			}).then(function(resp){
				if (resp.error) { throw resp.error; }
				return resp;
			});
		};

		// Clear audience built previously
		this.remoteClear = function() {
			if (this._id()) {
				return m.request({
					method: 'GET',
					url: window.countlyCommon.API_URL + '/i/pushes/clear',
					data: {
						api_key: window.countlyGlobal.member.api_key,
						args: {
							_id: this._id()
						}
					}
				});
			} else {
				return Promise.resolve();
			}
		};

		this.setBuild = function(resp) {
			if (resp) {				
				this._id(resp._id);
				if (resp.build) {
					this.count(resp.build.total);
					
					if (resp.build.count) {
						var count = resp.build.count,
							locales = [];
						for (var l in count) {		// locale
							var ll = locales.filter(function(loc){ return loc.value === l; });
							if (ll.length) {
								ll[0].count += count[l];
							} else {
								var title = l === 'default' ? 'Default' : l === 'null' ? t('pu.locale.null') : window.countlyGlobalLang.languages[l] ? window.countlyGlobalLang.languages[l].englishName : l;
								locales.push({value: l, title: title, count: count[l]});
							}
						}
						var sum = 0;
						locales.forEach(function(l){ sum += l.count; });
						locales.sort(function(a, b){ return b.count - a.count; });
						locales.unshift({value: 'default', title: t('pu.locale.default'), count: sum});
						locales.forEach(function(l){ l.percent = Math.round(l.count / sum * 100); });

						this.locales(locales);
					} else if (!this.locales().length) {
						this.locales([{value: 'default', title: t('pu.locale.default'), percent: 100}]);
					}
				}
			} else {
				this._id(undefined);
				this.count(0);
				this.locales([]);
			}
		};

		this.date = m.prop(data.date || null);
		this.tz = m.prop(data.tz || false);
		this.created = m.prop(data.created || null);
		this.sent = m.prop(data.sent || null);
		this.dates = function() {
			var dates = {
			    created: moment(this.created()).format("D MMM, YYYY HH:mm"),
			    createdSeconds: moment(this.created()).unix()
			};

			if (this.date()) {
			    dates.date = moment(this.date()).format("D MMM, YYYY HH:mm");
			    dates.dateSeconds = moment(this.date()).unix();
			}
			if (this.sent()) {
			    dates.sent = moment(this.sent()).format("D MMM, YYYY HH:mm");
			    dates.dateSeconds = moment(this.sent()).unix();
			}

			return dates;
		};
		this.createdSeconds = function() {
			return this.dateDate() ? new Date(this.dateDate()).getTime() : null;
		};
		this.createdSeconds = function() {
			return this.date() ? new Date(this.date()).getTime() : null;
		};
	};

	push.MessageResult = function(data) {
		this.status = m.prop(data.status || 0);
		this.total = m.prop(data.total || data.found || 0);
		this.processed = m.prop(data.processed || 0);
		this.sent = m.prop(data.sent || 0);
		this.errors = m.prop(data.errors || 0);
		this.actioned = m.prop(data.actioned || 0);
		this.error = m.prop(data.error);
		this.errorCodes = m.prop(data.errorCodes);

		this.percentSent = function() {
			return this.total() === 0 ? 0 : Math.min(100, +(100 * this.sent() / (this.found() - (this.processed() - this.sent()))).toFixed(2));
		};

		this.sending = function() {
			return (this.status() & 4) > 0 && (this.status() & (16 | 32)) === 0;
		};
	};

	push.remoteDashboard = function(appId, refresh) {
		if (!push.dashboard || push.dashboard.app_id !== appId || refresh) {
			return m.request({
				method: 'GET',
				url: window.countlyCommon.API_URL + '/i/pushes/dashboard',
				data: {
					api_key: window.countlyGlobal.member.api_key,
					app_id: appId
				}
			}).then(function(data){
				data.app_id = appId;
				push.dashboard = data;
				return data;
			});
		} else {
			return Promise.resolve(push.dashboard);
		}
	};

	push.remoteValidate = function(platform, type, key, secret) {
		var data = new FormData();
		data.append('platform', platform);
		data.append('type', type);
		data.append('key', key);
		data.append('secret', secret);

		return m.request({
			method: 'POST',
			url: window.countlyCommon.API_URL + '/i/pushes/validate?api_key=' + window.countlyGlobal.member.api_key,
			data: data,
			serialize: function(data) { return data; }
		});
	};

});
