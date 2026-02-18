---
sidebar_label: "Disable"
---

# /i/two-factor-auth?method=disable

## Overview

Disables two-factor authentication for the authenticated user. Removes the 2FA requirement and deletes the stored secret token. This operation is blocked if 2FA is globally enforced for the organization.

---

## Endpoint


```plaintext
/i/two-factor-auth?method=disable
```


---


## Authentication

Endpoint uses authenticated dashboard user context. Validation method in code: `validateUser`.


## Permissions

- No separate feature permission is checked beyond authenticated user validation (`validateUser`).

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `method` | String | Yes | Must be `disable` |

---

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `dashboards.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `data-manager.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `security.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.async.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.autoOffsetReset.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.cdn.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.clickhouse.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.condition_title.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.conditions.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.confirm.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.data.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.database.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.def.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.defaultConfig.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.delete.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.description.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.devtools.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.enabled.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.errorHandler.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.getTagNamespace.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.globalProperties.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.globally_enabled.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.groupId.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.groupInstanceId.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.heartbeatInterval.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.html.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.ignoredElements.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.invalidJsonBehavior.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.invalidJsonMetrics.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.isReservedAttr.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.isReservedTag.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.isUnknownElement.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.js.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.json.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.kafka.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.keyCodes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.lang.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.layout.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.lifetime.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maxBytes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maxBytesPerPartition.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maxPollIntervalMs.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maxWaitTimeInMs.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.metadataMaxAge.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.minBytes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.minutes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.mustUseProp.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.name.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.optionMergeStrategies.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parameter.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.partitionsConsumedConcurrently.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.passwordSecret.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.path.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.performance.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.primaryKey.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.productionTip.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.proxy_hostname.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.proxy_password.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.proxy_port.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.proxy_username.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.rackId.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.range.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.rate.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.rebalanceTimeout.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.schedule.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.screenshotsFolder.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.sessionTimeoutMs.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.silent.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.source.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.structure.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.toLowerCase.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.topics.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.type.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.users.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.videosFolder.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.warnHandler.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.web.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.yes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `tracking.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `two-factor-auth.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `white-labeling.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `COUNTLY_CONFIG_HOSTNAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONFIG_PROTOCOL` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONTAINER` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__DEBUG` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__DEFAULT` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__ERROR` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__INFO` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__PRETTYPRINT` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__LOGS__WARN` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_TEST_API_KEY_ADMIN` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_TEST_APP_ID` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_TEST_APP_KEY` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `DEPLOYMENT_ENV` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `HOSTNAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `KAFKA_GROUP_INSTANCE_ID` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
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
| `PROFILE_COLLECTOR_URL` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `PYROSCOPE_ENABLED` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |

## Response

**Success** (`200 OK`):
### Success Response

```json
{
  "result": "Disabled 2FA for user"
}
```

**Error Responses**:

`403 Forbidden` - Globally enforced:
```json
{
  "result": "Can not disable 2FA for user when it is globally enabled"
}
```

`500 Internal Server Error` - Database error:
```json
{
  "result": "Database error while disabling 2FA"
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

### Example 1: Disable Own 2FA

**Description**: User disables their own 2FA (when not globally enforced).

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "session_cookie" \
  -d "method=disable"
```

**Response** (Success):
```json
{
  "result": "Disabled 2FA for user"
}
```

---

### Example 2: Disable with Session Cookie

**Description**: Frontend makes request with user session.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "countly_session=abc123..." \
  -d "method=disable"
```

**Response**:
```json
{
  "result": "Disabled 2FA for user"
}
```

---

### Example 3: Blocked by Global Policy

**Description**: Attempt to disable when organization requires 2FA for all users.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "session_cookie" \
  -d "method=disable"
```

**Response**:
```json
{
  "result": "Can not disable 2FA for user when it is globally enabled"
}
```

---

## Behavior/Processing

### Processing Flow
1. Validates authentication (user must be logged in)
2. Checks global enforcement policy (`globally_enabled` config)
3. If globally enforced:
   - Returns 403 error
   - User cannot disable their own 2FA
4. If not globally enforced:
   - Updates member record in database
   - Sets `two_factor_auth.enabled: false`
   - Removes `two_factor_auth.secret_token` field
   - Logs action to systemlogs
   - Returns success

### Global Enforcement Check
- Reads `features.getConfig("two-factor-auth").globally_enabled`
- When `true`: prevents users from disabling their 2FA
- When `false`: allows users to disable 2FA
- Admins can still force-disable via [admin_disable method](./i-two-factor-auth-admin-disable.md)

### Security Implications
- Removes second authentication factor
- User will only need password for future logins
- Secret token permanently deleted (new setup required to re-enable)
- Action logged for audit purposes

---

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `$set: {"two_factor_auth.enabled": false}` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `$unset: {"two_factor_auth.secret_token": ""}` | Token records | Stores API/auth token records managed by this endpoint. |

---

## Systemlogs Integration

Action logged to systemlogs:
```javascript
{
  "action": "two_factor_auth_disabled",
  "user": "user@example.com",
  "timestamp": "2026-02-13T10:30:00.000Z",
  "data": {}
}
```

---

## Configuration

Feature configuration checked:

| Setting | Type | Effect |
|---------|------|--------|
| `globally_enabled` | Boolean | When `true`, blocks this operation |

---

## Technical Notes

- **Self-Service**: Users can disable their own 2FA (if policy allows)
- **Permanent Deletion**: Secret token completely removed from database
- **Re-enabling**: Requires full setup process (new QR code, new secret)
- **Admin Override**: Admins can force-disable via separate admin method
- **Audit Trail**: All disable actions logged to systemlogs
- **Session Required**: Must be authenticated with valid session cookie

---

## Use Cases

### When Users Should Disable 2FA
- Lost access to authenticator app
- Switching to new device/authenticator
- Temporary troubleshooting
- Personal preference (if policy allows)

### When Users Cannot Disable 2FA
- Organization requires 2FA for all users (`globally_enabled: true`)
- Compliance/security policies mandate 2FA
- Industry regulations require MFA

---

## Comparison with Admin Disable

| Feature | User Disable (this endpoint) | Admin Disable |
|---------|------------------------------|---------------|
| **Permission** | Self-service | Global admin only |
| **Global Policy** | Blocked when enforced | Bypasses enforcement |
| **Use Case** | User preference | Support/recovery |
| **Target** | Own account | Any user account |

---

## Related Endpoints

- [Generate QR Code](./i-two-factor-auth-generate-qr.md) - Setup 2FA again after disabling
- [Enable 2FA](./i-two-factor-auth-enable.md) - Re-enable 2FA with new secret
- [Admin Check 2FA Status](./i-two-factor-auth-admin-check.md) - Check if 2FA is enabled
- [Admin Disable 2FA](./i-two-factor-auth-admin-disable.md) - Force disable (admin)

---

## Best Practices

1. **Confirm Intent**: Show confirmation dialog before disabling
2. **Temporary Disable**: Consider admin disable for temporary access issues
3. **Re-enable Guidance**: Provide clear steps to re-enable 2FA
4. **Security Warning**: Warn users about reduced security
5. **Backup Methods**: Consider backup authentication methods before disabling

---

## Enterprise

Plugin: two-factor-auth
Endpoint: /i/two-factor-auth?method=disable

## Last Updated

February 2026
