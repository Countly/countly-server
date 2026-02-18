---
sidebar_label: "Enable"
---

# /i/two-factor-auth?method=enable

## Overview

Enables two-factor authentication for the authenticated user after verifying a 6-digit TOTP code. The secret token is encrypted and stored, and subsequent logins will require 2FA codes.

---

## Endpoint


```plaintext
/i/two-factor-auth?method=enable
```


---


## Authentication

Endpoint uses authenticated dashboard user context. Validation method in code: `validateUser`.


## Permissions

- No separate feature permission is checked beyond authenticated user validation (`validateUser`).

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `method` | String | Yes | Must be `enable` |
| `secret_token` | String | Yes | TOTP secret from `generate-qr-code` method |
| `auth_code` | String | Yes | 6-digit verification code from authenticator app |

---

## Validation Rules

- `auth_code` must match regex: `^\d{6}$` (exactly 6 digits)
- Code must be currently valid for the provided `secret_token`
- TOTP verification uses 30-second time windows

---

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `apps.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `data-manager.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `frontend.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `hooks.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `recaptcha.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `remote-config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `security.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.acks.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.api.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.async.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.cdn.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.clickhouse.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.cluster.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.condition.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.condition_title.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.conditions.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.conditions_per_paramaeters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.confirm.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.cookie.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.data.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.database.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.def.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.default.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.defaultConfig.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.delete.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.description.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.device_id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.distributed.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.enableTransactions.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.enabled.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.eventSink.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.globally_enabled.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.groupId.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.html.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.initialRetryTime.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.invalidJsonBehavior.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.invalidJsonMetrics.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.js.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.json.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.kafka.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.lang.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.layout.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.lifetime.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maxRetryTime.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maxWaitTimeInMs.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maximum_allowed_parameters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.minBytes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.minutes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.mongodb.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.name.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.offline_mode.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.optionMergeStrategies.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parallelReplicas.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parameter.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parameters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.partitionsConsumedConcurrently.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.passwordSecret.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_autocomplete.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_char.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_min.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_number.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_symbol.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.path.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.performance.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.primaryKey.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.range.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.replace.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.replication.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.retries.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.schedule.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.silent.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.source.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.structure.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.toLowerCase.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.topicName.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.topics.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.transactionTimeout.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.type.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.use_google.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.users.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.warnHandler.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.web.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.yes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `tracking.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `two-factor-auth.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `white-labeling.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `CLICKHOUSE_CLOUD_PASSWORD` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `CLICKHOUSE_CLOUD_URL` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `CLICKHOUSE_CLOUD_USER` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `CONTAINER_ID` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONFIG_HOSTNAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONFIG__CLICKHOUSE_DATABASE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONFIG__CLICKHOUSE_URL` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONFIG__DATABASE_ADAPTERS_CLICKHOUSE_ENABLED` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONTAINER` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_PATH` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__DEBUG` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__DEFAULT` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__ERROR` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__INFO` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__PRETTYPRINT` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__WARN` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_TEST_API_KEY_ADMIN` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_TEST_APP_ID` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_TEST_APP_KEY` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_TEST_SAVE_LOGS` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `DEPLOYMENT_ENV` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `HOSTNAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `KUBERNETES_NAMESPACE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `KUBERNETES_POD_NAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `NODE_ENV` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `NODE_PATH` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_BATCH_TIMEOUT` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_DEBUG` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_ENABLED` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_EXPORTER_OTLP_HEADERS` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_MAX_EXPORT_BATCH_SIZE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_MAX_QUEUE_SIZE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_METRIC_EXPORT_INTERVAL_MILLIS` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_SERVICE_NAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `POD_NAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `PROFILE_COLLECTOR_URL` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `PYROSCOPE_ENABLED` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `TEST_SUITE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |

## Response

**Success** (`200 OK`):
### Success Response

```json
{
  "result": "Enabled 2FA for user"
}
```

**Error Responses**:

`400 Bad Request` - Invalid code format:
```json
{
  "result": "Invalid 2FA code"
}
```

`401 Unauthorized` - Code verification failed:
```json
{
  "result": "Failed to authenticate"
}
```

`500 Internal Server Error` - Database or verification error:
```json
{
  "result": "Error during verification"
}
```

---


### Response Fields

| Field | Type | Description |
|---|---|---|
| `*` | Varies | Fields returned by this endpoint. See Success Response example. |


### Error Responses

```json
{
  "result": "Error"
}
```

## Examples

### Example 1: Enable 2FA After Scanning QR Code

**Description**: User scanned QR code and enters the 6-digit code from their authenticator app.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "session_cookie" \
  -d "method=enable" \
  -d "secret_token=JBSWY3DPEHPK3PXP" \
  -d "auth_code=123456"
```

**Response** (Success):
```json
{
  "result": "Enabled 2FA for user"
}
```

**Response** (Invalid Code):
```json
{
  "result": "Failed to authenticate"
}
```

---

### Example 2: Enable with Manual Entry

**Description**: User manually entered secret into authenticator app and provides verification code.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "countly_session=abc123..." \
  -d "method=enable" \
  -d "secret_token=MFRGGZDFMZTWQ2LK" \
  -d "auth_code=987654"
```

**Response**:
```json
{
  "result": "Enabled 2FA for user"
}
```

---

### Example 3: Failed Verification - Wrong Code

**Description**: User enters incorrect 6-digit code.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "session_cookie" \
  -d "method=enable" \
  -d "secret_token=JBSWY3DPEHPK3PXP" \
  -d "auth_code=000000"
```

**Response**:
```json
{
  "result": "Failed to authenticate"
}
```

---

### Example 4: Failed Validation - Invalid Format

**Description**: Code doesn't match required 6-digit format.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "session_cookie" \
  -d "method=enable" \
  -d "secret_token=JBSWY3DPEHPK3PXP" \
  -d "auth_code=12345"
```

**Response**:
```json
{
  "result": "Invalid 2FA code"
}
```

---

## Behavior/Processing

### Processing Flow
1. Validates authentication (user must be logged in)
2. Validates `auth_code` format (must be 6 digits)
3. Uses `otplib.authenticator.check()` to verify code against secret
4. If verification succeeds:
   - Encrypts secret token using `utils.encrypt()`
   - Updates member record in database
   - Sets `two_factor_auth.enabled: true`
   - Stores encrypted secret in `two_factor_auth.secret_token`
   - Logs action to systemlogs
5. Returns success or error response

### TOTP Verification
- Uses Time-based One-Time Password algorithm (RFC 6238)
- 30-second time window for code validity
- Allows for clock drift (typically accepts previous/next time windows)
- Code cannot be reused within same time window

### Security Processing
- Secret token encrypted before storage using `utils.encrypt()`
- Original plaintext secret never stored
- Failed attempts return 401 without retry tracking
- No rate limiting implemented (consider adding)

---

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.alerts` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.alerts_data` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.apps` | Application metadata/config | Stores app-level settings and metadata read/updated by this endpoint. |
| `countly.auth_tokens` | Token records | Stores API/auth token records managed by this endpoint. |
| `countly.carriers` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.cities` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.device_details` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.devices` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.diagnostic` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.event_groups` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.events` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.events_data` | Aggregated events data | Stores aggregated event metric documents touched by this endpoint. |
| `countly.failed_logins` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.feedback_widgets` | Star Rating feedback data | Stores feedback widgets, responses, and related settings. |
| `countly.hooks` | Webhook/integration definitions | Stores hook configuration and state used by this endpoint. |
| `countly.jobs` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.kafka_connect_status` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.kafka_consumer_events` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.kafka_consumer_health` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.kafka_consumer_state` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.kafka_lag_history` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.long_tasks` | Task/long-task records | Stores asynchronous task records and task lifecycle metadata. |
| `countly.members` | Member/account metadata | Stores member identity/profile fields used for enrichment and ownership checks. |
| `countly.mycountly` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.notes` | Notes records | Stores note documents read or modified by this endpoint. |
| `countly.password_reset` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.plugins` | Plugin configuration store | Stores plugin-level configuration documents used by this endpoint. |
| `countly.reports` | Reports storage | Stores report definitions, snapshots, or generated artifacts handled by this endpoint. |
| `countly.sdks` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.sessions_` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.timelineStatus` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.users` | User/member aggregates | Stores user and member records used by this endpoint. |
| `countly_drill.drill_bookmarks` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly_drill.drill_events` | Drill event rows | Stores granular event records queried or updated by this endpoint. |
| `countly_drill.drill_meta` | Drill metadata dictionary | Stores event/segment/property metadata used by this endpoint. |

---

## Systemlogs Integration

Action logged to systemlogs:
```javascript
{
  "action": "two_factor_auth_enabled",
  "user": "user@example.com",
  "timestamp": "2026-02-13T10:30:00.000Z",
  "data": {}
}
```

---

## Technical Notes

- **TOTP Library**: Uses `otplib` authenticator implementation
- **Encryption**: Secret encrypted with app-level encryption key
- **Time Sync**: Requires server and authenticator app clocks to be synchronized
- **No Retry Tracking**: Failed attempts not tracked (security consideration)
- **Session Required**: Must be authenticated with valid session cookie
- **Single Use**: After enabling, original secret no longer needed

---

## Common Issues

### Clock Skew
If verification consistently fails, check:
- Server time synchronized via NTP
- User's device time is correct
- Time zone settings are accurate

### Code Timing
TOTP codes refresh every 30 seconds. If code expires during entry:
- Wait for next code to appear
- Enter new code immediately

---

## Related Endpoints

- [Generate QR Code](./i-two-factor-auth-generate-qr.md) - Get secret and QR code for setup
- [Disable 2FA](./i-two-factor-auth-disable.md) - Disable 2FA for current user
- [Admin Check 2FA Status](./i-two-factor-auth-admin-check.md) - Check if user has 2FA enabled
- [Admin Disable 2FA](./i-two-factor-auth-admin-disable.md) - Force disable user's 2FA

---

## Enterprise

Plugin: two-factor-auth
Endpoint: /i/two-factor-auth?method=enable

## Last Updated

February 2026
