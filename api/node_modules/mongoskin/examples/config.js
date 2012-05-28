var mongoskin = require('../lib/mongoskin/');

require('myconsole').replace();

exports.db = mongoskin.db('localhost/test');
