/* eslint-disable no-console */
/* global localforage, Promise */


(function(countlyIndexedDbService) {

    var DB_NAME = "countly";

    localforage.config({
        name: DB_NAME,
        description: "Countly local indexed database."
    });

    var IndexedDbService = {
        stores: {},
        setItem: function(name, key, value) {
            this.stores[name].setItem(key, value);
        },
        getItemByKey: function(name, key) {
            return this.stores[name].getItem(key);
        },
        getItems: function(name) {
            var self = this;
            var storeRows = [];
            return new Promise(function(resolve, reject) {
                self.stores[name].iterate(function(value, key) {
                    storeRows.push({key: key, value: value});
                }).then(function() {
                    resolve(storeRows);
                }).catch(function(error) {
                    console.error("Error occurred when getting store items:", error);
                    reject(error);
                });
            });
        },
        dropStore: function(name) {
            localforage.dropInstance({
                name: DB_NAME,
                storeName: name
            }).then(function() {
                self.stores[name] = undefined;
            }).catch(function(error) {
                console.error("Error occurred when droping store:", error);
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
            if (this.stores[name]) {
                this.stores[name].clear();
            }
        }
    };
    Object.assign(countlyIndexedDbService, IndexedDbService);
})(window.countlyIndexedDbService = window.countlyIndexedDbService || {});