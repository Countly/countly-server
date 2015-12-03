'use strict';

/**
 * Log provides a wrapper over debug or console functions with log level filtering, module filtering and ability to store log in database.
 * Uses configuration require('../config.js').logging:
 * {
 *	'info': ['app', 'auth', 'static'],		// log info and higher level for modules 'app*', 'auth*', 'static*'
 *	'debug': ['api.users'],					// log debug and higher (in fact everything) for modules 'api.users*'
 * 	'default': 'warn',						// log warn and higher for all other modules
 * }
 * Note that log levels supported are ['debug', 'info', 'warn', 'error']
 *
 * Usage is quite simple:
 * var log = require('common.js').log('module[:submodule[:subsubmodule]]');
 * log.i('something happened: %s, %j', 'string', {obj: 'ect'});
 * log.e('something really bad happened: %j', new Error('Oops'));
 *
 * Whenever DEBUG is in process.env, log outputs all filtered messages with debug module instead of console so you could have pretty colors in console.
 * In other cases only log.d is logged using debug module.
 * 
 * To control log level at runtime, call require('common.js').log.setLevel('events', 'debug'). From now on 'events' logger will log everything.
 *
 * There is also a handy method for generating standard node.js callbacks which log error. Only applicable if no actions in case of error needed:
 * collection.find().toArray(log.callback(function(arg1, arg2){ // all good }));
 * - if error didn't happen, function is called
 * - if error happened, it will be logged, but function won't be called
 * - if error happened, arg1 is a first argument AFTER error, it's not an error
 */

var prefs = require('../config.js').logging,
	colors = require('colors'),
	deflt = (prefs && prefs.default) ?  prefs.default : 'error';

for (var level in prefs) {
	if (prefs[level].sort) { prefs[level].sort(); }
}

var styles = {
	moduleColors: {
//		'push:*api': 0 // green
		'[last]': -1
	},
	colors: ['green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'red'],
	stylers: {
		warn: function(args) {
			for (var i = 0; i < args.length; i++) {
				if (typeof args[i] === 'string') { args[i] = colors.bgYellow.black(args[i].black); }
			}
		},
		error: function(args) {
			for (var i = 0; i < args.length; i++) {
				if (typeof args[i] === 'string') { args[i] = colors.bgRed.white(args[i].white); }
			}
		}
	}
};

/**
 * Returns logger function for given preferences
 * @param prefix add prefix to message
 * @param enabled whether function should log anything
 * @param outer this for @out
 * @param out output function (console or debug)
 * @api private
 */
var log = function(level, prefix, enabled, outer, out, styler) {
	return function() {
		if (enabled()) {
			var args = Array.prototype.slice.call(arguments, 0);
			var color = styles.moduleColors[prefix];
			if (color === undefined) {
				color = (++styles.moduleColors['[last]']) % styles.colors.length;
				styles.moduleColors[prefix] = color;
			}
			color = styles.colors[color];
			if (styler) {
				args[0] = new Date().toISOString() + ': ' + level + '\t' + '[' + (prefix || '') + ']\t' + args[0];
				styler(args);
			} else {
				args[0] = (new Date().toISOString() + ': ' + level + '\t').gray + colors[color]('[' + (prefix || '') + ']\t') + args[0];
			}
			// args[0] = (new Date().toISOString() + ': ' + (prefix || '')).gray + args[0];
			// console.log('Logging %j', args);
			if (typeof out === 'function') { out.apply(outer, args); }
			else {
				for (var k in out) { out[k].apply(outer, args); }
			}
		}
	};
};

/**
 * Looks for logging level in config for a particular module
 * @param name module name
 * @api private
 */
var logLevel = function(name) {
	if (typeof prefs === 'undefined') { return 'error'; }
	else if (typeof prefs === 'string') { return prefs; }
	else {
		for (var level in prefs) {
			if (typeof prefs[level] === 'string' && name.indexOf(prefs[level]) === 0) { return level; }
			if (typeof prefs[level] === 'object' && prefs[level].length ) {
				for (var i = prefs[level].length - 1; i >= 0; i--) {
					var opt = prefs[level][i];
					if (opt === name || name.indexOf(opt) === 0) { return level; }
				}
				// for (var m in prefs[level]) {
				// 	if (name.indexOf(prefs[level][m]) === 0) { return level; }
				// }
			}
		}
		return deflt;
	}
};

/**
 * Current levels for all modules
 */
var levels = {
	// mongo: 'info'
};

var setLevel = function(module, level) {
	levels[module] = level;
};

var setDefault = function(level) {
	deflt = level;
};

var getLevel = function(module) {
	return levels[module];
};

var getEnabledWithLevel = function(acceptable, module) {
	return function(){
		// if (acceptable.indexOf(levels[module]) === -1) {
		// 	console.log('Won\'t log %j because %j doesn\'t have %j', module, acceptable, levels[module]);
		// }
		return acceptable.indexOf(levels[module] || deflt) !== -1;
	};
};

var ipcHandler = function(msg){
	var m, l, modules, i;

	if (!msg || msg.cmd !== 'log' || !msg.config) {
		return;
	}

	console.log('%d: Setting logging config to %j', process.pid, msg.config);

	if (msg.config.default) {
		deflt = msg.config.default;
	}

	for (m in levels) {
		var found = null;
		for (l in msg.config) { 
			modules = msg.config[l].split(',').map(function(v){ return v.trim(); });

			for (i = 0; i < modules.length; i++) {
				if (modules[i] === m) {
					found = l;
				}
			}
		}

		if (found === null) {
			for (l in msg.config) { 
				modules = msg.config[l].split(',').map(function(v){ return v.trim(); });

				for (i = 0; i < modules.length; i++) {
					if (modules[i].indexOf('*') === -1 && modules[i] === m.split(':')[0]) {
						found = l;
					} else if (modules[i].indexOf('*') !== -1 && modules[i].split(':')[1] === '*' && modules[i].split(':')[0] === m.split(':')[0]) {
						found = l;
					}
				}
			}
		}

		if (found !== null) {
			levels[m] = found;
		} else {
			levels[m] = deflt;
		}
	}
};

module.exports = function(name) {
	setLevel(name, logLevel(name));
	// console.log('Got level for ' + name + ': ' + levels[name], typeof debug(name));
	return {
		d: log('DEBUG', name, getEnabledWithLevel(['debug'], name), this, console.log),
		i: log('INFO', name, getEnabledWithLevel(['debug', 'info'], name), this, console.info),
		w: log('WARN', name, getEnabledWithLevel(['debug', 'info', 'warn'], name), this, console.warn, styles.stylers.warn),
		e: log('ERROR', name, getEnabledWithLevel(['debug', 'info', 'warn', 'error'], name), this, console.error, styles.stylers.error),
		callback: function(next){
			var self = this;
			return function(err) {
				if (err) { self.e(err); }
				else if (next) {
					var args = Array.prototype.slice.call(arguments, 1);
					next.apply(this, args);
				}
			};
		},
	};
	// return {
	// 	d: log('DEBUG\t', getEnabledWithLevel(['debug'], name), this, debug(name)),
	// 	i: log('INFO\t', getEnabledWithLevel(['debug', 'info'], name), this, debug(name)),
	// 	w: log('WARN\t', getEnabledWithLevel(['debug', 'info', 'warn'], name), this, debug(name)),
	// 	e: log('ERROR\t', getEnabledWithLevel(['debug', 'info', 'warn', 'error'], name), this, debug(name)),
	// 	callback: function(next){
	// 		var self = this;
	// 		return function(err) {
	// 			if (err) { self.e(err); }
	// 			else if (next) {
	// 				var args = Array.prototype.slice.call(arguments, 1);
	// 				next.apply(this, args);
	// 			}
	// 		};
	// 	},
	// };
};

module.exports.setLevel = setLevel;
module.exports.setDefault = setDefault;
module.exports.getLevel = getLevel;
module.exports.ipcHandler = ipcHandler;
