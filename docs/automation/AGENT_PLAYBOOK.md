# Agent Playbook — Countly Multi-Agent Development System

This file configures a multi-agent system for the Countly analytics platform. Seven specialized agents collaborate through a full software development lifecycle — from specification to deployment — orchestrated by a **Lead Agent**.

**Agent Team:**

| Agent | Role | Primary Output |
|-------|------|----------------|
| **Lead** | Orchestrates the SDLC, delegates tasks, reviews quality | Task plans, reviews, release decisions |
| **Technical Specification** | Translates functional requirements into detailed technical specs | API contracts, data models, flow diagrams, test cases |
| **UI/UX Design** | Produces component layouts, interaction flows, design tokens | Template structures, component hierarchy, UX flows |
| **Backend Development** | Implements server-side logic, APIs, database operations | `api/api.js`, `install.js`, hooks, migrations |
| **Frontend Development** | Implements Vue components, Vuex stores, templates, styles | `countly.views.js`, `countly.models.js`, templates, SASS |
| **QA/Test** | Writes and runs automated tests, validates quality | `tests.js`, Cypress specs, lint reports, coverage |
| **Documentation** | Maintains inline docs, changelogs, localization, API docs | JSDoc, `.properties` files, CHANGELOG entries |
| **Code Review** | Reviews branch diff for security, correctness, spec drift before PR | Review verdict with findings |
| **Release Manager** | Branches, commits, PRs, CI monitoring, Jira sync, deploy preparation | Pushed branches, PRs, release packages |

**Runnable implementation:** the agents exist as Claude Code subagents in
`.claude/agents/`. The Lead role is performed by the main session via the
`/sdlc` command (`.claude/commands/sdlc.md`); deployment is the separate,
human-approved `/deploy` command. See `docs/automation/README.md`.
This playbook is the role/checklist reference the subagents follow; the
repository's `CLAUDE.md` and `CODING_GUIDELINES.md` still apply in full.

---

## Project Overview

Countly is a plugin-based product analytics platform.

| Layer | Stack |
|-------|-------|
| Backend | Node.js 22+, MongoDB, Express |
| Frontend | Vue 2, Element UI, Backbone router (legacy) |
| Tests | Mocha, supertest, should.js, Cypress (UI) |
| Build | Grunt (assets, SASS, locales) |
| Lint | ESLint (`.eslintrc.json` at root) |

### Multi-Process Architecture

Countly runs as multiple services (start via `npm run start:all:dev`):

| Service | Entry Point | Port |
|---------|-------------|------|
| API Server | `api/api.js` | 3001 |
| Frontend/Dashboard | `frontend/express/app.js` | 6001 |
| Job Server | `jobServer/index.js` | — |
| Aggregator | `api/aggregator.js` | — |
| Ingestor | `api/ingestor.js` | — |

### Repository Layout

```
countly/
├── api/                          # Backend API server
│   ├── parts/                    # Request handling, data ingestion
│   └── utils/                    # common.js, rights.js, log.js
├── frontend/express/             # Dashboard Express app + static assets
│   └── public/javascripts/countly/vue/  # Vue framework core
├── plugins/                      # Plugins (the working directory)
│   ├── empty/                    # Plugin template — reference this
│   └── <name>/                  # Each plugin
├── docs/                         # VUEJS_GUIDELINES.md, CSS_STYLE_GUIDE.md, UI_TESTING.md
└── test/                         # Test suite
```

### Plugin Structure (every plugin follows this)

```
plugins/<name>/
├── api/api.js                    # Backend endpoints (required)
├── frontend/
│   ├── app.js                    # Express middleware/routes
│   └── public/
│       ├── javascripts/
│       │   ├── countly.models.js # Vuex store / data models
│       │   └── countly.views.js  # Vue components + routes
│       ├── templates/            # HTML templates (.html)
│       ├── stylesheets/          # SASS → CSS
│       └── localization/         # .properties i18n files
├── install.js                    # DB setup (idempotent)
├── tests.js                      # Mocha test suite
└── package.json                  # Plugin metadata
```

---

## Shared Rules (ALL agents MUST follow)

### Security — Non-Negotiable

1. **Every API endpoint must use authorization**:
   ```js
   const { validateRead, validateCreate, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');
   validateRead(params, FEATURE_NAME, function() { /* handler */ });
   ```

2. **Always include `app_id` in database queries** (prevents cross-app data access):
   ```js
   db.collection("items").findOne({_id: id, app_id: params.app_id + ""}, callback);
   ```

3. **Cast user input to strings** for auth fields:
   ```js
   params.username = params.username + "";
   ```

4. **Use `spawn`, never `exec`** for shell commands:
   ```js
   require('child_process').spawn("cmd", [userArg]);  // SAFE
   // exec("cmd " + userArg);                         // VULNERABLE
   ```

5. **Never use `v-html` with unsanitized user data** in Vue templates.

6. **Sanitize filenames**: `common.sanitizeFilename(name)` for file uploads.

7. **Prevent CSV injection**: Use `preventCSVInjection` when exporting to CSV/Excel.

8. **Validate user-supplied Mongo queries — reject, never strip**. Any query/filter from a request that reaches `find`/`aggregate`/`update`/`delete` must be checked with the `common` helpers at the endpoint where it is first parsed (NOT inside deep helpers or the `/drill/preprocess_query` hook). The query runs exactly as submitted or the request is rejected with `400` — never modified.
   ```js
   // raw query STRING from a request param → parse + validate in one step
   var parsed = common.parseUserQuery(params.qstring.query); // accepts string OR object
   if (parsed.error) {
       log.d("Rejected user query" + common.reqInfo(params) + ": " + parsed.error);
       return common.returnMessage(params, 400, parsed.error);
   }
   var query = parsed.query; // safe to run as-is

   // ALREADY-parsed object — e.g. a query nested in a saved cohort/funnel/journey
   // payload, already JSON-parsed upstream. Validate that parsed object directly:
   var parsedQuery = newAtt.user_segmentation.query; // example: already-parsed query from a saved payload
   var badOp = common.findUnsafeMongoOperator(parsedQuery);
   if (badOp) {
       log.d("Rejected user query" + common.reqInfo(params) + ": Query contains disallowed operator: " + badOp);
       return common.returnMessage(params, 400, "Query contains disallowed operator: " + badOp);
   }
   ```
   `$expr` is allowed; `$where`/`$function`/`$accumulator` are rejected at any depth (including nested inside `$expr`). Validate at SAVE endpoints too (cohorts/funnels/ab-testing/journey/block store queries that run later). Log the rejection at the call site using the file's `log` and `common.reqInfo(params)` (adds endpoint path/method, no api_key). Do NOT pass `params` into `parseUserQuery` and do NOT log inside it.

### Code Style

- **Indent**: 4 spaces
- **Semicolons**: always
- **Brace style**: Stroustrup (`}\nelse {`)
- **No trailing spaces**, no multi-spaces
- **`var`** for function-scoped declarations (legacy codebase convention)
- **Native Promises/async-await** over Bluebird
- **ESLint must pass** before committing — run `countly plugin lint <name>`

### Common Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|------------|
| `this.$parent.value = x` | `this.$emit('update', x)` |
| Deep watchers on objects | Watch specific properties |
| `v-html` with user data | `{{ }}` text interpolation |
| Query without `app_id` | Always include `app_id` |
| `exec(cmd + userInput)` | `spawn(cmd, [userInput])` |
| `replace(' ', '-')` | `replace(/ /g, '-')` for all occurrences |
| Global Vue.component for local use | Local component registration |
| `$` or `_` prefixed data props | Plain camelCase names |
| Bluebird `.then()` chains | `async/await` |

---

## Agent: Lead (Orchestrator)

**Role**: Orchestrates the full software development lifecycle. Delegates work to specialized agents, reviews outputs, manages iterations, and makes release decisions.

### Responsibilities

1. **Intake & Analysis** — Receive feature requests or bug reports, clarify scope, identify affected plugins
2. **Planning** — Break work into tasks, assign to agents, define execution order and dependencies
3. **Delegation** — Provide each agent with precise context: which plugin, which files, what the expected outcome is
4. **Review & Iteration** — Review each agent's output against checklists, request revisions if needed
5. **Integration** — Ensure all agent outputs are compatible (backend ↔ frontend contracts, tests match implementation)
6. **Quality Gate** — Verify ESLint passes, tests pass, build succeeds before marking complete

### Workflow Phases

```
Phase 1: SPECIFICATION
  Lead receives requirement → delegates to Technical Specification Agent
  ↓
Phase 2: DESIGN
  Tech spec approved → delegates to UI/UX Design Agent (if UI work needed)
  ↓
Phase 3: IMPLEMENTATION (parallel when independent)
  Design + spec approved → delegates to Backend + Frontend Agents
  ↓
Phase 4: TESTING
  Implementation complete → delegates to QA/Test Agent
  ↓
Phase 5: DOCUMENTATION
  Tests pass → delegates to Documentation Agent (or integrated into other agents)
  ↓
Phase 6: REVIEW & INTEGRATION
  Lead reviews all outputs, runs final checks, approves or iterates
```

### Decision Framework

| Situation | Action |
|-----------|--------|
| New feature (full-stack) | Spec → Design → Backend + Frontend (parallel) → QA → Docs |
| Bug fix (backend only) | Spec (light) → Backend → QA |
| Bug fix (frontend only) | Spec (light) → Frontend → QA |
| UI-only change | Design → Frontend → QA |
| API-only change | Spec → Backend → QA |
| Refactor / tech debt | Spec → affected agents → QA |

### Handoff Protocol

When delegating to any agent, the Lead MUST provide:

1. **Task type** — feature, bugfix, refactor, or investigation
2. **Plugin name** — which plugin(s) are affected
3. **Scope** — exactly which files or areas to touch
4. **Context** — relevant background, related tickets, prior decisions
5. **Acceptance criteria** — what "done" looks like
6. **Dependencies** — outputs from other agents this task depends on

When receiving output from any agent, the Lead MUST verify:

1. **Files modified** — list every file touched
2. **What changed** — one sentence per change
3. **Risks flagged** — side effects, related plugins, edge cases
4. **Checklist confirmed** — agent-specific checklist completed
5. **Build verified** — `npx grunt dist-all` succeeds (after frontend changes)
6. **Lint verified** — `countly plugin lint <name>` passes

### Integration Checks

Before declaring work complete, the Lead runs:

```bash
# Lint the plugin
countly plugin lint <pluginname>

# Build all assets
npx grunt dist-all

# Run plugin tests
npm run test:plugin -- <pluginname>

```

---

## Agent: Technical Specification

**Role**: Translates functional requirements (user stories, bug reports, feature requests) into detailed, implementable technical specifications that other agents consume.

### Scope

This agent does NOT write code. It produces specification documents that Backend, Frontend, and QA agents use as their blueprint.

### Responsibilities

1. **Analyze requirements** — Parse functional specs, identify ambiguities, ask clarifying questions
2. **Design API contracts** — Define endpoints, HTTP methods, request/response schemas, error codes
3. **Design data models** — Define MongoDB collections, document schemas, indexes, relationships
4. **Define system flows** — Request lifecycle, data flow, plugin hook interactions, edge cases
5. **Define test cases** — Acceptance criteria, test scenarios, edge cases for QA agent
6. **Identify risks** — Security concerns, performance implications, cross-plugin impacts

### Output Format: Technical Specification Document

For every feature or significant bugfix, produce a spec with these sections:

#### 1. Overview
```
Feature: <name>
Plugin: <plugin_name>
Type: feature | bugfix | refactor
Affected Files:
  - plugins/<name>/api/api.js (backend)
  - plugins/<name>/frontend/public/javascripts/countly.views.js (frontend)
  - plugins/<name>/frontend/public/templates/<template>.html (template)
  - plugins/<name>/tests.js (tests)
```

#### 2. API Endpoints

```
Endpoint: GET /o/myfeature
Auth: validateRead(params, "myfeature")
Parameters:
  - app_id (required, String) — Target application
  - id (optional, String) — Specific item ID
  - page (optional, Number, default: 1) — Pagination
  - limit (optional, Number, default: 20, max: 100) — Page size
Response 200:
  {
    "items": [{ "_id": "...", "name": "...", "created_at": 1234567890 }],
    "total": 42
  }
Response 400: { "result": "Error: Missing required parameter 'app_id'" }
Response 401: (unauthorized — missing or invalid api_key)

---

Endpoint: POST /i/myfeature/create
Auth: validateCreate(params, "myfeature")
Parameters:
  - app_id (required, String)
  - args (required, JSON String):
    - name (required, String, max: 128)
    - description (optional, String, max: 1024)
Response 200: { "result": { "_id": "...", "name": "..." } }
Response 400: { "result": "Error: ..." }
Audit Log: action="myfeature_created", data=<created item>
```

#### 3. Data Model

```
Collection: myfeature_data
Scoping: Per-app (shared collection with app_id field)
  OR: Per-app collection (myfeature<app_id>)

Document Schema:
{
  _id: ObjectId,
  app_id: String (required, indexed),
  name: String (required, max 128),
  description: String (optional, max 1024),
  status: String (enum: "active" | "paused" | "archived"),
  created_by: String (member._id),
  created_at: Number (timestamp ms),
  updated_at: Number (timestamp ms)
}

Indexes:
  - { app_id: 1 } — required for all queries
  - { app_id: 1, status: 1 } — for filtered listings
  - { app_id: 1, created_at: -1 } — for sorted listings
```

#### 4. System Flow

```
1. User clicks "Create" button in dashboard
2. Frontend validates form (via validation-observer)
3. Frontend calls POST /i/myfeature/create with args JSON
4. Backend: validateCreate() checks permissions
5. Backend: common.validateArgs() validates input
6. Backend: Insert document into MongoDB
7. Backend: Dispatch /systemlogs for audit
8. Backend: Return created item
9. Frontend: Update Vuex store, close drawer, show success toast
```

#### 5. Plugin Hooks Required

```
/i/apps/create → Create indexes for new app
/i/apps/delete → Drop app data
/i/app_users/delete → Remove user-specific data (GDPR)
/i/device_id → Merge user data on device ID change
```

#### 6. Test Cases

```
Validation Tests:
  - Missing api_key → 401
  - Missing app_id → 400
  - Missing required param 'name' → 400
  - Name exceeds 128 chars → 400
  - Invalid JSON in args → 400

Permission Tests:
  - Read-only user cannot create → 401
  - User cannot access other app's data → empty result
  - Admin can CRUD → 200

CRUD Tests:
  - Create item → verify response has _id
  - Read item by id → verify all fields
  - Update item → verify changes persisted
  - Delete item → verify 404 on re-read
  - List items with pagination → verify count and paging

Edge Cases:
  - Duplicate name handling (if applicable)
  - Empty state (no items) → valid empty response
  - Max items limit (if applicable)
  - Concurrent modifications
```

### Specification Checklist

- [ ] All endpoints documented with auth, params, responses, error codes
- [ ] Data model includes schema, indexes, and scoping strategy
- [ ] System flow covers happy path and error paths
- [ ] Plugin lifecycle hooks identified (create, delete, GDPR, device merge)
- [ ] Test cases cover validation, permissions, CRUD, and edge cases
- [ ] Security concerns addressed (app_id scoping, input validation, XSS)
- [ ] Cross-plugin impacts identified
- [ ] Localization keys listed for new user-facing strings
- [ ] Audit log actions defined for all write operations

---

## Agent: UI/UX Design

**Role**: Produces component layouts, interaction flows, and design specifications that the Frontend agent implements. Works within the constraints of the existing Countly design system (Vue 2, Element UI, Bulma grid, `cly-*` components).

### Scope

This agent designs within the existing Countly component library. It does NOT create new design systems — it composes existing `cly-*` and `el-*` components into coherent page layouts and interaction flows.

### Responsibilities

1. **Page layout** — Define component hierarchy, sections, and content flow
2. **Component selection** — Choose appropriate `cly-*` and `el-*` components for each UI element
3. **Interaction design** — Define user flows, state transitions, empty states, loading states, error states
4. **Responsive behavior** — Use Bulma grid (`bu-columns`, `bu-is-flex`) for layout
5. **Accessibility** — Ensure interactive elements have `data-test-id` attributes
6. **Design token usage** — Reference existing color variables, spacing, typography

### Design System Reference

#### Available Page Components

| Component | Usage | Slot(s) |
|-----------|-------|---------|
| `cly-header` | Page title bar | `header-right` (action buttons) |
| `cly-main` | Main content wrapper | default |
| `cly-section` | Content section with optional title | default |
| `cly-sub-section` | Nested content section | default |
| `cly-guide` | Onboarding/help guide | default |

#### Available Data Components

| Component | Usage | Key Props |
|-----------|-------|-----------|
| `cly-datatable-n` | Data tables with pagination, search, export | `:rows`, `:force-loading`, `:available-dynamic-cols` |
| `cly-select-x` | Single-select dropdown | `:options`, `v-model` |
| `cly-multi-select` | Multi-select dropdown | `:options`, `v-model` |
| `cly-date-picker` | Date range picker | `v-model` |
| `cly-empty-view` | Empty state placeholder | `:title`, `:description`, `:icon` |
| `cly-more-options` | Action dropdown menu | default (list items) |

#### Available Form Components

| Component | Usage |
|-----------|-------|
| `cly-drawer` | Slide-in create/edit panel |
| `validation-observer` | Form validation wrapper |
| `el-input` | Text input |
| `el-button` | Buttons (types: `success`, `warning`, `danger`, `primary`, `info`) |
| `el-dialog` | Modal dialogs |
| `el-checkbox` / `el-radio` | Selection inputs |
| `el-switch` | Toggle switch |

#### Grid System (Bulma)

```html
<div class="bu-columns">
    <div class="bu-column bu-is-8">Main content (8/12)</div>
    <div class="bu-column bu-is-4">Sidebar (4/12)</div>
</div>
```

#### Color Tokens

Colors imported via: `@use "../../../../../../frontend/express/public/stylesheets/styles/base/colors" as c;`

Key variables: `c.$color-primary`, `c.$color-success`, `c.$color-warning`, `c.$color-danger`, `c.$color-gray-*`

### Output Format: Design Specification

#### 1. Page Structure

```
Page: MyFeature List
Route: /dashboard#/myfeature

┌─────────────────────────────────────────────────┐
│ cly-header                                       │
│   title: i18n("myfeature.title")                │
│   header-right: [+ Create] button (success)      │
│                  v-if="canUserCreate"             │
├─────────────────────────────────────────────────┤
│ cly-main                                         │
│  ┌─────────────────────────────────────────────┐│
│  │ cly-section                                  ││
│  │                                              ││
│  │  (if items.length === 0)                     ││
│  │  cly-empty-view                              ││
│  │    icon: "cly-icon-myfeature"                ││
│  │    title: i18n("myfeature.empty-title")      ││
│  │    description: i18n("myfeature.empty-desc") ││
│  │                                              ││
│  │  (else)                                      ││
│  │  cly-datatable-n                             ││
│  │    columns: Name | Status | Created | Actions││
│  │    row-actions: Edit, Delete (via cly-more)  ││
│  │    searchable: true                          ││
│  │    exportable: true                          ││
│  │                                              ││
│  └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ cly-drawer (create/edit)                         │
│   Form: name, description, status               │
│   Actions: Save (primary), Cancel               │
└─────────────────────────────────────────────────┘
```

#### 2. Interaction Flow

```
List View:
  → Loading: cly-datatable-n with :force-loading="true"
  → Empty: cly-empty-view with create CTA
  → Data: Table with search, pagination, export

Create Flow:
  → Click "+ Create" → Open cly-drawer
  → Fill form (validated via validation-observer)
  → Click "Save" → API call → Close drawer → Refresh table → Success toast

Edit Flow:
  → Click row action "Edit" → Open cly-drawer with pre-filled data
  → Modify fields → Save → Refresh → Success toast

Delete Flow:
  → Click row action "Delete" → Confirmation dialog (el-dialog)
  → Confirm → API call → Refresh table → Success toast
```

#### 3. State Matrix

| State | Component | Behavior |
|-------|-----------|----------|
| Loading | `cly-datatable-n` | `:force-loading="true"`, skeleton rows |
| Empty | `cly-empty-view` | Icon + title + description + optional CTA |
| Data | `cly-datatable-n` | Rows with actions |
| Error | Toast notification | `CountlyHelpers.notify({ type: "error" })` |
| Success | Toast notification | `CountlyHelpers.notify({ type: "success" })` |

#### 4. Data Test IDs

```
data-test-id="myfeature-create-button"       — Create button in header
data-test-id="myfeature-table"               — Main data table
data-test-id="myfeature-search-input"        — Table search
data-test-id="myfeature-edit-button"         — Row edit action
data-test-id="myfeature-delete-button"       — Row delete action
data-test-id="myfeature-drawer"              — Create/edit drawer
data-test-id="myfeature-name-input"          — Name field in form
data-test-id="myfeature-save-button"         — Save button in drawer
data-test-id="myfeature-delete-confirm-btn"  — Delete confirmation
```

#### 5. Localization Keys Required

```
myfeature.title = My Feature
myfeature.create = Create New
myfeature.empty-title = No Items Yet
myfeature.empty-desc = Create your first item to get started
myfeature.name = Name
myfeature.description = Description
myfeature.status = Status
myfeature.created = Created
myfeature.actions = Actions
myfeature.edit = Edit
myfeature.delete = Delete
myfeature.delete-confirm = Are you sure you want to delete this item?
myfeature.save = Save
myfeature.cancel = Cancel
myfeature.created-success = Item created successfully
myfeature.updated-success = Item updated successfully
myfeature.deleted-success = Item deleted successfully
```

### Figma MCP Integration (Optional)

When a Figma design exists, use the Figma MCP tools to extract design context:

1. `mcp_figma_get_design_context` — Pull component structure and layout from Figma
2. `mcp_figma_get_screenshot` — Get visual reference for the design
3. `mcp_figma_get_variable_defs` — Extract design tokens and variables
4. `mcp_figma_get_metadata` — Get component metadata

Map Figma components to Countly equivalents:

| Figma Pattern | Countly Component |
|---------------|-------------------|
| Page header with actions | `cly-header` + `v-slot:header-right` |
| Data table | `cly-datatable-n` |
| Slide panel / form | `cly-drawer` |
| Dropdown select | `cly-select-x` |
| Modal dialog | `el-dialog` |
| Form inputs | `el-input`, `el-checkbox`, etc. |
| Empty state | `cly-empty-view` |

### Design Checklist

- [ ] Page structure uses `cly-header` → `cly-main` → `cly-section` hierarchy
- [ ] All interactive elements have `data-test-id` attributes defined
- [ ] Empty, loading, error, and success states defined
- [ ] Permission-gated elements identified (`v-if="canUserCreate"` etc.)
- [ ] All user-facing strings listed as localization keys
- [ ] Drawer used for create/edit forms (not inline editing)
- [ ] Confirmation dialog defined for destructive actions
- [ ] Grid layout uses `bu-columns` / `bu-column` for responsive
- [ ] Component selection limited to existing `cly-*` and `el-*` library
- [ ] Color usage references design tokens, not hardcoded values

---

## Agent: Backend Development

**Scope**: Files in `plugins/<name>/api/`, `install.js`, `uninstall.js`, backend utilities.

### Key Utilities

| Module | Import | Purpose |
|--------|--------|---------|
| `common` | `require('../../../api/utils/common.js')` | DB access, validation, response helpers |
| `plugins` | `require('../../pluginManager.js')` | Hook registration, plugin dispatch |
| `rights` | `require('../../../api/utils/rights.js')` | Auth: `validateRead/Create/Update/Delete` |
| `log` | `require('../../../api/utils/log.js')('name:sub')` | Logging: `.d()` `.i()` `.w()` `.e()` |

### common.js Key Methods

| Method | Purpose |
|--------|---------|
| `common.validateArgs(args, argProps, returnErrors)` | Validate and type-check parameters |
| `common.returnOutput(params, output, noescape)` | Return JSON success response (auto-escapes) |
| `common.returnMessage(params, statusCode, message)` | Return JSON error/status response |
| `common.returnRaw(params, statusCode, body)` | Return raw response body |
| `common.db` | MongoDB database connection |
| `common.readBatcher.getOne(collection, query, callback)` | Cached single-document reads |
| `common.writeBatcher.add(collection, id, update)` | Batched write operations |
| `common.sanitizeFilename(filename)` | Sanitize user-provided filenames |
| `common.escape_html(string)` | HTML entity escaping |
| `common.getJSON(val)` | Parse and validate JSON safely |

### rights.js Permission Model

```js
// Feature-based permissions
member.permission = {
    "_": {
        "u": ["app1", "app2"],    // user-level access
        "a": ["app1"]             // admin-level access
    },
    "r": {                         // read permissions per app
        "app1": { "all": true, "allowed": { "feature1": true } }
    },
    "w": {                         // write permissions per app
        "app1": { "all": false, "allowed": { "feature1": true } }
    }
};
```

| Function | Auth Level |
|----------|------------|
| `validateRead(params, feature, callback)` | Read access for feature in app |
| `validateCreate(params, feature, callback)` | Write access — create |
| `validateUpdate(params, feature, callback)` | Write access — update |
| `validateDelete(params, feature, callback)` | Write access — delete |
| `validateUserForRead(params, callback)` | App-level read (no feature) |
| `validateUserForWrite(params, callback)` | App-level admin |
| `validateGlobalAdmin(params, callback)` | Global admin only |

### API Endpoint Pattern

```js
var plugins = require('../../pluginManager.js');
var common = require('../../../api/utils/common.js');
const { validateRead, validateCreate } = require('../../../api/utils/rights.js');
var log = require('../../../api/utils/log.js')('myplugin:api');

const FEATURE_NAME = 'myfeature';

// Read endpoint
plugins.register("/o/myfeature", function(ob) {
    var params = ob.params;
    validateRead(params, FEATURE_NAME, function() {
        var argProps = {
            'id': { 'required': true, 'type': 'String' }
        };
        var validation = common.validateArgs(params.qstring, argProps, true);
        if (!validation.obj) {
            common.returnMessage(params, 400, 'Error: ' + validation.errors);
            return;
        }
        common.db.collection('mydata').findOne(
            {_id: validation.obj.id, app_id: params.app_id + ""},
            {projection: {field1: 1, field2: 1}},
            function(err, result) {
                if (err) {
                    log.e('Failed to fetch: %j', err);
                    common.returnMessage(params, 500, 'Internal error');
                    return;
                }
                common.returnOutput(params, result || {});
            }
        );
    });
});

// Write endpoint
plugins.register("/i/myfeature/create", function(ob) {
    var params = ob.params;
    validateCreate(params, FEATURE_NAME, function() {
        // validate, insert, then:
        plugins.dispatch("/systemlogs", {
            params: params,
            action: "myfeature_created",
            data: newItem
        });
        common.returnMessage(params, 200, 'Created successfully');
    });
});
```

### MongoDB Patterns

```js
// Read batcher — cached reads for hot documents
common.readBatcher.getOne("collection", {_id: id}, callback);

// Write batcher — batched updates
common.writeBatcher.add("collection", id, {$inc: {count: 1}});

// Always use projection
db.collection('x').findOne({_id: id}, {projection: {needed: 1}});
```

### Plugin Lifecycle Hooks

```js
// New app → create indexes
plugins.register("/i/apps/create", function(ob) {
    common.db.collection('mydata' + ob.appId).createIndex({"field": 1});
});

// App deleted → drop collection
plugins.register("/i/apps/delete", function(ob) {
    common.db.collection('mydata' + ob.appId).drop();
});

// GDPR user deletion
plugins.register("/i/app_users/delete", function(ob) {
    common.db.collection("mydata" + ob.app_id).deleteMany({uid: {$in: ob.uids}});
});

// Device ID merge
plugins.register("/i/device_id", function(ob) {
    if (ob.oldUser.uid !== ob.newUser.uid) {
        common.db.collection("mydata" + ob.app_id).updateMany(
            {uid: ob.oldUser.uid},
            {'$set': {uid: ob.newUser.uid}}
        );
    }
});
```

### Audit Logging

Log all user-facing write operations to System Logs:

```js
plugins.dispatch("/systemlogs", {
    params: params,
    action: "myitem_created",  // or _edited, _deleted
    data: itemData             // for edits: {before: old, update: changes}
});
```

Add localization keys: `systemlogs.action.myitem_created = My Item Created`

### Backend Development Checklist

- [ ] Every endpoint uses `validateRead/Create/Update/Delete`
- [ ] All DB queries include `app_id`
- [ ] Input validated with `common.validateArgs()`
- [ ] Errors handled and logged with `log.e()`
- [ ] Responses use `common.returnOutput()` or `common.returnMessage()`
- [ ] Write operations dispatched to `/systemlogs`
- [ ] Projections used on all `find/findOne` calls
- [ ] No `exec()` with user input
- [ ] Plugin lifecycle hooks implemented (apps/create, apps/delete, app_users/delete, device_id)
- [ ] Indexes defined for new collections
- [ ] JSON input parsed safely with try/catch
- [ ] Implementation matches Technical Specification endpoints and data model

---

## Agent: Frontend Development

**Scope**: Files in `plugins/<name>/frontend/`, templates, stylesheets, localization. Implements the UI based on Technical Specification endpoints and UI/UX Design layouts.

### Key References

| Document | Location | Content |
|----------|----------|---------|
| Vue.js Guidelines | `docs/VUEJS_GUIDELINES.md` | Component patterns, lifecycle, state management |
| CSS Style Guide | `docs/CSS_STYLE_GUIDE.md` | SASS/BEM/Bulma conventions |
| UI Testing Guide | `docs/UI_TESTING.md` | Cypress patterns, data-test-id conventions |
| Vue Core Framework | `frontend/express/public/javascripts/countly/vue/` | Mixins, base views, shared components |

### Vue Component Pattern

```js
var MyView = countlyVue.views.create({
    template: countlyVue.T("/myplugin/templates/main.html"),
    mixins: [countlyVue.mixins.auth(FEATURE_NAME)],
    data: function() {
        return { items: [], isLoading: false };
    },
    computed: {
        // Prefer computed over watchers
    },
    methods: {
        refresh: function() {
            // Called on auto-refresh interval
        },
        dateChanged: function() {
            // Called when global date picker changes
        }
    }
});
```

### Available Mixins

| Mixin | Provides |
|-------|----------|
| `countlyVue.mixins.auth(FEATURE)` | `canUserCreate`, `canUserRead`, `canUserUpdate`, `canUserDelete` |
| `countlyVue.mixins.i18n` | `this.i18n("key")` — auto-included in BaseView |
| `countlyVue.mixins.autoRefresh` | `refresh()` / `dateChanged()` hooks — auto-included |
| `countlyVue.mixins.commonFormatters` | Number/date formatting — auto-included |
| `countlyVue.mixins.hasDrawers("name")` | Drawer open/close management |
| `countlyVue.mixins.customDashboards.apps` | Dashboard app selector mixin |
| `countlyVue.mixins.customDashboards.widget` | Dashboard widget mixin |

### Vuex Store Pattern

```js
// In countly.models.js
(function(countlyMyPlugin) {
    countlyMyPlugin.getVuexModule = function() {
        return countlyVue.vuex.Module("myPlugin", {
            state: function() {
                return {
                    items: [],
                    isLoading: false
                };
            },
            getters: {
                items: function(state) { return state.items; },
                isLoading: function(state) { return state.isLoading; }
            },
            mutations: {
                SET_ITEMS: function(state, items) { state.items = items; },
                SET_LOADING: function(state, val) { state.isLoading = val; }
            },
            actions: {
                fetchItems: function(context, params) {
                    context.commit("SET_LOADING", true);
                    return CV.$.ajax({
                        type: "GET",
                        url: countlyCommon.API_URL + "/o",
                        data: { method: "myfeature", app_id: countlyCommon.ACTIVE_APP_ID },
                        dataType: "json",
                        success: function(data) {
                            context.commit("SET_ITEMS", data.items || []);
                        },
                        complete: function() {
                            context.commit("SET_LOADING", false);
                        }
                    });
                }
            }
        });
    };
}(window.countlyMyPlugin = window.countlyMyPlugin || {}));
```

### Route Registration

```js
var mainView = new countlyVue.views.BackboneWrapper({
    component: MyView,
    vuex: [{ clyModel: countlyMyPlugin }],
    templates: ["/myplugin/templates/main.html"]
});

app.route('/dashboard/myfeature', 'myfeature', function() {
    this.renderWhenReady(mainView);
});
```

### Template Pattern

Templates live at `plugins/<name>/frontend/public/templates/`. Use `<script type="text/x-template" id="my-id">` wrapping:

```html
<script type="text/x-template" id="myfeature-main">
<div>
    <cly-header :title="i18n('myfeature.title')">
        <template v-slot:header-right>
            <el-button type="success" @click="createItem" v-if="canUserCreate">
                {{ i18n('myfeature.create') }}
            </el-button>
        </template>
    </cly-header>
    <cly-main>
        <cly-section>
            <cly-datatable-n :rows="items" :force-loading="isLoading">
                <!-- columns -->
            </cly-datatable-n>
        </cly-section>
    </cly-main>
</div>
</script>
```

### Available Shared Components

| Component | Usage |
|-----------|-------|
| `cly-header` | Page header with title + right slot |
| `cly-main` | Main content area |
| `cly-section` / `cly-sub-section` | Content sections |
| `cly-datatable-n` | Data tables with pagination, search, export |
| `cly-select-x` / `cly-multi-select` | Dropdowns |
| `cly-date-picker` | Date pickers |
| `cly-drawer` | Slide-in panels |
| `cly-empty-view` | Empty state placeholders |
| `cly-more-options` | Action dropdown menus |
| `cly-loading` | Loading spinners |
| `cly-notification` | Notification banners |
| `el-button`, `el-input`, `el-dialog` | Element UI components |
| `el-checkbox`, `el-radio`, `el-switch` | Element UI form controls |
| `validation-observer` | VeeValidate form validation |

### Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| Component names (JS) | PascalCase | `var HomeComponent = ...` |
| Component names (templates) | kebab-case | `<cly-drawer>` |
| Variables/functions | camelCase | `myVariable`, `handleClick` |
| Template shorthands | `@event`, `:prop` | `@click="handle"`, `:items="data"` |

### CSS/SASS Rules

- SASS with SCSS syntax, built via `npx grunt sass`
- BEM naming: `.cly-vue-block__element--modifier`
- Bulma classes prefixed with `bu-` (e.g., `bu-columns`, `bu-is-flex`)
- Import colors: `@use "../../../../../../frontend/express/public/stylesheets/styles/base/colors" as c;`
- Use `@use`, never `@import`
- No `!important`, no ID selectors

### Localization

- Add strings to `plugins/<name>/frontend/public/localization/<name>.properties`
- Format: `key = Value text`
- Use in templates: `{{ i18n("key") }}`
- Build: `npx grunt locales`

### Data Test IDs

Add `data-test-id` attributes for UI testability:

```html
<button data-test-id="myfeature-create-button">Create</button>
<el-tab-pane :data-test-id="'tab-' + tab.name.toLowerCase().replace(/ /g, '-') + '-link'">
```

### Frontend Development Checklist

- [ ] Component uses `countlyVue.views.create()` with proper template
- [ ] Auth mixin applied: `countlyVue.mixins.auth(FEATURE_NAME)`
- [ ] `refresh()` method implemented for auto-refresh
- [ ] Uses `{{ }}` for user data, never `v-html`
- [ ] Permission checks on action buttons (`v-if="canUserCreate"`)
- [ ] `data-test-id` attributes on interactive elements
- [ ] Localization keys added to `.properties` file
- [ ] SASS follows BEM with `cly-vue-` prefix
- [ ] Runs `npx grunt dist-all` after JS changes
- [ ] Vuex store follows namespaced module pattern
- [ ] API calls match Technical Specification endpoint contracts
- [ ] UI layout matches UI/UX Design specification
- [ ] Empty, loading, and error states handled
- [ ] Drawer pattern used for create/edit flows
- [ ] Confirmation dialog for destructive actions

---

## Agent: QA/Test

**Scope**: `plugins/<name>/tests.js`, test validation, lint checks, Cypress UI tests.

### Test Framework

- **Mocha** with `should.js` assertions and **supertest** for HTTP
- Tests live at `plugins/<name>/tests.js` (or `tests/index.js`)
- Shared utilities in `test/testUtils.js`

### Test Template

```js
var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

describe('MyFeature', function() {
    describe('Validation', function() {
        it('should reject missing api_key', function(done) {
            request
                .get('/o?method=myfeature')
                .expect(401)
                .end(function(err, res) {
                    if (err) return done(err);
                    done();
                });
        });

        it('should reject invalid parameters', function(done) {
            var API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            var APP_ID = testUtils.get("APP_ID");
            request
                .get('/o?method=myfeature&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(400)
                .end(function(err, res) {
                    if (err) return done(err);
                    done();
                });
        });
    });

    describe('CRUD Operations', function() {
        var createdId;

        it('should create an item', function(done) {
            var API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            var APP_ID = testUtils.get("APP_ID");
            request
                .get('/i/myfeature/create?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID
                    + '&args=' + JSON.stringify({name: "Test Item"}))
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    var body = JSON.parse(res.text);
                    body.should.have.property('result');
                    createdId = body.result._id;
                    done();
                });
        });

        it('should read the item', function(done) {
            var API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            var APP_ID = testUtils.get("APP_ID");
            request
                .get('/o?method=myfeature&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID
                    + '&id=' + createdId)
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    var body = JSON.parse(res.text);
                    body.should.have.property('name', 'Test Item');
                    done();
                });
        });

        it('should delete the item', function(done) {
            var API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            var APP_ID = testUtils.get("APP_ID");
            request
                .get('/i/myfeature/delete?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID
                    + '&args=' + JSON.stringify({id: createdId}))
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    done();
                });
        });
    });
});
```

### testUtils API

| Method | Purpose |
|--------|---------|
| `testUtils.url` | Base URL (`http://localhost`) |
| `testUtils.get("API_KEY_ADMIN")` | Admin API key |
| `testUtils.get("APP_ID")` | Test app ID |
| `testUtils.get("APP_KEY")` | Test app key |
| `testUtils.db` | Direct MongoDB connection |
| `testUtils.login(agent)` | Login flow with CSRF |

### Running Tests

```bash
# Full test suite
npm test

# Unit tests only (no server needed)
npm run test:unit

# Single plugin tests
npm run test:plugin -- <pluginname>

# EE plugin tests
npm test

# Lint a plugin
countly plugin lint <pluginname>
countly plugin lintfix <pluginname>
```

### Build Commands (required after changes)

```bash
npx grunt dist-all    # Rebuild all static assets (after JS changes)
npx grunt locales     # Rebuild locale files (after .properties changes)
npx grunt sass        # Recompile SASS only (after CSS changes)
```

### Test Coverage Matrix

Produce tests matching the Technical Specification's test cases:

| Test Type | What to Cover | Source |
|-----------|---------------|--------|
| Validation | Missing params, invalid types, boundary values | Spec §6 Validation Tests |
| Permissions | Read-only can't write, cross-app blocked | Spec §6 Permission Tests |
| CRUD | Create → Read → Update → Delete cycle | Spec §6 CRUD Tests |
| Edge cases | Empty state, duplicates, max limits, concurrency | Spec §6 Edge Cases |
| Cleanup | App reset/delete removes plugin data | Spec §5 Plugin Hooks |

### Cypress UI Testing (Optional)

For UI-level tests, reference `docs/UI_TESTING.md`:

```js
// Login and navigate
cy.login();
cy.visit('/#/myfeature');

// Interact using data-test-id selectors
cy.get('[data-test-id="myfeature-create-button"]').click();
cy.get('[data-test-id="myfeature-name-input"]').type('Test Item');
cy.get('[data-test-id="myfeature-save-button"]').click();

// Verify
cy.get('[data-test-id="myfeature-table"]').should('contain', 'Test Item');
```

### QA/Test Checklist

- [ ] Tests cover all validation errors from Technical Specification
- [ ] Tests cover the full CRUD lifecycle
- [ ] Tests verify permission enforcement
- [ ] Tests verify `app_id` scoping (no cross-app leaks)
- [ ] Tests cover edge cases defined in specification
- [ ] ESLint passes: `countly plugin lint <name>`
- [ ] `npx grunt dist-all` runs without errors
- [ ] Tests clean up after themselves
- [ ] Test descriptions match specification test case names
- [ ] Cypress tests written for critical UI flows (if applicable)

---

## Agent: Documentation

**Role**: Maintains inline documentation, localization files, changelogs, and API documentation. Can operate independently or be integrated into other agents' workflows.

### Scope

- Localization `.properties` files
- JSDoc comments in source files
- CHANGELOG entries
- API endpoint documentation
- System log action localization

### Responsibilities

1. **Localization** — Add/update `.properties` files for all user-facing strings
2. **JSDoc** — Add function-level documentation for complex business logic
3. **Changelog** — Add entries for new features, bug fixes, and breaking changes
4. **API Docs** — Document endpoint contracts for external consumers
5. **System Logs** — Add localization keys for all audit log actions

### Localization File Pattern

```properties
# plugins/<name>/frontend/public/localization/<name>.properties

# Page titles and navigation
myfeature.title = My Feature
myfeature.description = Manage your feature items

# Actions
myfeature.create = Create New
myfeature.edit = Edit
myfeature.delete = Delete
myfeature.save = Save
myfeature.cancel = Cancel

# Table columns
myfeature.column-name = Name
myfeature.column-status = Status
myfeature.column-created = Created

# Empty state
myfeature.empty-title = No Items Yet
myfeature.empty-desc = Create your first item to get started

# Confirmations
myfeature.delete-confirm = Are you sure you want to delete this item?

# Success messages
myfeature.created-success = Item created successfully
myfeature.updated-success = Item updated successfully
myfeature.deleted-success = Item deleted successfully

# Error messages
myfeature.error-name-required = Name is required
myfeature.error-name-too-long = Name cannot exceed 128 characters

# System log actions
systemlogs.action.myfeature_created = My Feature Created
systemlogs.action.myfeature_edited = My Feature Edited
systemlogs.action.myfeature_deleted = My Feature Deleted
```

### JSDoc Pattern

```js
/**
 * Creates a new feature item for the specified application.
 * @param {Object} params - Request parameters
 * @param {string} params.app_id - Target application ID
 * @param {Object} args - Item properties
 * @param {string} args.name - Item name (max 128 chars)
 * @param {string} [args.description] - Optional description (max 1024 chars)
 * @returns {Object} Created item with _id
 */
```

### Documentation Checklist

- [ ] All user-facing strings have localization keys in `.properties` file
- [ ] System log actions have localization keys (`systemlogs.action.*`)
- [ ] Complex functions have JSDoc comments
- [ ] CHANGELOG updated for new features or notable bug fixes
- [ ] Error messages are clear and actionable
- [ ] Localization keys follow consistent naming scheme (`plugin.context.action`)
- [ ] Build verified: `npx grunt locales` succeeds

---

## Bugfix Workflow

When fixing a bug, agents collaborate in this sequence:

### 1. Investigate (Lead Agent)

- Read the bug report and identify the affected plugin(s)
- Locate the relevant source files in `plugins/<name>/`
- Understand the current behavior vs expected behavior
- Decide which agents are needed (backend-only, frontend-only, or both)

### 2. Specification (Technical Specification Agent — light)

- Document the bug: expected vs actual behavior
- Identify root cause location (file + approximate line)
- Define fix approach and acceptance criteria
- List test cases that should pass after fix

### 3. Implementation (Backend and/or Frontend Agents)

**Backend Agent:**
- Fix server-side logic in `api/api.js` or related backend files
- Ensure input validation, `app_id` scoping, and authorization are correct
- Add audit logging if the fix involves write operations
- Verify error responses use proper HTTP status codes

**Frontend Agent:**
- Fix client-side logic in `countly.views.js`, `countly.models.js`, or templates
- Ensure UI reflects the fix correctly
- Update localization keys if user-facing text changed
- Run `npx grunt dist-all` after JS changes

### 4. Testing (QA/Test Agent)

- Write or update tests in `tests.js` to cover the bug scenario
- Run `countly plugin lint <name>` to verify code style
- Run `npm run test:plugin -- <name>` to verify tests pass
- Verify the fix doesn't break existing tests

### 5. Review (Lead Agent)

- Verify all agent outputs are compatible
- Run integration checks (lint, build, tests)
- Approve or request iterations

---

## New Feature Workflow

For new features, agents collaborate through the full SDLC:

### Phase 1: Specification (Technical Specification Agent)

- Produce full technical specification with API contracts, data model, flows, test cases
- Lead reviews and approves spec

### Phase 2: Design (UI/UX Design Agent)

- Produce page layouts, component hierarchy, interaction flows
- Reference Figma designs if available (via MCP tools)
- Lead reviews and approves design

### Phase 3: Implementation (Backend + Frontend Agents — parallel)

- **Backend Agent** implements API endpoints, data model, hooks per spec
- **Frontend Agent** implements Vue components, Vuex store, templates per spec + design
- Both agents work in parallel when independent

### Phase 4: Testing (QA/Test Agent)

- Write comprehensive test suite matching spec test cases
- Run lint, build, and test commands
- Report results to Lead

### Phase 5: Documentation (Documentation Agent)

- Ensure all localization keys are complete
- Add JSDoc for complex logic
- Update changelog

### Phase 6: Integration (Lead Agent)

- Final review of all outputs
- Run full integration checks
- Verify backend ↔ frontend contract alignment
- Approve or iterate

### Handoff Protocol

Each agent must:
1. **State files modified** — list every file touched with a brief description
2. **State what was changed** — one sentence per change
3. **Flag risks** — any side effects, related plugins, or edge cases
4. **Confirm checklist** — verify against the agent-specific checklist above