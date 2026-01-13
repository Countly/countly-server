# Countly Server - AI Coding Agent Instructions

## Project Overview
Countly is a product analytics platform built with **Node.js 22+**, **MongoDB**, and **Vue 2** (with Element UI). The architecture is plugin-based: core functionality lives in `api/` and `frontend/`, while features are implemented as plugins in `plugins/`.

## Architecture

### Multi-Process Architecture
Countly runs as multiple services (start via `npm run start:all:dev`):
- **API Server** (`api/api.js`) - SDK data ingestion on port 3001
- **Frontend** (`frontend/express/app.js`) - Dashboard on port 6001
- **Job Server** (`jobServer/index.js`) - Background job processing
- **Aggregator** (`api/aggregator.js`) - Data aggregation
- **Ingestor** (`api/ingestor.js`) - High-volume data ingestion

### Plugin System
Plugins extend Countly via event hooks. Each plugin has this structure:
```
plugins/<name>/
├── api/api.js          # Backend API endpoints (required)
├── frontend/app.js     # Express middleware/routes
├── frontend/public/    # Static assets (JS, CSS, templates)
├── package.json        # Plugin metadata
├── install.js          # Installation hook
└── tests.js            # Plugin tests
```

## Backend Development Checklist

### API Endpoint Security (REQUIRED)
**Every endpoint must use validation** from `api/utils/rights.js`:
```javascript
const { validateRead, validateCreate, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');

// Read operations
validateRead(params, FEATURE_NAME, () => { /* handler */ });

// Write operations - always include app_id in queries!
validateDelete(params, FEATURE_NAME, () => {
    // CORRECT: Include app_id to prevent cross-app access
    db.collection("items").deleteOne({_id: params.qstring.id, app_id: params.app_id + ""});
});
```

### Parameter Validation
Always validate and type-check input parameters:
```javascript
var argProps = {
    'name': { 'required': true, 'type': 'String' },
    'count': { 'required': false, 'type': 'Number' }
};
var validation = common.validateArgs(params.qstring.args, argProps, true);
if (!validation.obj) {
    common.returnMessage(params, 400, 'Error: ' + validation.errors);
    return false;
}

// Parse JSON safely
if (typeof params.qstring.data === "string") {
    try {
        params.qstring.data = JSON.parse(params.qstring.data);
    } catch (ex) {
        params.qstring.data = {};
    }
}
```

### MongoDB Performance
```javascript
// Use read batcher for frequently accessed documents
common.readBatcher.getOne("events", {'_id': params.app_id}, (err, event) => {});

// Use write batcher for multiple updates to same document
common.writeBatcher.add("users", id, {'$inc': updateData});

// Always use projection to limit returned fields
db.collection('plugins').findOne({_id: 'plugins'}, {projection: {'myfield': 1}});
```

### App Lifecycle Events (Required for plugins with collections)
```javascript
// Create indexes when new app is created
plugins.register("/i/apps/create", function(ob) {
    common.db.collection('app_mydata' + ob.appId).ensureIndex({"field": 1}, {background: true});
});

// Clean up when app is deleted
plugins.register("/i/apps/delete", function(ob) {
    common.db.collection('app_mydata' + ob.appId).drop();
});

// Handle user data deletion (GDPR)
plugins.register("/i/app_users/delete", function(ob) {
    common.db.collection("app_mydata" + ob.app_id).remove({uid: {$in: ob.uids}});
});
```

### Audit Logging
Log all create/update/delete actions:
```javascript
plugins.dispatch("/systemlogs", {params: params, action: "item_created", data: newItem});
plugins.dispatch("/systemlogs", {params: params, action: "item_edited", data: {before: oldItem, update: changes}});
```

## Frontend Development (Vue 2)

### Component Conventions
```javascript
// Use PascalCase for component names
var MyComponent = countlyVue.views.create({
    template: countlyVue.T("/myplugin/templates/mytemplate.html"),
    mixins: [countlyVue.mixins.auth(FEATURE_NAME)],
    data: function() { return { /* state */ }; },
    computed: { /* prefer computed over watchers */ },
    methods: { /* handlers */ }
});

// Register route with kebab-case component names in templates
app.route('/dashboard/myfeature', 'myfeature', function() {
    new countlyVue.views.BackboneWrapper({ component: MyComponent }).render();
});
```

### Vue Best Practices
- **DO**: Use `@event` instead of `v-on:event`, `:prop` instead of `v-bind:prop`
- **DO**: Prefer computed properties over data + watchers
- **DO**: Add `data-test-id` attributes for testable elements
- **DON'T**: Use `v-html` with user input (XSS risk)
- **DON'T**: Modify parent state directly - use props down, events up
- **DON'T**: Use global component registration unless truly global

### Data Test IDs for UI Testing
```html
<!-- Add data-test-id for Cypress tests -->
<button data-test-id="submit-form-button">Submit</button>
<input data-test-id="username-input" type="text">

<!-- Dynamic test IDs in Vue -->
<el-tab :data-test-id="'tab-' + tab.name + '-link'">
```

## Security Requirements

### XSS Prevention
- API output is auto-escaped via `common.returnOutput()` and `common.returnMessage()`
- Frontend: Treat API data as HTML, use `{{ msg }}` for unescaped user input
- Use `countlyCommon.encodeHtml()` for manual sanitization

### MongoDB Injection Prevention
```javascript
// Always cast credentials to strings
params.username = params.username + "";
params.password = params.password + "";
```

### File Upload Security
```javascript
// Validate file types
if (type !== "image/png" && type !== "image/gif" && type !== "image/jpeg") {
    fs.unlink(tmp_path, function() {});
    return;
}
// Sanitize filenames
var safeFileName = common.sanitizeFilename(params.qstring.filename);
```

### Command Line Security
```javascript
// Use spawn with array args, NOT exec with string concatenation
var cp = require('child_process');
cp.spawn("command", [userInput]);  // Safe
// exec("command " + userInput);   // UNSAFE - allows injection
```

## Testing

```bash
npm run test:unit                 # Unit tests (no Docker)
npm run test:api-core             # Core API tests
npm run test:lite-plugins         # CE plugin tests
npm run test:plugin -- <name>     # Single plugin tests

# Linting
countly plugin lint <pluginname>
countly plugin lintfix <pluginname>
```

### Plugin Test Requirements
- Test empty state, various inputs, and cleanup
- Verify app lifecycle handlers work correctly
- Include tests in `plugins/<name>/tests.js`

## Development Commands

```bash
npm run start:all:dev        # All services with hot reload
npx grunt dist-all           # Build all static assets (required after JS changes)
npx grunt locales            # Build locale files

# Plugin management
node bin/commands/scripts/plugin.js enable <name>
node bin/commands/scripts/plugin.js disable <name>
```

## Key Files Reference

| Purpose | Location |
|---------|----------|
| Plugin manager | `plugins/pluginManager.js` |
| Common utilities | `api/utils/common.js` |
| Authorization | `api/utils/rights.js` |
| Vue core | `frontend/express/public/javascripts/countly/vue/core.js` |
| Sample plugin | `plugins/empty/` |
| TypeScript types | `types/` |
| Coding guidelines | `CODING_GUIDELINES.md` |
