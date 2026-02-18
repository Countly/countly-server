---
sidebar_position: 1
sidebar_label: "Overview"
---

# Apps Management

## Overview

Core application management APIs for creating apps, updating app metadata/config, reading app access views, resetting app data, and deleting apps.

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.apps` | Stores app definitions and app-level plugin configuration. |
| `countly.app_users{appId}` | Stores per-app user profiles and activity metadata. |
| `countly.members` | Stores member app permissions and app ownership references. |
| `countly.groups` | Stores group-level app permissions (when Groups feature is enabled). |
| `countly.long_tasks` | Stores long-task records removed during app deletion/reset cleanup. |
| `countly.events` | Stores event definitions, event map metadata, and event configuration per app. |
| `countly.events_data` | Stores aggregated event metric documents cleaned by app reset/delete. |
| `countly_drill.drill_events` | Stores granular drill events cleaned by app reset/delete. |
| `countly_drill.drill_meta` | Stores drill metadata cleaned by app reset/delete. |
| `countly_fs` | Stores app image files used by app create/update/delete flows. |

## Configuration & Settings

| Setting | Impact |
|---|---|
| `apps.country` | Default country used when app create input country is missing or invalid. |
| `apps.timezone` | Default timezone used when app create input timezone is missing or invalid. |
| `apps.category` | Default category used when app create input category is missing or invalid. |

## Endpoint Index

### Create
- [Apps - App Create](i-apps-create.md) - `/i/apps/create`

### Read
- [Apps - App Read All](o-apps-all.md) - `/o/apps/all`
- [Apps - App Read Mine](o-apps-mine.md) - `/o/apps/mine`
- [Apps - App Read Details](o-apps-details.md) - `/o/apps/details`
- [Apps - App Read Plugins](o-apps-plugins.md) - `/o/apps/plugins`

### Update
- [Apps - App Update](i-apps-update.md) - `/i/apps/update`

### Delete
- [Apps - App Delete](i-apps-delete.md) - `/i/apps/delete`

### Reset
- [Apps - App Reset](i-apps-reset.md) - `/i/apps/reset`

## Operational Notes

- App delete and reset are destructive operations and can touch large data domains.
- Delete/reset returns success after cleanup flow starts; related cleanup work continues across multiple collections.

## Last Updated

2026-02-17