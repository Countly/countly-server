---
sidebar_label: "Fetch Remote Config (Legacy)"
---

# /o/sdk?method=fetch_remote_config

## Overview

**Legacy alias** for retrieving remote configuration values. This endpoint provides identical functionality to `/o/sdk?method=rc` and exists for backwards compatibility. Fetches parameter values based on AB test enrollment, matching conditions, or default values.

**Recommended**: Use `/o/sdk?method=rc` instead. This endpoint will continue to work but is considered legacy.

---

## Endpoint


```plaintext
/o/sdk?method=fetch_remote_config
```

## Authentication

- **Required Parameter**: `app_key` (public app key, not API key)
- **HTTP Methods**: GET recommended (all methods supported)

## Request Parameters

All parameters are **identical** to `/o/sdk?method=rc`.

**Core Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `app_key` | String | Yes | Application key (public, used by SDK) |
| `device_id` | String | Yes | Unique device identifier |
| `keys` | String (JSON Array) | No | Specific parameter keys to fetch |
| `omit_keys` | String (JSON Array) | No | Parameter keys to exclude |
| `metrics` | String (JSON Object) | No | User metrics/properties for condition matching |
| `oi` | String | No | Enroll in AB tests if eligible ("1" = enable) |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `remote-config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.condition.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.data.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.js.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parameters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

**Identical** to `/o/sdk?method=rc`. Returns JSON object with parameter key-value pairs.

**Success Response Example**:
### Success Response

```json
{
  "button_color": "#FF5733",
  "max_items": 50,
  "feature_enabled": true
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

## Permissions

- No dashboard permission check is applied. Access is validated by SDK app credentials (`app_key` and `device_id`).


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.


## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.apps` | Application metadata/config | Stores app-level settings and metadata read/updated by this endpoint. |

## Examples

### Example 1: Fetch all parameters (legacy method)

**Description**: Fetch all remote config parameters using legacy endpoint

**Request** (GET):
```bash
curl "https://your-server.com/o/sdk?method=fetch_remote_config&app_key=YOUR_APP_KEY&device_id=user12345"
```

**Response** (200):
```json
{
  "button_color": "#FF5733",
  "max_items": 50,
  "feature_enabled": true
}
```

### Example 2: Comparison with preferred endpoint

**Legacy endpoint**:
```bash
curl "...method=fetch_remote_config&app_key=KEY&device_id=ID"
```

**Preferred endpoint** (identical result):
```bash
curl "...method=rc&app_key=KEY&device_id=ID"
```

**Response** (both return identical):
```json
{
  "button_color": "#FF5733",
  "max_items": 50
}
```

---

## Technical Notes

### Implementation

Internally, this endpoint:
1. Recognizes `method=fetch_remote_config`
2. **Calls same handler** as `method=rc`
3. Returns identical response

### Legacy Status

**Why it exists**:
- Early SDK versions used `fetch_remote_config` method
- Endpoint maintained for backwards compatibility
- Prevents breaking existing SDK integrations

**Migration recommendation**:
- Update SDKs to use `method=rc` when possible
- No functionality difference
- `method=rc` is shorter and clearer

### Performance

**Identical** to `/o/sdk?method=rc`:
- Typical response time: 50-150ms
- Same database queries
- Same processing overhead

---

## Related Endpoints

- [Get Remote Config](./o-sdk-rc.md) - **Use this instead** (preferred endpoint)
- [Enroll in AB Tests](./o-sdk-ab.md) - Explicit AB test enrollment
- [Get All Configs](./o-remote-config.md) - Dashboard endpoint

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - config returned | JSON object with key-value pairs |
| `200` | Success - no matching params | `{}` (empty object) |
| `400` | Invalid app_key | `{"result": 400, "message": "..."}` |

---

## Implementation Notes

1. **Perfect alias**: 100% functionally identical to `/o/sdk?method=rc`
2. **Same request parameters**: All parameters work identically
3. **Same response format**: JSON key-value pairs
4. **Same value resolution**: AB testing > Conditions > Default
5. **Maintained indefinitely**: No deprecation/removal planned
6. **Prefer `method=rc`**: Simpler, clearer, recommended for new code

For complete functionality documentation, parameters, examples, and behavior details, see: [Get Remote Config (`/o/sdk?method=rc`)](./o-sdk-rc.md)

## Last Updated

February 2026
