---
sidebar_position: 1
sidebar_label: "Overview"
---

# Two Factor Auth

## Overview

Two Factor Auth adds TOTP-based second-factor authentication for dashboard users.

## Configuration & Settings

| Setting | Default | Purpose |
|---|---|---|
| `two-factor-auth.globally_enabled` | `false` | When enabled, users cannot disable their own 2FA. |

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.members` | Stores per-user 2FA status and encrypted secret token. |
| `countly.systemlogs` | Stores 2FA enable/disable audit actions. |

## Endpoints

- [Two Factor Auth - Enable](i-two-factor-auth-enable.md) - `/i/two-factor-auth?method=enable`
- [Two Factor Auth - Disable](i-two-factor-auth-disable.md) - `/i/two-factor-auth?method=disable`
- [Two Factor Auth - Admin Check](i-two-factor-auth-admin-check.md) - `/i/two-factor-auth?method=admin_check`
- [Two Factor Auth - Admin Disable](i-two-factor-auth-admin-disable.md) - `/i/two-factor-auth?method=admin_disable`

## Last Updated

2026-03-05
