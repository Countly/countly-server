---
sidebar_label: "Permissions Metadata Read"
---

# Users Management - Permissions Metadata Read

## Endpoint

```plaintext
/o/users/permissions
```

## Overview

Returns feature permission dependency metadata used when building permission matrices.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires `core` read permission for the selected app scope.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes for non-global-admin users | App id used by read-permission validation. |

## Response

### Success Response

```json
{
  "features": [
    "core",
    "events"
  ],
  "featuresPermissionDependency": {
    "data_manager": {
      "u": {
        "data_manager": ["r", "u"]
      }
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `features` | Array of String | Base feature list used in dependency calculation. |
| `featuresPermissionDependency` | Object | Dependency graph populated by installed modules. |
| `featuresPermissionDependency.featureKey.crudKey.dependencyFeatureKey` | Array of String | Required CRUD permissions for dependency feature. |

### Error Responses

Authentication and authorization failures are returned by the common auth layer.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Dependency graph returned | Permissions check passes | Object containing `features` and `featuresPermissionDependency`. |

## Database Collections

This endpoint does not directly read or write database collections.

---

## Examples

### Example 1: Read permission dependency metadata

```plaintext
/o/users/permissions?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2
```

---

## Limitations

- Output is metadata for permission dependency, not a per-user effective-permissions result.
- Content depends on installed modules that contribute dependency rules.

## Related Endpoints

- [User Update](i-users-update.md)
- [Current User Read](o-users-me.md)

## Last Updated

2026-02-17
