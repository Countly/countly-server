const { Pool, FRAME } = require('./index');

let pool = new Pool('tp', 'key', 'secret', {concurrency: 10});
let message = {
    "_id": "6006a0034a5a1543b864ad60",
    "type": "message",
    "apps": [
        "5fbb72974e19c6614411d95f"
    ],
    "appNames": [
        "Halu"
    ],
    "platforms": [
        "a"
    ],
    "source": "dash",
    "delayed": true,
    "messagePerLocale": {
        "default|t": "ajshd \n",
        "default|0|t": "Button 1",
        "default|1|t": "Button 2",
        "default|tp": {
            "6": {
                "f": "d",
                "c": false,
                "k": "[the_event]dur"
            }
        },
        "default": "123",
        "default|p": {

        }
    },
    "sound": "default",
    "buttons": 0,
    "result": {
        "status": 3,
        "total": 0,
        "processed": 0,
        "sent": 0,
        "errors": 0,
        "error": null,
        "errorCodes": {

        },
        "resourceErrors": [ ],
        "aborts": [ ],
        "nextbatch": null
    },
    "expiryDate": new Date("2021-01-26T09:02:17.972Z"),
    "date": new Date("2021-01-19T09:02:17.972Z"),
    "tz": false,
    "tx": false,
    "auto": true,
    "autoOnEntry": "events",
    "autoEvents": [
        "the_event"
    ],
    "autoCapMessages": 2,
    "autoCapSleep": 86400000,
    "actualDates": false,
    "autoCancelTrigger": false,
    "created": new Date("2021-01-19T09:02:17.972Z"),
    "test": false,
    "v": 190600,
    "creator": "5fbb71e24ca6bb618088af89"
};
pool.on('data', console.log.bind(console, 'data:'));
pool.on('error', console.error.bind(console, 'error:'));
pool.write({type: FRAME.STREAM, data: {id: message._id, message}});
pool.write({type: FRAME.FEED, data: {id: message._id, token: {t: 'token_one'}}});