# CLAUDE.md - Countly Server

This file provides guidance for Claude (Anthropic) when working with this codebase.

## Project Overview

Countly is a product analytics platform. Backend: Node.js 22+, MongoDB. Frontend: Vue 2, Element UI, Backbone (legacy). Architecture is plugin-based.

## Quick Commands

```bash
npm run start:all:dev        # Start all services (API:3001, Frontend:6001)
npx grunt dist-all           # Build static assets (required after JS changes)
npx grunt locales            # Build locale files
npx grunt sass               # Compile SASS only

# Testing
npm run test:unit            # Unit tests
npm run test:plugin -- name  # Single plugin tests
countly plugin lint name     # Lint plugin
countly shellcheck           # Validate shell scripts
```

## Critical Security Rules

**ALWAYS follow these - no exceptions:**

1. **API endpoints must use validation**:
   ```javascript
   const { validateRead, validateCreate, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');
   validateRead(params, FEATURE_NAME, () => { /* handler */ });
   ```

2. **Write operations must include app_id**:
   ```javascript
   // CORRECT - prevents cross-app access
   db.collection("items").deleteOne({_id: id, app_id: params.app_id + ""});
   ```

3. **Cast user input to strings for auth**:
   ```javascript
   params.username = params.username + "";
   ```

4. **Use spawn, not exec for shell commands**:
   ```javascript
   cp.spawn("command", [userInput]);  // Safe
   // exec("command " + userInput);   // VULNERABLE
   ```

5. **Never use v-html with user data** in Vue templates.

## File Locations

| What | Where |
|------|-------|
| Plugin code | `plugins/<name>/api/api.js` |
| Vue views | `plugins/<name>/frontend/public/javascripts/countly.views.js` |
| Templates | `plugins/<name>/frontend/public/templates/` |
| Localization | `plugins/<name>/frontend/public/localization/<name>.properties` |
| Tests | `plugins/<name>/tests.js` |

## Creating API Endpoints

```javascript
var plugins = require('../../pluginManager.js');
var common = require('../../../api/utils/common.js');
const { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'myfeature';

plugins.register("/o/myfeature", function(ob) {
    var params = ob.params;
    validateRead(params, FEATURE_NAME, function() {
        // Validate input
        var argProps = {
            'id': { 'required': true, 'type': 'String' }
        };
        var validation = common.validateArgs(params.qstring, argProps, true);
        if (!validation.obj) {
            common.returnMessage(params, 400, 'Error: ' + validation.errors);
            return;
        }
        
        // Query with app_id
        common.db.collection('mydata').findOne(
            {_id: validation.obj.id, app_id: params.app_id + ""},
            function(err, result) {
                common.returnOutput(params, result || {});
            }
        );
    });
});
```

## Creating Vue Components

```javascript
var MyComponent = countlyVue.views.create({
    template: countlyVue.T("/myplugin/templates/main.html"),
    mixins: [countlyVue.mixins.auth(FEATURE_NAME)],
    data: function() {
        return { items: [] };
    },
    computed: {
        // Prefer computed over watchers
    },
    methods: {
        refresh: function() {
            // Called for auto-refresh
        }
    }
});

app.route('/dashboard/myfeature', 'myfeature', function() {
    new countlyVue.views.BackboneWrapper({ component: MyComponent }).render();
});
```

## MongoDB Patterns

```javascript
// Read batcher for hot documents
common.readBatcher.getOne("collection", {_id: id}, callback);

// Write batcher for multiple updates
common.writeBatcher.add("collection", id, {$inc: {count: 1}});

// Always use projection
db.collection('x').findOne({_id: id}, {projection: {field: 1}});
```

## Plugin Lifecycle Hooks

```javascript
// Required if your plugin creates per-app collections
plugins.register("/i/apps/create", function(ob) {
    common.db.collection('mydata' + ob.appId).createIndex({"field": 1});
});

plugins.register("/i/apps/delete", function(ob) {
    common.db.collection('mydata' + ob.appId).drop();
});

plugins.register("/i/app_users/delete", function(ob) {
    common.db.collection("mydata" + ob.app_id).deleteMany({uid: {$in: ob.uids}});
});
```

## CSS/Styling

- Use SASS with SCSS syntax
- BEM naming with `cly-vue-` prefix
- Bulma classes use `bu-` prefix
- Use `@use`, never `@import`

## Common Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|------------|
| `this.$parent.value = x` | Emit events: `this.$emit('update', x)` |
| Deep watchers | Watch specific properties |
| `v-html` with user data | Use `{{ }}` text interpolation |
| Query without app_id | Always include `app_id` in queries |
| `exec(cmd + userInput)` | `spawn(cmd, [userInput])` |
| `replace(' ', '-')` | `replace(/ /g, '-')` for all occurrences |

## Detailed Documentation

For comprehensive guidelines, read:
- `CODING_GUIDELINES.md` - Full development standards
- `docs/SECURITY.md` - Security requirements
- `docs/VUEJS_GUIDELINES.md` - Vue patterns
- `docs/CSS_STYLE_GUIDE.md` - SASS/BEM conventions
- `docs/UI_TESTING.md` - Cypress testing
- `test/README.md` - Test suite documentation
- `plugins/empty/` - Sample plugin structure
