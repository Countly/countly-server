module.exports = {
	mongodb: 'mongodb://localhost:27017/countly',

	ingest: {
		title: 'ingest',
		port: 2001,
		timeout: 5000,
	},

	api: {
		title: 'api',
		port: 3001,
		timeout: 120000
	}
};