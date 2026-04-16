# Push Plugin Architecture

This document describes the lifecycle of a push notification in the Countly push plugin — from message creation through delivery and result tracking.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Message Lifecycle](#message-lifecycle)
  - [1. Message Creation](#1-message-creation)
  - [2. Scheduling](#2-scheduling)
  - [3. Composition](#3-composition)
  - [4. Template Compilation](#4-template-compilation)
  - [5. Sending](#5-sending)
  - [6. Result Saving](#6-result-saving)
- [Kafka Queue](#kafka-queue)
- [Trigger Types](#trigger-types)
- [Platform Payload Formats](#platform-payload-formats)
- [Database Collections](#database-collections)
- [Auto-Trigger System](#auto-trigger-system)
- [API Endpoints](#api-endpoints)

---

## Overview

The push plugin uses a **Kafka-based event-driven pipeline** with 5 topics:

```
CREATE → SCHEDULE → COMPOSE → SEND → RESULT
```

Each stage is decoupled through Kafka, allowing independent scaling and fault isolation.

### Module Organization Principles

- **`models/`** — Domain schemas and types (Zod schemas, TypeScript interfaces). Pure data definitions with no runtime dependencies on the send pipeline or Kafka.
- **`kafka/`** — Kafka transport layer, split into three files to avoid circular dependencies:
  - `kafka/types.ts` — Event interfaces (`PushEvent`, `ScheduleEvent`, `ResultEvent`, `AutoTriggerEvent`), DTO types, and DTO conversion functions. No runtime imports from the send pipeline.
  - `kafka/producer.ts` — Kafka producer setup, topic management, and event publishing functions (`sendPushEvents`, `sendScheduleEvents`, etc.). Imported by `send/` modules for publishing.
  - `kafka/consumer.ts` — `initPushQueue()` consumer setup and message routing. This is the only file that imports the send pipeline handlers, keeping the dependency one-directional.
- **`send/platforms/`** — Each platform file co-locates its payload types (`AndroidMessagePayload`, `IOSConfig`, etc.) with its send logic. Platform-specific types are not shared across a central types file.
- **`lib/`** — Shared utilities with no Kafka or send-pipeline dependencies (template compilation, error types, validation helpers).

## Directory Structure

```
plugins/push/api/
├── api.ts                  # Main plugin entry, registers all hooks
├── api-message.ts          # Message CRUD operations (create/validate/update/remove)
├── api-push.ts             # Credentials, config, dashboard endpoints
├── api-auto.ts             # Auto-trigger message endpoints
├── api-dashboard.ts        # Dashboard statistics endpoint
├── api-drill.ts            # Drill integration
├── api-tx.ts               # Transactional push (API trigger) endpoint
├── api-reset.ts            # Data reset handlers
├── kafka/
│   ├── types.ts            # Event interfaces, DTO types, DTO conversion functions
│   ├── producer.ts         # Kafka producer setup, topic management, event publishing
│   └── consumer.ts         # Consumer setup, message routing to send pipeline
├── lib/
│   ├── api-patches.ts      # Wrappers for validateCreate/Read/Update/Delete
│   ├── template.ts         # Template compilation and personalization
│   ├── error.ts            # Error types (SendError, InvalidDeviceToken, etc.)
│   └── utils.ts            # Shared utilities (proxy, drill, flatten, etc.)
├── send/
│   ├── scheduler.ts        # Schedule creation and date calculation
│   ├── composer.ts         # User aggregation, push event creation
│   ├── sender.ts           # Platform dispatch (ios/android/huawei)
│   ├── resultor.ts         # Result saving, token cleanup, stats
│   └── platforms/
│       ├── android.ts      # FCM send + payload mapping + AndroidMessagePayload/AndroidConfig types
│       ├── ios.ts          # APNs send + payload mapping + IOSMessagePayload/IOSConfig types
│       └── huawei.ts       # HMS send + payload mapping + HuaweiMessagePayload/HuaweiConfig types
├── models/
│   ├── index.ts            # Barrel re-export of all model modules
│   ├── queue.ts            # Barrel re-export of kafka/types.ts event types (stable import path for tests)
│   ├── message.ts          # Message, Content, Trigger Zod schemas + types
│   ├── schedule.ts         # Schedule document interface + AudienceFilter, MessageOverrides
│   └── credentials.ts      # Platform credential Zod schemas + types (FCM, APN, HMS)
└── constants/
    ├── kafka-config.ts     # Topic names, partition counts
    ├── platform-keymap.ts  # Platform keys → titles, environments, combined keys
    ├── configs.ts          # Proxy timeout, media limits
    └── all-tz-offsets.ts   # All timezone offsets for timezone-aware scheduling
```

## Message Lifecycle

### 1. Message Creation

**File:** `api-message.ts` → `createMessage()`

1. Client sends `POST /i/push/message/create` with message JSON
2. Request is validated through `createApi()` wrapper (`api-patches.ts`), which calls `validateCreate` from `rights.js`
3. Message body is validated with Zod schemas:
   - `DraftMessageSchema` for draft messages (no result required, `_id` optional)
   - `CreateMessageSchema` for active messages (extends Draft with `result`)
4. If `status === "draft"`, message is inserted directly without scheduling
5. If `status === "active"`:
   - A `result` object is built with `buildResultObject()` (all stats zeroed)
   - Message is inserted into `messages` collection
   - `scheduleIfEligible()` is called to create initial schedules

### 2. Scheduling

**File:** `send/scheduler.ts`

Scheduling converts a message's trigger into one or more `Schedule` documents and publishes `ScheduleEvent`s to the Kafka SCHEDULE topic.

**`scheduleMessageByDateTrigger()`:**
- For `plain` triggers: schedules immediately or at the specified start date
- For `rec` (recurring) triggers: calculates the next N dates using `findNextMatchForRecurring()`, always keeping `NUMBER_OF_SCHEDULES_AHEAD_OF_TIME` (5) future schedules
- For `multi` triggers: finds the next N dates from the sorted date list

**`createSchedule()`:**
Creates a `Schedule` document and its events:
- If **not timezone-aware**: creates a single `ScheduleEvent`
- If **timezone-aware**: creates one `ScheduleEvent` per timezone offset, each adjusted to fire at the correct local time. Past events are either skipped or rescheduled to the next day (if `rescheduleIfPassed`)

**Kafka SCHEDULE topic** uses a scheduler pattern:
- Events are sent with headers: `scheduler-target-topic` (COMPOSE), `scheduler-target-key`, and `scheduler-epoch` (Unix timestamp)
- The Kafka scheduler service delays delivery to COMPOSE until the epoch time is reached
- This means SCHEDULE acts as a delayed delivery queue → events arrive at COMPOSE at the right time

### 3. Composition

**File:** `send/composer.ts`

When a `ScheduleEvent` arrives from the COMPOSE topic, `composeScheduledPushes()` runs:

1. **Load documents**: Fetches `Schedule`, `Message`, and `App` documents. Validates all exist and are in valid states
2. **Build aggregation pipeline** (`buildUserAggregationPipeline()`):
   - `$match` for platform token existence (e.g., `{tkap: {$exists: true}}`)
   - `$match` for timezone (if timezone-aware)
   - Audience filter stages (user IDs, cohorts, geos, user filters, drill queries)
   - `$lookup` to join `push_{appId}` for token data
   - `$project` for user properties needed by personalization
3. **Load credentials**: Fetches platform credentials from `creds` collection via `apps.plugins.push` config
4. **Create template**: `createTemplate()` compiles a reusable function from message contents
5. **Stream users** (`createPushStream()`):
   - Streams aggregation results from `app_users{appId}`
   - For each user, iterates their token entries (`user.tk[0].tk`)
   - For each token, yields a `PushEvent` with payload compiled by the template
6. **Batch and send**: `PushEvent`s are batched (100 per batch) and sent to the SEND topic
7. **Update results**: `applyResultObject()` increments `total` stats on Schedule and Message docs
8. **Re-schedule**: If the trigger is reschedulable (`rec` or `multi`), `scheduleMessageByDateTrigger()` is called again to create the next schedule(s)

### 4. Template Compilation

**File:** `lib/template.ts`

`createTemplate()` returns a function `(platform, user) → payload`:

1. **Content mapping** (`createContentMap()`):
   - Separates contents into `contentsByLanguage` (keyed by `la` or `"default"`) and `contentsByPlatform` (keyed by `p`)
   - Extracts personalization objects (character-index-based insertion points) from `messagePers` and `titlePers`

2. **Personalization** (`compilePersonalizableContent()`):
   - For each personalizable field (`title`, `message`):
     - Splits the template string into characters
     - At each insertion index, resolves the user property value (or fallback)
     - Optionally capitalizes the first character (`c: true`)
     - Splices the value into the character array
   - Returns the compiled `Content` object

3. **Platform dispatch**: Based on platform key, calls the appropriate `mapMessageToPayload()`:
   - `"a"` → `android.mapMessageToPayload()`
   - `"i"` → `ios.mapMessageToPayload()`
   - `"h"` → `huawei.mapMessageToPayload()`

### 5. Sending

**File:** `send/sender.ts`

`sendAllPushes()` processes a batch of `PushEvent`s:

1. Checks `sendBefore` timeout — rejects with `TooLateToSend` if expired
2. Dispatches each push to the platform handler:
   - **Android** (`platforms/android.ts`): Uses Firebase Admin SDK. Manages Firebase app instances with proxy support. Detects proxy configuration changes and recreates apps as needed
   - **iOS** (`platforms/ios.ts`): Uses HTTP/2 directly via `http2-wrapper`. Supports both P8 (token-based) and P12 (certificate-based) authentication. JWT tokens cached for 20 minutes
   - **Huawei** (`platforms/huawei.ts`): Uses HTTPS. OAuth2 token cached until expiry. Mutates payload to add `token` array before sending, then removes it
3. Collects results via `Promise.allSettled()` — all pushes are attempted regardless of individual failures
4. Maps results to `ResultEvent`s (with `response` for success, `error` for failure)
5. Sends `ResultEvent`s to the RESULT topic

### 6. Result Saving

**File:** `send/resultor.ts`

`saveResults()` processes `ResultEvent`s:

1. **Update internals**: Calls `updateInternalsWithResults()` for real-time internal tracking
2. **Aggregate stats**: Groups results by `scheduleId`, builds `Result` objects with hierarchical stats:
   ```
   result.total/sent/failed
   └── result.subs[platform].total/sent/failed
       └── result.subs[platform].subs[language].total/sent/failed
   ```
3. **Apply to documents**: `applyResultObject()` uses `$inc` to atomically update both `message_schedules` and `messages` collections. Also transitions schedule status:
   - `scheduled` + `composed` events → `"sending"`
   - All composed + `sent + failed >= total` → `"sent"` or `"failed"`
4. **Save raw results**: Inserts `ResultEvent`s into `message_results` (if `saveResult: true`)
5. **Clean invalid tokens**: For `InvalidDeviceToken` errors, removes the token from both `push_{appId}` (the `tk` field) and `app_users{appId}` (the `tk{combined}` field)
6. **Record sent dates**: Adds timestamps to `push_{appId}.msgs.{messageId}` array using `$addToSet` (used for cap/sleep filtering in auto-triggers)

## Kafka Queue

**Directory:** `kafka/`

The Kafka transport layer is split into three files to avoid circular dependencies between the send pipeline and Kafka publishing:

- **`kafka/types.ts`** — Event interfaces (`ScheduleEvent`, `PushEvent`, `ResultEvent`, `AutoTriggerEvent`), platform-specific variants, DTO types for JSON serialization (ObjectId/Date ↔ string), and DTO conversion functions
- **`kafka/producer.ts`** — Producer setup, topic management (`setupTopicsAndPartitions`), and event publishing functions (`sendScheduleEvents`, `sendPushEvents`, `sendResultEvents`, `sendAutoTriggerEvents`). Imported by `send/` modules.
- **`kafka/consumer.ts`** — `initPushQueue()` sets up the consumer, subscribes to topics, and routes messages to the send pipeline handlers (`sendAllPushes`, `composeAllScheduledPushes`, `saveResults`, `scheduleMessageByAutoTriggers`). This is the only Kafka file that imports the send pipeline, keeping the dependency graph acyclic.

| Topic | Name | Partitions | Purpose |
|-------|------|-----------|---------|
| SCHEDULE | CLY_PUSH_MESSAGE_SCHEDULE | 2 | Delayed schedule delivery (compact) |
| COMPOSE | CLY_PUSH_MESSAGE_COMPOSE | 3 | Triggers user aggregation + push creation |
| SEND | CLY_PUSH_MESSAGE_SEND | 10 | Individual push delivery to providers |
| RESULT | CLY_PUSH_MESSAGE_RESULT | 4 | Result processing and stat updates |
| AUTO_TRIGGER | CLY_PUSH_MESSAGE_AUTO_TRIGGER | 6 | Cohort/event trigger processing |

The SCHEDULE topic uses `cleanup.policy: compact` and a scheduler pattern — messages are held until their `scheduler-epoch` header timestamp, then forwarded to the `scheduler-target-topic` (COMPOSE).

Consumer group: `countly-push-consumers`

## Trigger Types

| Kind | Description | Scheduling |
|------|-------------|------------|
| `plain` | One-time send at a specific date | Single schedule, immediate or future |
| `rec` | Recurring (daily/weekly/monthly) | Rolling window of 5 future schedules |
| `multi` | Multiple specific dates | Rolling window of 5 future schedules |
| `event` | On user event | Scheduled on-demand when event fires |
| `cohort` | On cohort entry/exit | Scheduled on-demand when cohort changes |
| `api` | Transactional (API push) | Scheduled directly via API call |

**Date triggers** (`plain`, `rec`, `multi`): Scheduled proactively at message creation/activation.

**Auto triggers** (`event`, `cohort`, `api`): Scheduled reactively when the triggering condition occurs.

## Platform Payload Formats

Each platform defines its own payload type and config interface in its platform file under `send/platforms/`.

### Android (FCM)

**File:** `send/platforms/android.ts` — exports `AndroidMessagePayload`, `AndroidConfig`

```json
{
  "data": {
    "c.i": "<messageId>",
    "title": "...",
    "message": "...",
    "sound": "...",
    "badge": "423",
    "c.l": "<url>",
    "c.m": "<media>",
    "c.b": "[{\"t\":\"Button\",\"l\":\"url\"}]",
    "c.e.did": "<extra>",
    "c.li": "<large_icon>"
  },
  "android": { "ttl": 604800000 }
}
```
All values in `data` are strings. `android.ttl` is set from `content.expiration`.

### iOS (APNs)

**File:** `send/platforms/ios.ts` — exports `IOSMessagePayload`, `IOSConfig`

```json
{
  "aps": {
    "alert": { "title": "...", "body": "...", "subtitle": "..." },
    "sound": "...",
    "badge": 423,
    "mutable-content": 1
  },
  "c": {
    "i": "<messageId>",
    "l": "<url>",
    "a": "<media>",
    "b": [{"t": "Button", "l": "url"}],
    "e": { "did": "<extra>", "fs": 1700549799 }
  }
}
```
Key differences from Android: `badge` is a number (not string), `c.b` is an array (not JSON string), media is under `c.a` (not `c.m`), extras under `c.e` keep their original types, custom data is merged into the root (not `data`).

### Huawei (HMS)

**File:** `send/platforms/huawei.ts` — exports `HuaweiMessagePayload`, `HuaweiConfig`

```json
{
  "message": {
    "data": "<JSON string of android.data>",
    "android": {}
  }
}
```
Huawei reuses Android's `mapMessageToPayload()`, then wraps only the `.data` property as a JSON string. The `android.ttl` and wrapper structure are discarded.

## Database Collections

| Collection | Description | Model |
|------------|-------------|-------|
| `messages` | Push message documents (config, triggers, contents, cumulative results) | `models/message.ts` → `Message`, `MessageCollection` |
| `message_schedules` | Schedule documents per message (one-to-many). Tracks events, status, per-schedule results | `models/schedule.ts` → `Schedule`, `ScheduleCollection` |
| `message_results` | Raw send results (one per push attempt, when `saveResult: true`) | — |
| `push_{appId}` | Per-app token storage. `_id` = user uid, `tk` = token map, `msgs` = sent message timestamps | — |
| `app_users{appId}` | Core user collection. Token existence flags (`tkap`, `tkhp`, etc.) used for audience filtering | — |
| `apps` | App documents with `plugins.push` containing credential references | — |
| `creds` | Platform credential documents (FCM service accounts, APN certificates/keys, HMS secrets) | `models/credentials.ts` → `PlatformCredential` |
| `geos` | Geo-fence documents for location-based audience filtering | — |

## Auto-Trigger System

**File:** `send/scheduler.ts` → `scheduleMessageByAutoTriggers()`

For event and cohort triggers:

1. `AutoTriggerEvent`s arrive on the AUTO_TRIGGER Kafka topic
2. Events are merged by app ID to reduce queries (`mergeAutoTriggerEvents()`)
3. For each merged filter, active messages with matching triggers are queried
4. Schedules are created with audience filters containing the specific user IDs
5. Optional features per trigger:
   - **`delay`**: Delays the schedule by N milliseconds
   - **`time`**: Sends at a specific time of day (timezone-aware)
   - **`cap`**: Maximum number of sends per message per user
   - **`sleep`**: Minimum time between sends of the same message
   - **`cancels`** (cohort only): Instead of filtering by uid, filters by cohort membership status

## API Endpoints

### Write Endpoints (`/i/push/...`)
| Path | Handler | Description |
|------|---------|-------------|
| `/i/push/message/create` | `createApi` | Create and optionally schedule a message |
| `/i/push/message/update` | `updateApi` | Update a draft or active message |
| `/i/push/message/remove` | `deleteApi` | Remove (soft-delete) a message |
| `/i/push/message/toggle` | `updateApi` | Activate/deactivate a message |
| `/i/push/message/approve` | `updateApi` | Approve a pending message |
| `/i/push/message/reject` | `updateApi` | Reject a pending message |
| `/i/push/credentials/save` | `createApi` | Validate and save platform credentials |
| `/i/push/credentials/remove` | `deleteApi` | Remove platform credentials |
| `/i/push/reset` | `deleteApi` | Reset push data for an app |
| `/i/push/api` | (direct) | Transactional push via API trigger |

### Read Endpoints (`/o/push/...`)
| Path | Handler | Description |
|------|---------|-------------|
| `/o/push/message/all` | `readApi` | List messages with pagination |
| `/o/push/message/one` | `readApi` | Get single message with schedules |
| `/o/push/dashboard` | `readApi` | Dashboard statistics |
| `/o/push/credentials` | `readApi` | Get configured credentials |

### SDK/Internal Endpoints
| Path | Description |
|------|-------------|
| `/i/push/token` | Register/update device push token |
| `/i/push/action` | Record push notification action (open, button click) |
| `/cohort_entry`, `/cohort_exit` | Auto-trigger on cohort membership change |
