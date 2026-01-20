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


## Log Message Formatting

- **Be clear and concise:** Log messages should be easy to understand and provide enough context for debugging.
- **Use structured formatting:** Prefer format specifiers (`%s`, `%j`, `%d`, etc.) for variables and objects. Example:
  ```js
  log.d('Processing user %s with data: %j', userId, userData);
  ```
- **Include relevant identifiers:** Always log IDs, error objects, and key parameters to help trace issues.
- **Timestamp and level:** The logger automatically adds timestamps and log levels to each message.
- **Consistent style:** Use similar phrasing for similar events across modules (e.g., "Starting job", "Job completed", "Error processing job").
- **Avoid sensitive data:** Never log credentials, secrets, or personal data.
- **Multi-line logs:** For complex objects, use `%j` to pretty-print JSON. For multi-step flows, use separate log statements for each step.

---

**Consistent, structured logging is required for all new code.**
