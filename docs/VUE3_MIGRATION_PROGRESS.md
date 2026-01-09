# Vue 3 Migration Progress Report

## Executive Summary

The Countly frontend is being migrated from **Backbone.js to Vue 3**. A compatibility layer has been created that allows the application to run in **hybrid mode**, where both Backbone and Vue 3 components coexist.

## Files Created

### New Migration Files

| File | Size | Purpose |
|------|------|---------|
| [vue/compat.js](../frontend/express/public/javascripts/countly/vue/compat.js) | ~330 lines | Vue 2/3 compatibility utilities |
| [vue/router.js](../frontend/express/public/javascripts/countly/vue/router.js) | ~440 lines | Vue 3 Router with Backbone.history compatibility |
| [vue/view.js](../frontend/express/public/javascripts/countly/vue/view.js) | ~500 lines | Vue 3 compatible countlyView base class |
| [vue/app.js](../frontend/express/public/javascripts/countly/vue/app.js) | ~320 lines | Vue 3 app bootstrap with EventBus |
| [vue/backbone-compat.js](../frontend/express/public/javascripts/countly/vue/backbone-compat.js) | ~280 lines | Full Backbone.Router/View polyfill |
| [vue/integration.js](../frontend/express/public/javascripts/countly/vue/integration.js) | ~250 lines | Migration orchestration module |

### Modified Core Files

| File | Changes |
|------|---------|
| [vue/core.js](../frontend/express/public/javascripts/countly/vue/core.js) | Updated BackboneWrapper, autoRefreshMixin, and base components for Vue 3 support |

### Test Files

| File | Purpose |
|------|---------|
| [test/unit/vue3-migration.unit.js](../test/unit/vue3-migration.unit.js) | Unit tests for migration compatibility |
| [test/integration/vue3-migration-load-test.html](../test/integration/vue3-migration-load-test.html) | Browser-based load test |

### Documentation

| File | Purpose |
|------|---------|
| [docs/BACKBONE_TO_VUE3_MIGRATION.md](./BACKBONE_TO_VUE3_MIGRATION.md) | Comprehensive migration guide |
| [docs/DASHBOARD_SCRIPT_CHANGES.md](./DASHBOARD_SCRIPT_CHANGES.md) | Script loading order documentation |
| [docs/examples/vue3-migration-example.js](./examples/vue3-migration-example.js) | Example plugin migration |

## Modified Files

### Build Configuration

1. **[Gruntfile.js](../Gruntfile.js)**
   - Added `vue/compat.js` to lib concatenation
   - Added `vue/router.js` to lib concatenation
   - Added `vue/view.js` to lib concatenation
   - Added `vue/app.js` to lib concatenation
   - Added `vue/integration.js` to lib concatenation

2. **[frontend/express/views/dashboard.html](../frontend/express/views/dashboard.html)**
   - Added `vue/compat.js` before `vue/core.js`
   - Added script tags for Vue 3 migration layer files
   - Files loaded after `vue/container.js` and before `countly.template.js`

## API Compatibility

All existing APIs remain compatible:

| API | Status | Notes |
|-----|--------|-------|
| `app.route(pattern, name, callback)` | ✅ Working | Registered with both Backbone and Vue router |
| `app.navigate(path, trigger)` | ✅ Working | Forwards to Vue router in hybrid mode |
| `Backbone.history.getFragment()` | ✅ Working | Returns current URL fragment |
| `Backbone.history.fragment` | ✅ Working | Current URL fragment property |
| `countlyView.extend({...})` | ✅ Working | Same lifecycle interface |
| `new countlyVue.views.BackboneWrapper({...})` | ✅ Working | Updated for Vue 3 support |
| `countlyVue.container.registerData(...)` | ✅ Working | Unchanged |
| `countlyVue.compat.IS_VUE_3` | ✅ NEW | Check if running in Vue 3 mode |
| `countlyVue.compat.EventBus` | ✅ NEW | Global event bus for Vue 3 |
| `countlyVue.helpers.eventBus` | ✅ NEW | Easy access to event bus |
| `countlyVue.helpers.compatMixin` | ✅ NEW | Mixin with clyOn/clyOff/clyEmit |
| `countlyVue.helpers.lifecycleMixin` | ✅ NEW | Both Vue 2 & 3 lifecycle hooks |

## Testing the Migration

### 1. Check Migration Status

Open browser console and run:
```javascript
countlyVue.migration.getStats()
```

Expected output:
```javascript
{
    status: "hybrid",
    vueVersion: 2,        // Will be 3 after Vue upgrade
    isVue3: false,        // Will be true after Vue upgrade
    migrationStarted: true,
    migrationComplete: false,
    registeredRoutes: 0   // Will increase as routes are registered
}
```

### 2. Run Unit Tests
```bash
cd /path/to/countly-server
npm run test:unit
```

### 3. Run UI Tests
```bash
cd /path/to/countly-server
npm run test:ui
```

## Next Steps

### Phase 2: Upgrade Vue Libraries

1. **Download Vue 3 libraries**
   ```bash
   # Download to /javascripts/utils/vue/
   curl -o vue.global.min.js https://unpkg.com/vue@3.4/dist/vue.global.min.js
   curl -o vuex.global.min.js https://unpkg.com/vuex@4/dist/vuex.global.min.js
   curl -o vue-router.global.min.js https://unpkg.com/vue-router@4/dist/vue-router.global.min.js
   ```

2. **Update script tags in dashboard.html**
   - Replace Vue 2 with Vue 3
   - Replace Vuex 3 with Vuex 4

3. **Update vue/core.js**
   - Change `new Vue({...})` to `Vue.createApp({...}).mount(...)`
   - Update Vuex store creation
   - Replace `$on`/`$off`/`$emit` with the EventBus from `vue/app.js`

### Phase 3: Migrate Element UI to Element Plus

1. **Download Element Plus**
   - Get from https://element-plus.org/

2. **Update component references**
   - Most components keep same names
   - Some API changes required

### Phase 4: Remove Backbone.js

1. **Update countly.template.js**
   - Replace `Backbone.Router.extend` with plain object
   - Use `countlyVue.router` internally

2. **Remove Backbone script tag**
   - From dashboard.html

3. **Call migration complete**
   ```javascript
   countlyVue.migration.complete();
   ```

## Architecture Diagram

```
Before Migration:
┌─────────────────────────────────────────────────┐
│                  Backbone.js                     │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │ AppRouter    │───▶│ Backbone.history     │   │
│  │ (Backbone)   │    │ URL Management       │   │
│  └──────────────┘    └──────────────────────┘   │
│         │                                        │
│         ▼                                        │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │ countlyView  │───▶│ BackboneWrapper      │   │
│  │ (Backbone)   │    │ (Vue 2 components)   │   │
│  └──────────────┘    └──────────────────────┘   │
└─────────────────────────────────────────────────┘

After Migration (Hybrid Mode - Current):
┌─────────────────────────────────────────────────┐
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │ AppRouter    │◀──▶│ countlyVue.router    │   │
│  │ (Backbone)   │    │ (Vue 3 compatible)   │   │
│  └──────────────┘    └──────────────────────┘   │
│         │                   │                    │
│         ▼                   ▼                    │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │ countlyView  │◀──▶│ countlyVue.View      │   │
│  │ (Backbone)   │    │ (Vue 3 compatible)   │   │
│  └──────────────┘    └──────────────────────┘   │
│         │                                        │
│         ▼                                        │
│  ┌──────────────────────────────────────────┐   │
│  │         Vue 2 Components (unchanged)      │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

After Migration (Complete):
┌─────────────────────────────────────────────────┐
│                    Vue 3                         │
│  ┌──────────────────────────────────────────┐   │
│  │           countlyVue.router               │   │
│  │      (Vue Router 4 + history API)         │   │
│  └──────────────────────────────────────────┘   │
│                      │                           │
│                      ▼                           │
│  ┌──────────────────────────────────────────┐   │
│  │           countlyVue.View                 │   │
│  │      (Vue 3 Composition API)              │   │
│  └──────────────────────────────────────────┘   │
│                      │                           │
│                      ▼                           │
│  ┌──────────────────────────────────────────┐   │
│  │          Vue 3 Components                 │   │
│  │         (Element Plus UI)                 │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Rollback Plan

If issues arise, the migration can be rolled back by:

1. Reverting changes to `dashboard.html` (remove new script tags)
2. Reverting changes to `Gruntfile.js` (remove new files from concatenation)
3. The new files can remain - they don't affect functionality if not loaded

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Plugins break after upgrade | Medium | High | Hybrid mode allows gradual migration |
| UI tests fail | Low | High | Compatibility layer preserves all APIs |
| Performance regression | Low | Medium | Vue 3 is actually faster than Vue 2 |
| Element Plus incompatibilities | Medium | Medium | Document all component API changes |
