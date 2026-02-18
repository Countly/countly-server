---
sidebar_label: "Generate QR Code"
---

# /i/two-factor-auth?method=generate-qr-code

## Overview

Generates a new TOTP secret and corresponding QR code for 2FA setup. Returns both the secret token (for manual entry) and a base64-encoded QR code image that users can scan with authenticator apps.

---

## Endpoint


```plaintext
/i/two-factor-auth?method=generate-qr-code
```


---


## Authentication

Endpoint uses authenticated dashboard user context. Validation method in code: `validateUser`.


## Permissions

- No separate feature permission is checked beyond authenticated user validation (`validateUser`).

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `method` | String | Yes | Must be `generate-qr-code` |

---

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `server.globally_enabled.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `two-factor-auth.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

**Status Code**: `200 OK`

### Success Response

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `secret` | String | Base32-encoded TOTP secret token for manual entry |
| `qrCode` | String | Base64-encoded PNG QR code image as data URI |

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

### Example 1: Generate QR Code for 2FA Setup

**Description**: Generate a new 2FA setup QR code and secret for the authenticated user.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "session_cookie" \
  -d "method=generate-qr-code"
```

**Response**:
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAAAXNSR0IArs4c6QAAIABJREFUeF7t..."
}
```

---

### Example 2: Generate QR Code for Display in UI

**Description**: Frontend requests QR code to display in user settings.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "countly_session=abc123..." \
  -d "method=generate-qr-code"
```

**Response**:
```json
{
  "secret": "MFRGGZDFMZTWQ2LK",
  "qrCode": "data:image/png;base64,..."
}
```

The frontend can then:
1. Display the QR code in an `<img>` tag: `<img src="data:image/png;base64,..."/>`
2. Show the secret for manual entry
3. Prompt user to scan with Google Authenticator, Authy, etc.

---

## Behavior/Processing

### Secret Generation
1. Uses `otplib.authenticator.generateSecret()` to create random TOTP secret
2. Secret is Base32-encoded per RFC 4648
3. Compatible with TOTP standard (RFC 6238)

### QR Code Generation
1. Calls `generateQRCode()` from feature library
2. Encodes secret with username into TOTP URI format: `otpauth://totp/Countly:username?secret=SECRET&issuer=Countly`
3. Generates PNG image of QR code
4. Base64-encodes image for data URI format
5. Returns as `data:image/png;base64,...` string

### Setup Flow
1. User requests QR code generation (this endpoint)
2. Frontend displays QR code image
3. User scans with authenticator app
4. Authenticator app generates 6-digit codes
5. User enters code to verify (see [enable endpoint](./i-two-factor-auth-enable.md))
6. 2FA is activated after successful verification

---

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Member/account metadata | Stores member identity/profile fields used for enrichment and ownership checks. |

---

## Technical Notes

- **TOTP Standard**: Uses Time-based One-Time Password Algorithm (RFC 6238)
- **Base32 Encoding**: Secret encoded per RFC 4648 for compatibility
- **QR Format**: Follows `otpauth://` URI scheme standard
- **Image Format**: PNG encoded as base64 data URI
- **Authenticator Apps**: Compatible with Google Authenticator, Authy, Microsoft Authenticator, etc.
- **No Storage**: Secret not stored until user completes verification via enable endpoint
- **Session Required**: Must be authenticated user (cookie required)

---

## Error Responses

**500 Internal Server Error**:
```json
{
  "result": "Error generating QR code"
}
```

Occurs when QR code generation fails (rare).

---

## Security Considerations

- **Unique Secret**: Each call generates a new unique secret
- **Temporary**: Secret not persisted until user verifies and enables 2FA
- **Secure Transport**: Always use HTTPS to prevent secret interception
- **One-Time Setup**: User should save secret in authenticator app immediately
- **Backup Codes**: Consider generating backup codes separately (not provided by this endpoint)

---

## Related Endpoints

- [Enable 2FA](./i-two-factor-auth-enable.md) - Verify code and activate 2FA
- [Disable 2FA](./i-two-factor-auth-disable.md) - Disable 2FA for current user
- [Admin Check 2FA Status](./i-two-factor-auth-admin-check.md) - Check if user has 2FA enabled
- [Admin Disable 2FA](./i-two-factor-auth-admin-disable.md) - Force disable user's 2FA

---

## Enterprise

Plugin: two-factor-auth
Endpoint: /i/two-factor-auth?method=generate-qr-code

## Last Updated

February 2026
