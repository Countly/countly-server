'use strict';

var exports;

exports = module.exports = {
	EVENTS: {
		/** Sent by Child to Master in order to dispatch message to a particular Worker:
		 * {cmd: 'send', message: { ... }, credentials: [ ... ]}
		 */
		MASTER_SEND: 'master_send',

		/** Sent by Child to Master in order to abort message processing
		 * {cmd: 'abort', messageId: 'message ID'}
		 */
		MASTER_ABORT: 'master_abort',

		/** Sent by worker Child to Master in order to notify it about his progress in message processing
		 * {cmd: 'status', messageId: 'message ID', result: {status: Status.Aborted | Status.Processing | ..., streams: 1, sent: 123, total: 333[, warning: 'warning string'][, error: 'error string']}}
		 */
		MASTER_STATUS: 'master_status',

		/** Sent by worker Child to Master in order to change logging level
		 * {cmd: 'master_set_logging', enable: true}
		 */
		MASTER_SET_LOGGING: 'master_set_logging',

		/** Sent by Master to requesting Child to notify it about message status change (started, sent, aborted, partially sent)
		 * {cmd: 'update', messageId: 'message ID', result: {status: Status.Aborted | Status.Processing | ..., streams: 1, sent: 123, total: 333[, warning: 'warning string'][, error: 'error string']}}
		 */
		CHILD_STATUS: 'child_status',

		/** Sent by Master to sending Child in order to start sending message
		 * {cmd: 'process', message: { ... }, credentials: [ ... ]}
		 */
		CHILD_PROCESS: 'child_process',

		/** Sent by Master to sending Child in order to abort sending message
		 * {cmd: 'process', messageId: 'message ID', credentials: [ ... ]}
		 */
		CHILD_ABORT: 'child_abort',

		/** Sent by Master to all children to set logging level
		 * {cmd: 'child_set_logging', enable: true}
		 */
		CHILD_SET_LOGGING: 'child_set_logging',
	},
	SP: { 	// Events for internal use
		ERROR: 'pushly_internal_error',				// error occurred (see error.js)
		MESSAGE: 'pushly_internal_sent',			// notification is sent
		CLOSED: 'pushly_internal_closed',			// connection is closed
	},
	OPTIONS: {
		/** Send status update events each 1000 milliseconds */
		statusUpdatePeriod: 2000,
		/** Maintain (do not close immediately after sending) no more than 50 connections per worker */
		connections: 50,
		/** No more 50 messages can be sent simultaneously */
		concurrentMessages: 50,
		/** How much devices is required to open up additional connection within a worker (but no more than connectionsPerCredentials).
		 * 100 000 devices / 1000 = 100, but no more than 20 = 20 connections will be open when sending a message to 100 000 devices.
		 */
		connectionDivider: 10,
		/** 60 minute connection TTL */
		connectionTTL: 60 * 60 * 1000,
		/** 1 minute event TTL (waiting for tokens, freeing event loop, etc.) */
		eventTTL: 60 * 60 * 1000,
		/** Part of worker picking algorithm: ( (hasConnection ? 0 : priceOfConnection) + priceOfQueue * queueLength ) */
		priceOfConnection: 100,
		/** Part of worker picking algorithm: ( (hasConnection ? 0 : priceOfConnection) + priceOfQueue * queueLength ) */
		priceOfQueue: 10,
		/** How much connections can be closed or opened at once */
		maxImmediatePoolChange: 2,

		apn: {
			/** Maintain a signle connection per worker. */
			connectionsPerCredentials: 1,
			/** Send 100 or less requests each event loop (HTTP/2 streams) */
			transmitAtOnce: 100,
			/** Allow transmitAtOnce to change until eventLoopDelayToThrottleDown is met */
			transmitAtOnceAdjusts: true,
			/** If adjusts, for how much tops (HTTP/2 streams) */
			transmitAtOnceMaxAdjusted: 400,
			/** How much simultaneous requests can be in processing */
			maxRequestsInFlight: 999,
			/** How much certificates to hold in memory instead of reading from file */
			certificatesCache: 50,
			/** Keep no more than 50000 messages per connection in memory. Whenever sending is slower than messages stream,
			 * input stream will be throttled down (if using devicesQuery), or send method will just return false.
			 * Keep this option high.
			 */
			queue: 50000,
			/** Min event loop wait in ms smoothed at 10% (10 measurements) to skip processing in current loop */
			eventLoopDelayToThrottleDown: 300,
		},

		gcm: {
			/** Maintain (do not close immediately after sending) no more than 20 connections.
			 */
			connectionsPerCredentials: 20,
			/** How much GCM notifications to transmit in a batch for the same content */
			transmitAtOnce: 50,
			/** Allow transmitAtOnce to change until eventLoopDelayToThrottleDown is met */
			transmitAtOnceAdjusts: false,
			/** How much simultaneous requests can be in processing */
			maxRequestsInFlight: 50,
			/** Keep no more than 50000 messages per connection in memory. Whenever sending is slower than messages stream,
			 * input stream will be throttled down (if using devicesQuery), or send method will just return false.
			 * Keep this option high.
			 */
			queue: 50000,
			/** Min event loop wait in ms smoothed at 10% (10 measurements) to skip processing in current loop */
			eventLoopDelayToThrottleDown: 300,
		},

		/**
		 * Start with this number of connections
		 */
		initialConnectionPool: 1, 				// connections

		/**
		 * How often to check CPU & memory in order to prevent 100% utilization
		 */
		profilerCheckPeriod: 1, 				// seconds
		/**
		 * When CPU reaches this utilization, pushly will decrease pushing rates.
		 * When CPU is underutilized, pushing rates can be increased if necessary.
		 */
		profilerMaxCPU: 0.8,
		/**
		 * How wide pushing rate smoothing period should be
		 */
		ratesSmoothingPeriod: 10,		 		// seconds
		/**
		 * How much faster messages should come compared to outgoing rate to grow connection pool in a worker
		 */
		ratesConnectionPoolGrowRatio: 1.01, 	// 101 msgs/second incoming   /   100 msgs/second processed
		/**
		 * How much slower messages should come compared to outgoing rate to shrink connection pool in a worker
		 */
		ratesConnectionPoolShrinkRatio: 0.5, 	// 50  msgs/second incoming   /   100 msgs/second processed
		/**
		 * How much time to wait between decisions to grow / shrink connection pool
		 */
		ratesConnectionPoolCooldown: 2, 		// check->grow [2 seconds] check->grow [2 seconds] check->nope [2 seconds] ... check->shrink [2 seconds] check->shrink [2 seconds]
		/**
		 * How much time to wait between decisions to grow / shrink connection pool
		 */
		threadBatchSize: 1000, 					// when connection has queue of size less than batch size * 3, it gets a batch size - sized refill from its cluster
		/**
		 * Apart from ratesConnectionPoolGrowRatio, pool grows when number of messages left to send would take more than ratesToLeftSeconds seconds.
		 */
		ratesToLeftSeconds: 60, 				// 60 seconds or more to send queue with current rate -> grow
		ratesToLeftWeight: 0.25, 				// weight of ratesToLeftSeconds as opposed to growth / shrink ratio, 0.25 means that rates to left is 3 times less important than growth / shrink ratio
	},
};
