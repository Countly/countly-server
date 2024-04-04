// update script to migrate alerts data for revamped Alerts plugin

const pluginManager = require('./plugins/pluginManager.js');

async function migrateAlertCollection(collectionName, db) {
    console.log('Migrating alert data...');
    //var result2 = await db.collection(collectionName).find({'alertName': 'dfgdf'});
    await db.collection(collectionName).updateMany(
        {
            'alertDataType': { $ne: 'dataPoint'}
        },
        {
            $set: {
                'period': 'daily',
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            'compareType': {
                $regex: /^(increased|decreased)/
            }
        },
        [
            {
                $set: {
                    'compareType': {
                        $arrayElemAt: [
                            { $split: ['$compareType', ' by at least'] },
                            0
                        ]
                    }
                }
            }
        ]
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'metric' },
                { 'alertDataSubType': 'Total users'},
            ]
        },
        {
            $set: {
                'alertDataType': 'users',
                'alertDataSubType': '# of users',
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'metric' },
                { 'alertDataSubType': 'New users'},
            ]
        },
        {
            $set: {
                'alertDataType': 'users',
                'alertDataSubType': '# of new users'
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'metric' },
                { 'alertDataSubType': 'Total sessions'},
            ]
        },
        {
            $set: {
                'alertDataType': 'sessions',
                'alertDataSubType': '# of sessions',
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'metric' },
                { 'alertDataSubType': 'Average session duration'},
            ]
        },
        {
            $set: {
                'alertDataType': 'sessions',
                'alertDataSubType': 'average sessions duration',
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'metric' },
                { 'alertDataSubType': 'Purchases'},
            ]
        },
        {
            $set: {
                'alertDataType': 'revenue',
                'alertDataSubType': 'total revenue',
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'metric' },
                { 'alertDataSubType': 'Bounce rate'},
            ]
        },
        {
            $set: {
                'alertDataType': 'views',
                'alertDataSubType': 'bounce rate',
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'metric' },
                { 'alertDataSubType': 'Number of page views'},
            ]
        },
        {
            $set: {
                'alertDataType': 'views',
                'alertDataSubType': '# of page views',
            }
        }
    );
    db.collection(collectionName).updateMany(
        { 'alertDataType': 'event' },
        [
            {
                $set: {
                    'alertDataType': 'events',
                    'alertDataSubType2': {
                        $substrBytes: [
                            '$alertDataSubType',
                            { $add: [{ $indexOfBytes: ['$alertDataSubType', '***'] }, 3] },
                            { $subtract: [{$strLenBytes: "$alertDataSubType"}, {$add: [{$indexOfBytes: ['$alertDataSubType', '***']}, 3]}] }
                        ]
                    },
                    'alertDataSubType': 'count'
                }
            }
        ]
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'crash' },
                { 'alertDataSubType': 'Total crashes'},
            ]
        },
        {
            $set: {
                'alertDataType': 'crashes',
                'alertDataSubType': '# of crashes/errors',
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'crash' },
                { 'alertDataSubType': 'New crash occurence'},
            ]
        },
        {
            $set: {
                'alertDataType': 'crashes',
                'alertDataSubType': 'new crash/error',
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'crash' },
                { 'alertDataSubType': 'None fatal crash per session'},
            ]
        },
        {
            $set: {
                'alertDataType': 'crashes',
                'alertDataSubType': 'none-fatal crashes/errors per session',
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'crash' },
                { 'alertDataSubType': 'Fatal crash per session'},
            ]
        },
        {
            $set: {
                'alertDataType': 'crashes',
                'alertDataSubType': 'fatal crashes/errors per session',
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'dataPoint' },
                { 'alertDataSubType': 'Number of daily DP'},
            ]
        },
        {
            $set: {
                'alertDataType': 'dataPoints',
                'alertDataSubType': 'total data points',
                'period': 'daily'
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'dataPoint' },
                { 'alertDataSubType': 'Hourly data points'},
            ]
        },
        {
            $set: {
                'alertDataType': 'dataPoints',
                'alertDataSubType': 'total data points',
                'period': 'hourly'
            }
        }
    );
    await db.collection(collectionName).updateMany(
        {
            $and: [
                { 'alertDataType': 'dataPoint' },
                { 'alertDataSubType': 'Monthly data points'},
            ]
        },
        {
            $set: {
                'alertDataType': 'dataPoints',
                'alertDataSubType': 'total data points',
                'period': 'monthly'
            }
        }
    );
}

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        let alertCollection = 'alerts';
        await migrateAlertCollection(alertCollection, countlyDb);
        // const faileds = result.filter(x=>x.status === 'rejected');
        // if (faileds.length) {
        //     throw new Error(faileds.map(x=>x.reason).join('\n'));
        // }
        console.log("Finished migrating alert data. 'alerts' collection is updated.");
    }
    catch (error) {
        console.log(`Error migrating alert data: ${error}`);
    }
    finally {
        countlyDb.close();
    }
});
