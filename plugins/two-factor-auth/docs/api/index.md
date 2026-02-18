---
sidebar_position: 1
sidebar_label: "Overview"
---

# Two Factor Auth

Two-Factor Authentication (2FA) enhances security by requiring an additional verification code alongside passwords. This feature provides TOTP-based authentication using Google Authenticator or compatible apps.

---

## Key Capabilities

- **User Self-Service**: Enable/disable 2FA for own account
- **Admin Management**: Global admins can check status and disable 2FA for other users
- **QR Code Generation**: Generate setup QR codes and secrets
- **Global Enforcement**: Optionally require 2FA for all users
- **TOTP Standard**: Compatible with Google Authenticator, Authy, and similar apps

---


## Database Collections

| Collection | Purpose |
|---|---|
| `members` | User accounts with 2FA enabled flag and secret keys |
| `recovery_codes` | Backup recovery codes for 2FA reset |


## Configuration & Settings

Two-Factor Authentication settings from `features.setConfigs`:
- **Enforce 2FA**: Require 2FA for all users (default: false)
- **Recovery Codes**: Number of backup codes generated (default: 10)

## Available Endpoints

| Endpoint | Method Parameter | Description |
|----------|------------------|-------------|
| [Generate QR Code](./i-two-factor-auth-generate-qr.md) | `generate-qr-code` | Generate TOTP secret and QR code for setup |
| [Enable 2FA](./i-two-factor-auth-enable.md) | `enable` | Verify code and activate 2FA for user |
| [Disable 2FA](./i-two-factor-auth-disable.md) | `disable` | Disable 2FA for current user (if allowed) |
| [Admin Check Status](./i-two-factor-auth-admin-check.md) | `admin_check` | Check if user has 2FA enabled (admin) |
| [Admin Disable](./i-two-factor-auth-admin-disable.md) | `admin_disable` | Force disable user's 2FA (admin) |

---

## Authentication Flow

1. **Setup**: User requests QR code via `generate-qr-code` method
2. **Scan**: User scans QR code in authenticator app
3. **Enable**: User submits secret token and verification code via `enable` method
4. **Login**: Subsequent logins require 6-digit TOTP code
5. **Disable**: User or admin can disable 2FA via `disable` or `admin_disable` methods

---

## Supported Methods

The `/i/two-factor-auth` endpoint accepts a `method` parameter to determine the action:

- `generate-qr-code` - Generate QR code and secret for setup
- `enable` - Enable 2FA with verification
- `disable` - Disable 2FA for current user
- `admin_check` - Check if specific user has 2FA enabled (admin only)
- `admin_disable` - Disable 2FA for another user (admin only)

---

## Configuration

Feature configuration via `features.getConfig("two-factor-auth")`:

- `globally_enabled` (Boolean) - When `true`, prevents users from disabling their 2FA

---

## Security Notes

- Secret tokens are encrypted before storage
- 6-digit codes must match format: `^\d{6}$`
- Failed verification returns 401 Unauthorized
- Admin operations require global admin privileges


## Last Updated

2026-02-17
