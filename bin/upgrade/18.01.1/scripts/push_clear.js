var pluginManager = require('../../../../plugins/pluginManager.js'),
	countlyDb = pluginManager.dbConnection();

countlyDb.onOpened(() => {
	countlyDb._native.listCollections().toArray((err, names) => {
		if (names) {
			names = names.map(n => n.name).filter(n => n.indexOf('push_') === 0);
			if (names.length) {
				console.log('Dropping ' + names.length + ' "push_*" collections in 5 seconds. Exit to skip. ');
				setTimeout(() => {
					Promise.all(names.map(n => countlyDb._native.collection(n).drop())).then(() => {
						console.log('...done');
						countlyDb.close();
					}, err => {
						console.error('error: %j', err);
						countlyDb.close();
					})
				}, 5000);
				return;
			}
		}

		countlyDb.close();
	});
})
