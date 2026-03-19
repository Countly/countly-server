---
sidebar_label: "SDK Fetch (Legacy)"
---

# Remote Config - SDK Fetch (Legacy Alias)

## Endpoint

```plaintext
/o/sdk?method=fetch_remote_config
```

## Overview

Legacy alias for SDK remote config read. This endpoint uses the same runtime path as `method=rc` and returns the same value payload format.

## Authentication

SDK authentication is used.

Required SDK identity parameters:
- `app_key`
- `device_id`

## Permissions

No dashboard permission check is applied. Access is determined by SDK app/device context.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `fetch_remote_config`. |
| `app_key` | String | Yes | App key used by SDK endpoints. |
| `device_id` | String | Yes | Device/user identifier for config resolution. |
| `keys` | String (JSON Array) | No | Include only listed parameter keys. |
| `omit_keys` | String (JSON Array) | No | Exclude listed parameter keys. |
| `metrics` | String (JSON Object) or Object | No | User properties used for condition matching. |
| `oi` | Number/String | No | Enrollment toggle used by RC/AB flow when supported by SDK request context. |
| `timestamp` | Number | No | Optional event timestamp context. |
| `city` | String | No | Optional location context. |
| `country_code` | String | No | Optional location context. |
| `location` | String | No | Optional location context. |
| `tz` | String | No | Optional timezone context. |
| `ip_address` | String | No | Optional IP override for geo-derived properties. |

## Response

### Success Response

```json
{
  "button_color": "#FF5733",
  "max_items": 50,
  "feature_enabled": true
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Remote config key-value map for matched parameters. |
| `{parameter_key}` | String/Number/Boolean/Object/Array | Resolved parameter value. |

### Error Responses

- `400`

```json
{
  "result": "Error while fetching remote config data."
}
```

## Behavior/Processing

- Alias behavior: `fetch_remote_config` is routed through the same remote config resolver as `method=rc`.
- Value priority for each parameter: A/B-tested value first, then first matching condition value, then default value.
- `keys`/`omit_keys` are parsed from JSON strings. Parse failures are ignored and request continues without that filter.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_out.remoteconfig_parameters{appId}` | Parameter definitions and defaults | Reads parameter definitions and associated condition values. |
| `countly_out.remoteconfig_conditions{appId}` | Condition definitions | Reads condition rules used for per-user matching. |

---

## Examples

### Fetch all available parameters

```plaintext
/o/sdk?method=fetch_remote_config&app_key=YOUR_APP_KEY&device_id=device-123
```

### Fetch selected keys only

```plaintext
/o/sdk?method=fetch_remote_config&app_key=YOUR_APP_KEY&device_id=device-123&keys=["button_color","max_items"]
```

### Fetch while excluding keys

```plaintext
/o/sdk?method=fetch_remote_config&app_key=YOUR_APP_KEY&device_id=device-123&omit_keys=["debug_flag"]
```

## Limitations

- Legacy alias kept for compatibility; use `method=rc` for new integrations.
- If there are no matching parameters, response is an empty object.

---

## Related Endpoints

- [Remote Config - SDK Read](o-sdk-rc.md)
- [Remote Config - AB Enrollment](o-sdk-ab.md)

## Last Updated

2026-03-05
