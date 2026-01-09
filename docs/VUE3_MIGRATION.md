# Vue 2 to Vue 3 Migration Guide for Countly

## Overview

This guide covers the migration from Vue 2 to Vue 3 in the Countly Server frontend. The migration uses a compatibility layer approach that allows code to work with both Vue 2 and Vue 3 during the transition period.

## Compatibility Layer

The following files provide Vue 2/3 compatibility:

- `/frontend/express/public/javascripts/countly/vue/compat.js` - Core compatibility utilities
- `/frontend/express/public/javascripts/countly/vue/migration-helpers.js` - Helper mixins for plugins

## Key Breaking Changes

### 1. Lifecycle Hooks

Vue 3 renamed `beforeDestroy` to `beforeUnmount` and `destroyed` to `unmounted`.

**Solution: Add both hooks**

```javascript
// Before (Vue 2 only)
beforeDestroy: function() {
    this.cleanup();
}

// After (Vue 2/3 compatible)
beforeDestroy: function() {
    this.cleanup();
},
beforeUnmount: function() {
    this.cleanup();
}
```

Or use the lifecycle mixin:
```javascript
mixins: [countlyVue.helpers.lifecycleMixin],
methods: {
    onBeforeDestroy: function() {
        this.cleanup();
    }
}
```

### 2. Event Bus ($root.$on/$emit/$off removed in Vue 3)

Vue 3 removed the event emitter methods from component instances. Use the EventBus from the compat module.

**Before (Vue 2 only):**
```javascript
// Emitting
this.$root.$emit('my-event', data);

// Listening in mounted()
this.$root.$on('my-event', function(data) { ... });

// Cleanup in beforeDestroy()
this.$root.$off('my-event');
```

**After (Vue 2/3 compatible):**
```javascript
// At the top of your IIFE, get the EventBus
var EventBus = countlyVue.compat ? countlyVue.compat.EventBus : null;

// Emitting
if (EventBus) {
    EventBus.$emit('my-event', data);
} else {
    this.$root.$emit('my-event', data);
}

// Listening - store handler reference for cleanup
mounted: function() {
    var self = this;
    this._myEventHandler = function(data) {
        // handle event
    };
    
    if (EventBus) {
        EventBus.$on('my-event', this._myEventHandler);
    } else {
        this.$root.$on('my-event', this._myEventHandler);
    }
},

// Cleanup in both hooks
beforeDestroy: function() {
    if (EventBus) {
        EventBus.$off('my-event', this._myEventHandler);
    } else {
        this.$root.$off('my-event');
    }
},
beforeUnmount: function() {
    if (EventBus) {
        EventBus.$off('my-event', this._myEventHandler);
    }
}
```

Or use the compatMixin:
```javascript
mixins: [countlyVue.helpers.compatMixin],
mounted: function() {
    this.clyOn('my-event', function(data) { ... });
},
methods: {
    emitEvent: function() {
        this.clyEmit('my-event', data);
    }
}
// Cleanup is automatic with the mixin!
```

### 3. Vue.extend() Removed

Vue 3 removed `Vue.extend()`. Use `defineComponent` or the `countlyVue.compat.extendComponent` utility.

**Before:**
```javascript
var MyComponent = Vue.extend({
    // component options
});
```

**After:**
```javascript
var MyComponent = countlyVue.compat.extendComponent({
    // component options
});
```

### 4. Component Registration

Vue 3 uses `app.component()` instead of `Vue.component()`.

**Before (Vue 2):**
```javascript
Vue.component('my-component', {
    // component options
});
```

**After (Vue 2/3 compatible):**
```javascript
countlyVue.registerComponent('my-component', {
    // component options
});
```

The `countlyVue.registerComponent()` function:
- In Vue 2: Calls `Vue.component()` immediately
- In Vue 3: Queues the component for registration when the app is created

**Note:** Continue using `countlyVue.views.create()` and `countlyVue.components.create()` for views and components - they handle registration automatically.

### 5. Directive Registration

Vue 3 uses `app.directive()` instead of `Vue.directive()`.

**Before (Vue 2):**
```javascript
Vue.directive('my-directive', {
    inserted: function(el) { /* ... */ },
    unbind: function(el) { /* ... */ }
});
```

**After (Vue 2/3 compatible):**
```javascript
countlyVue.registerDirective('my-directive', {
    // Vue 2 hooks (still work)
    inserted: function(el) { /* ... */ },
    unbind: function(el) { /* ... */ },
    // Vue 3 hooks (add for full compatibility)
    mounted: function(el) { /* ... */ },
    unmounted: function(el) { /* ... */ }
});
```

**Directive Hook Changes (Vue 2 → Vue 3):**
- `bind` → `beforeMount`
- `inserted` → `mounted`
- `update` → removed (use `updated`)
- `componentUpdated` → `updated`
- `unbind` → `unmounted`

### 6. Plugin Registration

Vue 3 uses `app.use()` instead of `Vue.use()`.

**The compatibility layer handles this automatically** - continue using `countlyVue.addPlugin()`.

### 7. $children Removed

Vue 3 removed `$children`. Use the provide/inject pattern with helper mixins.

**Before (Vue 2 only):**
```javascript
// Parent
mounted: function() {
    var sidecarContents = this.$children.filter(function(child) {
        return child.isContent && child.role === "sidecar";
    });
}
```

**After (Vue 2/3 compatible):**
```javascript
// Parent component
mixins: [countlyVue.helpers.parentMixin],
mounted: function() {
    // Access via _registeredChildren instead of $children
    if (this._registeredChildren) {
        var sidecarContents = this._registeredChildren.filter(function(child) {
            return child.isContent && child.role === "sidecar";
        });
    }
}

// Child component
mixins: [countlyVue.helpers.childMixin],
data: function() {
    return {
        isContent: true,
        role: 'sidecar'
    };
}
```

### 7. $listeners Merged into $attrs

In Vue 3, `$listeners` is merged into `$attrs`. Update components that use `v-on="$listeners"`.

**Before (Vue 2):**
```html
<child-component v-bind="$attrs" v-on="$listeners">
```

**After (Vue 3):**
```html
<child-component v-bind="$attrs">
```

Note: In Vue 3 with `inheritAttrs: false`, listeners are automatically included in `$attrs`.

### 8. Vue.set() and Vue.delete() Removed

Vue 3 removes `Vue.set()` and `Vue.delete()` because its Proxy-based reactivity system automatically tracks property additions and deletions.

**Before (Vue 2):**
```javascript
// Adding a new reactive property
Vue.set(this.object, 'newKey', value);

// Deleting a reactive property
Vue.delete(this.object, 'keyToRemove');
```

**After (Vue 2/3 compatible):**
```javascript
// Use the compatibility utilities
countlyVue.set(this.object, 'newKey', value);
countlyVue.del(this.object, 'keyToRemove');
```

The `countlyVue.set()` and `countlyVue.del()` functions:
- In Vue 2: Call `Vue.set()` and `Vue.delete()` for proper reactivity
- In Vue 3: Use direct assignment/deletion (works due to Proxy-based reactivity)

**In Pure Vue 3 Code:**
```javascript
// Direct assignment works in Vue 3
this.object.newKey = value;

// Direct delete works in Vue 3
delete this.object.keyToRemove;

// For arrays, use splice
this.array.splice(index, 1);
```

### 9. $scopedSlots Removed

Vue 3 removes `$scopedSlots` and merges all slots into `$slots`. Existing code using `$scopedSlots` will work with the compatibility layer.

**Before (Vue 2):**
```javascript
computed: {
    hasSlot: function() {
        return !!this.$scopedSlots['my-slot'];
    }
}
```

**After (Vue 3):**
```javascript
computed: {
    hasSlot: function() {
        return !!this.$slots['my-slot'];
    }
}
```

The compatibility layer registers a global mixin that provides `$scopedSlots` as an alias to `$slots` in Vue 3, so existing code will continue to work during the migration period.

## Plugin Migration Checklist

### Required Changes for Each Plugin

1. **Check for `beforeDestroy`** - Add corresponding `beforeUnmount` hook
2. **Check for `destroyed`** - Add corresponding `unmounted` hook  
3. **Check for `$root.$on/$emit/$off`** - Use EventBus from compat module
4. **Check for `Vue.extend`** - Use `countlyVue.compat.extendComponent()`
5. **Check for `$listeners`** - Use `$attrs` (listeners are merged into attrs in Vue 3)
6. **Check for `$children`** - Use refs or provide/inject
7. **Check for `$on/$off/$once` on component instances** - Not available in Vue 3
8. **Check for `Vue.set`** - Use `countlyVue.set()` instead
9. **Check for `Vue.delete`** - Use `countlyVue.del()` instead
10. **Check for `$scopedSlots`** - Use `$slots` instead (compat mixin provides fallback)
11. **Check for `Vue.component`** - Use `countlyVue.registerComponent()` instead
12. **Check for `Vue.directive`** - Use `countlyVue.registerDirective()` instead

### Finding Files to Update

Run the migration checker script:

```bash
bin/scripts/check-vue3-migration.sh
```

Or use grep manually:

```bash
# Find beforeDestroy usage
grep -r "beforeDestroy:" plugins/*/frontend/public/javascripts/

# Find $root.$on usage  
grep -r "\$root\.\$on" plugins/*/frontend/public/javascripts/

# Find $root.$emit usage
grep -r "\$root\.\$emit" plugins/*/frontend/public/javascripts/

# Find Vue.extend usage
grep -r "Vue\.extend" plugins/*/frontend/public/javascripts/

# Find Vue.set and Vue.delete usage
grep -r "Vue\.set\|Vue\.delete" plugins/*/frontend/public/javascripts/

# Find Vue.component and Vue.directive usage
grep -r "Vue\.component\|Vue\.directive" plugins/*/frontend/public/javascripts/
```

## Migration Priority

### Core Files (Already Updated)

These core Vue files have been updated for Vue 3 compatibility:

- ✅ `vue/compat.js` - Created with compatibility utilities
- ✅ `vue/core.js` - Updated for Vue 3 lifecycle
- ✅ `vue/view.js` - Updated for EventBus
- ✅ `vue/imports.js` - Updated for Vue 3 plugin registration
- ✅ `vue/migration-helpers.js` - Created with helper mixins
- ✅ `vue/components/datatable.js` - Updated
- ✅ `vue/components/date.js` - Updated  
- ✅ `vue/components/form.js` - Updated
- ✅ `vue/components/helpers.js` - Updated
- ✅ `vue/components/dropdown.js` - Updated ($on/$off compatibility added)
- ✅ `vue/components/layout.js` - Updated
- ✅ `vue/components/vis.js` - Updated
- ✅ `vue/components/drawer.js` - Updated
- ✅ `vue/legacy.js` - Updated

### Core Views Updated

- ✅ `core/device-and-type/javascripts/countly.views.js` - Updated
- ✅ `core/geo-countries/javascripts/countly.views.js` - Updated
- ✅ `core/events/javascripts/countly.overview.views.js` - Updated
- ✅ `core/app-management/javascripts/countly.views.js` - Updated (EventBus listener for feedbackApp logo)

### Plugins Updated

| Plugin | beforeDestroy | $root.$on | $root.$emit | Status |
|--------|---------------|-----------|-------------|--------|
| data-manager | ✅ Updated | ✅ Updated | ✅ Updated | Done |
| views | ✅ Updated | - | - | Done |
| dashboards | ✅ Updated | - | - | Done |
| crashes | ✅ Updated | - | - | Done |
| push | ✅ Updated | - | - | Done |
| guides | ✅ Updated | - | - | Done |
| remote-config | ✅ Updated | - | - | Done |
| vue-example | ✅ Updated | - | - | Done |
| populator | ✅ Updated | - | - | Done |
| reports | ✅ Updated | - | - | Done |
| plugins (configs) | ✅ Updated | ✅ Updated | - | Done (EventBus listener for feedback logo) |
| star-rating | ✅ Updated | - | ✅ Updated | Done (EventBus for logo updates) |

### $listeners Compatibility

A global mixin is automatically registered in Vue 3 mode (in `vue/core.js`) that provides a computed `$listeners` property. This extracts event handlers from `$attrs` and makes them available as `$listeners`, allowing existing `v-on="$listeners"` patterns to work without modification.

### Remaining Work

The following vendor libraries have Vue 3 compatible versions available via npm (see package.json):

| Vue 2 Library | Vue 3 Replacement | npm Package |
|---------------|-------------------|-------------|
| `vue.min.js` | `vue3.min.js` | `vue@^3.4.15` |
| `vuex.min.js` | `vuex4.min.js` | `vuex@^4.1.0` |
| `element-ui.js` | `element-plus.min.js` | `element-plus@^2.5.3` |
| `vuedraggable.umd.min.js` | `vuedraggable3.umd.min.js` | `vuedraggable@^4.1.0` |
| `vue2-leaflet.min.js` | `vue3-leaflet.min.js` | `@vue-leaflet/vue-leaflet@^0.10.1` |
| `vue-echarts.umd.min.js` | `vue-echarts3.umd.min.js` | `vue-echarts@^6.6.8` |
| `vuescroll.min.js` | `vue3-scrollbar.min.js` | `vue3-perfect-scrollbar@^2.0.0` |
| `vee-validate.full.min.js` | `vee-validate4.min.js` | `vee-validate@^4.12.4` |

## Installing Vue 3 Libraries

### Method 1: Using npm + grunt (Recommended)

```bash
# Install Vue 3 packages
npm install

# Copy libraries to frontend
npx grunt vue3libs
```

### Method 2: Using the setup script

```bash
./bin/scripts/download-vue3-libs.sh
```

## Testing the Migration

### Pre-Flight Checks

Before switching to Vue 3:

1. Ensure all `beforeUnmount` hooks are added
2. Ensure EventBus is used for all cross-component communication
3. Run the existing UI test suite
4. Check browser console for Vue warnings

### Switching to Vue 3

After running `npx grunt vue3libs`, update the Gruntfile.js `concat:utils` task to use Vue 3 libraries:

```javascript
// In Gruntfile.js concat:utils, replace:
'frontend/express/public/javascripts/utils/vue/vue.min.js',
'frontend/express/public/javascripts/utils/vue/composition-api.min.js',  // Remove this
'frontend/express/public/javascripts/utils/vue/vuex.min.js',
'frontend/express/public/javascripts/utils/vue/element-ui.js',

// With:
'frontend/express/public/javascripts/utils/vue/vue3.min.js',
'frontend/express/public/javascripts/utils/vue/vuex4.min.js',
'frontend/express/public/javascripts/utils/vue/element-plus.min.js',
```

Then rebuild:
```bash
npx grunt dist
```

## EventBus Usage Reference

The EventBus is available at `countlyVue.compat.EventBus` and provides:

- `$on(event, handler)` - Subscribe to an event
- `$off(event, handler)` - Unsubscribe from an event (handler required for cleanup)
- `$emit(event, ...args)` - Emit an event
- `$once(event, handler)` - Subscribe to an event once

### Common Event Names

| Event | Purpose | Used In |
|-------|---------|---------|
| `cly-date-change` | Global date picker changed | datatable.js, date.js |
| `cly-refresh` | Trigger data refresh | core.js (auto-refresh) |
| `dm-open-edit-*` | Data manager drawer events | data-manager plugin |

## API Reference

### countlyVue.compat

```javascript
// Check if running Vue 3
countlyVue.compat.IS_VUE_3 // true/false

// EventBus for cross-component communication
countlyVue.compat.EventBus.$on(event, handler)
countlyVue.compat.EventBus.$off(event, handler)
countlyVue.compat.EventBus.$emit(event, ...args)

// Create Vue instance (handles Vue 2/3 differences)
countlyVue.compat.createVueInstance(options)

// Destroy Vue instance properly
countlyVue.compat.destroyVueInstance(instance)

// Extend component (replaces Vue.extend)
countlyVue.compat.extendComponent(baseComponent, extension)

// Auto-refresh mixin (uses EventBus in Vue 3)
countlyVue.compat.autoRefreshMixin
```

### countlyVue.helpers

```javascript
// Lifecycle mixin - use onBeforeDestroy, onDestroyed methods
countlyVue.helpers.lifecycleMixin

// Compat mixin - provides clyOn, clyOff, clyEmit methods with auto-cleanup
countlyVue.helpers.compatMixin

// Auto cleanup mixin - call registerCleanup() in mounted, it runs on destroy
countlyVue.helpers.autoCleanupMixin
```

## Troubleshooting

### "Cannot read property '$on' of undefined"

The component is trying to use `$root.$on` but Vue 3 doesn't support this. Use the EventBus pattern.

### "beforeDestroy is not called"

In Vue 3, `beforeDestroy` was renamed to `beforeUnmount`. Add the `beforeUnmount` hook.

### "Vue.extend is not a function"

Use `countlyVue.compat.extendComponent()` instead.

### Memory leaks after navigation

Ensure all event listeners are cleaned up in `beforeUnmount` (not just `beforeDestroy`).

## Template Slot Syntax Migration

Vue 3 deprecates the old slot syntax in favor of `v-slot`. While Vue 3 still supports the old syntax, Element Plus components require the new syntax.

### slot attribute (Deprecated)

**Before (Vue 2):**
```html
<template slot="suffix">
    <i class="el-icon-search"></i>
</template>
```

**After (Vue 3):**
```html
<template #suffix>
    <i class="el-icon-search"></i>
</template>
```

### slot-scope (Deprecated)

**Before (Vue 2):**
```html
<template slot-scope="scope">
    {{ scope.row.name }}
</template>
```

**After (Vue 3):**
```html
<template #default="scope">
    {{ scope.row.name }}
</template>
```

### Named Slot with Scope

**Before (Vue 2):**
```html
<template slot="header" slot-scope="scope">
    {{ scope.column.label }}
</template>
```

**After (Vue 3):**
```html
<template #header="scope">
    {{ scope.column.label }}
</template>
```

### Finding Files to Update

```bash
# Find old slot syntax
grep -r 'slot="' plugins --include="*.html"

# Find slot-scope usage  
grep -r 'slot-scope=' plugins --include="*.html"
```

**Note:** There are approximately 40 template files with slot-scope usage that need to be updated when switching to Element Plus.
