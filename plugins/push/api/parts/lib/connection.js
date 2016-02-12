'use strict';

var util = require('util'),
	EventEmitter = require('events').EventEmitter,
	M = require('./message.js'),
	prof = require('./profiler.js'),
	constants = require('./constants'),
	SP = constants.SP,
	DEFAULTS = constants.OPTIONS,
	log = require('../../../../../api/utils/log.js')('push:connection'),
	platforms = {};

platforms[M.Platform.APNS] = require('./apn.js');
platforms[M.Platform.GCM] = require('./gcm.js');
// platforms[M.Platform.GCM] = require('./test.js');


var Connection = function(cluster, idx, credentials, profiler) {
	log.d('[%j|%j]: New connection', idx, credentials.id);
	this.idx = idx;
	this.inflow = new prof.RateSmoother(DEFAULTS.ratesSmoothingPeriod);
	this.drain = new prof.RateSmoother(DEFAULTS.ratesSmoothingPeriod);
	this.counter = new prof.Counter();
	this.lastEvent = Date.now();
	// this.inflow = stats.meter('inflow');
	// this.drain = stats.meter('drain');
	// this.inflow.tick = this.inflow.mark;
	// this.drain.tick = this.drain.mark;

	this.connection = new platforms[credentials.platform](credentials, profiler, idx);

	// Notification is sent (one or more tokens)
	this.connection.on(SP.MESSAGE, function(messageId, size){
		this.lastEvent = Date.now();
		this.drain.tick(size > 0 ? size : 1);
		cluster.clusterDrain.tick(size > 0 ? size : 1);
		this.counter.dec(size);
		// debug('[%j:%j] Sent %d messages (rate %j : %j)', idx, credentials.id, size, this.drain.value.toFixed(2), cluster.clusterDrain.value.toFixed(2));
		// debug('[%j:%j] Sent %j message %j', idx, credentials.id, messageId, size);
		cluster.emit(SP.MESSAGE, this, messageId, size);
	}.bind(this));

	this.connection.on(SP.ERROR, function(error){
		log.d('Connection error %j', arguments);
		this.lastEvent = Date.now();
		cluster.emit(SP.ERROR, this, error);
	}.bind(this));

	this.connection.on(SP.CLOSED, function(){
		this.lastEvent = Date.now();
		log.d('Connection says it\'s closed');

		var i = cluster.connections.indexOf(this);
		if (i !== -1) {
			log.d('Removing connection at index %j', i);
			cluster.connections.splice(i, 1);
		}

		if (cluster.connections.length === 0) {
			log.d('No connections in cluster, will closing it in %dms if no connections added');
			setTimeout(function(){
				if (cluster.connections.length === 0) {
					log.d('No connections anymore, cluster closed');
					cluster.emit(SP.CLOSED, cluster);
				}
			}, 2 * DEFAULTS.connectionTTL);
		}
	}.bind(this));
};

Connection.prototype.send = function(messageId, content, encoding, expiry, device, locale){
	this.inflow.tick();
	var ret = this.connection.send(messageId, content, encoding, expiry, device, locale);
	if (ret !== -1) { this.counter.inc(1); }
	return ret;
};

Connection.prototype.add = function(notification){
	this.inflow.tick();
	this.counter.inc(1);
	this.connection.notifications.push(notification);
};

Connection.prototype.close = function(clb){
	log.d('closing connection');
	this.closed = true;
	this.connection.close(clb);
};

Connection.prototype.abort = function(msg){
	this.connection.abort(msg);
};

var Cluster = function(credentials, profiler) {
	this.idx = 0;
	this.clusterInflow = new prof.RateSmoother(DEFAULTS.ratesSmoothingPeriod);
	this.clusterDrain = new prof.RateSmoother(DEFAULTS.ratesSmoothingPeriod);
	this.profiler = profiler;
	this.queue = [];
	// this.clusterInflow = stats.meter('clusterInflow');
	// this.clusterDrain = stats.meter('clusterDrain');
	// this.clusterInflow.tick = this.clusterInflow.mark;
	// this.clusterDrain.tick = this.clusterDrain.mark;
	// this.clusterJson = stats.toJSON();
	this.credentials = credentials;
	this.connections = [];
	this.connectionsClosing = 0;
	log.d('[0|%j]: New cluster', credentials.id);
};
util.inherits(Cluster, EventEmitter);

Cluster.prototype.close = function(){
	if (!this.queue.length) {
		if (!this.closing) {
			log.d('Going to close the cluster on timeout after %dms', 2 * DEFAULTS.connectionTTL);
			this.closing = setTimeout(function(){
				if (!this.queue.length) {
					log.d('Cluster is closing on timeout');
					this.closed = true;
					this.emit(SP.CLOSED, this);
				}
			}.bind(this), 2 * DEFAULTS.connectionTTL);
		}
	} else if (this.closing) {
		clearTimeout(this.closing);
		this.closing = undefined;
	}
};

Cluster.prototype.canGrow = function(){
	return this.profiler.cpu.value < DEFAULTS.profilerMaxCPU;
};

Cluster.prototype.canChangePool = function(){
	return  (this.queue.length > 0 || this.countAllConnections() > 0) &&
			(!this.connectionsLastChanged || Date.now() - this.connectionsLastChanged > DEFAULTS.ratesConnectionPoolCooldown * 1000);
};

Cluster.prototype.shouldGrow = function(){
	// return this.canGrow() &&
		   // this.clusterJson.clusterInflow.currentRate / this.clusterJson.clusterDrain.currentRate > DEFAULTS.ratesConnectionPoolGrowRatio;
	return this.canGrow() &&
		   this.clusterInflow.secondsFromLastValue() < 1 &&
		   this.clusterInflow.value / this.clusterDrain.value > DEFAULTS.ratesConnectionPoolGrowRatio;
};

Cluster.prototype.shouldShrink = function(){
	// return this.clusterJson.clusterInflow.currentRate / this.clusterJson.clusterDrain.currentRate < 0.5;
	return this.clusterInflow.secondsFromLastValue() > DEFAULTS.connectionTTL / 3 ||
		   this.clusterInflow.value / this.clusterDrain.value < 0.5;
};

Cluster.prototype.grow = function(){
	log.d('[0|%j] Growing pool to %j connections', this.credentials.id, this.connections.length + 1);
	this.connections.push(new Connection(this, this.idx++, this.credentials, this.profiler));
	this.connectionsLastChanged = Date.now();
	return this.connections[this.connections.length - 1];
};

Cluster.prototype.send = function(messageId, content, encoding, expiry, device, locale){
	this.clusterInflow.tick();

	this.queue.push([messageId, content, encoding, expiry, device, locale]);

	this.serviceImmediate();

	return this.wow();
};

Cluster.prototype.wow = function(){
	if (((this.queue.length + this.countAllConnections()) > DEFAULTS.queue) || this.profiler.cpu.value > DEFAULTS.profilerMaxCPU) {
		return 'such no power much sad';
	} else {
		return 'much happy so message';
	}
};

Cluster.prototype.serviceImmediate = function() {
	if (!this.servicingImmediate) {
		this.servicingImmediate = true;
		setImmediate(function(){
			this.servicingImmediate = false;
			this.service();
		}.bind(this));
	}
};

Cluster.prototype.countAllConnections = function() {
	var count = 0;
	if (this.connections && this.connections.length) {
		for (var i = this.connections.length - 1; i >= 0; i--) {
			count += this.connections[i].counter.count;
		}
	}
	return count;
};

Cluster.prototype.service = function() {
	this.nextTickService = false;
	if (this.queue.length === 0 && this.connections.length === 0) { 
		this.stopMonitor();
		return; 
	} else {
		this.startMonitor();
	}
	if (this.connections.length === 0) { 
		var growTo = DEFAULTS.initialConnectionPool || 1;
		while (growTo--) { this.grow(); }
	}

	if (this.canChangePool()) {
		this.measuring = this.measuring || this.clusterDrain.measure(DEFAULTS.ratesConnectionPoolCooldown * 2, function(oldRate){
			var rate = this.clusterInflow.value / this.clusterDrain.value,
				tota = this.connections.length - this.connectionsClosing,
				diff = Math.min(Math.round(rate * tota), DEFAULTS.connectionsPerCredentials) - tota,
				left = this.countAllConnections() / oldRate,
				difc = diff, diffMax;

			log.d('------------ Measured rate %d, pool size is %d, rate is %j, left %j seconds (CPU %j, memory %j, process memory %j)', oldRate, tota, rate, left, this.profiler.cpu.value.toFixed(2), this.profiler.memory.value.toFixed(2), process.memoryUsage());

			if (oldRate > 1 && left > DEFAULTS.ratesToLeftSeconds) {
				log.d('------------ Old measured diff is %j', diff);
				diff = Math.min(
					Math.round((rate * (1 - DEFAULTS.ratesToLeftWeight) + left / DEFAULTS.ratesToLeftSeconds * DEFAULTS.ratesToLeftWeight)) * tota - tota, 
					DEFAULTS.connectionsPerCredentials
				);
				log.d('------------ New measured diff is %j', diff);
			}

 			if (oldRate > 1 && tota + diff > 0) {
				log.d('------------ Measured rate %d before changing pool size from %d to %d (CPU %j, memory %j)', oldRate, tota, tota + diff, this.profiler.cpu.value.toFixed(2), this.profiler.memory.value.toFixed(2));
	
				if (diff > 0) {
					diffMax = Math.min(difc, DEFAULTS.maxImmediatePoolChange);
					while (diffMax-- > 0) { this.grow(); }
				} else if (diff < 0) {
					diffMax = Math.max(difc, -DEFAULTS.maxImmediatePoolChange);
					while (diffMax++ < 0) { this.closeConnection(); }
				}

				this.measuring = this.clusterDrain.measure(DEFAULTS.ratesConnectionPoolCooldown * 2, function(newRate){
					tota = this.connections.length - this.connectionsClosing;
					this.measuring = false;

					log.d('------------ Measured rate %d after changing pool size to %d', newRate, tota);

					var rateRate = newRate / oldRate,
						rateDiff = Math.min(Math.round(rateRate * tota), DEFAULTS.connectionsPerCredentials) - tota;

					log.d('------------ Rate diff is %d', rateDiff);

					if (rateDiff > 0 && this.queue.length) {
						diffMax = Math.min(rateDiff, DEFAULTS.maxImmediatePoolChange);
						while (diffMax-- > 0) { this.grow(); }
					} else if (rateDiff < 0) {
						diffMax = Math.max(rateDiff, -DEFAULTS.maxImmediatePoolChange);
						while (this.connections.length - this.connectionsClosing > 1 && (diffMax++ < 0)) { this.closeConnection(); }
					}

				}.bind(this));
			} else {
				this.measuring = false;
			}

		}.bind(this));
	} else {
		log.d('Cannot change pool: %j / %j, %j / %j', this.queue.length > 0, this.countAllConnections(), this.connectionsLastChanged, Date.now());
	}

	for (var i = this.connections.length - 1; i >= 0; i--) {
		var c = this.connections[i], batch = DEFAULTS.threadBatchSize;
		if (c.counter.count < batch * 3) {
			while (batch-- && this.queue.length) {
				var msg = this.queue.shift();
				if (c.send.apply(c, msg) === -1) {
					log.d('Connection %d doesn\'t accept messages, closing', c.idx);
					this.queue.push(msg);
					this.closeConnection(i);
					this.serviceImmediate();
					return;
				}
			}
		}

		if (c.counter.count === 0) {
			log.d('Connection [%j:%j] is empty, closing with notes in flight %d', c.idx, this.credentials.id, c.connection.notesInFlight);
			this.closeConnection(i);
		}
	}

	if (this.connections.length) {
		setTimeout(this.serviceImmediate.bind(this), 1000 * DEFAULTS.ratesConnectionPoolCooldown);
	}

	// var index = Math.floor(Math.random() * this.connections.length);
	// this.connections[index].send(messageId, content, encoding, expiry, device, locale);
};

Cluster.prototype.closeConnection = function(idx){
	var index;
	if (typeof idx === 'number' && idx < this.connections.length) {
		index = idx;
		log.d('[0|%j] Shrinking pool idx %d', this.credentials.id, idx);
	} else if (idx instanceof Connection) {
		index = this.connections.indexOf(idx);
		if (idx === -1) {
			return;
		}
	} else {
		var min = this.leastLoadedConnectionIndex();
		if (min !== -1) { index = min; }
		log.d('[0|%j] Shrinking pool using least loaded %d', this.credentials.id, index);
	}

	if (index !== -1 && typeof index !== 'undefined') {
		log.d('[0|%j] Shrinking pool to %j connections (closing %d)', this.credentials.id, this.connections.length - 1, index);
		var connection = this.connections[index];
		this.connectionsClosing++;
		connection.close(function(notes){
			log.d('[0|%j] Shrinked pool to %j connections (%d notes left), removing connection', this.credentials.id, this.connections.length - 1, notes ? notes.length : 0);
			var i = this.connections.indexOf(connection), j;
			if (i !== -1) {
				this.connections.splice(i, 1);
			}

			this.connectionsClosing--;

			if (notes && notes.length) {
				if (this.closed) {
					log.d('[0|%j] Loosing %d notifications because cluster is closed', this.credentials.id, notes.length);
					return;
				}

				for (i = 0; i < this.connections.length; i++) {
					if (!this.connections[i].closed) {
						log.d('[0|%j] %d notifications will be moved into connection %d', this.credentials.id, notes.length, i);
						for (j = notes.length - 1; j >= 0; j--) {
						 	this.connections[i].add(notes[j]);
						}
					 	return;
					}
				}

				log.d('[0|%j] Growing back by 1 because %d notifications need to be placed somewhere', this.credentials.id, notes.length);
				var newConnection = this.grow();
				for (j = notes.length - 1; j >= 0; j--) {
					newConnection.add(notes[j]);
				}
			}
		}.bind(this));

		this.connectionsLastChanged = Date.now();
	}
};

Cluster.prototype.abort = function(msg){
	for (var i = this.connections.length - 1; i >= 0; i--) {
		this.connections[i].abort(msg);
	}
};

Cluster.prototype.leastLoadedConnectionIndex = function(){
	return this._loadedConnectionIndex(true);
};

Cluster.prototype.mostLoadedConnectionIndex = function(){
	return this._loadedConnectionIndex(false);
};

Cluster.prototype._loadedConnectionIndex = function(min){
	var value = min ? Number.MAX_VALUE : -1, index = -1;
	for (var i = this.connections.length - 1; i >= 0; i--) {
	 	if ((min && this.connections[i].inflow.value < value) || (!min && this.connections[i].inflow.value > value)) {
	 		index = i;
	 	}
	 }

 	return index;
};

Cluster.prototype.stopMonitor = function() {
	this.monitoring = false;
};

Cluster.prototype.startMonitor = function(seconds) {
	if (this.monitoring) { return; }

	this.monitoring = true;
	var f = function() {
		if (this.lastMonitored && (Date.now() - this.lastMonitored) < 1000) { 
			this.monitoringTimeout = this.monitoringTimeout || setTimeout(resettingF, seconds * 1000);
			return;
		}
		if (this.clusterInflow.secondsFromLastValue() > 1) {
			this.clusterInflow.tick(0);
		}
		for (var i = this.connections.length - 1; i >= 0; i--) {
			var c = this.connections[i];
			if (c.inflow.secondsFromLastValue() > 1) {
				c.inflow.tick(0);
			}
			if (this.queue.length === 0 && c.counter.count === 0 && !c.closed) {
				log.d('[%j:%j] Closing connection from monitor', c.idx, this.credentials.id);
				this.closeConnection(c);
			} else if (c.lastEvent < (Date.now() - 10000)) {
				log.d('[%j:%j] Closing connection from monitor because it appeared to be stuck', c.idx, this.credentials.id);
				this.closeConnection(c);
			}
			log.d('[%j:%j] left %d \t inflow %j (%d) ||| drain %j (%d)', c.idx, this.credentials.id, c.counter.count, c.inflow.value.toFixed(2), c.inflow.sum, c.drain.value.toFixed(2), c.drain.sum);
		}
		if (this.queue.length === 0 && this.countAllConnections() === 0) {
			log.d('No more messages in queue & connections, closing cluster after timeout');
			this.close();
		}
		this.lastMonitored = Date.now();
		log.d('[cluster]: inflow %j / drain %j, %j in queue, %j in connections', this.clusterInflow.value.toFixed(2), this.clusterDrain.value.toFixed(2), this.queue.length, this.countAllConnections());
		log.d('[system]: CPU %j / memory %j', this.profiler.cpu.value.toFixed(2), this.profiler.memory.value.toFixed(2));

		var now = Date.now();
		setImmediate(function(){
			log.d('[loop]: %j', Date.now() - now);
		}); 

		if (!this.closed) {
			if (this.monitoring) { 
				this.monitoringTimeout = this.monitoringTimeout || setTimeout(resettingF, seconds * 1000);
			}
			this.serviceImmediate();
		}
	}.bind(this), resettingF = function(){
		this.monitoringTimeout = undefined;
		f.apply(this, []);
	}.bind(this);

	process.nextTick(f);
};

module.exports = Cluster;

module.exports.clearFromCredentials = function(key) {
	log.d('clearFromCredentials %j', key);
	platforms[M.Platform.APNS].clearFromCredentials(key);
};
