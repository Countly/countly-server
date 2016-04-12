'use strict';

var util = require('util'),
	os = require('os'),
	EventEmitter = require('events').EventEmitter,
	ps = require('crazy-ps'),
	log = require('../../../../../api/utils/log.js')('push:profiler');

/**
 * Semiexponentially decaying moving average
 * @param {Float} initialFactor Initial factor of smoothing, gets smaller with groing number of samples
 * @param {Number} factorEasing Factor of easing the factor. factor = Math.min(initialFactor / log(factorEasing, count of records), factorEasing * initialFactor)
 */
var ValueSmoother = function(initialFactor, factorEasing) {
	this.factor = initialFactor || 0.1;
	this.easing = factorEasing || 10;
	this.value = 0;
	this.count = 0;

	this.push = function(val) {
		if (!this.count) {
			this.value = 1.0 * val;
		} else {
			var f = this.easedFactor();
			if (!isFinite((1.0 - f) * this.value + f * val)) {
				console.log('!!!!!!!!!!!!!!!!!!!!!!!! (1.0 - ' + f + ') * ' + this.value + ' + ' + f + ' * ' + val + ' ) !!!!!!!!!!!!!!!!!!!!!!!!!!!!');
			}
			this.value = (1.0 - f) * this.value + f * val;
		}
		this.count++;
	};

	this.easedFactor = function() {
		if (this.easing === 0 || this.count <= this.easing) { return this.factor; }
		else { return this.factor / (Math.log(this.count) / Math.log(this.easing)); }
	};
};

/**
 * Smoother wich measures frequency of events instead of value (see ValueSmoother)
 * @param {Number} sizeInSeconds Measurement window size in seconds
 */
var RateSmoother = function(sizeInSeconds) {
	ValueSmoother.call(this, 0.5, 0);
	this.size = sizeInSeconds * 1000;
	this.lastTick = 0;
	this.normalizedRate = 0.0;
	this.sum = 1;

	this.tick = function(count) {
		count = 1.0 * (typeof count === 'undefined' ? 1 : count);
		this.sum += count;
		if (!this.lastTick) {
			this.lastTick = Date.now();
		} else {
			var now = Date.now(),
				period = now - this.lastTick || 1,
				frequency = count * this.size / period;
			if (!isFinite(frequency)) {
				console.log('???????????????????????? ' + count + ' * ' + this.size + ' / ' + period + ' ???????????????????????????');
			}
			this.push(frequency);
			this.lastTick = now;
		}
	};

	this.secondsFromLastValue = function(){
		return 1.0 * (this.lastTick ? Date.now() - this.lastTick : 0) / 1000;
	};

	this.measurements = [];
	var measureId = 1;
	this.measure = function(durationInSeconds, clb) {
		var sum = this.sum, value = this.value, id = measureId++;

		this.measurements.push(id);
		setTimeout(function(){
			this.measurements.splice(this.measurements.indexOf(id), 1);
			clb((this.sum - sum) / durationInSeconds, value, this.value);
		}.bind(this), durationInSeconds * 1000);

		return id;
	};
};
util.inherits(RateSmoother, ValueSmoother);

var Counter = function() {
	this.count = 0;

	this.inc = function(count) {
		this.count += count || 1;
	};

	this.dec = function(count) {
		this.count -= count || 1;
	};
};

var ProcessProfiler = function(checkPeriod) {
	this.cpu = new ValueSmoother();
	this.memory = new ValueSmoother();
	this.loop = new ValueSmoother();
	this.closed = false;
	this.close = function(){ this.closed = true; };
	this.open = function(){ if (this.closed) { this.closed = false; process.nextTick(this.check.bind(this)); } };

	this.check = function() {
		try {
			var opts = { isNodeOnly: false };
			ps(this.mid || process.pid, opts, function (err, result) {
				var now = Date.now();
				setImmediate(function(){
					this.loop.push(Date.now() - now);
				}.bind(this)); 

				if (err) {
					console.error(err);
				} else {
					this.cpu.push(result.cpu);
					this.memory.push(os.freemem() / os.totalmem());
					log.d('CPU %j \t Memory %j \t loop %j \t process %j', this.cpu.value.toFixed(2), this.memory.value.toFixed(2), this.loop.value.toFixed(2), result);
				}
			}.bind(this));
		} catch (e) {
			log.w('Warning: could not check CPU amount because of %j', e);
		}
		if (!this.closed) { setTimeout(this.check.bind(this), checkPeriod); }
	};

	process.nextTick(this.check.bind(this));
};
util.inherits(ProcessProfiler, EventEmitter);

module.exports.RateSmoother = RateSmoother;
module.exports.ValueSmoother = ValueSmoother;
module.exports.Counter = Counter;
module.exports.ProcessProfiler = ProcessProfiler;