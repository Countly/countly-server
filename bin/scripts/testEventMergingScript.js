/* Script validates merging of aggregated events collections using merge_events_collections.js script
Correct app_ID and collection name(just hash of event name) should be provided
Script will delete documents matching selected event.
Do not run on real event data, as it will delete it.
*/
const pluginManager = require('../../plugins/pluginManager.js');

//Change these values to correct ones.
var collectionName = 'fe55f384d642312c76f6164a4f8ea40ffcc80795';
var app_ID = '6075f94b7e5e0d392902520c';
var EventKey = 'bumba';

var pathToScript = '/opt/countly/bin/upgrade/DEV/scripts/merge_events_collections.js';
Promise.all(
    [
        pluginManager.dbConnection("countly")
    ])
    .then(async function([countlyDB]) {
        //insert some documents in collection
        await countlyDB.collection("events" + collectionName).drop();//cleanup in case
        await countlyDB.collection("events_data").deleteMany({'_id': {"$regex": "^" + app_ID + "_" + collectionName + "_.*"}});
        var docs = [{
            "_id": "no-segment_2023:0_z",
            "m": "2023:0",
            "meta_v2": {
                "Method": {
                    "Mobile app": true
                },
                "segments": {
                    "Method": true
                }
            },
            "s": "no-segment"
        },
        {
            "_id": "no-segment_2023:11",
            "d": {
                "1": {
                    "0": {
                        "c": 1,
                        "dur": 8
                    },
                    "4": {
                        "c": 2,
                        "dur": 11
                    },
                    "11": {
                        "c": 2,
                        "dur": 7
                    },
                    "13": {
                        "c": 1,
                        "dur": 1
                    },
                    "14": {
                        "c": 1,
                        "dur": 6
                    },
                    "18": {
                        "c": 1,
                        "dur": 10
                    },
                    "c": 8,
                    "dur": 43
                }
            },
            "m": "2023:11",
            "s": "no-segment"
        },
        {
            "_id": "Method_2023:11_z",
            "d": {
                "1": {
                    "Mobile app": {
                        "c": 8,
                        "dur": 43
                    }
                },
                "2": {
                    "Mobile app": {
                        "c": 6,
                        "dur": 43
                    }
                },
            },
            "m": "2023:11",
            "s": "Method"
        }
        ];

        await countlyDB.collection("events" + collectionName).insertMany(docs);
        //run node.js script and wait for it to finish
        var exec = require('child_process').exec;
        exec('node ' + pathToScript, async function(error, stdout) {
            if (error) {
                console.log(error);
            }
            console.log(stdout);
            //run query to check current state in database

            var result = await countlyDB.collection("events_data").find({'_id': {"$regex": "^" + app_ID + "_" + collectionName + "_.*"}}).toArray();
            var mapped = {};
            for (var ii = 0; ii < result.length; ii++) {
                mapped[result[ii]._id] = result[ii];
            }

            for (var i = 0; i < docs.length; i++) {
                var coppied = JSON.parse(JSON.stringify(docs[i]));
                coppied._id = app_ID + "_" + collectionName + "_" + docs[i]._id;
                if (!mapped[coppied._id]) {
                    console.log("Document not found in database: " + coppied._id);
                }
                else {
                    coppied.a = app_ID;
                    coppied.e = "bumba";

                    if (!compareObjects(coppied, mapped[coppied._id], "", true)) {
                        console.log("Document not same as original: " + coppied._id);
                    }


                }
            }

            //
            await countlyDB.collection("events" + collectionName).drop();

            //insertng new docs(should clash)
            var docs2 = [{
                "_id": "no-segment_2023:0_z",
                "m": "2023:0",
                "meta_v2": {
                    "Method": {
                        "Mobile app": true,
                        "Desktop app": true
                    },
                    "segments": {
                        "Method": true,
                        "Test": true
                    }
                },
                "s": "no-segment"
            },
            {
                "_id": "no-segment_2023:11",
                "d": {
                    "1": {
                        "0": {
                            "c": 1,
                            "dur": 8
                        },
                        "c": 1,
                        "dur": 8
                    },
                    "2": {
                        "0": {
                            "c": 1,
                            "dur": 8
                        },
                        "4": {
                            "c": 2,
                            "dur": 11
                        },
                        "11": {
                            "c": 2,
                            "dur": 7
                        },
                        "13": {
                            "c": 1,
                            "dur": 1
                        },
                        "14": {
                            "c": 1,
                            "dur": 6
                        },
                        "18": {
                            "c": 1,
                            "dur": 10
                        },
                        "c": 8,
                        "dur": 43
                    }
                },
                "m": "2023:11",
                "s": "no-segment"
            },

            ];

            docs[0].meta_v2.Method["Desktop app"] = true;
            docs[0].meta_v2.segments["Test"] = true;

            docs[1].d["2"] = JSON.parse(JSON.stringify(docs2[1].d["2"]));
            docs[1].d["1"]["0"]["c"] = 2;
            docs[1].d["1"]["0"]["dur"] = 16;
            docs[1].d["1"]["c"] += 1;
            docs[1].d["1"]["dur"] += 8;

            await countlyDB.collection("events" + collectionName).insertMany(docs2);

            //run script again and compare again
            exec('node ' + pathToScript, async function(error, stdout) {
                if (error) {
                    console.log(error);
                }
                console.log(stdout);
                //run query to check current state in database

                var result = await countlyDB.collection("events_data").find({'_id': {"$regex": "^" + app_ID + "_" + collectionName + "_.*"}}).toArray();
                var mapped = {};
                for (var ij = 0; ij < result.length; ij++) {
                    mapped[result[ij]._id] = result[ij];
                }

                for (var i = 0; i < docs.length; i++) {
                    var coppied = JSON.parse(JSON.stringify(docs[i]));
                    coppied._id = app_ID + "_" + collectionName + "_" + docs[i]._id;
                    if (!mapped[coppied._id]) {
                        console.log("Document not found in database: " + coppied._id);
                    }
                    else {
                        coppied.a = app_ID;
                        coppied.e = EventKey;

                        if (!compareObjects(coppied, mapped[coppied._id], "", true)) {
                            console.log("Document not same as original: " + coppied._id);
                        }
                    }
                }
                //delete all records from selected databases
                //await countlyDB.collection("events"+collectionName).drop();
                // await countlyDB.collection("events_data").deleteMany({'_id':{"$regex":"^"+app_ID+"_"+collectionName+"_.*"}});
                console.log("Done");
                countlyDB.close();
            });
        });


    });



function compareObjects(correct, ob, tree, segmented) {
    var good = true;
    tree = tree || "";
    if (typeof ob === 'undefined') {
        console.log("missing param:" + tree);
        return false;
    }
    else if (typeof correct === "undefined") {
        console.log("extra param:" + tree);
        return false;
    }
    else {
        for (var c in correct) {
            if (typeof correct[c] === 'object') {
                if (c === "ds") {
                    console.log(tree + "." + c + " " + ob[c] + " " + correct[c]);
                }
                var zz = compareObjects(correct[c], ob[c], tree + "." + c, segmented);
                if (zz === false) {
                    good = false;
                }
            }
            else if (ob[c] != correct[c]) {
                console.log(tree + "." + c + " " + ob[c] + " (need:)" + correct[c]);
                good = false;
            }


        }
        return good;
    }
}


