---
sidebar_position: 1
sidebar_label: "Overview"
---

# App Users Management

## Overview

Core app-user management APIs for direct user profile maintenance, export/download workflow, and loyalty analytics.

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.app_users{appId}` | App-scoped user profiles and export metadata (`appUserExport`). |
| `countly.apps` | App metadata and user-sequence (`seq`) used during user creation. |
| `countly.exports` | Stored export payload rows for app-user export artifacts. |
| `countly.long_tasks` | Long-task records for async export processing. |
| `countly_drill.drill_events` | Granular drill events deleted during user removal cleanup. |
| `countly_fs` | GridFS storage for generated app-user export archives. |

## Endpoint Index

### Create
- [App Users - User Create](i-app-users-create.md) - `/i/app_users/create`

### Read
- [App Users - Read Loyalty](o-app-users-loyalty.md) - `/o/app_users/loyalty`
- [App Users - Export Download](o-app-users-download.md) - `/o/app_users/download/{id}`

### Update
- [App Users - User Update](i-app-users-update.md) - `/i/app_users/update`

### Delete
- [App Users - User Delete](i-app-users-delete.md) - `/i/app_users/delete`
- [App Users - Export Delete](i-app-users-deleteexport.md) - `/i/app_users/deleteExport/{id}`

### Export
- [App Users - Export Create](i-app-users-export.md) - `/i/app_users/export`

## Operational Notes

- Update/delete endpoints include guardrails against accidental multi-user changes unless `force` is provided.
- Export can return either a direct result or task-based output depending on processing time and task state.
- Download returns streamed content (archive stream first, then JSON-stream fallback).

## Last Updated

2026-02-17