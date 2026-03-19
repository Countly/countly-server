---
sidebar_label: "SDK Read"
---

# Remote Config - SDK Read

## Endpoint

```plaintext
/o/sdk?method=rc
```

## Overview

Returns remote config values for a device by resolving active parameters, A/B values, condition matches, and defaults.

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
| `method` | String | Yes | Must be `rc`. |
| `app_key` | String | Yes | App key used by SDK endpoints. |
| `device_id` | String | Yes | Device/user identifier for config resolution. |
| `keys` | String (JSON Array) | No | Include only listed parameter keys. |
| `omit_keys` | String (JSON Array) | No | Exclude listed parameter keys. |
| `metrics` | String (JSON Object) or Object | No | User properties used for condition matching. |
| `oi` | Number/String | No | Enrollment flag used by RC/AB flow when supported by SDK request context. |
| `timestamp` | Number | No | Optional event timestamp context. |
| `city` | String | No | Optional location context. |
| `country_code` | String | No | Optional location context. |
| `location` | String | No | Optional location context. |
| `tz` | String/Number | No | Optional timezone context. |
| `ip_address` | String | No | Optional IP override for geo-derived properties. |

## Response

### Success Response

```json
{
  "button_color": "#FF5722",
  "max_items": 50,
  "feature_enabled": true,
  "welcome_message": "Welcome"
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

- Active-parameter filter includes only parameters with status `Running` (or missing status) and with future/null expiry.
- Value resolution priority per parameter: A/B-tested value, then first matching condition value, then default value.
- `keys`/`omit_keys` are parsed from JSON strings. Parse failures are ignored and request continues without that filter.
- Condition matching uses processed user metrics and derived `random_percentile` for seeded rollout logic.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_out.remoteconfig_parameters{appId}` | Parameter definitions and defaults | Reads parameter definitions and associated condition values. |
| `countly_out.remoteconfig_conditions{appId}` | Condition definitions | Reads condition rules used for per-user matching. |

---

## Examples

### Fetch all active remote config values

```plaintext
/o/sdk?method=rc&app_key=YOUR_APP_KEY&device_id=device-123
```

### Fetch only selected keys

```plaintext
/o/sdk?method=rc&app_key=YOUR_APP_KEY&device_id=device-123&keys=["button_color","max_items"]
```

### Fetch with targeting metrics

```plaintext
/o/sdk?method=rc&app_key=YOUR_APP_KEY&device_id=device-123&metrics={"_os":"iOS","_app_version":"24.3.0"}
```

## Limitations

- If no parameters match, response is `{}`.
- Response payload includes resolved values only, not parameter metadata.

---

## Related Endpoints

- [Remote Config - SDK Fetch (Legacy Alias)](o-sdk-fetch.md)
- [Remote Config - AB Enrollment](o-sdk-ab.md)
- [Remote Config - Dashboard Read](o-remote-config.md)

## Last Updated

2026-03-05
