---
sidebar_label: "Environment Save"
---

# Populator - Environment Save

## Endpoint

```text
/i/populator/environment/save
```

## Overview

Creates generated environment users from a selected template and can also register environment metadata for later listing and reuse.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `Create` permission for the Populator feature.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `app_id` | String | Yes | App context for permission checks. |
| `api_key` | String | Conditional | Required when `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required when `api_key` is not provided. |
| `users` | JSON String (Array) | Yes | Array of generated-user records to store. |
| `setEnviromentInformationOnce` | Boolean/String | No | When truthy, inserts environment metadata in addition to users. |

### `users` Array Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `appId` | String | Yes | App ID used in generated IDs and environment metadata. |
| `templateId` | String | Yes | Template ID tied to this environment. |
| `environmentName` | String | Yes | Environment name used to derive environment ID. |
| `deviceId` | String | Yes | Device identifier used in per-user `_id`. |
| `userName` | String | No | User display/login name. |
| `platform` | String | No | Platform (for example `iOS`, `Android`, `Web`). |
| `device` | String | No | Device model/type. |
| `appVersion` | String | No | App version assigned to the generated user. |
| `custom` | Object | No | Custom user fields stored with generated user. |

Decoded example for `users`:

```json
[
  {
    "appId": "6991c75b024cb89cdc04efd2",
    "templateId": "65f0cbf8bca6b8e8fbf7f901",
    "environmentName": "Production Seed",
    "userName": "qa_user_001",
    "platform": "iOS",
    "device": "iPhone 15",
    "appVersion": "3.2.1",
    "deviceId": "device-ios-001",
    "custom": {
      "plan": "premium",
      "region": "EU"
    }
  },
  {
    "appId": "6991c75b024cb89cdc04efd2",
    "templateId": "65f0cbf8bca6b8e8fbf7f901",
    "environmentName": "Production Seed",
    "userName": "qa_user_002",
    "platform": "Android",
    "device": "Pixel 8",
    "appVersion": "3.2.1",
    "deviceId": "device-android-002",
    "custom": {
      "plan": "free",
      "region": "US"
    }
  }
]
```

Send it stringified in the request.

## Response

### Success Response

```json
{
  "result": "Successfully created "
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Fixed success message returned after user insert succeeds. |

### Error Responses

`400 Bad Request`

```json
{
  "result": "Missing params: users"
}
```

`400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

`401 Unauthorized`

```json
{
  "result": "No app_id provided"
}
```

`500 Internal Server Error`

```json
{
  "result": "DATABASE_ERROR_MESSAGE"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Environment metadata + users | `setEnviromentInformationOnce` is truthy | Computes environment ID, inserts environment metadata, inserts generated users. | Wrapped object: `{ "result": "Successfully created " }` |
| Users only | `setEnviromentInformationOnce` not provided/falsy | Computes environment ID and inserts generated users only. | Wrapped object: `{ "result": "Successfully created " }` |

### Impact on Other Data

- Inserts generated user rows into `countly.populator_environment_users`.
- When `setEnviromentInformationOnce` is truthy, inserts one metadata row into `countly.populator_environments`.
- Environment ID is deterministic: SHA-1 of `appId + environmentName`.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `populator_environment_created` | Metadata insert branch succeeds (`setEnviromentInformationOnce` truthy) | `{ environmentId, environmentName, appId, templateId }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.populator_environment_users` | Generated environment users | Inserts one document per user with `_id`, user profile fields, and `createdAt`. |
| `countly.populator_environments` | Environment metadata | Inserts environment record (`_id`, `name`, `templateId`, `appId`, `createdAt`) when metadata branch is enabled. |
| `countly.members` | Authentication and authorization | Reads member context for permission checks. |
| `countly.apps` | App rights validation | Reads app access context from `app_id`. |

---

## Examples

### Create environment and register metadata

```text
https://your-server.com/i/populator/environment/save?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  setEnviromentInformationOnce=true&
  users=[{"appId":"6991c75b024cb89cdc04efd2","templateId":"65f0cbf8bca6b8e8fbf7f901","environmentName":"Production Seed","userName":"qa_user_001","platform":"iOS","device":"iPhone 15","appVersion":"3.2.1","deviceId":"device-ios-001","custom":{"plan":"premium"}}]
```

### Add more users to an existing environment

```text
https://your-server.com/i/populator/environment/save?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  users=[{"appId":"6991c75b024cb89cdc04efd2","templateId":"65f0cbf8bca6b8e8fbf7f901","environmentName":"Production Seed","userName":"qa_user_145","platform":"Android","device":"Pixel 8","appVersion":"3.2.1","deviceId":"device-android-145","custom":{"plan":"free"}}]
```

### Seed a staging environment with mixed devices

```text
https://your-server.com/i/populator/environment/save?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  setEnviromentInformationOnce=true&
  users=[{"appId":"6991c75b024cb89cdc04efd2","templateId":"65f0cbf8bca6b8e8fbf7f901","environmentName":"Staging EU","userName":"stg_ios_01","platform":"iOS","device":"iPhone 14","appVersion":"3.1.0","deviceId":"stg-ios-01","custom":{"region":"EU"}},{"appId":"6991c75b024cb89cdc04efd2","templateId":"65f0cbf8bca6b8e8fbf7f901","environmentName":"Staging EU","userName":"stg_web_01","platform":"Web","device":"Chrome","appVersion":"3.1.0","deviceId":"stg-web-01","custom":{"region":"EU"}}]
```

## Operational Considerations

- `users` is parsed as JSON; invalid JSON falls back to an empty list and returns `Missing params: users`.
- Large `users` payloads increase insert time because user records are inserted in one batch.
- Metadata insert and user insert are separate writes; they are not transactional.

## Limitations

- Success response does not return environment ID or inserted counts.
- Environment/user IDs depend on client-supplied `appId`, `templateId`, `environmentName`, and `deviceId` fields.

---

## Related Endpoints

- [Populator - Environment Check](o-populator-environment-check.md)
- [Populator - Environment List](o-populator-environment-list.md)
- [Populator - Environment Read](o-populator-environment-get.md)
- [Populator - Environment Remove](o-populator-environment-remove.md)

## Last Updated

2026-02-17
