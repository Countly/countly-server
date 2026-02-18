---
sidebar_position: 1
sidebar_label: "Overview"
---

# Data Migration - API Documentation

## Overview

The Data Migration feature exports app data from one Countly environment and imports it into another. It supports archive generation, remote transfer, import token flow, lifecycle status tracking, and cleanup operations.

## Quick Links

- [Data Migration - Export](i-datamigration-export.md)
- [Data Migration - Send Existing Export](i-datamigration-sendexport.md)
- [Data Migration - Stop Export](i-datamigration-stop_export.md)
- [Data Migration - Import](i-datamigration-import.md)
- [Data Migration - Report Import Status](i-datamigration-report_import.md)
- [Data Migration - Delete Export](i-datamigration-delete_export.md)
- [Data Migration - Delete Import](i-datamigration-delete_import.md)
- [Data Migration - Delete All Migration Files](i-datamigration-delete_all.md)
- [Data Migration - Get My Exports](o-datamigration-getmyexports.md)
- [Data Migration - Get My Imports](o-datamigration-getmyimports.md)
- [Data Migration - Get Status](o-datamigration-getstatus.md)
- [Data Migration - Create Import Token](o-datamigration-createimporttoken.md)
- [Data Migration - Validate Remote Connection](o-datamigration-validateconnection.md)
- [Data Migration - Get Runtime Config](o-datamigration-get_config.md)

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.data_migrations` | Tracks export/import jobs, progress, remote handoff details, and status history fields. |
| `countly.auth_tokens` | Stores scoped import tokens created for migration import endpoint access. |
| `countly.systemlogs` | Stores migration lifecycle audit actions (for example export/import success/failure and callback reporting). |
| `countly.*` and `countly_drill.*` | Source/target app data collections read during export and written during import. |

## Configuration & Settings

| Setting | Default | Effect |
|---|---|---|
| Nginx `client_max_body_size` | Web-server default | Influences practical max import upload size; surfaced by `o/datamigration/get_config` as `fileSizeLimit`. |
| `security` request config | Server-defined | Affects outbound remote calls used by validate/send/report migration workflows. |

## Operational Flow

1. Export app data (`i/datamigration/export`) and capture export ID.
2. Validate remote target (`o/datamigration/validateconnection`) if exporting to another server.
3. Send export (`i/datamigration/sendexport`) or transfer archive manually.
4. Start import (`i/datamigration/import`) and track status (`o/datamigration/getstatus`).
5. Clean up local artifacts when done (`i/datamigration/delete_export`, `i/datamigration/delete_import`, `i/datamigration/delete_all`).

## Last Updated

2026-02-17
