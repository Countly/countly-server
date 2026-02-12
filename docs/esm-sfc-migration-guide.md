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
├── index.js                 # Entry point + registerTab + routes
├── widget.js                # Dashboard widget (if applicable)
├── components/
│   └── PluginView.vue       # Vue SFC (build-time compilation)
├── store/
│   └── index.js             # Vuex store module
└── assets/
    ├── main.scss            # Styles (imported in index.js)
    ├── images/              # Image assets (SVG, PNG, etc.)
    └── fonts/               # Font files (WOFF2, WOFF, etc.)
```

---

## ⚠️ Critical Rules

### No Window Global Dependencies

**ESM modules must NOT use `window` object to access dependencies.**

#### ❌ Forbidden patterns:
```js
// DO NOT use window globals for importable modules
window.countlyVue
window.countlyCommon
window.CV
window.jQuery
window.$
window.moment       // npm package - use import
window.store        // npm package (storejs) - use import
window._            // npm package (underscore) - use import
window.Backbone     // local ESM - use import
countlyVue          // implicit window.countlyVue
countlyCommon       // implicit window.countlyCommon
CV                  // implicit window.CV
```

#### ✅ Required pattern:
```js
// ALWAYS use explicit imports - prefer named imports over default
import { i18n, vuex, commonFormattersMixin, i18nMixin, autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';

// npm packages - import directly, NEVER use window.*
import moment from 'moment';
import _ from 'underscore';
import storejs from 'storejs';

// Local ESM modules
import Backbone from '../../../javascripts/utils/backbone-min.js';
import * as countlyCMS from '../../../javascripts/countly/countly.cms.js';
```

#### ⚠️ Exception: Legacy IIFE modules without ESM exports

Some modules are still legacy IIFEs and have no ESM exports. These are the **only** cases where `window.*` is acceptable. Always add a comment explaining why:
```js
// countlyPopulator is still legacy IIFE - no ESM exports available
var countlyPopulator = window.countlyPopulator;

// countlyPlugins is still legacy IIFE - no ESM exports available
var countlyPlugins = window.countlyPlugins;
```

#### ⚠️ Exception: Optional cross-plugin dependencies (Dynamic Import)

When a plugin **optionally** depends on another plugin that may or may not be installed/enabled, use **dynamic `import()`** with a `.catch()` fallback. **Guard the import with a plugin-enabled check** so the module is only loaded when needed:

##### Pattern:
```js
import countlyGlobal from '../../../javascripts/countly/countly.global.js';

// Module-level: conditional dynamic import — only loads when the target plugin is active
var groupsModelRef = null;
var groupsModelPromise = countlyGlobal.plugins.includes("groups")
    ? import('path/to/other-plugin/store/index.js')
        .then(function(mod) { groupsModelRef = mod.default; return mod.default; })
        .catch(function() { return null; })
    : Promise.resolve(null);
```

- `groupsModelPromise` — use in lifecycle hooks (`mounted`, `created`) for async initialization
- `groupsModelRef` — use for synchronous access after the promise has resolved (e.g., in methods, watchers)

##### Why guard the import?
- Prevents unnecessary module initialization when the plugin is disabled

##### Usage in lifecycle hooks:
```js
mounted: function() {
    var self = this;
    // No need to check countlyGlobal.plugins here — groupsModelPromise is already null-safe
    groupsModelPromise.then(function(groupsModel) {
        if (!groupsModel) return; // plugin not available or disabled
        groupsModel.initialize().then(function() {
            self.allGroups = groupsModel.data();
        });
    });
},
```

##### Usage for synchronous access (after promise has resolved):
```js
// In methods or watchers — groupsModelRef is set once the dynamic import resolves
if (groupsModelRef) {
    groupsModelRef.saveUserGroup({ email: email, group_id: groupId }, function() {});
}
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
| `cly-notification` | `components/helpers/cly-notification.vue` |
| `cly-database-engine-debug-panel` | `components/helpers/cly-database-engine-debug-panel.vue` |
| `cly-chart-zoom` | `components/echart/cly-chart-zoom.vue` |
| `cly-form-field-group` | `components/form/cly-form-field-group.vue` |

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
mkdir -p plugin-name/assets
touch plugin-name/index.js
touch plugin-name/components/PluginView.vue
touch plugin-name/store/index.js
touch plugin-name/assets/main.scss
```

Move all static assets (images, fonts, etc.) into `assets/`:
```bash
# Move images
mv plugin-name/images/* plugin-name/assets/images/

# Move fonts (if any)
mv plugin-name/fonts/* plugin-name/assets/fonts/

# Move SCSS content into assets/main.scss (inline the styles, don't just @use)
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
import { countlyCommon } from '../../../javascripts/countly/countly.common.js';
import { Module, ServerDataTable } from '../../../javascripts/countly/vue/data/vuex.js';

var countlyPluginName = {};

// Service layer - API calls
countlyPluginName.service = {
    fetchData: function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/plugin",
            data: { app_id: countlyCommon.ACTIVE_APP_ID },
            dataType: "json"
        });
    }
};

// Vuex module
countlyPluginName.getVuexModule = function() {
    return Module("countlyPluginName", {
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

export default countlyPluginName;
```

### Key changes:
- Remove `window.countlyPluginName` global
- **Use named imports from source modules** — e.g. `{ Module, ServerDataTable }` from `vue/data/vuex.js`, NOT from `vue/core.js`
- **Never import the default `countlyVue` object** — always import specific named exports from their source module
- Export the **store object** with `getVuexModule` method (NOT the result of `getVuexModule()` — VuexLoader calls `clyModel.getVuexModule()` internally)
- `$.when()` is not available in ESM — use `Promise.all([...])` instead

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
import { autoRefreshMixin, commonFormattersMixin, i18nMixin } from '../../../javascripts/countly/vue/core.js';
import { getServerDataSource } from '../../../javascripts/countly/vue/data/vuex.js';
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
        commonFormattersMixin,
        i18nMixin,
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
import './assets/main.scss';

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
- **Import SCSS styles** from `assets/main.scss` - Makes plugin self-contained with all assets in one entrypoint
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

# Remove empty legacy directories:
rmdir plugin-name/javascripts/    # If empty
rmdir plugin-name/stylesheets/    # Moved to assets/main.scss
rmdir plugin-name/images/         # Moved to assets/images/
rmdir plugin-name/fonts/          # Moved to assets/fonts/
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

Paths are relative to file location. **Always use named imports from source modules — never import the default `countlyVue` object.**

```js
// From store/index.js (3 levels deep)
import { countlyCommon } from '../../../javascripts/countly/countly.common.js';
import { createMetricModel } from '../../../javascripts/countly/countly.helpers.js';
import { Module, ServerDataTable } from '../../../javascripts/countly/vue/data/vuex.js';

// From index.js (2 levels deep)
import { i18n, views } from '../../javascripts/countly/vue/core.js';
import { registerTab, registerData } from '../../javascripts/countly/vue/container.js';
import { app } from '../../javascripts/countly/countly.template.js';

// From components/PluginView.vue (3 levels deep)
import { autoRefreshMixin, commonFormattersMixin, i18nMixin, authMixin } from '../../../javascripts/countly/vue/core.js';
import { getServerDataSource } from '../../../javascripts/countly/vue/data/vuex.js';
import { countlyCommon } from '../../../javascripts/countly/countly.common.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import { confirm as CountlyConfirm, alert as CountlyAlert, notify } from '../../../javascripts/countly/countly.helpers.js';
import { validateGlobalAdmin } from '../../../javascripts/countly/countly.auth.js';
import { monitor as monitorTask } from '../../../javascripts/countly/countly.task.manager.js';
```

### Named imports mapping (legacy → ESM)

This table maps the old `countlyVue.*` / `CountlyHelpers.*` / `countlyAuth.*` patterns to their proper named imports:

| Legacy pattern | Named import | Source module |
|---|---|---|
| `countlyVue.mixins.i18n` | `i18nMixin` | `vue/core.js` |
| `countlyVue.mixins.auth(feature)` | `authMixin(feature)` | `vue/core.js` |
| `countlyVue.mixins.commonFormatters` | `commonFormattersMixin` | `vue/core.js` |
| `countlyVue.views.create({...})` | `views.create({...})` | `vue/core.js` |
| `countlyVue.views.BackboneWrapper` | `views.BackboneWrapper` | `vue/core.js` |
| `countlyVue.vuex.Module(...)` | `Module(...)` | `vue/data/vuex.js` |
| `countlyVue.vuex.ServerDataTable(...)` | `ServerDataTable(...)` | `vue/data/vuex.js` |
| `countlyVue.vuex.getServerDataSource(...)` | `getServerDataSource(...)` | `vue/data/vuex.js` |
| `countlyVue.container.registerTab(...)` | `registerTab(...)` | `vue/container.js` |
| `countlyVue.container.registerData(...)` | `registerData(...)` | `vue/container.js` |
| `countlyVue.container.registerMixin(...)` | `registerMixin(...)` | `vue/container.js` |
| `CV.i18n(...)` / `countlyVue.i18n(...)` | `i18n(...)` | `vue/core.js` |
| `CV.T(...)` / `countlyVue.T(...)` | `templateUtil.stage(...)` | `vue/core.js` |
| `CV.$.ajax(...)` | `$.ajax(...)` | jQuery global |
| `CountlyHelpers.confirm(...)` | `CountlyConfirm(...)` | `countly.helpers.js` (aliased to avoid shadowing `window.confirm`) |
| `CountlyHelpers.alert(...)` | `CountlyAlert(...)` | `countly.helpers.js` (aliased to avoid shadowing `window.alert`) |
| `CountlyHelpers.notify(...)` | `notify(...)` | `countly.helpers.js` |
| `CountlyHelpers.createMetricModel(...)` | `createMetricModel(...)` | `countly.helpers.js` |
| `countlyAuth.validateGlobalAdmin()` | `validateGlobalAdmin()` | `countly.auth.js` |
| `countlyAuth.validateRead(...)` | `validateRead(...)` | `countly.auth.js` |
| `countlyTaskManager.monitor(...)` | `monitor(...)` or `monitorTask(...)` | `countly.task.manager.js` |

### Available named exports from `vue/core.js`:

| Export | Usage |
|---|---|
| `i18n` | Translation function: `i18n('key')` |
| `i18nM` | Translation function returning marked string |
| `autoRefreshMixin` | Mixin for date picker refresh support |
| `commonFormattersMixin` | Replaces `countlyVue.mixins.commonFormatters` |
| `i18nMixin` | Replaces `countlyVue.mixins.i18n` |
| `authMixin` | Replaces `countlyVue.mixins.auth` — call as `authMixin(featureName)` |
| `mixins` | Object with `customDashboards`, `zoom`, `hasDrawers`, `graphNotesCommand`, etc. |
| `views` | Object with `create()`, `BackboneWrapper` |
| `ajax` | AJAX utility (use where `CV.$.ajax` was used) |
| `templateUtil` | `templateUtil.stage()` replaces `countlyVue.T()` |

### Available named exports from `vue/data/vuex.js`:

| Export | Usage |
|---|---|
| `Module` | Creates Vuex module: `Module("name", options)` |
| `ServerDataTable` | Creates server data table resource: `ServerDataTable("name", options)` |
| `MutableTable` | Creates mutable table resource |
| `getServerDataSource` | Gets data source for `cly-datatable-n`: `getServerDataSource(store, path, resourceName)` |
| `getLocalStore` | Gets local Vuex store for a BackboneWrapper |
| `FetchMixin` | Vuex fetch mixin factory |

---

## Migration Checklist

```
[ ] 1. Analyze legacy files (models, views, templates)
[ ] 2. Create new folder structure (components/, store/, assets/)
[ ] 3. Create store/index.js
[ ] 4. Create components/PluginView.vue
[ ] 5. Import and register all cly-* global SFC components used in templates
[ ] 6. Add autoRefreshMixin if using global date picker
[ ] 7. Consolidate static assets into assets/ directory:
       - Move styles into assets/main.scss
       - Move images into assets/images/
       - Move fonts into assets/fonts/
[ ] 8. Create index.js with registerTab and SCSS import (from assets/main.scss)
[ ] 9. Comment out SCSS reference in manifest.scss
[ ] 10. Remove from vite.config.js legacyScripts
[ ] 11. Add import to entrypoint.js
[ ] 12. Delete legacy files and empty directories (stylesheets/, images/, fonts/, templates/, javascripts/)
[ ] 13. If plugin registers specific app.route() under a wildcard route, add bare import of parent module (see Backbone Route Ordering section)
[ ] 14. Build and test (including date picker functionality)
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
└── assets/
    └── main.scss
```

### index.js:
```js
import { i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab } from '../../javascripts/countly/vue/container.js';

import SessionDurationsView from './components/SessionDurations.vue';
import store from './store/index.js';
import './assets/main.scss';

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

## Dashboard Widget Integration (`widget.js`)

If the plugin has a custom dashboard widget (legacy `countly.widgets.*.js`), place the widget code in a separate `widget.js` file at the same level as `index.js` and import it from `index.js`.

### Structure:
```
plugin-name/
├── index.js              # Entry point (registerTab, routes, imports widget.js)
├── widget.js             # Dashboard widget (WidgetComponent, dashboard config DrawerComponent, registerData)
├── components/
├── store/
└── assets/
```

### index.js:
```js
import { i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab } from '../../javascripts/countly/vue/container.js';

import PluginView from './components/PluginView.vue';
import store from './store/index.js';
import './assets/main.scss';
import './widget.js';  // Dashboard widget registration

registerTab("/main/route", { /* ... */ });
```

### widget.js:
```js
import { views, i18nM, mixins, templateUtil } from '../../javascripts/countly/vue/core.js';
import { registerData } from '../../javascripts/countly/vue/container.js';
import PluginWidgetDrawer from './components/PluginWidgetDrawer.vue';

// WidgetComponent must use views.create() because it depends on a shared runtime HTML template
// loaded by the dashboards plugin. This cannot be an SFC until dashboards migrates those templates.
var WidgetComponent = views.create({
    template: templateUtil.stage('/dashboards/templates/widgets/analytics/widget.html'),
    mixins: [mixins.customDashboards.global, mixins.customDashboards.widget, /* ... */],
    // ...
});

registerData("/custom/dashboards/widget", {
    type: "analytics",
    label: i18nM("dashboards.widget-type.analytics"),
    getter: function(widget) { /* ... */ },
    drawer: { component: PluginWidgetDrawer, /* ... */ },
    grid: { component: WidgetComponent, /* ... */ }
});
```

### PluginWidgetDrawer.vue (SFC):
```vue
<template>
    <div>
        <!-- drawer form fields -->
    </div>
</template>

<script>
import { i18nMixin } from '../../../javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    props: {
        scope: { type: Object }
    },
    // computed, methods, etc.
};
</script>
```

### Key points:
- `widget.js` is a side-effect-only import (no exports needed) — it registers itself via `registerData`
- No changes needed in `entrypoint.js` — `index.js` handles everything
- **DrawerComponent → SFC**: Dashboard widget drawer components (the panel that opens when adding/editing a widget on a custom dashboard) typically use **inline string templates** (`template: '<div>...</div>'`) and have no dependency on shared runtime HTML templates. These **should be converted to Vue SFC files** in the `components/` directory and imported into `widget.js`. This gives you build-time template compilation and better developer experience. Remember to add `i18nMixin` explicitly — `views.create()` adds it automatically, but SFC components need it declared in `mixins`.
- **WidgetComponent → `views.create()`**: The grid widget component typically depends on a shared runtime HTML template loaded by the dashboards plugin (`templateUtil.stage()`). These **must stay as `views.create()`** until the dashboards plugin migrates those shared templates to SFC. At that point they can also become SFC imports.
- **Rule of thumb**: If a component uses `templateUtil.stage()` or references a runtime HTML template, it must use `views.create()`. If it uses an inline string template (`template: '<div>...</div>'`), convert it to an SFC.

---

## Backbone Route Ordering (Wildcard vs Specific Routes)

Backbone's `history.route()` uses `unshift` — the **last registered route is checked first**. In the Vite bundle, Rollup determines module execution order by dependency graph, not import order. If a plugin's specific route (e.g. `/analytics/users/online-users/compare`) executes before the parent wildcard route (e.g. `/analytics/users/*tab`), the wildcard gets `unshift`ed last and shadows the specific route.

**Fix:** Add a bare import of the parent module to create a dependency edge:

```js
// Ensure wildcard route registers before our specific route.
import '../../../../frontend/express/public/core/user-analytics-overview/index.js'; // eslint-disable-line no-unused-vars

app.route("/analytics/users/online-users/compare", "views", function() { ... });
```

This forces Rollup to execute the wildcard module first. ES modules are singletons, so the import won't re-execute it — it only establishes ordering. Apply this whenever your plugin registers a specific `app.route()` under another module's wildcard route.

---

## Global Date Picker Support (autoRefreshMixin)

If your component uses the global date picker (`<cly-date-picker-g>`), you **must** include the `autoRefreshMixin` for date changes to trigger data refresh.

### Why is this needed?

In legacy IIFE code, the `countlyVue.views.create()` function automatically wired up the date change event listener. In ESM/SFC components, you need to explicitly add this mixin.

The global date picker emits a `cly-date-change` event when the date selection changes. The `autoRefreshMixin` listens for this event and calls your component's `dateChanged()` or `refresh()` method.

### How to use:

```js
import { autoRefreshMixin, commonFormattersMixin, i18nMixin } from '../../../javascripts/countly/vue/core.js';

export default {
    mixins: [
        commonFormattersMixin,
        i18nMixin,
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
import { autoRefreshMixin, commonFormattersMixin, i18nMixin } from '../../../javascripts/countly/vue/core.js';

export default {
    mixins: [commonFormattersMixin, i18nMixin, autoRefreshMixin],
    // ...
};
```

### Error: `CV.$.when is not a function`
**Cause:** `countlyVue.$` in ESM only exposes `{ ajax }`, not jQuery's full API
**Fix:** Replace `CV.$.when(a, b)` with `Promise.all([a, b])`

### Specific route not matching (redirects to wrong page)
**Cause:** Plugin registers a specific `app.route()` that falls under another module's wildcard route, but Vite bundle execution order causes the wildcard to be checked first
**Fix:** Add a bare import of the parent tab container module to establish correct execution order. See [Backbone Route Ordering](#backbone-route-ordering-wildcard-vs-specific-routes) section.

### Error: `clyModel.getVuexModule is not a function`
**Cause:** Store exports the result of `getVuexModule()` instead of the store object
**Fix:** Export the store object itself:
```js
// ❌ Wrong - VuexLoader can't call getVuexModule() on a plain module object
export default getVuexModule();

// ✅ Correct - VuexLoader calls clyModel.getVuexModule() internally
export default countlyPluginName;
```

---

## Plugin Migration (plugins/ directory)

Plugins located in the `plugins/` directory follow a similar migration pattern but with a different file structure and import paths.

### Plugin Legacy Structure (IIFE)
```
plugins/plugin-name/frontend/public/
├── javascripts/
│   ├── countly.models.js    # Store logic (IIFE, window global)
│   └── countly.views.js     # Vue components (IIFE, window global)
├── templates/
│   └── *.html               # Runtime template compilation
├── stylesheets/
│   └── plugin.scss          # Plugin styles
├── images/
│   └── *.svg                # Image assets
└── fonts/
    └── *.woff2              # Font files (if any)
```

### Plugin New Structure (ESM + SFC)
```
plugins/plugin-name/frontend/public/
├── index.js                 # Entry point + route/tab registration
├── components/
│   └── PluginView.vue       # Vue SFC (build-time compilation)
├── store/
│   └── index.js             # Vuex store module
└── assets/
    ├── main.scss            # Styles (imported in index.js)
    ├── images/              # Image assets (moved from images/)
    │   └── *.svg
    └── fonts/               # Font files (moved from fonts/)
        └── *.woff2
```

### Key Differences from Core Migration

1. **Import Paths**: Plugins use longer relative paths to reach frontend files:
   ```js
   // From plugin's index.js
   import { i18n, views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';

   // From plugin's components/*.vue
   import { i18nMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
   import { getServerDataSource } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';

   // From plugin's store/index.js
   import { Module, ServerDataTable } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
   ```

2. **SCSS Import in index.js**: Include styles directly in the entry point:
   ```js
   // At the end of index.js
   import './assets/main.scss';
   ```

3. **Assets Folder**: Consolidate all static assets (SCSS, images, fonts) into the `assets/` directory. Move files from legacy `stylesheets/`, `images/`, and `fonts/` directories:
   ```
   assets/
   ├── main.scss            # All plugin styles (inline, not @use from stylesheets/)
   ├── images/              # SVG, PNG, etc. (moved from images/<plugin-name>/)
   │   ├── icon.svg
   │   └── background.png
   └── fonts/               # WOFF2, WOFF, etc. (moved from fonts/)
       └── custom-font.woff2
   ```
   After moving files into `assets/`, delete the now-empty legacy `stylesheets/`, `images/`, and `fonts/` directories. The `main.scss` should contain the actual style definitions (not just `@use` imports from `stylesheets/`), since the old `stylesheets/` directory is removed.

4. **Auto-Discovery**: Plugin `index.js` files are automatically imported via:
   ```js
   // In entrypoint.js
   import.meta.glob('../../../plugins/*/frontend/public/index.js', { eager: true });
   ```

5. **No Manual entrypoint.js Edit**: Unlike core modules, plugins don't need to be manually added to `entrypoint.js` - they are auto-discovered.

---

### Plugin Example: Browser Plugin

#### Final Structure:
```
plugins/browser/frontend/public/
├── index.js
├── components/
│   ├── BrowserView.vue
│   ├── BrowserTable.vue
│   └── VersionTable.vue
├── javascripts/
│   └── countly.models.js    # Keep if used by shared stores
├── assets/
│   ├── main.scss            # All plugin styles
│   └── images/              # Static image assets
│       └── browser-icon.svg
└── localization/
    └── browser.properties
```

#### index.js:
```js
import { i18n } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerTab } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';

import BrowserView from './components/BrowserView.vue';

import './assets/main.scss';

const FEATURE_NAME = 'browser';

// Register tab under technology analytics.
// Note: This component uses the shared countlyDevicesAndTypes store from device-and-type plugin.
registerTab("/analytics/technology", {
    type: "web",
    priority: 6,
    name: "browsers",
    permission: FEATURE_NAME,
    route: "#/analytics/technology/browsers",
    title: i18n('browser.title'),
    dataTestId: "browser-analytics",
    component: BrowserView
});

// Export for other plugins that may need to extend browser analytics
export { BrowserView };
```

#### components/BrowserView.vue:
```vue
<template>
    <div class="browser-view">
        <cly-header :title="i18n('browser.title')"></cly-header>
        <cly-main>
            <cly-date-picker-g></cly-date-picker-g>
            <!-- content -->
        </cly-main>
    </div>
</template>

<script>
import { autoRefreshMixin, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';

export default {
    mixins: [
        i18nMixin,
        autoRefreshMixin
    ],
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchBrowser');
    },
    methods: {
        refresh: function(force) {
            this.$store.dispatch('countlyDevicesAndTypes/fetchBrowser', force);
        },
        dateChanged: function() {
            this.refresh(true);
        }
    },
    computed: {
        appBrowser: function() {
            return this.$store.state.countlyDevicesAndTypes.appBrowser;
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.browserLoading;
        }
    }
};
</script>
```

---

### Plugin Import Path Reference

Paths are relative from plugin's `frontend/public/` directory. **Always use named imports — never import the default `countlyVue` object.**

```js
// From index.js (plugins/plugin-name/frontend/public/index.js)
import { i18n, views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerTab } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';

// From components/*.vue (plugins/plugin-name/frontend/public/components/View.vue)
import { i18nMixin, authMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { getServerDataSource } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { validateGlobalAdmin } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';

// From store/index.js (plugins/plugin-name/frontend/public/store/index.js)
import { Module, ServerDataTable } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { createMetricModel } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
```

---

### Plugin Migration Checklist

```
[ ] 1. Analyze legacy files (models, views, templates)
[ ] 2. Create new folder structure (components/, store/, assets/)
[ ] 3. Create store/index.js (if plugin has its own store)
[ ] 4. Create components/*.vue files
[ ] 5. Add autoRefreshMixin if using global date picker
[ ] 6. Create index.js with registerTab/route registration
[ ] 7. Consolidate all static assets into assets/ directory:
       - Move SCSS content into assets/main.scss (inline styles, not @use imports)
       - Move images from images/ to assets/images/
       - Move fonts from fonts/ to assets/fonts/
       - Import assets/main.scss in index.js
[ ] 8. Delete legacy directories (stylesheets/, images/, fonts/, javascripts/, templates/)
[ ] 9. Keep countly.models.js if used by shared stores
[ ] 10. If plugin registers specific app.route() under a wildcard route, add bare import of parent module (see Backbone Route Ordering section)
[ ] 11. Build and test
```

---

### Using Shared Stores

Some plugins don't have their own store but use shared stores from core modules. For example, the browser plugin uses `countlyDevicesAndTypes` from the device-and-type core module:

```js
// Dispatching actions on shared store
this.$store.dispatch('countlyDevicesAndTypes/fetchBrowser');

// Reading from shared store state
this.$store.state.countlyDevicesAndTypes.appBrowser;
this.$store.state.countlyDevicesAndTypes.browserLoading;
```

In this case:
- **Don't create a store/index.js** for the plugin
- **Don't include vuex in registerTab** since no store registration is needed
- The shared store must be registered before the plugin component mounts
