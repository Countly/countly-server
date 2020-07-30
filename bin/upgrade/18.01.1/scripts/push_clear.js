var pluginManager = require('../../../../plugins/pluginManager.js');

async function sequence(arr, f, def = 0) {
    return await arr.reduce(async(promise, item) => {
        let total = await promise,
            next = await f(item);
        if (typeof next === 'object') {
            Object.keys(next).forEach(k => {
                total[k] = (total[k] || 0) + next[k];
            });
            return total;
        }
        else {
            return total + next;
        }
    }, Promise.resolve(def));
}

function split(data, batch) {
    let chunks = [];
    while (data.length > 0) {
        chunks.push(data.splice(0, batch));
    }
    return chunks;
}
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.listCollections().toArray((err, names) => {
        if (names) {
            names = names.map(n => n.name).filter(n => n.indexOf('push_') === 0 && n.indexOf('_') === n.lastIndexOf('_'));
            if (names.length) {
                var i = 0, total = Math.ceil(names.length / 10);
                console.log('Dropping ' + names.length + ' "push_*" collections in 5 seconds. Exit to skip. ');
                setTimeout(() => {
                    sequence(split(names, 10), names => {
                        return new Promise((res, rej) => {
                            console.log(`${i++} batch out of ${total}`);
                            Promise.all(names.map(n => countlyDb.collection(n).drop())).then(res, res);
                        });
                    }).then(() => {
                        console.log('...done');
                        countlyDb.close();
                    }, err => {
                        console.error('error: %j', err);
                        countlyDb.close();
                    });
                }, 5000);
                return;
            }
        }

        countlyDb.close();
    });
});