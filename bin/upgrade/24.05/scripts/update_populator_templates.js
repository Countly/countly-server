const pluginManager = require('../../../../plugins/pluginManager.js');

console.log("Updating user populator templates");

pluginManager.dbConnection().then(async(countlyDb) => {
    const cursor = countlyDb.collection('populator_templates').find({uniqueUserCount: {$exists: false}});
    try {
        while (await cursor.hasNext()) {
            const existingTemplate = await cursor.next();
            try {
                const convertedTemplate = convertTemplate(existingTemplate);
                try {
                    const result = await countlyDb.collection('populator_templates').replaceOne({_id: existingTemplate._id}, convertedTemplate);
                    console.log("Template updated successfully:", existingTemplate.name);
                }
                catch (replaceOneError) {
                    console.error("Error during replaceOne:", replaceOneError);
                    console.log("Template data:", existingTemplate);
                }
            }
            catch (convertError) {
                console.error("Error converting template:", convertError);
                console.log("Template data:", existingTemplate);
            }
        }
    }
    catch (generalError) {
        console.error("General error processing template:", generalError);
    }
    finally {
        cursor.close((err) => {
            if (err) {
                console.error("Error closing cursor:", err);
            }
            else {
                countlyDb.close();
                console.log("All templates processed.");
            }
        });
    }
}).catch((err) => {
    console.error("Error connecting to the database:", err);
});

function generateRandomNumber(min, max) {
    return parseInt(Math.floor(Math.random() * (max - min + 1) + min), 10);
}
function convertTemplate(template) {
    const convertedTemplate = {
        "name": template.name,
        "isDefault": false,
        "uniqueUserCount": 100,
        "platformType": ["Mobile", "Web", "Desktop"],
        "users": template.up ? Object.keys(template.up).map(key => {
            return {
                "key": key,
                "values": template.up[key].map(value => {
                    return {
                        "key": value,
                        "probability": "100"
                    };
                })
            };
        }) : [],
        "events": template.events ? Object.keys(template.events).map(key => {
            const event = template.events[key][0];
            return {
                "key": key,
                "segmentations": (event.segments ? Object.keys(event.segments).map(segmentKey => {
                    return {
                        "key": segmentKey,
                        "values": event.segments[segmentKey].map(segmentValue => {
                            return {
                                "key": segmentValue,
                                "probability": "100"
                            };
                        })
                    };
                }) : []),
                "sum": {
                    "isActive": !!(event.sum && event.sum.length === 2),
                    "minSumValue": event.sum ? event.sum[0] : 0,
                    "maxSumValue": event.sum ? event.sum[1] : 0
                },
                "duration": {
                    "isActive": !!(event.sum && event.sum.length === 2),
                    "minDurationTime": event.dur ? event.dur[0] : 0,
                    "maxDurationTime": event.dur ? event.dur[1] : 0
                }
            };
        }) : [],
        "views": [],
        "sequences": [
            {
                "steps": [
                    {
                        "key": "session",
                        "value": "start",
                        "probability": "100"
                    },
                    ...(template.events ? Object.keys(template.events).map(eventKey => {
                        return {
                            "key": "events",
                            "value": eventKey,
                            "probability": "100"
                        };
                    }) : []),
                    {
                        "key": "session",
                        "value": "end",
                        "probability": "100"
                    }
                ]
            }
        ],
        "behavior": {
            "runningSession": [
                generateRandomNumber(1, 10),
                generateRandomNumber(12, 72)
            ],
            "generalConditions": [],
            "sequences": [
                {
                    "key": "Sequence_1",
                    "probability": 100
                }
            ],
            "sequenceConditions": []
        },
        "lastEditedBy": "Countly-Script"
    };

    return convertedTemplate;
}
