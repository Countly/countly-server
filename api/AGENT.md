# API Agent Guide

This guide is for AI agents and developers working in the `api/` backend of Countly Server.

## Essentials
- **Tech:** Node.js 22+, MongoDB
- **Start all services:** `npm run start:all:dev`
- **Unit tests:** `npm run test:unit`
- **Build frontend assets:** `npx grunt dist-all`

## Security
- Always use validation in API endpoints:
  ```js
  const { validateRead, validateCreate, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');
  validateRead(params, FEATURE_NAME, callback);
  ```
- Always include `app_id` in DB operations:
  ```js
  db.collection("items").deleteOne({_id: id, app_id: params.app_id + ""});
  ```
- Never use `exec()` with user input:
  ```js
  require('child_process').spawn("cmd", [userArg]);
  ```

## More
- [Full backend checklist](../.github/copilot-instructions.md)
- [Security Guidelines](../docs/SECURITY.md)
