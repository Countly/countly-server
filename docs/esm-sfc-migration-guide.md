# Legacy IIFE → ESM + Vue SFC Migration Guide

This document provides a step-by-step guide for converting Countly's legacy IIFE modules to modern ESM + Vue SFC architecture.

---

## Overview

### Legacy Structure (IIFE)
```
plugin-name/
├── javascripts/
│   ├── countly.models.js    # Store logic (IIFE, window global)
│   └── countly.views.js     # Vue components (IIFE, window global)
└── templates/
    └── *.html               # Runtime template compilation
```

### New Structure (ESM + SFC)
```
plugin-name/
├── index.js                 # Entry point + registerTab
├── components/
│   └── PluginView.vue       # Vue SFC (build-time compilation)
├── store/
│   └── index.js             # Vuex store module
└── stylesheets/
    └── _main.scss           # Styles (unchanged)
```

---

## ⚠️ Critical Rules

### No Window Global Dependencies

**ESM modules must NOT use `window` object to access dependencies.**

#### ❌ Forbidden patterns:
```js
// DO NOT use window globals
window.countlyVue
window.countlyCommon
window.CV
window.jQuery
window.$
countlyVue          // implicit window.countlyVue
countlyCommon       // implicit window.countlyCommon
CV                  // implicit window.CV
```

#### ✅ Required pattern:
```js
// ALWAYS use explicit imports
import countlyVue from '../../../javascripts/countly/vue/index.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';

const CV = countlyVue;  // Create local alias if needed
```

### Explicit Global SFC Component Imports

**All global SFC components used in a template must be explicitly imported and registered in the `components` option.**

In the legacy system, components like `<cly-header>`, `<cly-datatable-n>`, etc. were globally registered via `Vue.component()` and available everywhere without imports. In the ESM/SFC architecture, each component must import what it uses.

#### ❌ Forbidden pattern:
```vue
<template>
    <cly-header :title="i18n('plugin.title')"></cly-header>
    <cly-main>
        <cly-datatable-n :rows="rows"></cly-datatable-n>
    </cly-main>
</template>

<script>
// Missing component imports - relies on global registration
export default {
    // no components option
};
</script>
```

#### ✅ Required pattern:
```vue
<template>
    <cly-header :title="i18n('plugin.title')"></cly-header>
    <cly-main>
        <cly-datatable-n :rows="rows"></cly-datatable-n>
    </cly-main>
</template>

<script>
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClyDatatableN
    }
};
</script>
```

#### Component source mapping:

| Tag name | Import path |
|---|---|
| `cly-header` | `components/layout/cly-header.vue` |
| `cly-main` | `components/layout/cly-main.vue` |
| `cly-section` | `components/layout/cly-section.vue` |
| `cly-date-picker-g` | `components/date/global-date-picker.vue` |
| `cly-chart-bar` | `components/echart/cly-chart-bar.vue` |
| `cly-chart-line` | `components/echart/cly-chart-line.vue` |
| `cly-chart-pie` | `components/echart/cly-chart-pie.vue` |
| `cly-chart-time` | `components/echart/cly-chart-time.vue` |
| `cly-datatable-n` | `components/datatable/cly-datatable-n.vue` |
| `cly-progress-bar` | `components/progress/progress-bar.vue` |
| `cly-more-options` | `components/dropdown/more-options.vue` |
| `cly-dynamic-tabs` | `components/nav/cly-dynamic-tabs.vue` |
| `cly-tooltip-icon` | `components/helpers/cly-tooltip-icon.vue` |
| `cly-metric-cards` | `components/helpers/cly-metric-cards.vue` |
| `cly-metric-card` | `components/helpers/cly-metric-card.vue` |
| `cly-metric-breakdown` | `components/helpers/cly-metric-breakdown.vue` |

> **Note:** Element UI components (`el-table-column`, `el-select`, `el-option`, `el-tabs`, etc.) are registered globally via `Vue.use(ElementUI)` and do **not** need explicit imports. These will be handled during the Vue 3 / Element Plus migration.

### Validation Checklist

Before completing migration, verify:
- [ ] No `window.` references in any ESM file
- [ ] No implicit global variable usage (e.g., `countlyVue` without import)
- [ ] All dependencies are explicitly imported at the top of the file
- [ ] No `(function() { ... })()` IIFE patterns remain
- [ ] Components with `<cly-date-picker-g>` include `autoRefreshMixin`
- [ ] All `cly-*` components used in templates are imported and registered in the `components` option

### Warning

**If you encounter any `window.` usage or implicit global variables in the migrated code, this is a critical error that must be fixed.** The module will fail when code-splitting is enabled because window globals may not be available at the time the module loads.

---

## Step 1: Analyze Existing Structure

### 1.1 Locate legacy files
- `javascripts/countly.models.js` → Service functions, Vuex module
- `javascripts/countly.views.js` → Vue components, registerTab calls
- `templates/*.html` → Vue templates

### 1.2 Check vite.config.js
Verify files are listed in `legacyScripts` array:
```js
const legacyScripts = [
    'plugin-name/javascripts/countly.models.js',
    'plugin-name/javascripts/countly.views.js',
];
```

---

## Step 2: Create New Folder Structure

```bash
mkdir -p plugin-name/components
mkdir -p plugin-name/store
touch plugin-name/index.js
touch plugin-name/components/PluginView.vue
touch plugin-name/store/index.js
```

---

## Step 3: Create Store (`store/index.js`)

### Legacy countly.models.js:
```js
(function() {
    window.countlyPluginName = window.countlyPluginName || {};

    countlyPluginName.service = {
        fetchData: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/plugin",
                data: { app_id: countlyCommon.ACTIVE_APP_ID },
                dataType: "json"
            });
        }
    };

    countlyPluginName.getVuexModule = function() {
        return countlyVue.vuex.Module("countlyPluginName", {
            state: function() {
                return { data: [] };
            },
            actions: {
                fetchData: function(context) {
                    return countlyPluginName.service.fetchData()
                        .then(function(res) {
                            context.commit('setData', res);
                        });
                }
            },
            mutations: {
                setData: function(state, data) {
                    state.data = data;
                }
            }
        });
    };
})();
```

### New store/index.js:
```js
import countlyVue from '../../../javascripts/countly/vue/index.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';

const CV = countlyVue;

// Service layer - API calls
const service = {
    fetchData: function() {
        return CV.$.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/plugin",
            data: { app_id: countlyCommon.ACTIVE_APP_ID },
            dataType: "json"
        });
    }
};

// Vuex module
const getVuexModule = function() {
    return countlyVue.vuex.Module("countlyPluginName", {
        state: function() {
            return { data: [] };
        },
        actions: {
            fetchData: function(context) {
                return service.fetchData()
                    .then(function(res) {
                        context.commit('setData', res);
                    });
            }
        },
        mutations: {
            setData: function(state, data) {
                state.data = data;
            }
        }
    });
};

export default getVuexModule();
```

### Key changes:
- Remove `window.countlyPluginName` global
- Import `countlyVue` and `countlyCommon`
- Keep service functions private (not exported)
- Export the instantiated Vuex module

---

## Step 4: Create Vue SFC (`components/PluginView.vue`)

### Legacy countly.views.js:
```js
(function() {
    var PluginView = countlyVue.views.create({
        template: countlyVue.T('/plugin/templates/plugin-view.html'),
        mixins: [countlyVue.mixins.commonFormatters],
        computed: {
            data: function() {
                return this.$store.state.countlyPluginName.data;
            }
        },
        methods: {
            refresh: function() {
                this.$store.dispatch('countlyPluginName/fetchData');
            }
        }
    });

    countlyVue.container.registerTab("/route", { ... });
})();
```

### Legacy templates/plugin-view.html:
```html
<div class="plugin-view">
    <cly-header :title="i18n('plugin.title')"></cly-header>
    <cly-main>
        <!-- content -->
    </cly-main>
</div>
```

### New components/PluginView.vue:
```vue
<template>
    <div class="plugin-view">
        <cly-header :title="i18n('plugin.title')"></cly-header>
        <cly-main>
            <cly-date-picker-g></cly-date-picker-g>
            <!-- content -->
        </cly-main>
    </div>
</template>

<script>
import countlyVue, { autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClyDatePickerG from '../../../javascripts/components/date/global-date-picker.vue';

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClyDatePickerG
    },
    mixins: [
        countlyVue.mixins.commonFormatters,
        countlyVue.mixins.i18n,
        autoRefreshMixin
    ],
    computed: {
        data: function() {
            return this.$store.state.countlyPluginName.data;
        }
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyPluginName/fetchData', false);
        },
        dateChanged: function() {
            this.$store.dispatch('countlyPluginName/fetchData', true);
        }
    }
};
</script>
```

### Key changes:
- `countlyVue.T('/path.html')` → inline `<template>` block
- `countlyVue.views.create({...})` → `export default {...}`
- **Do NOT include registerTab here** (separation of concerns)
- Copy template HTML exactly as-is
- **Add `autoRefreshMixin`** if component uses global date picker (see below)
- **Import and register all `cly-*` components** used in the template (see [Explicit Global SFC Component Imports](#explicit-global-sfc-component-imports))

---

## Step 5: Create Entry Point (`index.js`)

```js
import { i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab } from '../../javascripts/countly/vue/container.js';

import PluginView from './components/PluginView.vue';
import store from './store/index.js';
import './stylesheets/_main.scss';

// Register tab.
registerTab("/main/route", {
    priority: 1,
    name: "plugin-name",
    permission: "plugin",
    title: i18n('plugin.title'),
    route: "#/main/route/plugin",
    dataTestId: "plugin-name",
    component: PluginView,
    vuex: [{
        clyModel: store
    }]
});


```

### Key points:
- Import `i18n` from `vue/core.js`
- Import `registerTab` from `vue/container.js`
- **Import SCSS styles** - Makes plugin self-contained with all assets in one entrypoint
- Store is connected via `vuex.clyModel`
- Only add exports if other modules need access

---

## Step 6: Update Global SCSS Manifest

Comment out the plugin's SCSS reference in `manifest.scss` since styles are now imported in the plugin's index.js:

```scss
// core/frontend/express/public/stylesheets/styles/manifest.scss

// All core "Plugins" views specific SASS partials
// @use "../../core/plugin-name/stylesheets/main" as plugin-name-main-style; // Migrated to SFC - imported in plugin index.js
```

### Why this is needed:
- Previously, all plugin styles were globally imported via `manifest.scss`
- Now each plugin imports its own styles via its `index.js` entrypoint
- Comment (don't delete) to track migration progress
- The compiled `manifest2.css` will auto-update on next build

---

## Step 7: Update vite.config.js

Remove from `legacyScripts` array:
```js
const legacyScripts = [
    // ...other scripts...

    // ESM modules - imported via entrypoint.js:
    // 'plugin-name/javascripts/countly.models.js',
    // 'plugin-name/javascripts/countly.views.js',
];
```

---

## Step 8: Update entrypoint.js

```js
// =============================================================================
// CORE PLUGIN IMPORTS
// =============================================================================
// TODO: Convert to dynamic imports with code-splitting once vue-router is implemented.
import './core/plugin-name/index.js';
```

### Path reference:
- **Core modules:** `./core/plugin-name/index.js`
- **Plugin modules:** `../../plugins/plugin-name/frontend/public/index.js`

---

## Step 9: Delete Legacy Files

```bash
rm plugin-name/javascripts/countly.models.js
rm plugin-name/javascripts/countly.views.js
rm -rf plugin-name/templates/

# If javascripts folder is empty:
rmdir plugin-name/javascripts/
```

---

## Step 10: Build and Test

```bash
cd core
npm run build:vite
```

### Verification checklist:
- [ ] Build completes without errors
- [ ] Page loads in browser
- [ ] Component renders correctly
- [ ] Store data loads
- [ ] No console errors
- [ ] Date picker changes trigger data refresh (if applicable)

---

## Import Path Reference

Paths are relative to file location:

```js
// From store/index.js (3 levels deep)
import countlyVue from '../../../javascripts/countly/vue/index.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';

// From index.js (2 levels deep)
import { i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab } from '../../javascripts/countly/vue/container.js';

// From components/PluginView.vue (3 levels deep)
import countlyVue, { autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';
```

---

## Migration Checklist

```
[ ] 1. Analyze legacy files (models, views, templates)
[ ] 2. Create new folder structure (components/, store/)
[ ] 3. Create store/index.js
[ ] 4. Create components/PluginView.vue
[ ] 5. Import and register all cly-* global SFC components used in templates
[ ] 6. Add autoRefreshMixin if using global date picker
[ ] 7. Create index.js with registerTab and SCSS import
[ ] 8. Comment out SCSS reference in manifest.scss
[ ] 9. Remove from vite.config.js legacyScripts
[ ] 10. Add import to entrypoint.js
[ ] 11. Delete legacy files
[ ] 12. Build and test (including date picker functionality)
```

---

## Example: Session Durations

### Final structure:
```
session-durations/
├── index.js
├── components/
│   └── SessionDurations.vue
├── store/
│   └── index.js
└── stylesheets/
    └── _main.scss
```

### index.js:
```js
import { i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab } from '../../javascripts/countly/vue/container.js';

import SessionDurationsView from './components/SessionDurations.vue';
import store from './store/index.js';
import './stylesheets/_main.scss';

// Register tab.
registerTab("/analytics/sessions", {
    priority: 2,
    name: "durations",
    permission: "core",
    title: i18n('session-durations.title'),
    route: "#/analytics/sessions/durations",
    dataTestId: "session-durations",
    component: SessionDurationsView,
    vuex: [{
        clyModel: store
    }]
});

// Add exports if needed for other plugins.
```

---

## Global Date Picker Support (autoRefreshMixin)

If your component uses the global date picker (`<cly-date-picker-g>`), you **must** include the `autoRefreshMixin` for date changes to trigger data refresh.

### Why is this needed?

In legacy IIFE code, the `countlyVue.views.create()` function automatically wired up the date change event listener. In ESM/SFC components, you need to explicitly add this mixin.

The global date picker emits a `cly-date-change` event when the date selection changes. The `autoRefreshMixin` listens for this event and calls your component's `dateChanged()` or `refresh()` method.

### How to use:

```js
import countlyVue, { autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';

export default {
    mixins: [
        countlyVue.mixins.commonFormatters,
        countlyVue.mixins.i18n,
        autoRefreshMixin  // Add this mixin
    ],
    methods: {
        // Called on manual refresh (e.g., auto-refresh toggle)
        refresh: function() {
            this.$store.dispatch('countlyPluginName/fetchData', false);
        },
        // Called when date picker changes (optional, falls back to refresh)
        dateChanged: function() {
            this.$store.dispatch('countlyPluginName/fetchData', true);
        }
    }
};
```

### How autoRefreshMixin works:

1. On `mounted`: Registers a listener for `cly-refresh` event on `$root`
2. When date changes: Calls `dateChanged()` if defined, otherwise calls `refresh(isForced)`
3. On `beforeDestroy`: Removes the event listener to prevent memory leaks

### When to use:

- **Required**: Components with `<cly-date-picker-g>` that need to reload data on date change
- **Optional**: Components without date picker (mixin will be no-op if no refresh/dateChanged methods exist)

---

## Common Issues

### Error: `cannot be used outside of module code`
**Cause:** File is still in `legacyScripts` array
**Fix:** Remove from `legacyScripts` in vite.config.js

### Error: `X is not defined`
**Cause:** Missing import statement
**Fix:** Add proper import for the dependency

### Error: `Cannot read properties of undefined (reading 'registerTab')`
**Cause:** Importing from wrong path
**Fix:** Use `import { registerTab } from '../../javascripts/countly/vue/container.js'`

### Template not rendering
**Cause:** Template syntax error or missing closing tags
**Fix:** Validate HTML structure in `<template>` block

### Date picker changes not refreshing data
**Cause:** Missing `autoRefreshMixin`
**Fix:** Add `autoRefreshMixin` to component mixins:
```js
import countlyVue, { autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';

export default {
    mixins: [countlyVue.mixins.commonFormatters, countlyVue.mixins.i18n, autoRefreshMixin],
    // ...
};
```
