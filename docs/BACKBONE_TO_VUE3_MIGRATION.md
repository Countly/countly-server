# Backbone.js to Vue.js 3 Migration Guide

## Overview

This document outlines the strategy for migrating the Countly frontend from Backbone.js to Vue.js 3 while maintaining full backward compatibility with existing code and ensuring all UI tests continue to pass.

## Current Migration Status

### Files Created
| File | Purpose | Status |
|------|---------|--------|
| `vue/router.js` | Vue 3 Router with Backbone.history compatibility | ✅ Created |
| `vue/view.js` | Vue 3 compatible countlyView class | ✅ Created |
| `vue/app.js` | Vue 3 app bootstrap with event bus | ✅ Created |
| `vue/backbone-compat.js` | Full Backbone polyfill | ✅ Created |
| `vue/integration.js` | Migration orchestration module | ✅ Created |

### Build Configuration
- [x] Updated `dashboard.html` - includes all new migration files
- [x] Updated `Gruntfile.js` - includes files in production build

### Migration Mode
Currently in **HYBRID** mode - both Backbone.js and Vue 3 compatibility layer coexist.

## Current Architecture

### Technologies in Use
- **Backbone.js** - Router and base View class (being replaced)
- **Vue.js 2.7** - Component rendering (with Composition API polyfill)
- **Vuex 3** - State management
- **Element UI 2** - UI component library

### Key Files
| File | Purpose |
|------|---------|
| `countly.template.js` | Main AppRouter (Backbone.Router), route registration, app initialization |
| `countly.view.js` | Base countlyView class (Backbone.View) |
| `vue/core.js` | Vue integration, BackboneWrapper, mixins, Vuex store |
| `vue/container.js` | Component registration container |

### Backbone.js Usage Patterns

1. **AppRouter** (`Backbone.Router.extend`)
   - ~15 built-in routes
   - `app.route()` API for plugin route registration
   - URL fragment management via `Backbone.history`

2. **countlyView** (`Backbone.View.extend`)
   - Lifecycle methods: `beforeRender`, `render`, `afterRender`, `refresh`, `destroy`
   - Wrapped by `BackboneWrapper` for Vue components

3. **History Management**
   - `Backbone.history.fragment` - Current URL
   - `Backbone.history.getFragment()` - Get current path
   - `Backbone.history.start()` - Initialize routing
   - `app.navigate()` - Programmatic navigation

## Migration Strategy

### Phase 1: Create Vue 3 Compatibility Layer ✅ COMPLETE

**Goal**: Create new Vue 3 infrastructure that coexists with Backbone

#### 1.1 Vue Router Compatibility (`vue/router.js`)
- Created: `/frontend/express/public/javascripts/countly/vue/router.js`
- Provides same `app.route()` API
- Wraps Vue Router 4 with Backbone-compatible interface
- Maintains `Backbone.history` compatibility

#### 1.2 Integration Module (`vue/integration.js`)
- Orchestrates the migration
- Provides `countlyVue.migration.getStats()` to check status
- Auto-initializes bridges in hybrid mode

#### 1.3 Update Imports
The dashboard.html now loads the migration files:

```html
<!-- Vue 3 Migration Layer -->
<script src="<%- cdn %>javascripts/countly/vue/router.js"></script>
<script src="<%- cdn %>javascripts/countly/vue/view.js"></script>
<script src="<%- cdn %>javascripts/countly/vue/app.js"></script>
<script src="<%- cdn %>javascripts/countly/countly.template.js"></script>
<script src="<%- cdn %>javascripts/countly/vue/integration.js"></script>
```

### Phase 2: Upgrade Vue and Libraries (NEXT)

**Goal**: Upgrade from Vue 2.7 to Vue 3.4, Vuex 3 to 4, Element UI to Element Plus

#### 2.1 Download Vue 3 Libraries
Download and add to `/javascripts/utils/vue/`:
- `vue.global.min.js` (Vue 3.4.x)
- `vuex.global.min.js` (Vuex 4.x)  
- `vue-router.global.min.js` (Vue Router 4.x)

#### 2.2 Element Plus Migration
This is the largest change. Element UI 2 → Element Plus:
- Component name changes (el-date-picker stays, some others change)
- API changes for some components
- Import style changes

### Phase 3: Migrate AppRouter to Vue 3

**Goal**: Replace Backbone.Router with Vue-based routing while keeping the same interface

#### 3.1 Changes to `countly.template.js`

The AppRouter will be refactored to use `countlyVue.router` internally:

```javascript
// Before (Backbone)
var AppRouter = Backbone.Router.extend({
    routes: {
        "/": "dashboard",
        "*path": "main"
    },
    // ...
});

// After (Vue 3 compatible)
var AppRouter = function() {
    this.initialize();
};

AppRouter.prototype = {
    route: function(pattern, name, callback) {
        countlyVue.router.route(pattern, name, callback);
    },
    navigate: function(path, options) {
        countlyVue.router.navigate(path, options);
    },
    // ... keep all other methods
};
```

#### 3.2 Backward Compatibility Layer

All existing API calls must continue to work:

| Old API | Compatibility |
|---------|---------------|
| `app.route(pattern, name, callback)` | ✅ Supported |
| `app.navigate(path, trigger)` | ✅ Supported |
| `Backbone.history.fragment` | ✅ Supported via proxy |
| `Backbone.history.getFragment()` | ✅ Supported via proxy |
| `Backbone.history.start()` | ✅ Supported |

### Phase 3: Migrate countlyView to Vue 3

**Goal**: Replace Backbone.View with pure Vue component while preserving the interface

#### 3.1 New countlyView Base

```javascript
// Create Vue 3 compatible base view
window.countlyView = {
    extend: function(options) {
        return countlyVue.views.create({
            // Map Backbone lifecycle to Vue
            beforeCreate: options.initialize,
            beforeMount: options.beforeRender,
            mounted: function() {
                this.renderCommon();
                this.afterRender();
            },
            methods: {
                renderCommon: options.renderCommon || function() {},
                afterRender: options.afterRender || function() {},
                refresh: options.refresh || function() {},
                destroy: options.destroy || function() {}
            },
            // ... map other properties
        });
    }
};
```

### Phase 4: Upgrade Vue 2 to Vue 3

**Goal**: Update Vue core and all dependent libraries

#### 4.1 Library Updates Required

| Library | Current | Target |
|---------|---------|--------|
| Vue | 2.7.x | 3.4.x |
| Vuex | 3.x | 4.x (or Pinia) |
| Element UI | 2.x | Element Plus |
| vue-echarts | 5.x | 6.x |
| vue-router | - | 4.x |

#### 4.2 Vue 3 Breaking Changes to Address

1. **Global API changes**: `Vue.component()` → `app.component()`
2. **Composition API**: Native in Vue 3, remove polyfill
3. **v-model changes**: Prop/event naming
4. **Filters removed**: Convert to methods or computed
5. **Vuex 4**: Minor API changes

### Phase 5: Remove Backbone Dependencies

**Goal**: Remove all Backbone.js code once migration is complete

#### 5.1 Files to Remove/Update

- Remove: `backbone-min.js` from utils
- Update: `dashboard.html` - remove Backbone script tag
- Update: `countly.template.js` - remove Backbone.Router usage
- Update: `countly.view.js` - remove Backbone.View usage

## Implementation Timeline

### Sprint 1 (Weeks 1-2): Foundation
- [x] Create router compatibility layer
- [ ] Add Vue Router 4 to dependencies
- [ ] Update dashboard.html imports
- [ ] Test with existing routes

### Sprint 2 (Weeks 3-4): Router Migration
- [ ] Migrate AppRouter to use Vue Router internally
- [ ] Update all `app.route()` calls to work with new router
- [ ] Test navigation and history management
- [ ] Run UI tests to verify no regressions

### Sprint 3 (Weeks 5-6): View Migration
- [ ] Create Vue 3 compatible countlyView
- [ ] Migrate BackboneWrapper to pure Vue
- [ ] Update component lifecycle mappings
- [ ] Test view rendering and refresh

### Sprint 4 (Weeks 7-8): Vue 3 Upgrade
- [ ] Upgrade Vue to 3.4.x
- [ ] Upgrade Vuex to 4.x
- [ ] Migrate Element UI to Element Plus
- [ ] Update all Vue component syntax

### Sprint 5 (Weeks 9-10): Cleanup
- [ ] Remove Backbone.js dependencies
- [ ] Remove compatibility shims
- [ ] Update documentation
- [ ] Full regression testing

## Testing Strategy

### Unit Tests
- Test router API compatibility
- Test view lifecycle methods
- Test state management

### Integration Tests
- Test navigation between views
- Test app switching
- Test date/period changes

### UI Tests (Cypress)
- All existing tests must pass
- No changes to `data-test-id` selectors
- No visual changes to UI

## Rollback Plan

Each phase creates a compatibility layer that allows rollback:

1. **Phase 1**: Can be disabled by not loading router.js
2. **Phase 2**: Keep original AppRouter code commented
3. **Phase 3**: Keep original countlyView code commented
4. **Phase 4-5**: Use feature flags to switch between versions

## File Changes Summary

### New Files
- `frontend/express/public/javascripts/countly/vue/router.js` - Vue Router compatibility
- `frontend/express/public/javascripts/utils/vue/vue-router.global.min.js` - Vue Router 4

### Modified Files
- `frontend/express/views/dashboard.html` - Updated script imports
- `frontend/express/public/javascripts/countly/countly.template.js` - Router migration
- `frontend/express/public/javascripts/countly/countly.view.js` - View migration
- `frontend/express/public/javascripts/countly/vue/core.js` - Vue 3 updates

### Deleted Files (Final Phase)
- `frontend/express/public/javascripts/utils/backbone-min.js`
- `frontend/express/public/javascripts/utils/vue/composition-api.min.js` (native in Vue 3)

## Monitoring & Success Metrics

1. **UI Test Pass Rate**: Must remain at 100%
2. **Performance**: Page load time should not increase
3. **Bundle Size**: Should decrease after removing Backbone
4. **Error Rate**: No new JavaScript errors in production

## Notes

- The migration maintains full backward compatibility at each step
- Plugin developers should be notified about deprecated APIs
- Consider creating a migration guide for plugin developers
