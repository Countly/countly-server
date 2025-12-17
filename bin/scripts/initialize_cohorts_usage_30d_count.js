// Script to initialize usage_30d_count field for existing cohorts
// This calculates the count from existing view_users data
// Run with: mongosh countly initialize_cohorts_usage_30d_count.js

/* eslint-env mongodb */
/* global db, print */

// eslint-disable-next-line no-global-assign
db = db.getSiblingDB('countly');

var cohorts = db.cohorts.find().toArray();
print("Found " + cohorts.length + " cohorts");

var updatedCount = 0;
var thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

cohorts.forEach(function(cohort) {
    var usage30dCount = 0;

    // Calculate count from existing view_users if available
    if (cohort.view_users && Array.isArray(cohort.view_users)) {
        cohort.view_users.forEach(function(view) {
            if (view && view.date) {
                var viewDate = new Date(view.date);
                if (!isNaN(viewDate.getTime()) && viewDate >= thirtyDaysAgo) {
                    usage30dCount++;
                }
            }
        });
    }

    // Only update if the field doesn't exist or if we calculated a different value
    var needsUpdate = false;
    if (typeof cohort.usage_30d_count === 'undefined') {
        needsUpdate = true;
    }
    else if (cohort.usage_30d_count !== usage30dCount) {
        needsUpdate = true;
    }

    if (needsUpdate) {
        db.cohorts.updateOne(
            { _id: cohort._id },
            { $set: { usage_30d_count: usage30dCount } }
        );
        updatedCount++;
        print("Cohort '" + (cohort.name || cohort._id) + "' - Set usage_30d_count to " + usage30dCount);
    }
});

print("\nUpdated " + updatedCount + " cohorts with usage_30d_count field");
print("Field tracks total views in the last 30 days, independent of view_users array size.");


