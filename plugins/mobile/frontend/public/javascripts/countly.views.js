/*globals app */

app.addAppType("mobile", null);

app.addSubMenuForType("mobile", "analytics", {code: "analytics-technology", permission: "core", url: "#/analytics/technology", text: "sidebar.analytics.technology", priority: 30});
app.addSubMenuForType("mobile", "analytics", {code: "analytics-geo", permission: "core", url: "#/analytics/geo", text: "sidebar.analytics.geo", priority: 40});
app.addSubMenuForType("mobile", "analytics", {code: "analytics-sessions", permission: "core", url: "#/analytics/sessions", text: "sidebar.analytics.session", priority: 20});
app.addSubMenuForType("mobile", "analytics", {code: "analytics-users", permission: "core", url: "#/analytics/users", text: "sidebar.analytics.users", priority: 10});
app.addSubMenuForType("mobile", "analytics", {code: "analytics-loyalty", permission: "core", url: "#/analytics/loyalty", text: "sidebar.analytics.user-loyalty", priority: 15});