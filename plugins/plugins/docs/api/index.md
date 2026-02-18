---
sidebar_position: 1
sidebar_label: "Overview"
---

# Features - API Documentation

## Overview

The Features API manages feature enablement, global configuration, user-scoped configuration, and related operational metadata.

## Quick Links

- [Features - Global Config Read](./o-configs.md)
- [Features - Global Config Update](./i-configs.md)
- [Features - User Config Read](./o-userconfigs.md)
- [Features - User Config Update](./i-userconfigs.md)
- [Features - Feature List](./o-plugins.md)
- [Features - Feature State Update](./i-plugins.md)
- [Features - Feature State Check](./o-plugins-check.md)
- [Features - Internal Events Read](./o-internal-events.md)
- [Features - Themes List](./o-themes.md)
- [Features - Email Test](./o-email_test.md)

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.plugins` | Stores feature enablement state and global configuration values under `_id: "plugins"`. |
| `countly.members` | Stores dashboard user profile and per-user settings used by user-config endpoints. |
| `countly.auth_tokens` | Stores dashboard auth token TTL metadata updated by session-timeout configuration flows. |
| `countly.apps` | Used by app-admin read validation where `app_id` context is required. |

## Configuration & Settings

- `frontend.session_timeout` affects token TTL/expiration update behavior in config-update endpoints.
- `member.lang` affects localized title/description fallback for disabled features in feature list output.

## Last Updated

2026-02-17
