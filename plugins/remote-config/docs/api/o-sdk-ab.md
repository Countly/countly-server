---
sidebar_label: "AB Enrollment"
---

# Remote Config - AB Enrollment

## Endpoint

```plaintext
/o/sdk?method=ab
```

## Overview

Enrolls a device into active A/B-tested remote config parameters for the specified parameter keys.

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
| `method` | String | Yes | Must be `ab`. |
| `app_key` | String | Yes | App key used by SDK endpoints. |
| `device_id` | String | Yes | Device/user identifier for enrollment. |
| `keys` | String (JSON Array) | Yes | Array of remote config parameter keys to enroll. |
| `metrics` | String (JSON Object) or Object | No | User properties used when evaluating conditions. |
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
  "result": "Successfully enrolled in ab tests"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Enrollment status message. |

### Error Responses

- `400`

```json
{
  "result": "Missing Keys"
}
```

- `400`

```json
{
  "result": "Error while fetching remote config data."
}
```

## Behavior/Processing

- `keys` is parsed from JSON string; if parsing fails or list is empty, request returns `Missing Keys`.
- Only parameters that are eligible through A/B logic are processed for enrollment.
- Endpoint returns a success message, not enrolled parameter values.

## Database Collections

This endpoint does not directly query database collections.

Enrollment candidates are resolved via the `/ab/parameters` integration hook.

---

## Examples

### Enroll for two parameter keys

```plaintext
/o/sdk?method=ab&app_key=YOUR_APP_KEY&device_id=device-123&keys=["button_color","price_plan"]
```

### Enroll with metrics for targeting

```plaintext
/o/sdk?method=ab&app_key=YOUR_APP_KEY&device_id=device-123&keys=["welcome_message"]&metrics={"platform":"iOS","country":"US"}
```

## Limitations

- Requires non-empty `keys` array.
- Response does not include resolved config values.

---

## Related Endpoints

- [Remote Config - SDK Read](o-sdk-rc.md)
- [Remote Config - SDK Fetch (Legacy Alias)](o-sdk-fetch.md)

## Last Updated

2026-03-05
