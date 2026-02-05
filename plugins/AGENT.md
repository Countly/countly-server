# Plugins Agent Guide

This guide is for AI agents and developers working in the `plugins/` folder of Countly Server.

## Plugin Structure
```
plugins/<name>/
├── api/api.js          # Backend API endpoints (required)
├── frontend/app.js     # Express middleware/routes
├── frontend/public/    # Static assets (JS, CSS, templates)
├── package.json        # Plugin metadata
├── install.js          # Installation hook
└── tests.js            # Plugin tests
```

## Testing
- **Single plugin:** `npm run test:plugin -- <name>`
- **Lint plugin:** `countly plugin lint <name>`
- **Auto-fix lint:** `countly plugin lintfix <name>`

## More
- [Plugin lifecycle & events](../.github/copilot-instructions.md)
- [Sample plugin](empty/)
