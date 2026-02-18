---
sidebar_position: 1
sidebar_label: "Overview"
---

# Users Management - API Documentation

## Overview

These endpoints manage dashboard user accounts (`members`) and related account operations such as profile updates, permission metadata lookup, login lock reset, and account deletion.

## Endpoint Index

- [User Create](i-users-create.md) - `/i/users/create`
- [User Update](i-users-update.md) - `/i/users/update`
- [User Delete](i-users-delete.md) - `/i/users/delete`
- [Own Account Delete](i-users-delete-own-account.md) - `/i/users/deleteOwnAccount`
- [Home Settings Update](i-users-updatehomesettings.md) - `/i/users/updateHomeSettings`
- [Users List](o-users-all.md) - `/o/users/all`
- [User Read By ID](o-users-id.md) - `/o/users/id`
- [Current User Read](o-users-me.md) - `/o/users/me`
- [Permissions Metadata Read](o-users-permissions.md) - `/o/users/permissions`
- [Time Ban Reset](o-users-reset-timeban.md) - `/o/users/reset_timeban`

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.members` | Primary dashboard user account records. |
| `countly.failed_logins` | Failed login counters used for lock/ban behavior. |
| `countly.auth_tokens` | Dashboard auth tokens and session-like token entries. |
| `countly.password_reset` | Invite/reset records created and invalidated in user lifecycle operations. |
| `countly.sessions_` | Session records removed when credentials change or users are deleted. |
| `countly.date_presets` | User-owned date presets removed on user deletion. |
| `countly.notes` | User-owned notes removed during administrative user deletion flow. |

## Configuration & Settings

- Password validation in create/update endpoints is controlled by:
  - `security.password_min`
  - `security.password_number`
  - `security.password_char`
  - `security.password_symbol`
- User list `blocked` status calculation is controlled by:
  - `security.login_tries`
  - `security.login_wait`

## Operational Notes

- Create/update/delete/write endpoints in this group are currently global-admin-only routes.
- Deletion flows can be affected by installed modules that process user-delete hooks.

## Last Updated

2026-02-17
