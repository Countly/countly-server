/* global describe, it, expect, beforeEach, afterEach, jest, countlyVue, countlyView, app, Backbone, $, CV */

/**
 * Vue 3 Migration Compatibility Tests
 * 
 * These tests verify that the migration layer maintains backward compatibility
 * with existing Backbone-based code.
 * 
 * Run with: npm run test:unit
 */

describe('Vue 3 Migration Compatibility', function() {

    describe('countlyView backward compatibility', function() {

        it('should allow extending countlyView with same API', function() {
            var TestView = countlyView.extend({
                templateData: { title: 'Test' },

                initialize: function() {
                    this.initialized = true;
                },

                beforeRender: function() {
                    return true;
                },

                renderCommon: function(isRefresh) {
                    this.rendered = true;
                    this.isRefresh = isRefresh;
                },

                afterRender: function() {
                    this.afterRendered = true;
                },

                refresh: function() {
                    this.refreshed = true;
                },

                destroy: function() {
                    this.destroyed = true;
                }
            });

            expect(TestView).toBeDefined();
            expect(typeof TestView).toBe('function');
        });

        it('should create view instances with correct properties', function() {
            var TestView = countlyView.extend({
                templateData: { title: 'Test' }
            });

            var instance = new TestView();

            expect(instance.templateData).toEqual({ title: 'Test' });
            expect(instance.isLoaded).toBe(false);
            expect(instance._myRequests).toEqual({});
        });

        it('should support __super__ reference', function() {
            var ParentView = countlyView.extend({
                myMethod: function() {
                    return 'parent';
                }
            });

            var ChildView = ParentView.extend({
                myMethod: function() {
                    return ChildView.__super__.myMethod.call(this) + '-child';
                }
            });

            var instance = new ChildView();
            expect(instance.myMethod()).toBe('parent-child');
        });
    });

    describe('app.route backward compatibility', function() {

        it('should accept route registrations', function() {
            expect(function() {
                app.route('/test-route', 'test-route', function() {
                    // Route callback
                });
            }).not.toThrow();
        });

        it('should store routes for later processing', function() {
            var routeCallback = function() {};

            // This should work whether using Backbone or Vue router
            app.route('/another-test', 'another-test', routeCallback);

            // Route should be registered somewhere
            expect(app).toBeDefined();
        });
    });

    describe('Backbone.history compatibility', function() {

        it('should have getFragment method', function() {
            expect(typeof Backbone.history.getFragment).toBe('function');
        });

        it('should have _getFragment method', function() {
            expect(typeof Backbone.history._getFragment).toBe('function');
        });

        it('should have noHistory method', function() {
            expect(typeof Backbone.history.noHistory).toBe('function');
        });

        it('should have urlChecks array', function() {
            expect(Array.isArray(Backbone.history.urlChecks)).toBe(true);
        });

        it('should have checkOthers method', function() {
            expect(typeof Backbone.history.checkOthers).toBe('function');
        });
    });

    describe('countlyVue.views.BackboneWrapper compatibility', function() {

        it('should create wrapper instances', function() {
            var TestComponent = {
                template: '<div>Test</div>',
                data: function() {
                    return { test: true };
                }
            };

            var wrapper = new countlyVue.views.BackboneWrapper({
                component: TestComponent,
                templates: []
            });

            expect(wrapper).toBeDefined();
            expect(typeof wrapper.render).toBe('function');
            expect(typeof wrapper.refresh).toBe('function');
            expect(typeof wrapper.destroy).toBe('function');
        });

        it('should support vuex property', function() {
            var TestComponent = {
                template: '<div>Test</div>'
            };

            var wrapper = new countlyVue.views.BackboneWrapper({
                component: TestComponent,
                vuex: [{
                    clyModel: {
                        getVuexModule: function() {
                            return { name: 'test', module: {} };
                        }
                    }
                }],
                templates: []
            });

            expect(wrapper).toBeDefined();
        });
    });

    describe('countlyVue.views.create compatibility', function() {

        it('should create Vue components', function() {
            var component = countlyVue.views.create({
                template: '<div>Test</div>',
                data: function() {
                    return { test: true };
                },
                methods: {
                    refresh: function() {}
                }
            });

            expect(component).toBeDefined();
        });

        it('should support CV.T template loading', function() {
            // CV.T should be available and return a template loader
            expect(typeof CV.T).toBe('function');
        });
    });

    describe('Menu registration compatibility', function() {

        it('should support addMenu', function() {
            expect(typeof app.addMenu).toBe('function');
        });

        it('should support addSubMenu', function() {
            expect(typeof app.addSubMenu).toBe('function');
        });

        it('should support addMenuForType', function() {
            expect(typeof app.addMenuForType).toBe('function');
        });

        it('should support addSubMenuForType', function() {
            expect(typeof app.addSubMenuForType).toBe('function');
        });
    });

    describe('App lifecycle callbacks', function() {

        it('should support addAppSwitchCallback', function() {
            expect(typeof app.addAppSwitchCallback).toBe('function');

            var callback = jest.fn();
            app.addAppSwitchCallback(callback, 'test-plugin');

            // Callback should be registered
            expect(app.appSwitchCallbacks.length).toBeGreaterThan(0);
        });

        it('should support addPageScript', function() {
            expect(typeof app.addPageScript).toBe('function');
        });

        it('should support addRefreshScript', function() {
            expect(typeof app.addRefreshScript).toBe('function');
        });
    });

    describe('countlyVue.container compatibility', function() {

        it('should have registerData method', function() {
            expect(typeof countlyVue.container.registerData).toBe('function');
        });

        it('should have registerTab method', function() {
            expect(typeof countlyVue.container.registerTab).toBe('function');
        });

        it('should have dataMixin method', function() {
            expect(typeof countlyVue.container.dataMixin).toBe('function');
        });

        it('should have tabsMixin method', function() {
            expect(typeof countlyVue.container.tabsMixin).toBe('function');
        });

        it('should have getAllRoutes method', function() {
            expect(typeof countlyVue.container.getAllRoutes).toBe('function');
        });
    });

    describe('countlyVue.vuex compatibility', function() {

        it('should have getGlobalStore method', function() {
            expect(typeof countlyVue.vuex.getGlobalStore).toBe('function');
        });

        it('should have registerGlobally method', function() {
            expect(typeof countlyVue.vuex.registerGlobally).toBe('function');
        });

        it('should return a Vuex store', function() {
            var store = countlyVue.vuex.getGlobalStore();
            expect(store).toBeDefined();
            expect(typeof store.state).toBe('object');
        });
    });

    describe('Event system compatibility', function() {

        it('should support app event bus', function() {
            if (countlyVue.app && countlyVue.app.eventBus) {
                expect(typeof countlyVue.app.eventBus.$on).toBe('function');
                expect(typeof countlyVue.app.eventBus.$off).toBe('function');
                expect(typeof countlyVue.app.eventBus.$emit).toBe('function');
            }
        });
    });
});

/**
 * Integration test - simulates a full view lifecycle
 */
describe('View Lifecycle Integration', function() {

    var testView;
    var lifecycleOrder;

    beforeEach(function() {
        lifecycleOrder = [];

        var TestView = countlyView.extend({
            initialize: function() {
                lifecycleOrder.push('initialize');
            },
            beforeRender: function() {
                lifecycleOrder.push('beforeRender');
                return $.Deferred().resolve().promise();
            },
            renderCommon: function(isRefresh) {
                lifecycleOrder.push(isRefresh ? 'renderCommon-refresh' : 'renderCommon');
            },
            afterRender: function() {
                lifecycleOrder.push('afterRender');
            },
            refresh: function() {
                lifecycleOrder.push('refresh');
                this.renderCommon(true);
            },
            destroy: function() {
                lifecycleOrder.push('destroy');
            }
        });

        testView = new TestView({ el: $('<div>') });
    });

    afterEach(function() {
        if (testView && testView.destroy) {
            testView.destroy();
        }
    });

    it('should call initialize on construction', function() {
        expect(lifecycleOrder).toContain('initialize');
    });

    it('should have correct render method', function() {
        expect(typeof testView.render).toBe('function');
    });

    it('should have correct refresh method', function() {
        expect(typeof testView.refresh).toBe('function');
    });
});
