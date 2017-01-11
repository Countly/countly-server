'use strict';

const log = require('../../../../api/utils/log.js')('push:note');

/**
 * ENUM for message statuses.
 */
const Status = {
	Initial:        0,          // 0  Nothing happened yet
	Preparing:      1,          // 1  Preparing
	InQueue:        1 << 1,     // 2  Master level
	InProcessing:   1 << 2,     // 4  Worker level
	Done:           1 << 3,     // 8  Done on worker level
	Error:          1 << 4,     // 16 Some error occurred during processing
	Aborted:        1 << 5,     // 32 Unrecoverable (credentials or message format) error occurred, or you just send message abort request
};

/**
 * ENUM for supported platforms.
 */
const Platform = {
	APNS: 'i',
	GCM: 'a'
};

const DEFAULT_EXPIRY = 1000 * 60 * 60 * 24 * 7;

/** 
 * Main notification class, stored in messages
 */
class Note {

	constructor (data) {
		this._id = data._id;
		this.type = data.type;
		this.apps = data.apps;
		this.appNames = data.appNames;
		this.platforms = data.platforms;
		this.userConditions = typeof data.userConditions === 'string' ? JSON.parse(data.userConditions) : data.userConditions;
		this.drillConditions = typeof data.drillConditions === 'string' ? JSON.parse(data.drillConditions) : data.drillConditions;
		this.source = data.source;              					// api or dash
		this.geo = data.geo;                    					// ID of geo object
		this.messagePerLocale = data.messagePerLocale;      		// Map of localized messages
		this.locales = data.locales;      							// Map locale-percentage
		this.collapseKey = data.collapseKey;           				// Collapse key for Android
		this.contentAvailable = data.contentAvailable;      		// content-available for iOS
		this.delayWhileIdle = data.delayWhileIdle;        			// delay_while_idle for Android
		this.url = data.url;                   						// url to open
		this.data = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;  // Custom data
		this.sound = data.sound;                 					// Sound
		this.badge = data.badge;                					// Badge
		this.test = data.test;                						// Test
		this.date = data.date;                						// Date to be sent on
		this.tz = data.tz;                							// Send in user timezones

		this.result = {
			status: data.result ? data.result.status || Status.Initial : Status.Initial,
			total: 0,
			processed: 0,
			sent: 0,
			error: null,
		};

		this.expiryDate = parseDate(data.expiryDate) || new Date(Date.now() + DEFAULT_EXPIRY);     // one week by default
		this.created = parseDate(data.created) || new Date();
		this.build = data.build;
	}

	get id () { return '' + this._id; }

	toJSON () {
		var json = {
			_id: this._id,
			type: this.type,
			apps: this.apps,
			appNames: this.appNames,
			platforms: this.platforms,
			userConditions: this.userConditions ? JSON.stringify(this.userConditions) : undefined,
			drillConditions: this.drillConditions ? JSON.stringify(this.drillConditions) : undefined,
			source: this.source,
			geo: this.geo,
			messagePerLocale: this.messagePerLocale,
			collapseKey: this.collapseKey,
			contentAvailable: this.contentAvailable,
			delayWhileIdle: this.delayWhileIdle,
			url: this.url,
			data: this.data ? JSON.stringify(this.data) : undefined,
			sound: this.sound,
			badge: this.badge,
			result: this.result,
			expiryDate: this.expiryDate,
			date: this.date,
			tz: this.tz,
			created: this.created,
			test: this.test,
			build: this.build
		};

		Object.keys(json).forEach(k => {
			if (json[k] === null || json[k] === undefined) {
				delete json[k];
			}
		});
		
		return json;
	}

	static load (db, _id) {
		return new Promise((resolve, reject) => {
			db.collection('messages').findOne({_id: typeof _id === 'string' ? db.ObjectID(_id) : _id}, (err, message) => {
				if (err || !message) { reject(err || 'Not found'); } 
				else { resolve(new Note(message)); }
			});
		});
	}

	schedule (db, jobs) {
		// build already finished, lets schedule the job
		if (this.date && this.tz !== false && this.build.tzs.length) {
			var batch = new Date(this.date.getTime() + (this.tz - this.build.tzs[0]) * 60000);
			log.d('Scheduling message with date %j to be sent in user timezones (tz %j, tzs %j): %j', this.date, this.tz, this.build.tzs, batch);
			jobs.job('push:send', {mid: this._id}).once(batch);
			db.collection('messages').updateOne({_id: this._id}, {$set: {'result.status': Status.InQueue, 'result.nextbatch': batch}}, log.logdb('when updating message status with inqueue'));
		} else if (this.date) {
			log.d('Scheduling messag %j to be sent on date %j',this._id, this.date);
			jobs.job('push:send', {mid: this._id}).once(this.date);
			db.collection('messages').updateOne({_id: this._id}, {$set: {'result.status': Status.InQueue}}, log.logdb('when updating message status with inqueue'));
		} else {
			log.d('Scheduling message %j to be sent immediately', this._id);
			jobs.job('push:send', {mid: this._id}).now();
		}
	}

	save (db) {
		return new Promise((resolve, reject) => {
			if (!this._id) { this._id = new db.ObjectID(); }

			db.collection('messages').save(this.toJSON(), (err) => {
				if (err) { reject(err); }
				else { resolve(this); }
			});
		});
	}

	compile (platform, message) {
		if (this.platforms.indexOf(platform) === -1) { throw new Error('No such platform: ' + platform); }

		var compiled;

		if (typeof message === 'undefined') {
			if (this.messagePerLocale) {
				var content = {};
				Object.keys(this.messagePerLocale).forEach(k => content[k] = this.compile(platform, this.messagePerLocale[k]));
				return content;
			} else {
				return {
					default: this.compile(platform, null)
				};
			}
		} else {
			if (platform === Platform.APNS) {
				compiled = {
					aps: {},
				};
				if (message) {
					compiled.aps.alert = message;
				}
				if (this.sound !== undefined && this.sound !== null) {
					compiled.aps.sound = this.sound;
				}
				if (this.badge !== undefined && this.badge !== null) {
					compiled.aps.badge = this.badge;
				}
				if (this.contentAvailable || (!compiled.aps.alert && !compiled.aps.sound)) {
					compiled.aps['content-available'] = 1;
				}
				if (this.data) {
					for (let k in this.data) { compiled[k] = this.data[k]; }
				}

				if (Object.keys(compiled.aps).length === 0) {
					delete compiled.aps;
				}

				if (!compiled.c) { 
					compiled.c = {}; 
				}
				compiled.c.i = this._id + '';
				
				if (this.url) {
					compiled.c.l = this.url;
				}

				return JSON.stringify(compiled);
			} else {
				compiled = {};
				if (this.collapseKey) {
					compiled.collapse_key = this.collapseKey;
				}

				compiled.time_to_live = Math.round((this.expiryDate.getTime() - Date.now()) / 1000);
				if (this.delayWhileIdle === true) {
					compiled.delay_while_idle = true;
				}

				compiled.data = {};
				if (message) {
					compiled.data.message = message;
				}

				if (this.sound !== undefined && this.sound !== null) {
					compiled.data.sound = this.sound;
				}
				if (this.badge !== undefined && this.badge !== null) {
					compiled.aps.badge = this.badge;
				}

				if (!message && (this.sound === undefined || this.sound === null)) {
					compiled.data['c.s'] = 'true';
				}

				if (this.data) {
					var flattened = flattenObject(this.data);
					for (let k in flattened) { compiled.data[k] = flattened[k]; }
				}
				compiled.data['c.i'] = this._id + '';
				
				if (this.url) {
					compiled.data['c.l'] = this.url;
				}
				
				return compiled;
			}
		}
	}

	appsub (idx, appsubcreds, plan) {
		return new AppSubNote(this, idx, appsubcreds, plan);
	}
}

/**
 * Class constructed from subjob data and used in job process
 */
class AppSubNote {
	constructor(note, idx, appsubcreds, plan) {
		// initial case
		if (note && note.compile) {
			this._id = note._id;
			this.idx = idx;
			this.date = note.date;
			this.tz = note.tz;
			this.mintz = note.build ? note.build.mintz : undefined;
			this.content = note.compile(appsubcreds.platform);
			this.creds = appsubcreds;
			if (typeof plan !== 'undefined') {
				this.plan = plan;
			}
			if (note.userConditions || note.drillConditions) {
				this.query = {};
				if (note.userConditions) { this.query.user = typeof note.userConditions === 'string' ? JSON.parse(note.userConditions) : note.userConditions; }
				if (note.drillConditions) { this.query.drill = typeof note.drillConditions === 'string' ? JSON.parse(note.drillConditions) : note.drillConditions; }
			}
		// from job data
		} else if (note && note._id) {
			this._id = note._id;
			this.idx = note.idx;
			this.date = note.date ? new Date(note.date) : undefined;
			this.tz = note.tz;
			this.mintz = note.mintz;
			this.content = typeof note.content === 'string' ? JSON.parse(note.content) : note.content;
			this.creds = note.creds;
			if (note.plan) {
				this.plan = note.plan;
			}
			if (note.query) {
				this.query = {};
				if (note.query.userConditions) { this.query.userConditions = JSON.parse(note.query.userConditions); }
				if (note.query.drillConditions) { this.query.drillConditions = JSON.parse(note.query.drillConditions); }
			}
		} else {
			throw new Error('Illegal arguments for AppSubNote constructor: ' + JSON.stringify(arguments));
		}
	}

	get id () { return this._id + '|' + this.idx + '::' + this.creds.id; }

	toJSON () {
		var json = {
			_id: this._id,
			idx: this.idx,
			date: this.date,
			tz: this.tz,
			mintz: this.mintz,
			content: JSON.stringify(this.content),
			creds: this.creds,
			query: this.query ? {} : undefined,
			plan: this.plan
		};

		if (this.query && this.query.user) {
			json.query.user = JSON.stringify(this.query.user);
		}
		if (this.query && this.query.drill) {
			json.query.drill = JSON.stringify(this.query.drill);
		}
		return json;
	}
}

var flattenObject = function(ob) {
	var toReturn = {};

	for (var i in ob) {
		if (!ob.hasOwnProperty(i)) continue;

		if ((typeof ob[i]) === 'object' && ob[i] !== null) {
			var flatObject = flattenObject(ob[i]);
			for (var x in flatObject) {
				if (!flatObject.hasOwnProperty(x)) continue;

				toReturn[i + '.' + x] = flatObject[x];
			}
		} else {
			toReturn[i] = ob[i];
		}
	}
	return toReturn;
};

var parseDate = function(d) {
	if (d instanceof Date) { return d; } 
	if (typeof d === 'string' && d) { return new Date(d); }
	if (typeof d === 'number' && d) { return new Date(d); }
	return d;
};

module.exports = {
	Platform: Platform,
	Status: Status,
	Note: Note,
	AppSubNote: AppSubNote
};

