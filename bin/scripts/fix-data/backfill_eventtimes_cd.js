// backfill_eventtimes_cd.js
// Backfills the "cd" field on all eventTimes* collections so the TTL index can expire old documents.
// Usage: mongosh "mongodb://localhost" backfill_eventtimes_cd.js
// (any connection string works — the script selects the countly database itself)

/* global db, print */

var countlyDb = db.getSiblingDB("countly");
var totals = { matched: 0, modified: 0 };

countlyDb.getCollectionNames()
    .filter(function(name) {
        return name.indexOf("eventTimes") === 0;
    })
    .forEach(function(name) {
        print("processing " + name);
        var result = countlyDb.getCollection(name).updateMany(
            { cd: { $exists: false } },
            [{
                $set: {
                    cd: {
                        $switch: {
                            branches: [
                                // same derivation the server code uses: h = "YYYY:M:D..."
                                {
                                    case: { $eq: [{ $type: "$h" }, "string"] },
                                    then: {
                                        $dateFromParts: {
                                            year: { $toInt: { $arrayElemAt: [{ $split: ["$h", ":"] }, 0] } },
                                            month: { $toInt: { $arrayElemAt: [{ $split: ["$h", ":"] }, 1] } },
                                            day: { $toInt: { $arrayElemAt: [{ $split: ["$h", ":"] }, 2] } }
                                        }
                                    }
                                },
                                // fallback: derive from the millisecond timestamp
                                { case: { $isNumber: "$ts" }, then: { $toDate: "$ts" } }
                            ],
                            // neither field present (shouldn't happen): stamp with now so TTL still picks it up eventually
                            default: "$$NOW"
                        }
                    }
                }
            }]
        );
        print("  matched: " + result.matchedCount + ", modified: " + result.modifiedCount);
        totals.matched += result.matchedCount;
        totals.modified += result.modifiedCount;
    });

print("done. total matched: " + totals.matched + ", total modified: " + totals.modified);
