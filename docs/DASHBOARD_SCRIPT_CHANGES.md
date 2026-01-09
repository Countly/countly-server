# Vue 3 Migration: Script Loading Changes

This document describes the changes needed to `dashboard.html` for the Vue 3 migration.

## Current Script Loading Order (with Backbone)

```html
<!-- Core Libraries -->
<script src="javascripts/dom/jquery/jquery.js"></script>
<script src="javascripts/utils/polyfills.js"></script>
<script src="javascripts/utils/underscore-min.js"></script>
<script src="javascripts/utils/backbone-min.js"></script>        <!-- BACKBONE -->
<script src="javascripts/utils/jquery.i18n.properties.js"></script>
<!-- ... other utils ... -->

<!-- Vue 2 + Plugins -->
<script src="javascripts/utils/vue/vue.min.js"></script>          <!-- VUE 2 -->
<script src="javascripts/utils/vue/composition-api.min.js"></script>
<script src="javascripts/utils/vue/vuex.min.js"></script>
<!-- ... other vue plugins ... -->

<!-- Countly Core -->
<script src="javascripts/countly/countly.auth.js"></script>
<script src="javascripts/countly/countly.view.js"></script>       <!-- Uses Backbone.View -->
<script src="javascripts/countly/vue/core.js"></script>
<script src="javascripts/countly/vue/container.js"></script>
<script src="javascripts/countly/countly.template.js"></script>   <!-- Uses Backbone.Router -->
<!-- ... vue components ... -->

<!-- At end -->
<script>Backbone.history.start();</script>                        <!-- BACKBONE INIT -->
```

## New Script Loading Order (Vue 3 Compatible)

```html
<!-- Core Libraries -->
<script src="javascripts/dom/jquery/jquery.js"></script>
<script src="javascripts/utils/polyfills.js"></script>
<script src="javascripts/utils/underscore-min.js"></script>

<!-- MIGRATION PHASE 1: Load Backbone compatibility layer BEFORE actual Backbone -->
<!-- This provides a fallback if vue/backbone-compat.js handles routing -->
<script src="javascripts/utils/backbone-min.js"></script>

<script src="javascripts/utils/jquery.i18n.properties.js"></script>
<!-- ... other utils ... -->

<!-- Vue 3 + Plugins (replace Vue 2 files) -->
<script src="javascripts/utils/vue/vue.global.min.js"></script>   <!-- VUE 3 -->
<!-- Note: Composition API is built-in to Vue 3, no separate file needed -->
<script src="javascripts/utils/vue/vuex.global.min.js"></script>  <!-- VUEX 4 -->
<script src="javascripts/utils/vue/vue-router.global.min.js"></script> <!-- VUE ROUTER 4 -->
<!-- ... other vue plugins (update to Vue 3 compatible versions) ... -->

<!-- Countly Vue 3 Migration Layer -->
<script src="javascripts/countly/vue/backbone-compat.js"></script>  <!-- NEW: Backbone polyfill -->
<script src="javascripts/countly/vue/router.js"></script>           <!-- NEW: Vue Router wrapper -->
<script src="javascripts/countly/vue/view.js"></script>             <!-- NEW: countlyView replacement -->
<script src="javascripts/countly/vue/app.js"></script>              <!-- NEW: Vue 3 app bootstrap -->

<!-- Countly Core (unchanged - uses compatibility layer) -->
<script src="javascripts/countly/countly.auth.js"></script>
<script src="javascripts/countly/countly.view.js"></script>
<script src="javascripts/countly/vue/core.js"></script>
<script src="javascripts/countly/vue/container.js"></script>
<script src="javascripts/countly/countly.template.js"></script>
<!-- ... vue components ... -->

<!-- At end: Works with both Backbone and Vue 3 router -->
<script>
if (typeof Backbone !== 'undefined' && Backbone.history) {
    Backbone.history.start();
}
</script>
```

## Phased Migration Approach

### Phase 1: Add Compatibility Layer (Non-Breaking)

Add the new files without removing Backbone:

```html
<!-- Add AFTER backbone-min.js, BEFORE vue libraries -->
<script src="javascripts/countly/vue/backbone-compat.js"></script>

<!-- Add AFTER vue/core.js -->
<script src="javascripts/countly/vue/router.js"></script>
<script src="javascripts/countly/vue/view.js"></script>
<script src="javascripts/countly/vue/app.js"></script>
```

This allows:
- All existing Backbone code continues to work
- New Vue 3 features are available
- Testing can validate compatibility

### Phase 2: Upgrade Vue to Version 3

Replace Vue 2 files with Vue 3 versions:

| Old File | New File |
|----------|----------|
| `vue.min.js` | `vue.global.min.js` |
| `composition-api.min.js` | (not needed, built-in) |
| `vuex.min.js` | `vuex.global.min.js` |
| `element-ui.js` | `element-plus.js` |

### Phase 3: Remove Backbone Dependency

Once all views are verified working:

1. Remove `backbone-min.js` from script loading
2. Remove `backbone-compat.js` (no longer needed)
3. Update `countly.template.js` to use Vue Router directly
4. Update `countly.view.js` to use Vue component base

## File Download Links

Download Vue 3 libraries from CDN:

- **Vue 3**: https://unpkg.com/vue@3/dist/vue.global.min.js
- **Vuex 4**: https://unpkg.com/vuex@4/dist/vuex.global.min.js  
- **Vue Router 4**: https://unpkg.com/vue-router@4/dist/vue-router.global.min.js
- **Element Plus**: https://unpkg.com/element-plus/dist/index.full.min.js

## Testing the Migration

After each phase, run:

```bash
# Unit tests
npm run test:unit

# UI tests
cd ui-tests && npm test

# Manual testing checklist:
# - [ ] Login page loads
# - [ ] Dashboard loads after login
# - [ ] Navigation between views works
# - [ ] App switching works
# - [ ] Date picker works
# - [ ] All sidebar menus expand/collapse
# - [ ] Views refresh every 10 seconds
```
