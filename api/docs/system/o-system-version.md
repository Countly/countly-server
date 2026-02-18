---
sidebar_label: "Version Read"
---

# System - Version Read

## Endpoint

```plaintext
/o/system/version
```

## Overview

Returns the Countly server version string.

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
{
  "version": "24.11.0"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `version` | String | Countly server version. |

### Error Responses

Authentication and authorization failures are returned by the common auth layer.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Version response | Authenticated request | Object with `version` field. |

## Database Collections

This endpoint does not directly read or write database collections.

---

## Examples

### Example 1: Read server version

```plaintext
/o/system/version?api_key=YOUR_API_KEY
```

```json
{
  "version": "24.11.0"
}
```

---

## Related Endpoints

- [Enabled Features List](./o-system-plugins.md)
- [Observability Read](./o-system-observability.md)

## Last Updated

2026-02-17
