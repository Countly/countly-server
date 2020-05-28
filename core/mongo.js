const MongoClient = require('mongodb').MongoClient;

class MongoService {
    constructor(config) {
        this.config = config;
    }

    connect() {
        return new Promise((res, rej) => {
            if (this.client && this.client.isConnected) {
                return this.client.db('countly');
            }
            else {
                MongoClient.connect(this.config, (err, client) => {
                    if (err) {
                        rej(err);
                    }
                    else {
                        this.client = client;
                        res(client);
                    }
                });
            }
        });
    }

    disconnect() {
        return this.client && this.client.isConnected ? this.client.close() : Promise.resolve();
    }
}

module.exports = MongoService;