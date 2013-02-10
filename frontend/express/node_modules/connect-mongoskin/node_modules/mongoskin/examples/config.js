var mongoskin = require('../lib/mongoskin/');

exports.db = mongoskin.db('localhost/test');

mongoskin.db('localhost', { database: 'test' });
