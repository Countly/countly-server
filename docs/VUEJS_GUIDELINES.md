# Vue.js Development Guidelines

This document provides Vue.js specific guidelines for developing Countly Server frontend components.

## Table of Contents
- [Component Architecture](#component-architecture)
- [Naming Conventions](#naming-conventions)
- [Template Best Practices](#template-best-practices)
- [State Management](#state-management)
- [Security](#security)
- [Testing with Data Test IDs](#testing-with-data-test-ids)

---

## Component Architecture

### Creating Components

Use `countlyVue.views.create()` for new components:

```javascript
var MyComponent = countlyVue.views.create({
    template: countlyVue.T("/myplugin/templates/mycomponent.html"),
    mixins: [
        countlyVue.mixins.auth(FEATURE_NAME),  // Authorization mixin
        countlyVue.mixins.hasDrawers("main")    // If using drawers
    ],
    props: {
        itemId: { type: String, required: true }
    },
    data: function() {
        return {
            isLoading: false,
            items: []
        };
    },
    computed: {
        // Prefer computed over data + watchers
        filteredItems: function() {
            return this.items.filter(item => item.active);
        }
    },
    methods: {
        fetchData: function() {
            // API calls and event handlers
        }
    },
    mounted: function() {
        this.fetchData();
    }
});
```

### Registering Routes

```javascript
app.route('/dashboard/myfeature', 'myfeature', function() {
    var view = new countlyVue.views.BackboneWrapper({
        component: MyComponent
    });
    view.render();
});

// With parameters
app.route('/dashboard/myfeature/:id', 'myfeature-detail', function(id) {
    var view = new countlyVue.views.BackboneWrapper({
        component: MyDetailComponent,
        vuex: { itemId: id }
    });
    view.render();
});
```

### Component Lifecycle

Implement these methods for proper data management:

```javascript
var MyView = countlyVue.views.create({
    methods: {
        // Called on initial load
        initialize: function() {
            this.loadData();
        },
        
        // Called when data should be refreshed
        refresh: function() {
            this.loadData();
        },
        
        // Called when view is being destroyed
        reset: function() {
            this.items = [];
        }
    }
});
```

---

## Naming Conventions

### JavaScript

| Element | Convention | Example |
|---------|------------|---------|
| Component variables | PascalCase | `var UserProfile = ...` |
| Data properties | camelCase | `isLoading`, `userData` |
| Methods | camelCase | `handleClick`, `fetchData` |
| Constants | UPPER_SNAKE | `const FEATURE_NAME = 'users'` |
| Private (avoid) | No $ or _ prefix | ~~`$internalVar`~~ |

### Templates

| Element | Convention | Example |
|---------|------------|---------|
| Component tags | kebab-case | `<user-profile>` |
| Props | kebab-case | `:user-data="data"` |
| Events | kebab-case | `@click-save="handleSave"` |

### Vuex

| Element | Convention | Example |
|---------|------------|---------|
| Module names | camelCase | `userModule` |
| State properties | camelCase | `currentUser` |
| Getters | camelCase | `activeUsers` |
| Mutations | UPPER_SNAKE | `SET_USER` |
| Actions | camelCase | `fetchUser` |

---

## Template Best Practices

### Use Shorthand Syntax

```html
<!-- ✅ Preferred -->
<button @click="handleClick" :disabled="isLoading">
    Submit
</button>

<!-- ❌ Avoid verbose syntax -->
<button v-on:click="handleClick" v-bind:disabled="isLoading">
    Submit
</button>
```

### Component Registration

```html
<!-- ✅ Use kebab-case in templates -->
<cly-drawer @close="onClose" :controls="drawerControls">
    <template #default>Content</template>
</cly-drawer>

<!-- ❌ Don't use PascalCase in templates -->
<ClyDrawer></ClyDrawer>
```

### Conditional Rendering

```html
<!-- ✅ Use v-if for conditional blocks -->
<template v-if="isLoaded">
    <div class="content">{{ data }}</div>
</template>
<template v-else>
    <cly-loading></cly-loading>
</template>

<!-- ✅ Use v-show for frequent toggles -->
<div v-show="isVisible" class="tooltip">Tooltip content</div>
```

### Lists

```html
<!-- ✅ Always use :key with v-for -->
<div v-for="item in items" :key="item._id">
    {{ item.name }}
</div>

<!-- ❌ Don't use index as key for mutable lists -->
<div v-for="(item, index) in items" :key="index">
```

---

## State Management

### Prefer Computed Properties

```javascript
// ✅ Good: Computed property
computed: {
    fullName: function() {
        return this.firstName + ' ' + this.lastName;
    },
    sortedItems: function() {
        return [...this.items].sort((a, b) => a.name.localeCompare(b.name));
    }
}

// ❌ Avoid: Data + watcher
data: function() {
    return {
        fullName: ''
    };
},
watch: {
    firstName: function() {
        this.fullName = this.firstName + ' ' + this.lastName;
    },
    lastName: function() {
        this.fullName = this.firstName + ' ' + this.lastName;
    }
}
```

### Avoid Deep Watchers

```javascript
// ❌ Expensive: Deep watcher
watch: {
    formData: {
        deep: true,
        handler: function(newVal) {
            this.validate(newVal);
        }
    }
}

// ✅ Better: Watch specific properties
watch: {
    'formData.email': function(newVal) {
        this.validateEmail(newVal);
    },
    'formData.password': function(newVal) {
        this.validatePassword(newVal);
    }
}
```

### Props Down, Events Up

```javascript
// ✅ Correct: Parent passes data via props
// Child emits events to request changes
var ChildComponent = {
    props: ['value'],
    methods: {
        updateValue: function(newValue) {
            this.$emit('input', newValue);  // Emit event to parent
        }
    }
};

// ❌ Wrong: Don't modify parent state directly
var ChildComponent = {
    methods: {
        updateValue: function(newValue) {
            this.$parent.value = newValue;  // DON'T DO THIS
        }
    }
};
```

---

## Security

### XSS Prevention

```html
<!-- ✅ Safe: Automatic escaping in text interpolation -->
<span>{{ userInput }}</span>
<div :title="userInput"></div>

<!-- ⚠️ Use with caution: Only for pre-sanitized HTML -->
<div v-html="sanitizedHtml"></div>

<!-- ❌ NEVER: Raw user input in v-html -->
<div v-html="userProvidedContent"></div>
```

### Sanitization

```javascript
// When you must render HTML
methods: {
    getSafeHtml: function(rawInput) {
        return countlyCommon.encodeHtml(rawInput);
    }
}
```

### Testing for XSS

Always test with these strings:
```javascript
var testStrings = [
    "<script>alert('xss')</script>",
    "\"onclick=\"alert('xss')\"",
    "'&&&'",
    "<img src=x onerror=alert('xss')>"
];
```

The strings should display exactly as entered, not execute.

---

## Testing with Data Test IDs

### Adding Test IDs

Add `data-test-id` attributes to all interactive elements:

```html
<!-- Static test IDs -->
<button data-test-id="submit-form-button">Submit</button>
<input data-test-id="username-input" type="text">
<div data-test-id="error-message-container">{{ errorMessage }}</div>

<!-- Dynamic test IDs -->
<el-tab-pane 
    v-for="tab in tabs" 
    :key="tab.name"
    :data-test-id="'tab-' + tab.name.toLowerCase().replace(' ', '-') + '-link'">
    {{ tab.label }}
</el-tab-pane>
```

### Component Props for Test IDs

When creating reusable components, accept test ID as a prop:

```javascript
var MySelect = countlyVue.views.create({
    props: {
        testId: {
            type: String,
            default: ''
        }
    },
    template: `
        <div :data-test-id="testId + '-container'">
            <select :data-test-id="testId + '-select'">
                <option 
                    v-for="opt in options" 
                    :key="opt.value"
                    :data-test-id="testId + '-option-' + opt.value">
                    {{ opt.label }}
                </option>
            </select>
        </div>
    `
});
```

Usage:
```html
<my-select test-id="country-selector" :options="countries"></my-select>
```

### Naming Conventions for Test IDs

| Pattern | Example |
|---------|---------|
| Buttons | `{action}-{context}-button` → `submit-form-button` |
| Inputs | `{field}-input` → `username-input` |
| Links | `{destination}-link` → `dashboard-link` |
| Containers | `{content}-container` → `user-list-container` |
| Tabs | `tab-{name}-link` → `tab-settings-link` |
| Rows | `{item}-row-{id}` → `user-row-123` |

### After Adding Test IDs

When adding test IDs via JavaScript (not templates), rebuild assets:

```bash
npx grunt dist-all
```

### Verifying Test IDs

In browser console:
```javascript
// Find element by test ID
$('[data-test-id="login-submit-button"]')

// List all test IDs on page
$$('[data-test-id]').map(el => el.getAttribute('data-test-id'))
```

---

## Component Library

### Available Components

Check if a component exists before creating a new one:

| Need | Component |
|------|-----------|
| Data tables | `cly-datatable-n` |
| Dropdowns | `cly-select-x`, `cly-multi-select` |
| Date pickers | `cly-date-picker` |
| Drawers | `cly-drawer` |
| Modals | `el-dialog` |
| Form inputs | `el-input`, `el-checkbox`, `el-radio` |
| Loading states | `cly-loading` |
| Empty states | `cly-empty-view` |

### Requesting New Components

If you need a component that doesn't exist:
1. Check if another plugin has implemented it
2. Check if a suitable third-party component exists
3. Discuss in team channel before implementing

---

## Common Patterns

### Data Fetching

```javascript
methods: {
    fetchData: function() {
        var self = this;
        self.isLoading = true;
        
        CV.$.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/myfeature',
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            success: function(result) {
                self.items = result.data || [];
            },
            error: function(xhr, status, error) {
                CountlyHelpers.notify({
                    type: 'error',
                    message: jQuery.i18n.map['common.error']
                });
            },
            complete: function() {
                self.isLoading = false;
            }
        });
    }
}
```

### Form Handling

```javascript
data: function() {
    return {
        form: {
            name: '',
            email: ''
        },
        rules: {
            name: [
                { required: true, message: 'Name is required' }
            ],
            email: [
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Invalid email format' }
            ]
        }
    };
},
methods: {
    submitForm: function() {
        var self = this;
        this.$refs.form.validate(function(valid) {
            if (valid) {
                self.saveData();
            }
        });
    }
}
```

### Confirmation Dialogs

```javascript
methods: {
    confirmDelete: function(item) {
        var self = this;
        CountlyHelpers.confirm(
            jQuery.i18n.map['common.confirm-delete'],
            'popStyleGreen',
            function(result) {
                if (result) {
                    self.deleteItem(item._id);
                }
            },
            [jQuery.i18n.map['common.no'], jQuery.i18n.map['common.yes']],
            { title: jQuery.i18n.map['common.warning'] }
        );
    }
}
```

---

## Debugging

### Vue DevTools

Install Vue DevTools browser extension for:
- Component tree inspection
- State debugging
- Event tracking
- Vuex store inspection

### Console Logging

```javascript
// Component instance
console.log(this.$data);
console.log(this.$props);

// Vuex state
console.log(this.$store.state);
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Component not updating | Check if data is reactive (defined in `data()`) |
| Props not working | Verify prop name uses kebab-case in template |
| Events not firing | Check `$emit` name matches `@handler` |
| Template not found | Verify path in `countlyVue.T()` is correct |
| Styles not applied | Run `npx grunt sass` after CSS changes |
