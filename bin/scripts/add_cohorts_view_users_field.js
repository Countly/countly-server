// Simple script to add view_users field to cohorts
// Run with: mongosh countly add_cohorts_view_users_field.js
// Or: mongo countly add_cohorts_view_users_field.js (legacy)
// Or: mongosh --eval "load('add_cohorts_view_users_field.js')" countly

/* eslint-env mongodb */
/* global db, print */

// eslint-disable-next-line no-global-assign
db = db.getSiblingDB('countly');

var cohorts = db.cohorts.find().toArray();
print("Found " + cohorts.length + " cohorts");

// Try to get real member IDs from the members collection, or use sample ones
var userIds = [];
try {
    var members = db.members.find({}, {_id: 1}).limit(10).toArray();
    if (members && members.length > 0) {
        userIds = members.map(function(m) {
            return m._id.toString();
        });
        print("Using " + userIds.length + " real member IDs for view tracking");
    }
    else {
        // Fallback to sample user IDs
        userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
        print("No members found, using sample user IDs");
    }
}
catch (e) {
    // Fallback to sample user IDs
    userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
    print("Error fetching members, using sample user IDs: " + e);
}

if (userIds.length === 0) {
    userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
    print("Using default sample user IDs");
}

cohorts.forEach(function(cohort, index) {
    var viewUsers = [];

    // Create 3 types of cohorts:
    // 1. Active: Recent views (last 30 days) - 50%
    // 2. Potentially unused: Old views only (31-180 days ago) - 30%
    // 3. Mixed: Both recent and old views - 20%

    var cohortType = index % 10;

    if (cohortType < 5) {
        // Type 1: Active cohorts (50%) - Recent views only
        for (var i = 0; i < 30; i++) {
            var randomViews = Math.floor(Math.random() * 3); // 0-2 views per day
            for (var j = 0; j < randomViews; j++) {
                var randomUser = userIds[Math.floor(Math.random() * userIds.length)];
                var viewDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
                viewUsers.push({
                    userId: randomUser,
                    date: viewDate
                });
            }
        }
        print("Cohort '" + (cohort.name || cohort._id) + "' (app: " + (cohort.app_id || 'N/A') + ") - Active (recent views)");
    }
    else if (cohortType < 8) {
        // Type 2: Potentially UNUSED (30%) - OLD views only, NO recent activity
        for (var k = 31; k < 180; k += 5) { // Every 5 days for 31-180 days ago
            var oldRandomViews = Math.floor(Math.random() * 2); // 0-1 views
            for (var m = 0; m < oldRandomViews; m++) {
                var oldRandomUser = userIds[Math.floor(Math.random() * userIds.length)];
                var oldViewDate = new Date(Date.now() - k * 24 * 60 * 60 * 1000);
                viewUsers.push({
                    userId: oldRandomUser,
                    date: oldViewDate
                });
            }
        }
        print("Cohort '" + (cohort.name || cohort._id) + "' (app: " + (cohort.app_id || 'N/A') + ") - POTENTIALLY UNUSED (old views only, no activity in 30 days)");
    }
    else {
        // Type 3: Mixed (20%) - Both recent and old views
        for (var i2 = 0; i2 < 30; i2++) {
            var randomViews2 = Math.floor(Math.random() * 2);
            for (var j2 = 0; j2 < randomViews2; j2++) {
                var randomUser2 = userIds[Math.floor(Math.random() * userIds.length)];
                var viewDate2 = new Date(Date.now() - i2 * 24 * 60 * 60 * 1000);
                viewUsers.push({
                    userId: randomUser2,
                    date: viewDate2
                });
            }
        }
        for (var k2 = 60; k2 < 180; k2 += 10) {
            var oldRandomViews2 = Math.floor(Math.random() * 2);
            for (var m2 = 0; m2 < oldRandomViews2; m2++) {
                var oldRandomUser2 = userIds[Math.floor(Math.random() * userIds.length)];
                var oldViewDate2 = new Date(Date.now() - k2 * 24 * 60 * 60 * 1000);
                viewUsers.push({
                    userId: oldRandomUser2,
                    date: oldViewDate2
                });
            }
        }
        print("Cohort '" + (cohort.name || cohort._id) + "' (app: " + (cohort.app_id || 'N/A') + ") - Mixed (recent + old views)");
    }

    // Calculate usage_30d_count from view_users
    var usage30dCount = 0;
    var thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    viewUsers.forEach(function(view) {
        if (view && view.date) {
            var viewDate = new Date(view.date);
            if (!isNaN(viewDate.getTime()) && viewDate >= thirtyDaysAgo) {
                usage30dCount++;
            }
        }
    });

    db.cohorts.updateOne(
        { _id: cohort._id },
        {
            $set: {
                view_users: viewUsers,
                usage_30d_count: usage30dCount
            }
        }
    );
});

print("\nUpdated " + cohorts.length + " cohorts with view_users and usage_30d_count fields");
print("Field structure:");
print("  - view_users: [{ userId: String, date: Date }] (latest 10 users)");
print("  - usage_30d_count: Number (total views in last 30 days)");
print("\nDistribution:");
print("  - Active cohorts (recent views): ~50%");
print("  - Potentially unused (old views only): ~30%");
print("  - Mixed (recent + old views): ~20%");

