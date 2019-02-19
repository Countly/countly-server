const ipc = require('./ipc.js'),
	os = require('os'),
	cluster = require('cluster');

process.on('uncaughtException', (err) => {
    console.log('uncaughtException on process %d', process.pid, err.stack);
});


if (cluster.isMaster) {
	console.log('master', process.pid);
	const workerCount = 1 || os.cpus().length, workers = [];

	for (let i = 0; i < workerCount; i++) {
	    const worker = cluster.fork();
	    workers.push(worker);
	}

	let central = new ipc.Central('can', (data, needsreply) => {
		console.log('<<< master: %j', data);
		if (data === 'read') {
			return 'reply';
		} else if (data === 'one') {
			return 'onereply';
		} else if (data === 'two') {
			return 'tworeply';
		} else if (data === 'three') {
			return 'threereply';
		} else if (needsreply) {
			return 'needsreply';
		}
	});
} else {
	console.log('worker', process.pid);

	let worker = new ipc.CentralWorker('can', data => {
		console.log('<<< worker %d: %j', process.pid, data);
	});

	worker.send('inc1');

	setTimeout(() => {
		console.log('------------ reading "read" ------------------ ')
		worker.read('read').then(resp => {
			console.log('<<< worker read response %d: %j', process.pid, resp);
		}, err => {
			console.log('<<< worker read err %d: %j', process.pid, err);
		});
	}, 1000);

	setTimeout(() => {
		console.log('------------ reading "smth" ------------------')
		worker.read('smth').then(resp => {
			console.log('<<< worker read response %d: %j', process.pid, resp);
		}, err => {
			console.log('<<< worker read err %d: %j', process.pid, err);
		});
	}, 2000);

	setTimeout(() => {
		console.log('------------ reading "smth" 3 times ------------------')
		worker.read('one').then(resp => {
			console.log('<<< worker read one response %d: %j', process.pid, resp);
		}, err => {
			console.log('<<< worker read one err %d: %j', process.pid, err);
		});
		worker.read('two').then(resp => {
			console.log('<<< worker read two response %d: %j', process.pid, resp);
		}, err => {
			console.log('<<< worker read two err %d: %j', process.pid, err);
		});
		worker.read('three').then(resp => {
			console.log('<<< worker read three response %d: %j', process.pid, resp);
		}, err => {
			console.log('<<< worker read three err %d: %j', process.pid, err);
		});
	}, 3000);

	setTimeout(() => {
		worker.remove();

		console.log('------------ reading timeout ------------------')
		worker.read('smth').then(resp => {
			console.log('<<< worker read response %d: %j', process.pid, resp);
		}, err => {
			console.log('<<< worker read err %d: %j', process.pid, err);
		});;
	}, 4000);
}
