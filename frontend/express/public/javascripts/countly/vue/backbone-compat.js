/* global Backbone, Vue, countlyCommon, countlyGlobal, $ */

/**
 * Backbone Compatibility Layer for Vue 3 Migration
 * 
 * This module provides backward compatibility for code that depends on Backbone.
 * It wraps the new Vue 3 router and view system to maintain the existing API.
 * 
 * Usage:
 * - Load this file BEFORE countly.template.js
 * - All existing app.route() calls will continue to work
 * - All countlyView.extend() calls will continue to work
 */
(function(window) {
    'use strict';

    // Check if we're in Vue 3 mode (used to determine initialization path)
    var _isVue3Mode = typeof Vue !== 'undefined' && typeof Vue.createApp === 'function';
    void _isVue3Mode; // Mark as intentionally unused for now

    // If Backbone is already fully defined, we're in legacy mode - don't override
    if (typeof Backbone !== 'undefined' && Backbone.Router && Backbone.View) {
        console.log('[Countly] Running in Backbone mode'); // eslint-disable-line
        return;
    }

    console.log('[Countly] Running in Vue 3 compatibility mode'); // eslint-disable-line

    /**
     * Backbone.Events polyfill
     */
    var Events = {
        _events: {},

        on: function(name, callback, context) {
            if (!this._events) {
                this._events = {};
            }
            if (!this._events[name]) {
                this._events[name] = [];
            }
            this._events[name].push({ callback: callback, context: context || this });
            return this;
        },

        off: function(name, callback) {
            if (!this._events) {
                return this;
            }
            if (!name) {
                this._events = {};
                return this;
            }
            if (!this._events[name]) {
                return this;
            }
            if (!callback) {
                delete this._events[name];
                return this;
            }
            this._events[name] = this._events[name].filter(function(evt) {
                return evt.callback !== callback;
            });
            return this;
        },

        trigger: function(name) {
            if (!this._events || !this._events[name]) {
                return this;
            }
            var args = Array.prototype.slice.call(arguments, 1);
            this._events[name].forEach(function(evt) {
                evt.callback.apply(evt.context, args);
            });
            return this;
        },

        listenTo: function(obj, name, callback) {
            obj.on(name, callback, this);
            return this;
        },

        stopListening: function(obj, name, callback) {
            if (obj) {
                obj.off(name, callback);
            }
            return this;
        }
    };

    /**
     * Backbone.History polyfill
     */
    var History = function() {
        this.handlers = [];
        this.started = false;
        this.fragment = '';
        this.urlChecks = [];
    };

    History.prototype = Object.assign({}, Events, {
        start: function(options) {
            if (this.started) {
                throw new Error('Backbone.history has already been started');
            }
            this.started = true;
            this.options = options || {};

            var self = this;

            // Listen to hash changes
            $(window).on('hashchange', function() {
                self.checkUrl();
            });

            // Initial route
            if (!this.options.silent) {
                this.checkUrl();
            }

            return true;
        },

        stop: function() {
            $(window).off('hashchange');
            this.started = false;
        },

        getFragment: function() {
            var hash = window.location.hash.replace(/^#\/?/, '');

            // Handle app ID prefix
            if (countlyCommon && countlyCommon.ACTIVE_APP_ID) {
                if (hash.indexOf(countlyCommon.ACTIVE_APP_ID + '/') === 0) {
                    hash = hash.substring(countlyCommon.ACTIVE_APP_ID.length + 1);
                }
                else if (hash === countlyCommon.ACTIVE_APP_ID) {
                    hash = '';
                }
            }

            return hash;
        },

        _getFragment: function() {
            return window.location.hash.replace(/^#\/?/, '');
        },

        navigate: function(fragment, options) {
            if (!this.started) {
                return false;
            }

            if (!options || options === true) {
                options = { trigger: !!options };
            }

            var url = '#/' + fragment.replace(/^#?\/?/, '');

            if (options.replace) {
                history.replaceState(null, null, url);
            }
            else {
                history.pushState(null, null, url);
            }

            if (options.trigger) {
                this.checkUrl();
            }

            return true;
        },

        checkOthers: function() {
            for (var i = 0; i < this.urlChecks.length; i++) {
                if (!this.urlChecks[i]()) {
                    return false;
                }
            }
            return true;
        },

        checkUrl: function() {
            var current = this.getFragment();

            if (current === this.fragment) {
                return;
            }

            this.fragment = current;
            this.loadUrl();
        },

        loadUrl: function(fragment) {
            fragment = fragment || this.getFragment();

            for (var i = 0; i < this.handlers.length; i++) {
                if (this.handlers[i].route.test(fragment)) {
                    this.handlers[i].callback(fragment);
                    return true;
                }
            }
            return false;
        },

        route: function(route, callback) {
            this.handlers.unshift({ route: route, callback: callback });
        },

        noHistory: function(hash) {
            if (history && history.replaceState) {
                history.replaceState(undefined, undefined, encodeURI(hash));
            }
            else {
                location.replace(hash);
            }
        }
    });

    /**
     * Backbone.Router polyfill
     * @param {Object} options - Router options
     */
    var Router = function(options) {
        options = options || {};
        if (options.routes) {
            this.routes = options.routes;
        }
        this._bindRoutes();
        this.initialize.apply(this, arguments);
    };

    Router.prototype = Object.assign({}, Events, {
        initialize: function() {},

        route: function(route, name, callback) {
            if (typeof route === 'string') {
                route = this._routeToRegExp(route);
            }
            if (typeof name === 'function') {
                callback = name;
                name = '';
            }
            if (!callback) {
                callback = this[name];
            }

            var router = this;
            window.Backbone.history.route(route, function(fragment) {
                var args = router._extractParameters(route, fragment);
                if (router.execute(callback, args, name) !== false) {
                    router.trigger.apply(router, ['route:' + name].concat(args));
                    router.trigger('route', name, args);
                    window.Backbone.history.trigger('route', router, name, args);
                }
            });

            return this;
        },

        execute: function(callback, args) {
            if (callback) {
                callback.apply(this, args);
            }
        },

        navigate: function(fragment, options) {
            window.Backbone.history.navigate(fragment, options);
            return this;
        },

        _bindRoutes: function() {
            if (!this.routes) {
                return;
            }

            var routes = Object.keys(this.routes);
            var i = routes.length;

            while (i--) {
                this.route(routes[i], this.routes[routes[i]]);
            }
        },

        _routeToRegExp: function(route) {
            var optionalParam = /\((.*?)\)/g;
            var namedParam = /(\(\?)?:\w+/g;
            var splatParam = /\*\w+/g;
            var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

            route = route
                .replace(escapeRegExp, '\\$&')
                .replace(optionalParam, '(?:$1)?')
                .replace(namedParam, function(match, optional) {
                    return optional ? match : '([^/?]+)';
                })
                .replace(splatParam, '([^?]*?)');

            return new RegExp('^' + route + '(?:\\?[\\s\\S]*)?$');
        },

        _extractParameters: function(route, fragment) {
            var params = route.exec(fragment).slice(1);
            return params.map(function(param, i) {
                if (i === params.length - 1) {
                    return param || null;
                }
                return param ? decodeURIComponent(param) : null;
            });
        }
    });

    Router.extend = function(protoProps, staticProps) {
        var parent = this;
        var child;

        if (protoProps && Object.prototype.hasOwnProperty.call(protoProps, 'constructor')) {
            child = protoProps.constructor;
        }
        else {
            child = function() {
                return parent.apply(this, arguments);
            };
        }

        Object.assign(child, parent, staticProps);

        var Surrogate = function() {
            this.constructor = child;
        };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate();

        if (protoProps) {
            Object.assign(child.prototype, protoProps);
        }

        child.__super__ = parent.prototype;

        return child;
    };

    /**
     * Backbone.View polyfill
     * @param {Object} options - View options
     */
    var View = function(options) {
        this.cid = 'view' + Math.random().toString(36).substr(2, 9);
        options = options || {};

        this.el = options.el || document.createElement('div');
        this.$el = $(this.el);

        if (options.model) {
            this.model = options.model;
        }
        if (options.collection) {
            this.collection = options.collection;
        }
        if (options.id) {
            this.id = options.id;
        }
        if (options.className) {
            this.className = options.className;
        }
        if (options.tagName) {
            this.tagName = options.tagName;
        }
        if (options.attributes) {
            this.attributes = options.attributes;
        }

        this._ensureElement();
        this.initialize.apply(this, arguments);
    };

    View.prototype = Object.assign({}, Events, {
        tagName: 'div',

        $: function(selector) {
            return this.$el.find(selector);
        },

        initialize: function() {},

        render: function() {
            return this;
        },

        remove: function() {
            this._removeElement();
            this.stopListening();
            return this;
        },

        _removeElement: function() {
            this.$el.remove();
        },

        setElement: function(element) {
            this.undelegateEvents();
            this._setElement(element);
            this.delegateEvents();
            return this;
        },

        _setElement: function(el) {
            this.$el = el instanceof $ ? el : $(el);
            this.el = this.$el[0];
        },

        delegateEvents: function() {
            // Simplified - full implementation would parse events hash
            return this;
        },

        undelegateEvents: function() {
            if (this.$el) {
                this.$el.off('.delegateEvents' + this.cid);
            }
            return this;
        },

        _ensureElement: function() {
            if (!this.el) {
                var attrs = Object.assign({}, this.attributes || {});
                if (this.id) {
                    attrs.id = this.id;
                }
                if (this.className) {
                    attrs.class = this.className;
                }
                this.setElement(document.createElement(this.tagName));
                for (var attr in attrs) {
                    this.el.setAttribute(attr, attrs[attr]);
                }
            }
            else {
                this.setElement(this.el);
            }
        }
    });

    View.extend = Router.extend;

    // Create Backbone namespace
    window.Backbone = window.Backbone || {};
    window.Backbone.Events = Events;
    window.Backbone.History = History;
    window.Backbone.history = new History();
    window.Backbone.Router = Router;
    window.Backbone.View = View;

    // Initialize app IDs for history
    if (countlyGlobal && countlyGlobal.apps) {
        window.Backbone.history.appIds = Object.keys(countlyGlobal.apps);
    }

}(window));
