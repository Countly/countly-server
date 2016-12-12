'use strict';

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
		return {
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
			created: this.created,
			test: this.test,
			build: this.build
		};
	}

	static load (db, _id) {
		return new Promise((resolve, reject) => {
			db.collection('messages').findOne({_id: typeof _id === 'string' ? db.ObjectID(_id) : _id}, (err, message) => {
				if (err || !message) { reject(err || 'Not found'); } 
				else { resolve(new Note(message)); }
			});
		});
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
				if (typeof this.sound !== 'undefined') {
					compiled.aps.sound = this.sound;
				}
				if (typeof this.badge !== 'undefined') {
					compiled.aps.badge = this.badge;
				}
				if (this.contentAvailable) {
					compiled.aps['content-available'] = 1;
				}
				if (this.data) {
					for (let k in this.data) { compiled[k] = this.data[k]; }
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

				if (this.data) {
					var flattened = flattenObject(this.data);
					for (let k in flattened) { compiled.data[k] = flattened[k]; }
				}
				if (this.category) {
					compiled.data['c.c'] = this.content.category;
				}
				return compiled;
			}
		}
	}

	appsub (idx, appsubcreds) {
		return new AppSubNote(this, idx, appsubcreds);
	}
}

/**
 * Class constructed from subjob data and used in job process
 */
class AppSubNote {
	constructor(note, idx, appsubcreds) {
		// initial case
		if (note && note.compile) {
			this._id = note._id;
			this.idx = idx;
			this.content = note.compile(appsubcreds.platform);
			this.creds = appsubcreds;
			if (note.userConditions || note.drillConditions) {
				this.query = {};
				if (note.userConditions) { this.query.user = JSON.stringify(note.userConditions); }
				if (note.drillConditions) { this.query.drill = JSON.stringify(note.drillConditions); }
			}
		// from job data
		} else if (note && note._id) {
			this._id = note._id;
			this.idx = note.idx;
			this.content = typeof note.content === 'string' ? JSON.parse(note.content) : note.content;
			this.creds = note.creds;
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
		return {
			_id: this._id,
			idx: this.idx,
			content: JSON.stringify(this.content),
			creds: this.creds,
			query: this.query
		};
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

