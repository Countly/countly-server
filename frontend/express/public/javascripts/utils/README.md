# Frontend Utils Dependencies

JavaScript utility libraries for the Countly frontend.

---

## Main Libraries

| Library | Size | Version | Latest (Jan 2026) | Status | Used By |
|---------|------|---------|-------------------|--------|---------|
| **element-tiptap** | 1.0 MB | 1.x | 2.2.1 | ✅ Active | Content plugin (WYSIWYG editor) + Dashboards Note widget |
| **ECharts** | 996 KB | 5.x | 6.0.0 | ✅ Core | All charts - dashboard, drill, funnels |
| **Element UI** | 473 KB | 2.15.x | 2.15.14 | ✅ Core | el-table, el-select, el-dialog |
| **Vue.js** | 358 KB | 2.7.16 | 3.5.x | ✅ Core | Framework - all Vue components |
| **Leaflet** | 139 KB | 1.7.1 | 1.9.4 | ⚠️ Replaceable | cly-worldmap (geo, activity-map) |
| **vue2-leaflet** | 90 KB | ~2.x | 2.7.1 | ⚠️ Replaceable | cly-worldmap, cly-map-picker |
| **vue-color** | 80 KB | - | - | ⚠️ Replaceable | Use Element UI `<el-color-picker>` |
| **v-tooltip** | 64 KB | - | - | ✅ Active | Tooltips |
| **vuescroll** | 63 KB | - | - | ✅ Active | Custom scrollbars |
| **vue2Dropzone** | 52 KB | - | - | ✅ Active | File uploads |
| **Vuex** | 40 KB | 3.6.2 | 4.1.0 | ✅ Core | State management |
| **VeeValidate** | 38 KB | 3.4.5 | 4.15.1 | ✅ Active | Push, alerts validation |
| **vuedraggable** | 35 KB | 2.x | 2.24.3 | ✅ Active | Dashboard widget sorting |
| **Sortable.js** | 25 KB | 1.8.4 | 1.15.6 | ✅ Active | Drag and drop |
| **underscore.js** | 19 KB | 1.13.6 | 1.13.7 | ✅ Active | _.extend, _.filter utilities |
| **vue-json-pretty** | 17 KB | - | - | ✅ Active | JSON display |
| **vue-clipboard** | 13 KB | 2.x | 2.0.0 | ✅ Active | Users plugin (copy UID/DID) |
| **vue-echarts** | 10 KB | ~6.x | 7.0.3 | ✅ Core | ECharts Vue wrapper |

### Polyfills (⚠️ IE11 Only)

| File | Size | Notes |
|------|------|-------|
| intersection-observer | 34 KB | Remove if IE11 dropped |
| es6-promise | 6 KB | Remove if IE11 dropped |
| prefixfree.min.js | 6 KB | CSS vendor prefixes |
| polyfills.js | 5 KB | Various polyfills |

---

## 🎯 Optimization Opportunities

### Immediate (No Risk)

| Action | Savings | Effort |
|--------|---------|--------|
| Remove IE11 polyfills | **46 KB** | Low |
| **Total** | **46 KB** | |

### Medium-term

| Action | Savings | Effort | Notes |
|--------|---------|--------|-------|
| Replace Leaflet → ECharts | **229 KB** | Medium | See below |
| Replace vue-color → Element UI `<el-color-picker>` | ~80 KB | Low | Built-in component, no extra dependency |

---


*Last updated: January 2026*
