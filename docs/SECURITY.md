# Security Guidelines

This document outlines security requirements and best practices for Countly Server development. All contributors must follow these guidelines to ensure the security of the platform.

## Table of Contents
- [API Endpoint Security](#api-endpoint-security)
- [Cross-App Operation Security](#cross-app-operation-security)
- [XSS Prevention](#xss-prevention)
- [MongoDB Injection Prevention](#mongodb-injection-prevention)
- [File Upload Security](#file-upload-security)
- [Command Line Security](#command-line-security)
- [CSV Injection Prevention](#csv-injection-prevention)
- [Brute Force Prevention](#brute-force-prevention)

---

## API Endpoint Security

All API endpoints (except special cases) **must be secured** using validation methods from `api/utils/rights.js`.

### Available Validation Methods

| Method | Purpose | Required Params |
|--------|---------|-----------------|
| `validateUser` | Verify user exists | `api_key` or `auth_token` |
| `validateRead` | Check read permission on feature | `api_key`, `app_id` |
| `validateCreate` | Check create permission on feature | `api_key`, `app_id` |
| `validateUpdate` | Check update permission on feature | `api_key`, `app_id` |
| `validateDelete` | Check delete permission on feature | `api_key`, `app_id` |
| `validateGlobalAdmin` | Check global admin status | `api_key` |
| `dbUserHasAccessToCollection` | Check collection-level access | `member`, `app_id` |

### Usage Examples

```javascript
const { validateRead, validateUpdate, validateDelete, validateGlobalAdmin } = require('../../../api/utils/rights.js');

// Read permission check
plugins.register("/o/myfeature", function(ob) {
    var params = ob.params;
    validateRead(params, 'myfeature', function() {
        // User has read access to this feature for the app
        common.returnOutput(params, data);
    });
});

// Write permission check
plugins.register("/i/myfeature/update", function(ob) {
    var params = ob.params;
    validateUpdate(params, 'myfeature', function() {
        // User has update permission
        performUpdate(params);
    });
});

// Global admin check (no app context)
plugins.register("/i/admin/settings", function(ob) {
    var params = ob.params;
    validateGlobalAdmin(params, function() {
        // User is a global administrator
        updateGlobalSettings(params);
    });
});
```

### Collection-Level Access

For endpoints that expose entire collections (like data export):

```javascript
const { dbUserHasAccessToCollection } = require('../../../api/utils/rights.js');

validateRead(params, 'core', function() {
    dbUserHasAccessToCollection(params, params.qstring.collection, function(hasAccess) {
        if (hasAccess) {
            exportData(params);
        } else {
            common.returnMessage(params, 401, 'User does not have access to this collection');
        }
    });
});
```

---

## Cross-App Operation Security

**Critical**: All edit/delete operations must verify the resource belongs to the authorized app.

### ❌ Insecure Pattern

```javascript
// DANGEROUS: User can manipulate resources from other apps
validateDelete(params, 'cohorts', function() {
    db.collection("cohorts").deleteOne({_id: params.qstring.id});
});
```

An attacker could:
1. Get delete permission for App A
2. Provide a cohort ID from App B
3. Delete App B's cohort without authorization

### ✅ Secure Pattern

```javascript
// SAFE: Verify resource belongs to authorized app
validateDelete(params, 'cohorts', function() {
    db.collection("cohorts").deleteOne({
        _id: params.qstring.id, 
        app_id: params.app_id + ""  // Cast to string for consistency
    });
});
```

This applies to all operations:
- `deleteOne` / `deleteMany`
- `updateOne` / `updateMany`
- `findOneAndUpdate` / `findOneAndDelete`

---

## XSS Prevention

### Backend (API)

API responses are automatically escaped when using standard output methods:

```javascript
// ✅ Auto-escaped - safe to use
common.returnOutput(params, data);
common.returnMessage(params, 200, 'Success');
```

For custom output, manually escape these characters:
- `"` → `&quot;`
- `&` → `&amp;`
- `'` → `&#39;`
- `<` → `&lt;`
- `>` → `&gt;`

Use the built-in escape function:
```javascript
var safeString = common.escape_html(unsafeString);
```

### Frontend

**Data from API should be treated as HTML** (it's already escaped):

```html
<!-- ✅ Correct: Render escaped content as HTML -->
<p v-html="apiData.description"></p>
```

**User input that bypasses API must be escaped as text**:

```html
<!-- ✅ Safe: Vue automatically escapes in text interpolation -->
<span>{{ userInput }}</span>
```

**Never use v-html with raw user input**:

```html
<!-- ❌ DANGEROUS: XSS vulnerability -->
<div v-html="userProvidedContent"></div>
```

### Manual Sanitization

```javascript
// Frontend sanitization
var sanitized = countlyCommon.encodeHtml(userInput);

// Test inputs to verify XSS protection
var testString = "<script>'&&&'</script>";
// Should display exactly as: <script>'&&&'</script>
```

---

## MongoDB Injection Prevention

MongoDB operations using the official driver are generally safe from code injection. However, data manipulation attacks are still possible.

### The Vulnerability

```javascript
// User submits: {"username": "admin", "password": {"$ne": 1}}
var params = {
    username: "admin",
    password: {"$ne": 1}  // Matches any password not equal to 1
};

db.collection("members").findOne(params, function(err, user) {
    if (!err && user) {
        // ATTACKER AUTHENTICATED without knowing password!
    }
});
```

### Prevention

**Always cast authentication credentials to strings**:

```javascript
// ✅ Safe: Force string type
params.username = params.username + "";
params.password = params.password + "";

db.collection("members").findOne({
    username: params.username,
    password: params.password
}, function(err, user) {
    // Now safe from object injection
});
```

**For objects, validate no MongoDB operators are present**:

```javascript
function isSafeQuery(obj) {
    for (var key in obj) {
        if (key.startsWith('$')) {
            return false;  // MongoDB operator detected
        }
        if (typeof obj[key] === 'object' && !isSafeQuery(obj[key])) {
            return false;
        }
    }
    return true;
}
```

---

## File Upload Security

### Validate File Types

```javascript
var tmp_path = params.files.upload.path;
var type = params.files.upload.type;

// Whitelist allowed types
var allowedTypes = ["image/png", "image/gif", "image/jpeg"];

if (!allowedTypes.includes(type)) {
    // Delete the uploaded file
    fs.unlink(tmp_path, function() {});
    common.returnMessage(params, 400, 'Invalid file type');
    return;
}

// Additional: Verify file magic bytes match claimed type
// (type header can be spoofed)
```

### Sanitize Filenames

**Never use user-provided filenames directly**:

```javascript
// ❌ Dangerous: Path traversal possible
// User provides: "../../../etc/passwd"
var filename = params.qstring.filename;
fs.writeFile('/uploads/' + filename, data);

// ✅ Safe: Sanitize filename
var safeFileName = common.sanitizeFilename(params.qstring.filename);
fs.writeFile('/uploads/' + safeFileName, data);
```

The `sanitizeFilename` function:
- Removes path separators (`/`, `\`)
- Removes null bytes
- Limits length
- Removes dangerous characters

---

## Command Line Security

### The Vulnerability

```javascript
var exec = require('child_process').exec;

// ❌ DANGEROUS: Command injection
var scriptPath = userInput;  // User provides: "myscript.js; rm -rf /"
exec("nodejs " + scriptPath, callback);
// Executes: nodejs myscript.js; rm -rf /
```

### Prevention

**Use `spawn` with argument arrays**:

```javascript
var cp = require('child_process');

// ✅ Safe: Arguments are properly escaped
var scriptPath = userInput;  // Even if: "myscript.js; rm -rf /"
var process = cp.spawn("nodejs", [scriptPath]);

process.on('close', function(code) {
    console.log('Exited with code:', code);
});

// The malicious input is treated as a literal filename
// nodejs will fail to find file named "myscript.js; rm -rf /"
```

**If you must use exec**, sanitize rigorously:

```javascript
var shellEscape = require('shell-escape');
var safeArgs = shellEscape([userInput]);
exec("nodejs " + safeArgs, callback);
```

---

## CSV Injection Prevention

When exporting data to CSV or Excel, cell values starting with special characters can be interpreted as formulas.

### The Attack

A malicious user stores data like:
```
=cmd|' /C calc'!A0
```

When exported to CSV and opened in Excel, this launches the calculator (or worse).

### Prevention

```javascript
var exports = require('../../../api/parts/data/exports.js');

// Use the built-in function
var safeValue = exports.preventCSVInjection(cellValue);

// Or manually prefix dangerous characters
function preventCSVInjection(value) {
    if (typeof value === 'string') {
        var dangerous = ['=', '+', '-', '@', '\t', '\r'];
        if (dangerous.includes(value.charAt(0))) {
            return "'" + value;  // Prefix with single quote
        }
    }
    return value;
}
```

---

## Brute Force Prevention

Protect authentication endpoints from brute force attacks.

```javascript
var preventBruteforce = require('../../../frontend/express/libs/preventBruteforce.js');

function login(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    
    preventBruteforce.isBlocked("login", username, function(isBlocked, fails, err) {
        if (isBlocked) {
            res.status(429).json({error: "Too many failed attempts. Please try again later."});
            return;
        }
        
        authenticateUser(username, password, function(success) {
            if (success) {
                // Reset fail counter on successful login
                preventBruteforce.reset("login", username);
                // ... complete login
            } else {
                // Increment fail counter
                preventBruteforce.fail("login", username);
                res.status(401).json({error: "Invalid credentials"});
            }
        });
    });
}
```

### Rate Limiting

API endpoints can use rate limiting:

```javascript
const { RateLimiterMemory } = require("rate-limiter-flexible");

const rateLimiter = new RateLimiterMemory({
    points: 10,     // 10 requests
    duration: 1,    // per 1 second
});

async function handleRequest(params) {
    try {
        await rateLimiter.consume(params.ip_address);
        // Process request
    } catch (rejRes) {
        common.returnMessage(params, 429, "Too Many Requests");
    }
}
```

---

## Security Checklist

Before submitting code, verify:

- [ ] All API endpoints use appropriate validation methods
- [ ] All database operations include `app_id` where applicable
- [ ] User credentials are cast to strings
- [ ] File uploads validate type and sanitize filename
- [ ] Command line arguments use `spawn` with arrays
- [ ] CSV exports use injection prevention
- [ ] Authentication endpoints have brute force protection
- [ ] No `v-html` with unsanitized user input
- [ ] Sensitive data is not logged

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email security@count.ly with details
3. Include steps to reproduce
4. Allow time for a fix before disclosure

See [SECURITY.md](../SECURITY.md) in the repository root for more information.
