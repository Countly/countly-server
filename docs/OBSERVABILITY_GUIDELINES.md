# Countly Server Observability Guidelines

This document describes best practices for logging, debugging, and error reporting in Countly Server. All contributors must follow these guidelines to ensure robust observability and traceability.

---

## 1. Logging Library
- **Always use** `api/utils/log.js` for all logging. Do **not** use `console.log` or similar.
- The logger provides levels: `debug`, `info`, `warn`, `error`.
- Example usage:
  ```js
  const log = require('../../../api/utils/log.js')('crashes:api');
  log.d('Debug message');
  log.e('Error occurred: %j', error);
  ```

## 2. Module Naming Convention
- **Plugin files:** Use the plugin name as the logger prefix. Example: `crashes`, `push`, `views`.
- **Submodules:** Separate submodules with `:`. Example: `crashes:api`, `crashes:render`.
- **Core files:** Prefix with `core:`. Example: `core:render`, `core:auth`.
- **Job files:** Prefix with `job:`. Example: `job:crashes`, `job:push`. This allows enabling/disabling logging for all jobs at once.

## 3. Logging Practices
- **Log all errors** and error handling with `error` level (`log.e`).
- **Add debug logs** (`log.d`) at every major step of execution to trace code flow.
- Use `log.i` for important state changes, and `log.w` for warnings.
- Use the logger's `callback` and `logdb` helpers for error logging in async/database operations.
- Example:
  ```js
  log.d('Starting job execution');
  // ...
  log.e('Failed to process job: %j', err);
  ```

## 4. Enabling Logging
- **Via Dashboard:** Go to Management → Settings → Logs to configure log levels and modules.
- **Via Environment Variables:**
  - Set `DEBUG=*` to enable all debug logs.
  - Set `DEBUG=crashes:*,job:*` to enable debug logs for all crashes and job modules.
  - Example:
    ```bash
    DEBUG=core:*,crashes:api npm run start:all:dev
    ```

## 5. Log Level Configuration
- Log levels can be set in `api/config.js` under the `logging` section.
- Example:
  ```js
  logging: {
    info: ['core', 'crashes'],
    debug: ['job:*'],
    default: 'warn'
  }
  ```
- You can also set log levels at runtime:
  ```js
  require('api/utils/log.js').setLevel('job:crashes', 'debug');
  ```

## 6. Error Handling
- **Always log errors** with `log.e`.
- Use logger's `callback` and `logdb` for async/database error handling.
- Example:
  ```js
  someAsyncOperation(log.callback((result) => {
    log.d('Operation completed', result);
  }));
  ```

## 7. Debugging Flow
- Add debug logs at:
  - Function entry/exit
  - Major state changes
  - Before/after external calls (DB, API, etc.)
  - All error handling branches
- This enables tracing execution in debug mode.

## 8. References
- See `api/utils/log.js` for advanced usage (sub-loggers, logdb, callback, etc.).
- See [CODING_GUIDELINES.md](../CODING_GUIDELINES.md) for general code standards.

---

**Consistent, structured logging is required for all new code.**
