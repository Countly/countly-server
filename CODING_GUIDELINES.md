# Countly Coding Guidelines

This document provides comprehensive coding standards and best practices for developing Countly Server. All contributors should follow these guidelines to maintain code quality and consistency.

## Table of Contents
- [Code Quality](#code-quality)
- [Backend Development](#backend-development)
- [Frontend Development (Vue.js)](#frontend-development-vuejs)
- [MongoDB Best Practices](#mongodb-best-practices)
- [Security Requirements](#security-requirements)
- [Testing](#testing)
- [Plugin Development](#plugin-development)

---

## Code Quality

### ESLint

All code must pass ESLint validation. ESLint runs automatically on PRs via GitHub Actions.

```bash
# Lint a specific plugin
countly plugin lint <pluginname>
countly plugin lintfix <pluginname>

# Lint entire codebase
npx grunt eslint

# Install pre-commit hooks for automatic linting
bash bin/dev-scripts/install-pre-commit-hooks.sh
```

### Shell Script Validation

Shell scripts must be validated using shellcheck:

```bash
# Install shellcheck
scversion="stable"
wget -qO- "https://github.com/koalaman/shellcheck/releases/download/${scversion}/shellcheck-${scversion}.linux.x86_64.tar.xz" | tar -xJv
cp "shellcheck-${scversion}/shellcheck" /usr/bin/

# Validate a script
shellcheck myscript.sh

# Validate all shell scripts in Countly
countly shellcheck
```

### Code Comments

- Document all external/reusable functions for automatic documentation generation
- Use JSDoc format for function documentation
- Comment complex logic, but avoid over-commenting obvious code

---

## Backend Development

### API Endpoint Structure

Register endpoints in `plugins/<name>/api/api.js`:

```javascript
var plugins = require('../../pluginManager.js');
var common = require('../../../api/utils/common.js');
const { validateRead, validateCreate, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');
var log = require('../../../api/utils/log.js')('myplugin:api');

const FEATURE_NAME = 'myfeature';

// Read endpoint
plugins.register("/o/myfeature", function(ob) {
    var params = ob.params;
    validateRead(params, FEATURE_NAME, function() {
        // Handle read request
        common.returnOutput(params, {data: result});
    });
});

// Write endpoint
plugins.register("/i/myfeature/create", function(ob) {
    var params = ob.params;
    validateCreate(params, FEATURE_NAME, function() {
        // Handle create request
        common.returnMessage(params, 200, 'Created successfully');
    });
});
```

### Parameter Validation

Always validate input parameters:

```javascript
// Using validation helper
var argProps = {
    'name': { 'required': true, 'type': 'String' },
    'count': { 'required': false, 'type': 'Number' },
    'type': { 'required': true, 'type': 'String' }
};

var validation = common.validateArgs(params.qstring.args, argProps, true);
if (!validation.obj) {
    common.returnMessage(params, 400, 'Error: ' + validation.errors);
    return false;
}

// Manual validation with JSON parsing
if (!params.qstring.path) {
    common.returnMessage(params, 400, 'Missing parameter "path"');
    return true;
}

if (typeof params.qstring.data === "string") {
    try {
        params.qstring.data = JSON.parse(params.qstring.data);
    } catch (ex) {
        console.log("Error parsing data", ex);
        params.qstring.data = {};
    }
}
```

### Error Handling

Always handle errors and notify the frontend:

```javascript
countlyApi.mgmt.appUsers.create(params.qstring.app_id, params.qstring.data, params, function(err, res) {
    if (err) {
        common.returnMessage(params, 400, err);
    } else {
        common.returnMessage(params, 200, 'User Created');
    }
});
```

### Logging

Use the logging utility with appropriate levels:

```javascript
var log = require('../../../api/utils/log.js')('myplugin:api');

log.d('Debug message');  // Development debugging
log.i('Info message');   // Important operations
log.w('Warning message'); // Potential issues
log.e('Error message');  // Errors
```

---

## Frontend Development (Vue.js)

### Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| Component names (JS) | PascalCase | `var HomeComponent = ...` |
| Component names (templates) | kebab-case | `<cly-drawer>` |
| Variables/functions | camelCase | `myVariable`, `handleClick` |
| Vuex modules/states | camelCase | `userModule`, `isLoading` |

### Do's

```javascript
// ✅ Use PascalCase for component definitions
var MyComponent = countlyVue.views.create({
    template: countlyVue.T("/myplugin/templates/myview.html"),
    // ...
});

// ✅ Prefer computed properties over watchers
computed: {
    fullName: function() {
        return this.firstName + ' ' + this.lastName;
    }
}

// ✅ Use shorthand in templates
// @click instead of v-on:click
// :prop instead of v-bind:prop
```

```html
<!-- ✅ Use kebab-case and shorthand -->
<cly-drawer @close="handleClose" :controls="drawerControls"></cly-drawer>
```

### Don'ts

```javascript
// ❌ Don't modify parent state directly
this.$parent.someValue = 'changed'; // BAD

// ❌ Don't use deep watchers unless absolutely necessary
watch: {
    myObject: {
        deep: true, // Avoid this
        handler() {}
    }
}

// ❌ Don't register components globally unless truly global
Vue.component('my-local-component', MyComponent); // BAD for local components

// ❌ Don't use $ or _ prefixes in custom properties
data: {
    $myValue: 'bad',  // BAD
    _privateVal: 'bad' // BAD
}
```

### Security in Vue Templates

```html
<!-- ✅ Safe: Treated as text -->
<span>{{ userInput }}</span>

<!-- ⚠️ Dangerous: Only use with sanitized data -->
<span v-html="sanitizedHtml"></span>

<!-- ❌ NEVER: Raw user input -->
<span v-html="userInput"></span>
```

### Data Test IDs

Add `data-test-id` attributes for UI testing:

```html
<!-- Static test IDs -->
<button data-test-id="login-submit-button">Sign In</button>
<input data-test-id="login-username" type="text">

<!-- Dynamic test IDs -->
<el-tab-pane 
    v-for="tab in tabs" 
    :key="tab.name"
    :data-test-id="'tab-' + tab.name.toLowerCase().replace(' ', '-') + '-link'">
</el-tab-pane>
```

After adding test IDs in JavaScript files, run:
```bash
npx grunt dist-all
```

---

## MongoDB Best Practices

### Minimize Database Operations

```javascript
// ✅ Use read batcher for frequently accessed documents
common.readBatcher.getOne("events", {'_id': params.app_id}, (err, event) => {
    // Cached for subsequent requests within ~1 minute
});

// ✅ Use write batcher for multiple updates
common.writeBatcher.add("users", documentId, {'$inc': updateData});

// ✅ Use insert batcher for bulk inserts
common.insertBatcher.add("events", documentToInsert);
```

### Use Projections

Only return fields you need:

```javascript
// ✅ Good: Return only needed fields
db.collection('plugins').findOne(
    {_id: 'plugins'}, 
    {projection: {'myfield': 1, 'otherfield': 1}}
);

// ❌ Bad: Return entire document
db.collection('plugins').findOne({_id: 'plugins'});
```

### Indexing

- Create indexes for collections with >1000 documents
- Follow the [ESR rule](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-rule/) (Equality, Sort, Range)
- Use covered queries for collections >1 million documents
- Create indexes in `install.js` for existing apps
- Create indexes via `/i/apps/create` hook for new apps

```javascript
// In install.js
db.collection('app_mydata' + appId).ensureIndex(
    {"timestamp": 1, "type": 1}, 
    {background: true}
);
```

### Sharding Considerations

Ensure collections can be sharded by including appropriate shard keys in your schema design.

---

## Security Requirements

### API Endpoint Validation

**Every endpoint must be secured** with one of these methods:

| Method | Use Case |
|--------|----------|
| `validateUser` | Check user exists (no specific permission) |
| `validateRead` | Read permission on feature |
| `validateCreate` | Create permission on feature |
| `validateUpdate` | Update permission on feature |
| `validateDelete` | Delete permission on feature |
| `validateGlobalAdmin` | Global admin permission |
| `dbUserHasAccessToCollection` | Collection-level access check |

### Cross-App Security

**Always include `app_id` in database operations**:

```javascript
// ❌ INSECURE: User could delete items from other apps
db.collection("items").deleteOne({_id: params.qstring.id});

// ✅ SECURE: Verify item belongs to authorized app
db.collection("items").deleteOne({
    _id: params.qstring.id, 
    app_id: params.app_id + ""
});
```

### XSS Prevention

**Backend:**
- Use `common.returnOutput()` and `common.returnMessage()` - they auto-escape
- For custom output, escape: `"`, `&`, `'`, `<`, `>`

**Frontend:**
```javascript
// Sanitize user input
var safe = countlyCommon.encodeHtml(userInput);
```

### MongoDB Injection Prevention

```javascript
// ✅ Always cast authentication values to strings
params.username = params.username + "";
params.password = params.password + "";

db.collection("members").findOne({
    username: params.username,
    password: params.password
});
```

### File Upload Security

```javascript
// Validate file type
var type = params.files.upload.type;
if (type !== "image/png" && type !== "image/gif" && type !== "image/jpeg") {
    fs.unlink(params.files.upload.path, function() {});
    common.returnMessage(params, 400, 'Invalid file type');
    return;
}

// Sanitize filename
var safeFileName = common.sanitizeFilename(params.qstring.filename);
```

### Command Line Security

```javascript
// ❌ INSECURE: Command injection possible
exec("nodejs " + userInput);

// ✅ SECURE: Arguments are properly escaped
var cp = require('child_process');
cp.spawn("nodejs", [userInput]);
```

### CSV Injection Prevention

Use `preventCSVInjection` when exporting to CSV/Excel formats.

---

## Testing

### Running Tests

```bash
# All tests via Grunt
npm test

# Unit tests only (no Docker required)
npm run test:unit

# API tests
npm run test:api-core

# Plugin tests
npm run test:lite-plugins         # CE plugins
npm run test:enterprise-plugins   # EE plugins
npm run test:plugin -- <name>     # Single plugin
```

### Test Structure

Tests should cover:
1. Empty state verification
2. Various input scenarios
3. Error handling
4. Cleanup verification

### Cypress UI Tests

When UI tests fail in CI:
1. Check CI logs for error messages
2. Review video/screenshot artifacts in Box tool
3. Run tests locally to reproduce
4. Common issues:
   - Missing `data-test-id` attributes
   - Text content mismatches
   - Element visibility issues

---

## Plugin Development

### Required Files

```
plugins/<name>/
├── api/api.js          # Backend endpoints (required)
├── frontend/app.js     # Express middleware
├── frontend/public/
│   ├── javascripts/    # Frontend JS
│   ├── templates/      # HTML templates
│   ├── stylesheets/    # CSS
│   └── localization/   # i18n strings
├── package.json        # Dependencies & metadata
├── install.js          # Installation script
├── uninstall.js        # Cleanup script
└── tests.js            # Plugin tests
```

### App Lifecycle Handlers

```javascript
// Create indexes for new apps
plugins.register("/i/apps/create", function(ob) {
    var appId = ob.appId;
    common.db.collection('app_mydata' + appId).ensureIndex({"field": 1}, {background: true});
});

// Cleanup on app deletion
plugins.register("/i/apps/delete", function(ob) {
    common.db.collection('app_mydata' + ob.appId).drop();
});

// Clear time-based data
plugins.register("/i/apps/clear", function(ob) {
    common.db.collection('app_mydata' + ob.appId).remove({ts: {$lt: ob.moment.unix()}});
});

// Reset app (clear all + recreate)
plugins.register("/i/apps/reset", function(ob) {
    common.db.collection('app_mydata' + ob.appId).drop(function() {
        common.db.collection('app_mydata' + ob.appId).ensureIndex({"field": 1}, {background: true});
    });
});
```

### User Lifecycle Handlers

```javascript
// GDPR: Delete user data
plugins.register("/i/app_users/delete", function(ob) {
    if (ob.uids && ob.uids.length) {
        common.db.collection("app_mydata" + ob.app_id).remove({uid: {$in: ob.uids}});
    }
});

// Handle device ID merge
plugins.register("/i/device_id", function(ob) {
    if (ob.oldUser.uid !== ob.newUser.uid) {
        common.db.collection("app_mydata" + ob.app_id).updateMany(
            {uid: ob.oldUser.uid}, 
            {'$set': {uid: ob.newUser.uid}}
        );
    }
});
```

### Audit Logging

Log all user actions to System Logs:

```javascript
// Creation
plugins.dispatch("/systemlogs", {
    params: params, 
    action: "myitem_created", 
    data: newItem
});

// Update
plugins.dispatch("/systemlogs", {
    params: params, 
    action: "myitem_edited", 
    data: {before: oldItem, update: changes}
});

// Deletion
plugins.dispatch("/systemlogs", {
    params: params, 
    action: "myitem_deleted", 
    data: deletedItem
});
```

Add localization strings for your actions:
```
systemlogs.action.myitem_created = My Item Created
systemlogs.action.myitem_edited = My Item Edited
systemlogs.action.myitem_deleted = My Item Deleted
```

### Installation Script

`install.js` must be idempotent (safe to run multiple times):

```javascript
var pluginManager = require('../pluginManager.js');
var countlyDb = pluginManager.dbConnection();

countlyDb.collection('apps').find({}).toArray(function(err, apps) {
    if (!err && apps) {
        apps.forEach(function(app) {
            countlyDb.collection('app_mydata' + app._id).ensureIndex(
                {"field": 1}, 
                {background: true}
            );
        });
    }
    countlyDb.close();
});
```

---

## Additional Resources

- [API Documentation](http://countly.github.io/countly-server/)
- [Plugin Development Guide](https://support.countly.com/hc/en-us/articles/360036862392)
- [Security Guidelines](docs/SECURITY.md)
- [Testing Guide](test/README.md)
