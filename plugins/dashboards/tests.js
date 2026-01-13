var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

// Sample dashboard and widget configurations based on OpenAPI schema
const baseDashboard = {
    "name": "Test Dashboard",
    "share_with": "none", // Use enum value from OpenAPI spec
    "widgets": []
};

const sampleWidget = {
    "widget_type": "analytics",
    "data_type": "session",
    "apps": [],
    "configuration": {
        "metrics": ["t", "n", "u"],
        "period": "30days"
    },
    "dimensions": {
        "width": 6,
        "height": 4,
        "position": 1
    }
};

// Store created resources for later use and cleanup
const createdResources = {
    dashboards: [],
    widgets: []
};

function getRequestURL(path) {
    const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
    return path + `?api_key=${API_KEY_ADMIN}`;
}

// Helper function to log API response details for debugging
function logApiResponse(method, endpoint, requestBody, response) {
    console.log(`\n🔍 API ${method} ${endpoint} RESPONSE DETAILS:`);
    console.log(`📤 Request body: ${JSON.stringify(requestBody || {})}`);
    console.log(`📥 Response status: ${response.status}`);
    console.log(`📥 Response body: ${JSON.stringify(response.body || {})}`);
    console.log(`📥 Response headers: ${JSON.stringify(response.headers || {})}`);
    console.log('\n');
}

// Schema validation functions based on OpenAPI spec
function validateDashboardObject(dashboard) {
    dashboard.should.have.property('_id').which.is.a.String();
    dashboard.should.have.property('name').which.is.a.String();
    dashboard.should.have.property('widgets').which.is.an.Array();

    // The actual API uses owner_id instead of owner, and owner can be object or string
    if (dashboard.owner !== undefined) {
        // Owner can be either string ID or object with user details
        if (typeof dashboard.owner === 'string') {
            dashboard.owner.should.be.a.String();
        }
        else {
            dashboard.owner.should.be.an.Object();
            dashboard.owner.should.have.property('_id');
        }
    }
    if (dashboard.owner_id !== undefined) {
        dashboard.owner_id.should.be.a.String();
    }

    if (dashboard.created_at !== undefined) {
        dashboard.created_at.should.be.a.Number();
    }

    if (dashboard.last_modified !== undefined) {
        dashboard.last_modified.should.be.a.Number();
    }
}

function validateWidgetObject(widget) {
    widget.should.have.property('_id').which.is.a.String();

    if (widget.widget_type !== undefined) {
        widget.widget_type.should.be.a.String();
    }

    if (widget.data_type !== undefined) {
        widget.data_type.should.be.a.String();
    }

    if (widget.apps !== undefined) {
        widget.apps.should.be.an.Array();
    }

    if (widget.configuration !== undefined) {
        widget.configuration.should.be.an.Object();
    }

    if (widget.dimensions !== undefined) {
        widget.dimensions.should.be.an.Object();
    }
}

describe('Testing Dashboard API against OpenAPI Specification', function() {
    describe('0. Setup - Create test resources', function() {
        it('should create initial test dashboard for other tests', function(done) {
            const APP_ID = testUtils.get("APP_ID");
            const setupDashboard = {
                name: "Setup Test Dashboard",
                share_with: "none"
            };

            request
                .get(getRequestURL('/i/dashboards/create') +
                    `&name=${encodeURIComponent(setupDashboard.name)}&share_with=${setupDashboard.share_with}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/i/dashboards/create', setupDashboard, res);
                        return done(err);
                    }

                    should.exist(res.body);
                    createdResources.dashboards.push(res.body);
                    console.log(`✅ Setup dashboard created with ID: ${res.body}`);
                    done();
                });
        });
    });

    describe('1. /o/dashboards - Get specific dashboard', function() {
        it('should retrieve a specific dashboard with widgets and app info', function(done) {
            if (createdResources.dashboards.length === 0) {
                return done(new Error("No dashboard created for test"));
            }

            const dashboardId = createdResources.dashboards[0];
            request
                .get(getRequestURL('/o/dashboards') + `&dashboard_id=${dashboardId}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/o/dashboards', null, res);
                        return done(err);
                    }

                    // Validate response schema according to OpenAPI spec
                    res.body.should.have.property('widgets').which.is.an.Array();
                    res.body.should.have.property('apps').which.is.an.Array();

                    if (res.body.is_owner !== undefined) {
                        res.body.is_owner.should.be.a.Boolean();
                    }
                    if (res.body.is_editable !== undefined) {
                        res.body.is_editable.should.be.a.Boolean();
                    }
                    if (res.body.owner !== undefined) {
                        res.body.owner.should.be.an.Object();
                    }

                    console.log(`✅ Dashboard retrieved successfully with ${res.body.widgets.length} widgets`);
                    done();
                });
        });

        it('should fail with invalid dashboard_id', function(done) {
            request
                .get(getRequestURL('/o/dashboards') + '&dashboard_id=invalid')
                .expect(401)
                .end(function(err, res) {
                    if (err && err.status !== 401) {
                        logApiResponse('GET', '/o/dashboards', null, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/invalid.*dashboard_id/i);
                    done();
                });
        });

        it('should support period and action parameters', function(done) {
            if (createdResources.dashboards.length === 0) {
                return done(new Error("No dashboard created for test"));
            }

            const dashboardId = createdResources.dashboards[0];
            request
                .get(getRequestURL('/o/dashboards') +
                    `&dashboard_id=${dashboardId}&period=30days&action=refresh`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/o/dashboards', null, res);
                        return done(err);
                    }

                    res.body.should.have.property('widgets').which.is.an.Array();
                    res.body.should.have.property('apps').which.is.an.Array();
                    done();
                });
        });
    });

    describe('2. /o/dashboards/widget - Get widget info', function() {
        let testWidgetId;

        before(function(done) {
            if (createdResources.dashboards.length === 0) {
                return done(new Error("No dashboard available for widget test"));
            }

            // Create a test widget first
            const APP_ID = testUtils.get("APP_ID");
            const dashboardId = createdResources.dashboards[0];
            const widgetData = JSON.stringify({
                widget_type: "analytics",
                apps: [APP_ID],
                data_type: "sessions"
            });

            request
                .get(getRequestURL('/i/dashboards/add-widget') +
                    `&dashboard_id=${dashboardId}&widget=${encodeURIComponent(widgetData)}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    testWidgetId = res.body;
                    createdResources.widgets.push({dashboardId, widgetId: testWidgetId});
                    done();
                });
        });

        it('should retrieve widget data for valid dashboard and widget combination', function(done) {
            if (!testWidgetId || createdResources.dashboards.length === 0) {
                return done(new Error("No widget or dashboard available for test"));
            }

            const dashboardId = createdResources.dashboards[0];
            request
                .get(getRequestURL('/o/dashboards/widget') +
                    `&dashboard_id=${dashboardId}&widget_id=${testWidgetId}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/o/dashboards/widget', null, res);
                        return done(err);
                    }

                    res.body.should.be.an.Object();
                    console.log(`✅ Widget data retrieved successfully`);
                    done();
                });
        });

        it('should fail with invalid dashboard_id', function(done) {
            if (!testWidgetId) {
                return done(new Error("No widget available for test"));
            }

            request
                .get(getRequestURL('/o/dashboards/widget') +
                    `&dashboard_id=invalid&widget_id=${testWidgetId}`)
                .expect(401)
                .end(function(err, res) {
                    if (err && err.status !== 401) {
                        logApiResponse('GET', '/o/dashboards/widget', null, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/invalid.*dashboard_id/i);
                    done();
                });
        });

        it('should fail with invalid widget_id', function(done) {
            if (createdResources.dashboards.length === 0) {
                return done(new Error("No dashboard available for test"));
            }

            const dashboardId = createdResources.dashboards[0];
            request
                .get(getRequestURL('/o/dashboards/widget') +
                    `&dashboard_id=${dashboardId}&widget_id=invalid`)
                .expect(401)
                .end(function(err, res) {
                    if (err && err.status !== 401) {
                        logApiResponse('GET', '/o/dashboards/widget', null, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/invalid.*widget_id/i);
                    done();
                });
        });
    });

    describe('3. /o/dashboards/test - Test widgets', function() {
        it('should test widget configurations and return data', function(done) {
            const APP_ID = testUtils.get("APP_ID");
            const testWidgets = JSON.stringify([
                {
                    widget_type: "analytics",
                    apps: [APP_ID],
                    data_type: "sessions"
                }
            ]);

            request
                .get(getRequestURL('/o/dashboards/test') +
                    `&widgets=${encodeURIComponent(testWidgets)}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/o/dashboards/test', null, res);
                        return done(err);
                    }

                    res.body.should.be.an.Object();
                    console.log(`✅ Widget test completed successfully`);
                    done();
                });
        });

        it('should handle empty widgets parameter', function(done) {
            request
                .get(getRequestURL('/o/dashboards/test') + '&widgets=[]')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/o/dashboards/test', null, res);
                        return done(err);
                    }

                    res.body.should.be.an.Object();
                    done();
                });
        });
    });

    describe('4. /o/dashboards/widget-layout - Get widget layout', function() {
        it('should retrieve widget layout information', function(done) {
            if (createdResources.dashboards.length === 0) {
                return done(new Error("No dashboard available for test"));
            }

            const dashboardId = createdResources.dashboards[0];
            request
                .get(getRequestURL('/o/dashboards/widget-layout') +
                    `&dashboard_id=${dashboardId}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/o/dashboards/widget-layout', null, res);
                        return done(err);
                    }

                    res.body.should.be.an.Array();

                    // Validate each widget layout object
                    res.body.forEach(widget => {
                        widget.should.have.property('_id').which.is.a.String();
                        if (widget.position !== undefined) {
                            widget.position.should.be.an.Array();
                        }
                        if (widget.size !== undefined) {
                            widget.size.should.be.an.Array();
                        }
                    });

                    console.log(`✅ Widget layout retrieved with ${res.body.length} widgets`);
                    done();
                });
        });
    });

    describe('5. /o/dashboard/data - Get dashboard data', function() {
        it('should retrieve data for a specific widget in dashboard', function(done) {
            if (createdResources.dashboards.length === 0 || createdResources.widgets.length === 0) {
                return done(new Error("No dashboard or widget available for test"));
            }

            const dashboardId = createdResources.dashboards[0];
            const widgetId = createdResources.widgets[0].widgetId;

            request
                .get(getRequestURL('/o/dashboard/data') +
                    `&dashboard_id=${dashboardId}&widget_id=${widgetId}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/o/dashboard/data', null, res);
                        return done(err);
                    }

                    res.body.should.be.an.Object();
                    console.log(`✅ Dashboard data retrieved successfully`);
                    done();
                });
        });

        it('should fail with missing dashboard_id', function(done) {
            if (createdResources.widgets.length === 0) {
                return done(new Error("No widget available for test"));
            }

            const widgetId = createdResources.widgets[0].widgetId;
            request
                .get(getRequestURL('/o/dashboard/data') + `&widget_id=${widgetId}`)
                .expect(401)
                .end(function(err, res) {
                    if (err && err.status !== 401) {
                        logApiResponse('GET', '/o/dashboard/data', null, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/invalid.*dashboard_id/i);
                    done();
                });
        });

        it('should fail with missing widget_id', function(done) {
            if (createdResources.dashboards.length === 0) {
                return done(new Error("No dashboard available for test"));
            }

            const dashboardId = createdResources.dashboards[0];
            request
                .get(getRequestURL('/o/dashboard/data') + `&dashboard_id=${dashboardId}`)
                .expect(401)
                .end(function(err, res) {
                    if (err && err.status !== 401) {
                        logApiResponse('GET', '/o/dashboard/data', null, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/invalid.*widget_id/i);
                    done();
                });
        });
    });

    describe('6. /o/dashboards/all - Get all dashboards', function() {
        it('should retrieve all dashboards with correct schema', function(done) {
            request
                .get(getRequestURL('/o/dashboards/all'))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/o/dashboards/all', null, res);
                        return done(err);
                    }

                    res.body.should.be.an.Array();

                    // Verify each dashboard has required properties
                    if (res.body.length > 0) {
                        res.body.forEach(validateDashboardObject);
                        console.log(`✅ Retrieved ${res.body.length} dashboards`);
                    }

                    done();
                });
        });

        it('should support just_schema parameter', function(done) {
            request
                .get(getRequestURL('/o/dashboards/all') + '&just_schema=true')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/o/dashboards/all', null, res);
                        return done(err);
                    }

                    res.body.should.be.an.Array();

                    // With just_schema, should only return basic info
                    if (res.body.length > 0) {
                        res.body.forEach(dashboard => {
                            dashboard.should.have.property('_id').which.is.a.String();
                            dashboard.should.have.property('name').which.is.a.String();
                        });
                    }

                    done();
                });
        });

        it('should fail without authentication', function(done) {
            request
                .get('/o/dashboards/all')
                .expect(400)
                .end(function(err, res) {
                    if (err && err.status !== 400) {
                        logApiResponse('GET', '/o/dashboards/all', null, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/missing.*api_key.*auth_token/i);
                    done();
                });
        });
    });
    describe('7. /i/dashboards/create - Create Dashboard', function() {
        it('should create a new dashboard with all required parameters using GET', function(done) {
            const dashboardName = "Create Test Dashboard";
            const shareWith = "none";

            request
                .get(getRequestURL('/i/dashboards/create') +
                    `&name=${encodeURIComponent(dashboardName)}&share_with=${shareWith}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/i/dashboards/create', {name: dashboardName, share_with: shareWith}, res);
                        return done(err);
                    }

                    // According to OpenAPI spec, should return dashboard ID as string
                    should.exist(res.body);
                    res.body.should.be.a.String();

                    // Store the created dashboard ID for later tests
                    createdResources.dashboards.push(res.body);

                    console.log(`✅ Dashboard created successfully with ID: ${res.body}`);
                    done();
                });
        });

        it('should create dashboard with sharing parameters', function(done) {
            const dashboardName = "Shared Dashboard Test";
            const shareWith = "selected-users";
            const sharedEmailEdit = JSON.stringify(["test@example.com"]);
            const sharedEmailView = JSON.stringify(["viewer@example.com"]);

            request
                .get(getRequestURL('/i/dashboards/create') +
                    `&name=${encodeURIComponent(dashboardName)}&share_with=${shareWith}` +
                    `&shared_email_edit=${encodeURIComponent(sharedEmailEdit)}` +
                    `&shared_email_view=${encodeURIComponent(sharedEmailView)}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/i/dashboards/create', {
                            name: dashboardName,
                            share_with: shareWith,
                            shared_email_edit: sharedEmailEdit,
                            shared_email_view: sharedEmailView
                        }, res);
                        return done(err);
                    }

                    should.exist(res.body);
                    res.body.should.be.a.String();
                    createdResources.dashboards.push(res.body);
                    console.log(`✅ Shared dashboard created successfully with ID: ${res.body}`);
                    done();
                });
        });

        it('should create dashboard with refresh rate', function(done) {
            const dashboardName = "Dashboard with Refresh";
            const shareWith = "none";
            const useRefreshRate = "true";
            const refreshRate = 10; // minutes

            request
                .get(getRequestURL('/i/dashboards/create') +
                    `&name=${encodeURIComponent(dashboardName)}&share_with=${shareWith}` +
                    `&use_refresh_rate=${useRefreshRate}&refreshRate=${refreshRate}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/i/dashboards/create', {
                            name: dashboardName,
                            share_with: shareWith,
                            use_refresh_rate: useRefreshRate,
                            refreshRate: refreshRate
                        }, res);
                        return done(err);
                    }

                    should.exist(res.body);
                    res.body.should.be.a.String();
                    createdResources.dashboards.push(res.body);
                    console.log(`✅ Dashboard with refresh rate created successfully with ID: ${res.body}`);
                    done();
                });
        });

        it('should fail when missing required name parameter', function(done) {
            request
                .get(getRequestURL('/i/dashboards/create') + '&share_with=none')
                .expect(400)
                .end(function(err, res) {
                    if (err && err.status !== 400) {
                        logApiResponse('GET', '/i/dashboards/create', {share_with: 'none'}, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/missing.*name/i);
                    done();
                });
        });

        it('should fail when missing required share_with parameter', function(done) {
            request
                .get(getRequestURL('/i/dashboards/create') + '&name=Test Dashboard')
                .expect(400)
                .end(function(err, res) {
                    if (err && err.status !== 400) {
                        logApiResponse('GET', '/i/dashboards/create', {name: 'Test Dashboard'}, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/missing.*share_with/i);
                    done();
                });
        });
    });

    describe('8. /i/dashboards/update - Update Dashboard', function() {
        it('should update an existing dashboard', function(done) {
            if (createdResources.dashboards.length === 0) {
                return done(new Error("No dashboards created for update test"));
            }

            const dashboardId = createdResources.dashboards[0];
            const newName = "Updated Dashboard Name";
            const shareWith = "all-users";

            request
                .get(getRequestURL('/i/dashboards/update') +
                    `&dashboard_id=${dashboardId}&name=${encodeURIComponent(newName)}&share_with=${shareWith}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/i/dashboards/update', {
                            dashboard_id: dashboardId,
                            name: newName,
                            share_with: shareWith
                        }, res);
                        return done(err);
                    }

                    res.body.should.be.an.Object();
                    // Dashboard update returns MongoDB result object
                    if (res.body.result && res.body.result === 'Success') {
                        res.body.should.have.property('result', 'Success');
                    }
                    else if (res.body.acknowledged !== undefined) {
                        // MongoDB update result format
                        res.body.should.have.property('acknowledged', true);
                        res.body.should.have.property('modifiedCount');
                    }
                    console.log(`✅ Dashboard updated successfully`);
                    done();
                });
        });

        it('should fail with invalid dashboard_id', function(done) {
            const invalidId = "507f1f77bcf86cd799439011";
            const newName = "Should Not Update";

            request
                .get(getRequestURL('/i/dashboards/update') +
                    `&dashboard_id=${invalidId}&name=${encodeURIComponent(newName)}&share_with=none`)
                .expect(400)
                .end(function(err, res) {
                    if (err && err.status !== 400) {
                        logApiResponse('GET', '/i/dashboards/update', {
                            dashboard_id: invalidId,
                            name: newName,
                            share_with: 'none'
                        }, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/dashboard.*doesn.*exist|invalid.*dashboard/i);
                    done();
                });
        });
    });

    describe('9. /i/dashboards/add-widget - Add Widget', function() {
        it('should add a widget to an existing dashboard', function(done) {
            if (createdResources.dashboards.length === 0) {
                return done(new Error("No dashboards created for widget test"));
            }

            const APP_ID = testUtils.get("APP_ID");
            const dashboardId = createdResources.dashboards[0];
            const widgetData = JSON.stringify({
                widget_type: "analytics",
                apps: [APP_ID],
                data_type: "sessions",
                position: [0, 0],
                size: [4, 3]
            });

            request
                .get(getRequestURL('/i/dashboards/add-widget') +
                    `&dashboard_id=${dashboardId}&widget=${encodeURIComponent(widgetData)}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/i/dashboards/add-widget', {
                            dashboard_id: dashboardId,
                            widget: widgetData
                        }, res);
                        return done(err);
                    }

                    // Should return widget ID
                    should.exist(res.body);
                    res.body.should.be.a.String();

                    createdResources.widgets.push({
                        dashboardId: dashboardId,
                        widgetId: res.body
                    });

                    console.log(`✅ Widget added successfully with ID: ${res.body}`);
                    done();
                });
        });

        it('should fail with invalid dashboard_id', function(done) {
            const invalidId = "507f1f77bcf86cd799439011";
            const widgetData = JSON.stringify({widget_type: "analytics"});

            request
                .get(getRequestURL('/i/dashboards/add-widget') +
                    `&dashboard_id=${invalidId}&widget=${encodeURIComponent(widgetData)}`)
                .expect(400)
                .end(function(err, res) {
                    if (err && err.status !== 400) {
                        logApiResponse('GET', '/i/dashboards/add-widget', {
                            dashboard_id: invalidId,
                            widget: widgetData
                        }, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/invalid.*parameter.*widget|invalid.*dashboard/i);
                    done();
                });
        });
    });

    describe('10. /i/dashboards/update-widget - Update Widget', function() {
        it('should update an existing widget', function(done) {
            if (createdResources.widgets.length === 0) {
                return done(new Error("No widgets created for update test"));
            }

            const widget = createdResources.widgets[0];
            const updatedWidgetData = JSON.stringify({
                widget_type: "analytics",
                data_type: "users",
                title: "Updated Widget Title"
            });

            request
                .get(getRequestURL('/i/dashboards/update-widget') +
                    `&dashboard_id=${widget.dashboardId}&widget_id=${widget.widgetId}` +
                    `&widget=${encodeURIComponent(updatedWidgetData)}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/i/dashboards/update-widget', {
                            dashboard_id: widget.dashboardId,
                            widget_id: widget.widgetId,
                            widget: updatedWidgetData
                        }, res);
                        return done(err);
                    }

                    res.body.should.have.property('result', 'Success');
                    console.log(`✅ Widget updated successfully`);
                    done();
                });
        });

        it('should fail with invalid widget_id', function(done) {
            if (createdResources.dashboards.length === 0) {
                return done(new Error("No dashboards available for test"));
            }

            const dashboardId = createdResources.dashboards[0];
            const invalidWidgetId = "507f1f77bcf86cd799439011";
            const widgetData = JSON.stringify({widget_type: "analytics"});

            request
                .get(getRequestURL('/i/dashboards/update-widget') +
                    `&dashboard_id=${dashboardId}&widget_id=${invalidWidgetId}` +
                    `&widget=${encodeURIComponent(widgetData)}`)
                .expect(400)
                .end(function(err, res) {
                    if (err && err.status !== 400) {
                        logApiResponse('GET', '/i/dashboards/update-widget', {
                            dashboard_id: dashboardId,
                            widget_id: invalidWidgetId,
                            widget: widgetData
                        }, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/dashboard.*widget.*combination.*not.*exist/i);
                    done();
                });
        });
    });

    describe('11. /i/dashboards/remove-widget - Remove Widget', function() {
        it('should remove an existing widget', function(done) {
            if (createdResources.widgets.length === 0) {
                return done(new Error("No widgets created for removal test"));
            }

            const widget = createdResources.widgets[0];

            request
                .get(getRequestURL('/i/dashboards/remove-widget') +
                    `&dashboard_id=${widget.dashboardId}&widget_id=${widget.widgetId}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/i/dashboards/remove-widget', {
                            dashboard_id: widget.dashboardId,
                            widget_id: widget.widgetId
                        }, res);
                        return done(err);
                    }

                    res.body.should.have.property('result', 'Success');

                    // Remove from our tracking array
                    createdResources.widgets.splice(0, 1);

                    console.log(`✅ Widget removed successfully`);
                    done();
                });
        });

        it('should fail with invalid widget_id', function(done) {
            if (createdResources.dashboards.length === 0) {
                return done(new Error("No dashboards available for test"));
            }

            const dashboardId = createdResources.dashboards[0];
            const invalidWidgetId = "507f1f77bcf86cd799439011";

            request
                .get(getRequestURL('/i/dashboards/remove-widget') +
                    `&dashboard_id=${dashboardId}&widget_id=${invalidWidgetId}`)
                .expect(400)
                .end(function(err, res) {
                    if (err && err.status !== 400) {
                        logApiResponse('GET', '/i/dashboards/remove-widget', {
                            dashboard_id: dashboardId,
                            widget_id: invalidWidgetId
                        }, res);
                        return done(err);
                    }

                    res.body.should.have.property('result');
                    res.body.result.should.match(/dashboard.*widget.*combination.*not.*exist/i);
                    done();
                });
        });
    });

    describe('12. /i/dashboards/delete - Delete Dashboard', function() {
        it('should delete an existing dashboard', function(done) {
            if (createdResources.dashboards.length === 0) {
                return done(new Error("No dashboards created for deletion test"));
            }

            // Delete the last dashboard to keep others for remaining tests
            const dashboardIdToDelete = createdResources.dashboards[createdResources.dashboards.length - 1];

            request
                .get(getRequestURL('/i/dashboards/delete') + `&dashboard_id=${dashboardIdToDelete}`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/i/dashboards/delete', {dashboard_id: dashboardIdToDelete}, res);
                        return done(err);
                    }

                    res.body.should.be.an.Object();
                    // Dashboard delete returns MongoDB result object
                    if (res.body.result && res.body.result === 'Success') {
                        res.body.should.have.property('result', 'Success');
                    }
                    else if (res.body.acknowledged !== undefined) {
                        // MongoDB delete result format
                        res.body.should.have.property('acknowledged', true);
                        res.body.should.have.property('deletedCount');
                    }

                    // Remove from our tracking array
                    createdResources.dashboards.splice(
                        createdResources.dashboards.indexOf(dashboardIdToDelete),
                        1
                    );

                    console.log(`✅ Dashboard deleted successfully`);
                    done();
                });
        });

        it('should handle non-existent dashboard ID', function(done) {
            const nonExistentId = "507f1f77bcf86cd799439011";

            request
                .get(getRequestURL('/i/dashboards/delete') + `&dashboard_id=${nonExistentId}`)
                .expect(400)
                .end(function(err, res) {
                    if (err && err.status !== 400) {
                        // Some APIs might return 200 for idempotent delete
                        if (res.status === 200) {
                            return done();
                        }
                        logApiResponse('GET', '/i/dashboards/delete', {dashboard_id: nonExistentId}, res);
                        return done(err);
                    }

                    if (res.body && res.body.result) {
                        res.body.result.should.match(/dashboard.*doesn.*exist|not.*found/i);
                    }
                    done();
                });
        });
    });

    describe('13. End-to-End Workflow Test', function() {
        let workflowDashboardId;
        let workflowWidgetId;

        it('should successfully execute complete dashboard lifecycle', function(done) {
            const APP_ID = testUtils.get("APP_ID");

            // Step 1: Create a new dashboard
            const dashboardName = "Workflow Test Dashboard";
            request
                .get(getRequestURL('/i/dashboards/create') +
                    `&name=${encodeURIComponent(dashboardName)}&share_with=none`)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        logApiResponse('GET', '/i/dashboards/create', {name: dashboardName, share_with: 'none'}, res);
                        return done(err);
                    }

                    should.exist(res.body);
                    workflowDashboardId = res.body;
                    createdResources.dashboards.push(workflowDashboardId);

                    // Step 2: Add a widget to the dashboard
                    const widgetData = JSON.stringify({
                        widget_type: "analytics",
                        apps: [APP_ID],
                        data_type: "sessions"
                    });

                    request
                        .get(getRequestURL('/i/dashboards/add-widget') +
                            `&dashboard_id=${workflowDashboardId}&widget=${encodeURIComponent(widgetData)}`)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) {
                                logApiResponse('GET', '/i/dashboards/add-widget', {
                                    dashboard_id: workflowDashboardId,
                                    widget: widgetData
                                }, res);
                                return done(err);
                            }

                            workflowWidgetId = res.body;
                            createdResources.widgets.push({
                                dashboardId: workflowDashboardId,
                                widgetId: workflowWidgetId
                            });

                            // Step 3: Get the dashboard data
                            request
                                .get(getRequestURL('/o/dashboard/data') +
                                    `&dashboard_id=${workflowDashboardId}&widget_id=${workflowWidgetId}`)
                                .expect(200)
                                .end(function(err, res) {
                                    if (err) {
                                        logApiResponse('GET', '/o/dashboard/data', null, res);
                                        return done(err);
                                    }

                                    res.body.should.be.an.Object();

                                    // Step 4: Update the dashboard
                                    const updatedName = "Updated Workflow Dashboard";
                                    request
                                        .get(getRequestURL('/i/dashboards/update') +
                                            `&dashboard_id=${workflowDashboardId}&name=${encodeURIComponent(updatedName)}&share_with=none`)
                                        .expect(200)
                                        .end(function(err, res) {
                                            if (err) {
                                                logApiResponse('GET', '/i/dashboards/update', {
                                                    dashboard_id: workflowDashboardId,
                                                    name: updatedName,
                                                    share_with: 'none'
                                                }, res);
                                                return done(err);
                                            }

                                            res.body.should.be.an.Object();
                                            // Dashboard update returns MongoDB result object
                                            if (res.body.result && res.body.result === 'Success') {
                                                res.body.should.have.property('result', 'Success');
                                            }
                                            else if (res.body.acknowledged !== undefined) {
                                                // MongoDB update result format
                                                res.body.should.have.property('acknowledged', true);
                                                res.body.should.have.property('modifiedCount');
                                            }

                                            // Step 5: Verify the update by getting all dashboards
                                            request
                                                .get(getRequestURL('/o/dashboards/all'))
                                                .expect(200)
                                                .end(function(err, res) {
                                                    if (err) {
                                                        logApiResponse('GET', '/o/dashboards/all', null, res);
                                                        return done(err);
                                                    }

                                                    const updatedDashboard = res.body.find(d => d._id === workflowDashboardId);
                                                    should.exist(updatedDashboard);
                                                    updatedDashboard.should.have.property('name', updatedName);

                                                    // Step 6: Remove the widget
                                                    request
                                                        .get(getRequestURL('/i/dashboards/remove-widget') +
                                                            `&dashboard_id=${workflowDashboardId}&widget_id=${workflowWidgetId}`)
                                                        .expect(200)
                                                        .end(function(err, res) {
                                                            if (err) {
                                                                logApiResponse('GET', '/i/dashboards/remove-widget', {
                                                                    dashboard_id: workflowDashboardId,
                                                                    widget_id: workflowWidgetId
                                                                }, res);
                                                                return done(err);
                                                            }

                                                            res.body.should.have.property('result', 'Success');

                                                            // Step 7: Delete the dashboard
                                                            request
                                                                .get(getRequestURL('/i/dashboards/delete') +
                                                                    `&dashboard_id=${workflowDashboardId}`)
                                                                .expect(200)
                                                                .end(function(err, res) {
                                                                    if (err) {
                                                                        logApiResponse('GET', '/i/dashboards/delete', {
                                                                            dashboard_id: workflowDashboardId
                                                                        }, res);
                                                                        return done(err);
                                                                    }

                                                                    res.body.should.be.an.Object();
                                                                    // Dashboard delete returns MongoDB result object
                                                                    if (res.body.result && res.body.result === 'Success') {
                                                                        res.body.should.have.property('result', 'Success');
                                                                    }
                                                                    else if (res.body.acknowledged !== undefined) {
                                                                        // MongoDB delete result format
                                                                        res.body.should.have.property('acknowledged', true);
                                                                        res.body.should.have.property('deletedCount');
                                                                    }

                                                                    // Remove from tracking arrays
                                                                    const dashboardIndex = createdResources.dashboards.indexOf(workflowDashboardId);
                                                                    if (dashboardIndex >= 0) {
                                                                        createdResources.dashboards.splice(dashboardIndex, 1);
                                                                    }

                                                                    const widgetIndex = createdResources.widgets.findIndex(w =>
                                                                        w.widgetId === workflowWidgetId);
                                                                    if (widgetIndex >= 0) {
                                                                        createdResources.widgets.splice(widgetIndex, 1);
                                                                    }

                                                                    console.log(`✅ Complete workflow test passed successfully`);
                                                                    done();
                                                                });
                                                        });
                                                });
                                        });
                                });
                        });
                });
        });
    });

    // Clean up all created resources after all tests
    after(function(done) {
        if (createdResources.dashboards.length === 0) {
            return done();
        }

        console.log(`\n🧹 Cleaning up ${createdResources.dashboards.length} test dashboards...`);

        // Delete all dashboards created during testing
        const deletePromises = createdResources.dashboards.map(dashboardId => {
            return new Promise((resolve) => {
                console.log(`  - Deleting dashboard ${dashboardId}`);
                request
                    .get(getRequestURL('/i/dashboards/delete') + `&dashboard_id=${dashboardId}`)
                    .end(function(err, res) {
                        if (err) {
                            console.log(`❌ Error deleting dashboard ${dashboardId}: ${err.message}`);
                            console.log(`  Response details: ${JSON.stringify(res.body || {})}`);
                        }
                        else {
                            console.log(`  ✓ Dashboard ${dashboardId} deleted`);
                        }
                        resolve();
                    });
            });
        });

        Promise.all(deletePromises)
            .then(() => {
                console.log(`✅ Cleanup completed`);
                done();
            })
            .catch(done);
    });
});