---
sidebar_label: "Features List"
---

# System - Enabled Features List

## Endpoint

```plaintext
/o/system/plugins
```

## Overview

Returns enabled feature identifiers for the current server.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires authenticated dashboard user access to management-read endpoints.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |

## Response

### Success Response

```json
[
  "core",
  "plugins",
  "dashboards",
  "users",
  "events"
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Array of String | Enabled feature/plugin identifiers. |

### Error Responses

Authentication and authorization failures are returned by the common auth layer.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Features list | Authenticated request | Array of feature IDs. |

## Database Collections

This endpoint does not directly read or write database collections.

---

## Examples

### Example 1: List enabled features

```plaintext
/o/system/plugins?api_key=YOUR_API_KEY
```

```json
[
  "core",
  "events",
  "dashboards"
]
```

---

## Related Endpoints

- [System Version Read](./o-system-version.md)
- [Observability Read](./o-system-observability.md)

## Last Updated

2026-02-17
