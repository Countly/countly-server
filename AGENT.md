# AI Agent Instructions for Countly Server

This file provides guidance for AI coding agents working on the Countly Server codebase.

For comprehensive instructions, see [.github/copilot-instructions.md](.github/copilot-instructions.md).

## Quick Reference

### Tech Stack
- **Backend**: Node.js 22+, MongoDB
- **Frontend**: Vue 2, Element UI
- **Architecture**: Plugin-based (plugins extend core via event hooks)

### Key Commands

```bash
# Development
npm run start:all:dev        # Start all services
npx grunt dist-all           # Build frontend assets

# Testing
npm run test:unit            # Unit tests
npm run test:plugin -- name  # Single plugin test

# Linting
countly plugin lint <name>   # Lint plugin
countly plugin lintfix <name> # Auto-fix lint issues
```

### Critical Security Rules

1. **Always use validation** in API endpoints:
   ```javascript
   const { validateRead, validateCreate, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');
   validateRead(params, FEATURE_NAME, callback);
   ```

2. **Always include app_id** in database operations:
   ```javascript
   db.collection("items").deleteOne({_id: id, app_id: params.app_id + ""});
   ```

3. **Never use exec()** with user input:
   ```javascript
   // Use spawn instead
   require('child_process').spawn("cmd", [userArg]);
   ```

### Plugin Structure

```
plugins/<name>/
├── api/api.js          # Backend endpoints
├── frontend/app.js     # Express middleware
├── frontend/public/    # Static assets
├── install.js          # Installation
└── tests.js            # Tests
```

### Essential Files

| File | Purpose |
|------|---------|
| `api/utils/common.js` | Utility functions |
| `api/utils/rights.js` | Authorization |
| `plugins/pluginManager.js` | Plugin system |
| `plugins/empty/` | Sample plugin |

## Documentation

- [Coding Guidelines](CODING_GUIDELINES.md) - Full development standards
- [Security Guidelines](docs/SECURITY.md) - Security requirements
- [Vue.js Guidelines](docs/VUEJS_GUIDELINES.md) - Frontend patterns
- [UI Testing](docs/UI_TESTING.md) - Cypress testing guide
- [Test README](test/README.md) - Test suite documentation
