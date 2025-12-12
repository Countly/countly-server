// Script to update cohorts with outdated view data for testing
// Run with: mongosh countly update_cohorts_outdated_views.js
// Or: mongo countly update_cohorts_outdated_views.js (legacy)
// Or: mongosh --eval "load('update_cohorts_outdated_views.js')" countly

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

var updatedCount = 0;

cohorts.forEach(function(cohort, index) {
    var viewUsers = [];

    // Create different outdated patterns for testing
    var patternType = index % 5;

    if (patternType === 0) {
        // Pattern 1: Very outdated - last viewed 60-90 days ago
        for (var i = 60; i <= 90; i += 3) {
            var randomUser = userIds[Math.floor(Math.random() * userIds.length)];
            var viewDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            viewUsers.push({
                userId: randomUser,
                date: viewDate
            });
        }
        print("Cohort '" + (cohort.name || cohort._id) + "' - Very outdated (60-90 days ago)");
    }
    else if (patternType === 1) {
        // Pattern 2: Moderately outdated - last viewed 31-60 days ago
        for (var j = 31; j <= 60; j += 2) {
            var randomUser2 = userIds[Math.floor(Math.random() * userIds.length)];
            var viewDate2 = new Date(Date.now() - j * 24 * 60 * 60 * 1000);
            viewUsers.push({
                userId: randomUser2,
                date: viewDate2
            });
        }
        print("Cohort '" + (cohort.name || cohort._id) + "' - Moderately outdated (31-60 days ago)");
    }
    else if (patternType === 2) {
        // Pattern 3: Recently outdated - last viewed 31-45 days ago (just past 30 day threshold)
        for (var k = 31; k <= 45; k += 2) {
            var randomUser3 = userIds[Math.floor(Math.random() * userIds.length)];
            var viewDate3 = new Date(Date.now() - k * 24 * 60 * 60 * 1000);
            viewUsers.push({
                userId: randomUser3,
                date: viewDate3
            });
        }
        print("Cohort '" + (cohort.name || cohort._id) + "' - Recently outdated (31-45 days ago)");
    }
    else if (patternType === 3) {
        // Pattern 4: Very old - last viewed 120-180 days ago
        for (var m = 120; m <= 180; m += 5) {
            var randomUser4 = userIds[Math.floor(Math.random() * userIds.length)];
            var viewDate4 = new Date(Date.now() - m * 24 * 60 * 60 * 1000);
            viewUsers.push({
                userId: randomUser4,
                date: viewDate4
            });
        }
        print("Cohort '" + (cohort.name || cohort._id) + "' - Very old (120-180 days ago)");
    }
    else {
        // Pattern 5: Extremely outdated - last viewed 200-365 days ago
        for (var n = 200; n <= 365; n += 10) {
            var randomUser5 = userIds[Math.floor(Math.random() * userIds.length)];
            var viewDate5 = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
            viewUsers.push({
                userId: randomUser5,
                date: viewDate5
            });
        }
        print("Cohort '" + (cohort.name || cohort._id) + "' - Extremely outdated (200-365 days ago)");
    }

    // Calculate usage_30d_count (should be 0 for all outdated views)
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

    updatedCount++;
});

print("\nUpdated " + updatedCount + " cohorts with outdated view data");
print("Field structure: view_users: [{ userId: String, date: Date }]");
print("\nDistribution patterns:");
print("  - Very outdated (60-90 days): ~20%");
print("  - Moderately outdated (31-60 days): ~20%");
print("  - Recently outdated (31-45 days): ~20%");
print("  - Very old (120-180 days): ~20%");
print("  - Extremely outdated (200-365 days): ~20%");
print("\nAll cohorts now have outdated view data for testing cleanup-center sorting and filtering.");

