---
sidebar_position: 1
sidebar_label: "Overview"
---

# System Logs

## Overview

System Logs captures administrative and system-level actions for audit and troubleshooting workflows. It supports writing custom entries and reading/filtering historical records for UI tables and exports.

## Key Features

- Record action entries with structured payload data.
- Query logs with search, period filter, pagination, and sorting.
- Export mode that flattens payload details for reporting.
- Metadata endpoint for available action filters and user pickers.

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.systemlogs` | Stores log entries and one metadata document (`_id: "meta_v2"`) used for filter values. |
| `countly.members` | Stores member accounts used for user attribution and metadata user list responses. |

## Configuration & Settings

| Setting | Default | What it affects |
|---|---|---|
| `systemlogs.preventIPTracking` | `false` | When enabled, new log entries are stored with `ip: null` instead of client IP addresses. |

## Endpoints

- [System Logs - Query](o-systemlogs-query.md) - `/o?method=systemlogs`
- [System Logs - Metadata](o-systemlogs-meta.md) - `/o?method=systemlogs_meta`
- [System Logs - Record](i-systemlogs.md) - `/i/systemlogs`

## Last Updated

2026-03-05
