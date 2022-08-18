/* eslint-disable no-console */
/* global localforage */


(function(countlyIndexedDbService) {

    var DB_NAME = "countly";

    localforage.config({
        name: DB_NAME,
        description: "Countly local indexed database."
    });

    var IndexedDbService = {
        stores: {},
        setItem: function(name, key, value) {
            var self = this;
            return new Promise(function(resolve, reject) {
                if (!self.stores[name]) {
                    reject(new Error("Unable to find '" + name + "' store"));
                    return;
                }
                self.stores[name].setItem(key, value)
                    .then(resolve)
                    .catch(function(error) {
                        console.error("Error occurred when setting item at store " + name + ":" + error);
                        reject(error);
                    });
            });
        },
        getItemByKey: function(name, key) {
            var self = this;
            return new Promise(function(resolve, reject) {
                if (!self.stores[name]) {
                    reject(new Error("Unable to find '" + name + "' store"));
                    return;
                }
                self.stores[name].getItem(key)
                    .then(resolve)
                    .catch(function(error) {
                        console.error("Error occurred when getting item by key at store " + name + ":" + error);
                        reject(error);
                    });
            });
        },
        getItems: function(name) {
            var self = this;
            var storeRows = [];
            return new Promise(function(resolve, reject) {
                if (!self.stores[name]) {
                    reject(new Error("Unable to find '" + name + "' store"));
                    return;
                }
                self.stores[name].iterate(function(value, key) {
                    storeRows.push({key: key, value: value});
                }).then(function() {
                    resolve(storeRows);
                }).catch(function(error) {
                    console.error("Error occurred when getting all items at store " + name + ":" + error);
                    reject(error);
                });
            });
        },
        dropStore: function(name) {
            var self = this;
            return new Promise(function(resolve, reject) {
                localforage.dropInstance({
                    name: DB_NAME,
                    storeName: name
                }).then(function() {
                    self.stores[name] = undefined;
                    resolve();
                }).catch(function(error) {
                    console.error("Error occurred when droping store " + name + ":", error);
                    reject(error);
                });
            });
        },
        createStore: function(name) {
            if (this.stores[name]) {
                return;
            }
            this.stores[name] = localforage.createInstance({
                name: DB_NAME,
                storeName: name
            });
        },
        clearStore: function(name) {
            var self = this;
            return new Promise(function(resolve, reject) {
                if (!self.stores[name]) {
                    resolve();
                    return;
                }
                self.stores[name].clear().then(resolve).catch(function(error) {
                    console.error("Error occurred when clearing store " + name + ":" + error);
                    reject(error);
                });
            });
        }
    };
    Object.assign(countlyIndexedDbService, IndexedDbService);
})(window.countlyIndexedDbService = window.countlyIndexedDbService || {});
