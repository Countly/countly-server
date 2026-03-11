# AI Pull Request Review Guidelines for Countly Server

These guidelines are for AI-based review bots (e.g., GitHub Copilot) to ensure all pull requests (PRs) to Countly Server meet project standards for quality, security, and maintainability.

---

## 1. General Code Quality
- **Linting:** All code must pass ESLint and shellcheck validation. Reject PRs with lint errors.
- **Comments:** Public functions must use JSDoc. Complex logic should be commented, but avoid redundant comments.
- **Error Handling:** All errors must be handled and surfaced to the frontend or logs.

## 2. Backend (Node.js)
- **API Security:** All endpoints must use validation from `api/utils/rights.js` (e.g., `validateRead`, `validateCreate`).
- **Parameter Validation:** All input parameters must be validated and type-checked. Reject PRs with missing or unsafe validation.
- **Cross-App Security:** All write/delete operations must check `app_id` to prevent cross-app access.
- **MongoDB:** Use projections to limit returned fields. Use batchers for frequent/bulk operations. Create indexes for new collections.
- **Audit Logging:** All create/update/delete actions must dispatch `/systemlogs` events.

## 3. Frontend (Vue.js)
- **Component Naming:** Use PascalCase for JS, kebab-case for templates.
- **Props/Events:** Use props down, events up. Do not modify parent state directly.
- **Security:** Never use `v-html` with user input. Use `countlyCommon.encodeHtml()` for manual sanitization.
- **Testing:** All interactive elements must have `data-test-id` attributes for UI testing.
- **Computed Properties:** Prefer computed properties over watchers for derived state.

## 4. CSS & Styling
- **SASS:** Use SCSS syntax and `@use` for imports. Do not use `@import`.
- **BEM:** All new classes must use BEM naming with `cly-vue-` prefix.
- **Bulma:** Use Bulma classes with `bu-` prefix for layout.
- **No Deprecated Paths:** Do not add CSS to deprecated directories.

## 5. Security
- **XSS:** All API output must be escaped. Frontend must treat API data as text. Never use `v-html` with unsanitized input.
- **MongoDB Injection:** Always cast credentials to strings. Validate objects for MongoDB operators.
- **File Uploads:** Only allow whitelisted file types. Sanitize all filenames.
- **Command Line:** Use `spawn` with argument arrays, never `exec` with user input.

## 6. Testing & Documentation
- **Tests:** PRs must include tests for new features, edge cases, and cleanup. Plugins must test app lifecycle hooks.
- **Docs:** Update or add documentation for new/changed features, including JSDoc for public functions.

## 7. Plugin Development
- **Structure:** Plugins must follow the standard structure (`api/api.js`, `frontend/app.js`, etc.).
- **Lifecycle:** Plugins with collections must handle app create/delete and user data deletion events.

## 8. Pull Request Hygiene
- **No Secrets:** PRs must not include credentials, secrets, or sensitive data.
- **Changelogs:** Update `CHANGELOG.md` for user-facing changes.
- **License:** All code must comply with AGPL-3.0 and Countly's Section 7 modifications.

---

**References:**
- [CODING_GUIDELINES.md](../CODING_GUIDELINES.md)
- [SECURITY.md](../docs/SECURITY.md)
- [VUEJS_GUIDELINES.md](../docs/VUEJS_GUIDELINES.md)
- [CSS_STYLE_GUIDE.md](../docs/CSS_STYLE_GUIDE.md)
- [UI_TESTING.md](../docs/UI_TESTING.md)

---

**If a PR does not meet these requirements, request changes with specific feedback.**
