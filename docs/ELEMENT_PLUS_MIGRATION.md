# Element UI to Element Plus Migration Guide

## Overview

Element Plus is the Vue 3 compatible version of Element UI. Most components keep the same API, but there are some breaking changes.

## Quick Reference

### Compatible Changes (No Code Changes Needed)

These components work the same in both Element UI and Element Plus:

| Component | Status |
|-----------|--------|
| `el-button` | ✅ Compatible |
| `el-input` | ✅ Compatible |
| `el-select` | ✅ Compatible |
| `el-option` | ✅ Compatible |
| `el-checkbox` | ✅ Compatible |
| `el-radio` | ✅ Compatible |
| `el-switch` | ✅ Compatible |
| `el-table` | ✅ Compatible |
| `el-table-column` | ✅ Compatible |
| `el-pagination` | ✅ Compatible |
| `el-dialog` | ✅ Compatible |
| `el-form` | ✅ Compatible |
| `el-form-item` | ✅ Compatible |
| `el-date-picker` | ✅ Compatible |
| `el-tooltip` | ✅ Compatible |
| `el-popover` | ✅ Compatible |
| `el-dropdown` | ✅ Compatible |
| `el-menu` | ✅ Compatible |
| `el-tabs` | ✅ Compatible |
| `el-tab-pane` | ✅ Compatible |
| `el-alert` | ✅ Compatible |
| `el-tag` | ✅ Compatible |
| `el-badge` | ✅ Compatible |
| `el-progress` | ✅ Compatible |
| `el-collapse` | ✅ Compatible |
| `el-card` | ✅ Compatible |

### Breaking Changes

#### 1. Import Changes

**Element UI (Vue 2):**
```javascript
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
Vue.use(ElementUI);
```

**Element Plus (Vue 3):**
```javascript
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
app.use(ElementPlus);
```

#### 2. Component Registration

**Element UI:**
```javascript
Vue.component('el-button', ELEMENT.Button);
```

**Element Plus:**
```javascript
// Components are auto-registered when using app.use(ElementPlus)
// Or register individually:
app.component('ElButton', ElementPlus.ElButton);
```

#### 3. Icon Changes

**Element UI:**
```html
<i class="el-icon-edit"></i>
<el-button icon="el-icon-edit">Edit</el-button>
```

**Element Plus:**
```html
<el-icon><Edit /></el-icon>
<el-button :icon="Edit">Edit</el-button>

<!-- Or with string icon name (requires additional setup) -->
<el-button icon="Edit">Edit</el-button>
```

**Migration approach:**
```javascript
// Register icons globally
import { Edit, Delete, Search } from '@element-plus/icons-vue';
app.component('Edit', Edit);
app.component('Delete', Delete);
app.component('Search', Search);
```

#### 4. Loading Directive

**Element UI:**
```html
<div v-loading="loading">...</div>
```

**Element Plus:**
```html
<!-- Same syntax, works the same -->
<div v-loading="loading">...</div>
```

#### 5. Message and Notification

**Element UI:**
```javascript
this.$message('Hello');
this.$notify({ title: 'Title', message: 'Message' });
```

**Element Plus:**
```javascript
import { ElMessage, ElNotification } from 'element-plus';
ElMessage('Hello');
ElNotification({ title: 'Title', message: 'Message' });
```

#### 6. Confirm Dialog

**Element UI:**
```javascript
this.$confirm('Message', 'Title', {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel'
}).then(() => { ... });
```

**Element Plus:**
```javascript
import { ElMessageBox } from 'element-plus';
ElMessageBox.confirm('Message', 'Title', {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel'
}).then(() => { ... });
```

#### 7. Form Validation

**Element UI:**
```javascript
this.$refs.form.validate((valid) => { ... });
```

**Element Plus:**
```javascript
// Same API, but validate returns a Promise
this.$refs.form.validate().then(() => { ... });

// Or use callback style (still supported)
this.$refs.form.validate((valid) => { ... });
```

#### 8. Table Events

**Element UI:**
```html
<el-table @sort-change="handleSort" @selection-change="handleSelection">
```

**Element Plus:**
```html
<!-- Same events, same API -->
<el-table @sort-change="handleSort" @selection-change="handleSelection">
```

### CSS Class Changes

Most CSS classes remain the same. Notable changes:

| Element UI | Element Plus |
|------------|--------------|
| `.el-loading-mask` | `.el-loading-mask` (same) |
| `.el-dialog__wrapper` | `.el-overlay` |
| `.el-message-box__wrapper` | `.el-overlay` |

### Size Prop Changes

**Element UI:**
```html
<el-button size="medium">Button</el-button>
<el-button size="small">Button</el-button>
<el-button size="mini">Button</el-button>
```

**Element Plus:**
```html
<el-button size="default">Button</el-button>
<el-button size="small">Button</el-button>
<!-- 'mini' is removed, use 'small' instead -->
<el-button size="small">Button</el-button>
```

## Countly-Specific Migration

### 1. Current Element UI Usage

Element UI is loaded in `dashboard.html`:
```html
<script src="<%- cdn %>javascripts/utils/vue/element-ui.js"></script>
```

### 2. Migration Steps

1. **Download Element Plus:**
   ```bash
   curl -o element-plus.js https://unpkg.com/element-plus/dist/index.full.min.js
   curl -o element-plus.css https://unpkg.com/element-plus/dist/index.css
   ```

2. **Update dashboard.html:**
   - Replace `element-ui.js` with `element-plus.js`
   - Replace `element-ui.css` with `element-plus.css`

3. **Update imports.js:**
   - Replace `ELEMENT` global with `ElementPlus`

4. **Search for icon usage:**
   ```bash
   grep -r "el-icon-" --include="*.js" --include="*.html" plugins/
   ```

5. **Search for size="mini":**
   ```bash
   grep -r 'size="mini"' --include="*.js" --include="*.html" plugins/
   ```

### 3. Icon Migration Helper

Create a component to handle both old and new icon formats:

```javascript
// Icon compatibility component
countlyVue.component('cly-icon', {
    props: {
        name: String
    },
    template: '<i :class="iconClass"></i>',
    computed: {
        iconClass: function() {
            // Support both old 'el-icon-edit' and new 'Edit' format
            if (this.name.startsWith('el-icon-')) {
                return this.name;
            }
            return 'el-icon-' + this.name.toLowerCase();
        }
    }
});
```

## Testing Checklist

After migration, test these scenarios:

- [ ] Forms submit correctly
- [ ] Form validation works
- [ ] Tables sort correctly
- [ ] Tables pagination works
- [ ] Dialogs open and close
- [ ] Date pickers work
- [ ] Dropdowns work
- [ ] Notifications display correctly
- [ ] Loading states show correctly
- [ ] Icons display correctly

## Rollback Plan

If issues arise:
1. Revert dashboard.html to load element-ui.js
2. Revert CSS file changes
3. The old Element UI files are still available
