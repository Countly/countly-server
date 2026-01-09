# Vue 3 Vendor Library Migration Guide

This document describes how to migrate third-party Vue libraries from Vue 2 to Vue 3 compatible versions.

## Overview

| Vue 2 Library | Vue 3 Replacement | CDN Available | Notes |
|---------------|-------------------|---------------|-------|
| `vue.min.js` (2.7.x) | `vue.min.js` (3.4.x) | ✅ Yes | Core library |
| `vuex.min.js` (3.x) | `vuex.min.js` (4.x) | ✅ Yes | State management |
| `composition-api.min.js` | N/A (built-in) | N/A | Remove - built into Vue 3 |
| `element-ui.js` | `element-plus.min.js` | ✅ Yes | UI component library |
| `vuedraggable.umd.min.js` | `vue-draggable-next.min.js` | ✅ Yes | Drag and drop |
| `vue-good-table.min.js` | `vue-good-table-next` | ❌ No | Data tables - needs bundling |
| `vue2-leaflet.min.js` | `@vue-leaflet/vue-leaflet` | ❌ No | Maps - needs bundling |
| `vue2Dropzone.min.js` | `vue3-dropzone` | ❌ No | File upload - needs bundling |

## Core Libraries

### Vue 3

Download from CDN:
```bash
curl -sL "https://unpkg.com/vue@3.4/dist/vue.global.prod.js" -o vue.min.js
```

### Vuex 4

Download from CDN:
```bash
curl -sL "https://unpkg.com/vuex@4/dist/vuex.global.prod.js" -o vuex.min.js
```

### Vue Router 4

Download from CDN:
```bash
curl -sL "https://unpkg.com/vue-router@4/dist/vue-router.global.prod.js" -o vue-router.min.js
```

## Element Plus (replacing Element UI)

Element Plus is the Vue 3 version of Element UI.

### Download

```bash
# JavaScript
curl -sL "https://unpkg.com/element-plus@2/dist/index.full.min.js" -o element-plus.min.js

# CSS
curl -sL "https://unpkg.com/element-plus@2/dist/index.css" -o element-plus.css
```

### Breaking Changes

1. **Component naming**: Prefix changed from `el-` (unchanged for most)
2. **Import style**: Global registration works differently
3. **Date picker**: Uses dayjs instead of moment
4. **Some prop names changed**: Check Element Plus migration guide

### Registration in Vue 3

```javascript
// Vue 2 with Element UI
Vue.use(ElementUI);

// Vue 3 with Element Plus
const app = Vue.createApp({...});
app.use(ElementPlus);
app.mount('#app');
```

## vue-draggable-next (replacing vuedraggable)

### Download

```bash
curl -sL "https://unpkg.com/vue-draggable-next@2/dist/vue-draggable-next.global.js" -o vue-draggable-next.min.js
```

### Breaking Changes

1. **Import name**: `VueDraggableNext` instead of `draggable`
2. **Model value**: Uses `modelValue` instead of `value`

### Usage

```javascript
// Vue 2
import draggable from 'vuedraggable'

// Vue 3
import { VueDraggableNext } from 'vue-draggable-next'
// or from global: window.VueDraggableNext
```

## Libraries Requiring Bundling

The following libraries don't have UMD builds for Vue 3 and need to be bundled with a build tool.

### Option 1: Create a vendor bundle

Create a simple bundler script:

```javascript
// vendor-bundle/index.js
import VueGoodTableNext from 'vue-good-table-next';
import { LMap, LTileLayer, LMarker } from '@vue-leaflet/vue-leaflet';
import Vue3Dropzone from 'vue3-dropzone';

window.VueGoodTablePlugin = VueGoodTableNext;
window.VueLeaflet = { LMap, LTileLayer, LMarker };
window.Vue3Dropzone = Vue3Dropzone;
```

Bundle with esbuild:
```bash
npm install esbuild vue-good-table-next @vue-leaflet/vue-leaflet vue3-dropzone
npx esbuild vendor-bundle/index.js --bundle --minify --format=iife --outfile=vendor-vue3.min.js
```

### Option 2: Use existing alternatives

#### For vue-good-table

Consider using Element Plus's `el-table` component which is already included.

#### For vue2-leaflet

The leaflet integration can work with vanilla Leaflet + Vue 3 refs:

```javascript
// Instead of vue-leaflet components, use vanilla Leaflet
mounted() {
    this.map = L.map(this.$refs.mapContainer).setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
}
```

#### For vue2Dropzone

Consider using native HTML5 drag-and-drop with Vue 3:

```javascript
// Simple dropzone implementation
const dropzone = {
    template: `
        <div @drop.prevent="onDrop" @dragover.prevent @dragenter.prevent>
            <slot></slot>
        </div>
    `,
    methods: {
        onDrop(e) {
            const files = e.dataTransfer.files;
            this.$emit('files-dropped', files);
        }
    }
};
```

## vue-good-table-next

If you must use vue-good-table-next:

### Install and bundle

```bash
npm install vue-good-table-next
```

### Breaking Changes

1. **CSS import**: Styles are separate
2. **Pagination**: Some prop names changed
3. **Sorting**: API slightly different

### Registration

```javascript
// Vue 2
import VueGoodTablePlugin from 'vue-good-table';
Vue.use(VueGoodTablePlugin);

// Vue 3
import VueGoodTablePlugin from 'vue-good-table-next';
app.use(VueGoodTablePlugin);
```

## @vue-leaflet/vue-leaflet

### Install and bundle

```bash
npm install @vue-leaflet/vue-leaflet leaflet
```

### Breaking Changes

1. **Component names**: Slightly different (e.g., `l-map` stays the same)
2. **Icon handling**: Different approach for custom icons
3. **Events**: Use `@ready` instead of `@leaflet-load`

### Usage

```javascript
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet';
import 'leaflet/dist/leaflet.css';

app.component('l-map', LMap);
app.component('l-tile-layer', LTileLayer);
app.component('l-marker', LMarker);
app.component('l-popup', LPopup);
```

## Migration Checklist

### Before Migration

- [ ] Run existing test suite
- [ ] Document current library usage
- [ ] Backup current vendor files

### During Migration

- [ ] Download Vue 3 core libraries
- [ ] Download Element Plus
- [ ] Download vue-draggable-next
- [ ] Bundle or replace vue-good-table
- [ ] Bundle or replace vue2-leaflet
- [ ] Bundle or replace vue2Dropzone
- [ ] Update HTML imports
- [ ] Update component registrations

### After Migration

- [ ] Test all features using the vendor libraries
- [ ] Run UI test suite
- [ ] Check for console errors/warnings
- [ ] Verify CSS styling

## File Locations

Current Vue 2 libraries:
```
frontend/express/public/javascripts/utils/vue/
├── vue.min.js
├── vuex.min.js
├── composition-api.min.js
├── element-ui.js
├── vuedraggable.umd.min.js
├── vue-good-table.min.js
├── vue2-leaflet.min.js
└── vue2Dropzone.min.js
```

After Vue 3 migration:
```
frontend/express/public/javascripts/utils/vue/
├── vue.min.js (Vue 3.4)
├── vuex.min.js (Vuex 4)
├── vue-router.min.js (Vue Router 4)
├── element-plus.min.js
├── vue-draggable-next.min.js
├── vendor-vue3-bundle.min.js (bundled: good-table, leaflet, dropzone)
└── vue2-backup/ (backup of Vue 2 files)
```

## Rollback Plan

If issues are found after migration:

1. Stop the server
2. Restore Vue 2 libraries: `cp vue2-backup/* ./`
3. Revert HTML imports
4. Restart the server

## Resources

- [Vue 3 Migration Guide](https://v3-migration.vuejs.org/)
- [Element Plus Documentation](https://element-plus.org/)
- [vue-draggable-next](https://github.com/SortableJS/vue.draggable.next)
- [vue-good-table-next](https://github.com/nickvenne/vue-good-table-next)
- [@vue-leaflet/vue-leaflet](https://github.com/vue-leaflet/vue-leaflet)
