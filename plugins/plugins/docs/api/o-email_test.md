---
sidebar_label: "Email Test"
---

# /o/email_test

## Endpoint

```plaintext
/o/email_test
```

## Overview

Sends a test email to the authenticated global admin user's email address to verify current mail delivery setup.

## Authentication

Countly API supports three authentication methods:

1. **API Key** (parameter): `api_key=YOUR_API_KEY`
2. **Auth Token** (parameter): `auth_token=YOUR_AUTH_TOKEN`
3. **Auth Token** (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Required permission: Global Admin.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `config.mail.transport` | `nodemailer-smtp-transport` fallback behavior | Processing flow | Mail transport selection controls whether test email can be sent. |
| `config.mail.config` | Server configuration | Processing flow | SMTP/sendmail connection settings determine success or failure of test delivery. |
| `white-labeling.emailFrom` / `white-labeling.emailCompany` | Empty | Message metadata | If configured, affects sender identity used by outbound email module. |

## Response

### Success Response

```json
{
  "result": "OK"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | `OK` when send operation succeeds. |

### Error Responses

`503 Service Unavailable`

```json
{
  "result": "Failed"
}
```

`400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

`400 Bad Request`

```json
{
  "result": "Token not valid"
}
```

`401 Unauthorized`

```json
{
  "result": "User does not exist"
}
```

`401 Unauthorized`

```json
{
  "result": "User does not have right"
}
```

`401 Unauthorized`

```json
{
  "result": "User is locked"
}
```

`401 Unauthorized`

```json
{
  "result": "Token is invalid"
}
```

## Behavior/Processing

- Validates global-admin access.
- Uses authenticated member email as recipient.
- Builds subject/body from localization file when available for the member language.
- Sends mail through configured server mail transport.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Global-admin validation and recipient lookup | Reads authenticated user's account and email address. |

## Examples

### Send test email

```plaintext
/o/email_test?api_key=YOUR_API_KEY
```

## Limitations

- Recipient address is always the authenticated admin user's email.
- The endpoint validates send attempt, not mailbox delivery/open status.

## Related Endpoints

- [Features - Global Config Read](o-configs.md)

## Last Updated

2026-02-17
