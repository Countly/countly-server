---
sidebar_position: 1
sidebar_label: "Overview"
---

# Data Export - API Documentation

## Overview

Export endpoints generate downloadable data files from collections, request handlers, or provided in-memory payloads.

## Quick Links

- [Data Export - Export Database](./o-export-db.md) - `/o/export/db`
- [Data Export - Export Request](./o-export-request.md) - `/o/export/request`
- [Data Export - Export Request Query](./o-export-requestquery.md) - `/o/export/requestQuery`
- [Data Export - Export Data](./o-export-data.md) - `/o/export/data`
- [Data Export - Download Export](./o-export-download.md) - `/o/export/download/{task_id}`

## Authentication & Permissions

- Export creation endpoints use dashboard user authentication (`api_key` or `auth_token`).
- `/o/export/db`, `/o/export/request`, `/o/export/requestQuery`, and `/o/export/data` require authenticated dashboard access.
- `/o/export/download/{task_id}` is validated with core read access rules.

## Export Modes

1. Database export:
   - Reads directly from a selected collection and streams/returns a formatted file.
2. Request export:
   - Calls an internal endpoint and exports its returned payload.
3. Request-query export:
   - Creates an async export task and returns a task ID.
4. Data export:
   - Exports a provided data payload without querying DB collections.
5. Download:
   - Streams task output from stored task results.

## Supported Formats

- `json`
- `csv`
- `xls`
- `xlsx`

## Configuration & Settings

| Setting | Affects | Impact |
|---|---|---|
| `api.export_limit` | `/o/export/db` | Caps maximum exported document count when `limit` is provided. |

## Storage & Collections

| Collection | Purpose |
|---|---|
| `countly.members` | Member identity/permissions used by export endpoint management-read and core-read validations. |
| `countly.long_tasks` | Stores async export task metadata, status, and output references. |
| `countly_fs.task_results` | Stores large/binary export results (GridFS). |

## Related Endpoints

- [Tasks - Task Status](../tasks/o-tasks-task.md)
- [Tasks - All Tasks](../tasks/o-tasks-all.md)

## Last Updated

2026-02-17
