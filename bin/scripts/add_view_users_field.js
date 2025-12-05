// Simple script to add view_users field to dashboards
// Run with: mongo countly add_view_users_field.js

/* eslint-env mongodb */
/* global db, print */

// eslint-disable-next-line no-global-assign
db = db.getSiblingDB('countly');

var dashboards = db.dashboards.find().toArray();
print("Found " + dashboards.length + " dashboards");

var userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];

dashboards.forEach(function(dashboard, index) {
    var viewUsers = [];

    // Create 3 types of dashboards:
    // 1. Active: Recent views (last 30 days) - 50%
    // 2. Potentially unused: Old views only (31-180 days ago) - 30%
    // 3. Mixed: Both recent and old views - 20%

    var dashboardType = index % 10;

    if (dashboardType < 5) {
        // Type 1: Active dashboards (50%) - Recent views only
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
        print("Dashboard '" + (dashboard.name || dashboard._id) + "' - Active (recent views)");
    }
    else if (dashboardType < 8) {
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
        print("Dashboard '" + (dashboard.name || dashboard._id) + "' - POTENTIALLY UNUSED (old views only, no activity in 30 days)");
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
        print("Dashboard '" + (dashboard.name || dashboard._id) + "' - Mixed (recent + old views)");
    }

    db.dashboards.updateOne(
        { _id: dashboard._id },
        { $set: { view_users: viewUsers } }
    );
});

print("Updated " + dashboards.length + " dashboards with view_users field");
print("Field structure: view_users: [{ userId: String, date: Date }]");
