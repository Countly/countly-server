---
sidebar_position: 1
sidebar_label: "Overview"
---

# Background Tasks - API Documentation

## Overview

Tasks endpoints manage asynchronous jobs stored in the task manager (create/rerun/check/list/delete task records).

## Quick Links

- [Tasks - Update Task](./i-tasks-update.md) - `/i/tasks/update`
- [Tasks - Edit Task](./i-tasks-edit.md) - `/i/tasks/edit`
- [Tasks - Name Task](./i-tasks-name.md) - `/i/tasks/name`
- [Tasks - Delete Task](./i-tasks-delete.md) - `/i/tasks/delete`
- [Tasks - Read All Tasks](./o-tasks-all.md) - `/o/tasks/all`
- [Tasks - Count Tasks](./o-tasks-count.md) - `/o/tasks/count`
- [Tasks - List Tasks](./o-tasks-list.md) - `/o/tasks/list`
- [Tasks - Read Task](./o-tasks-task.md) - `/o/tasks/task`
- [Tasks - Check Task Status](./o-tasks-check.md) - `/o/tasks/check`

## Data Model

| Collection | Purpose |
|---|---|
| `countly.members` | Member identity/permissions used by task endpoint read/write validators and visibility filters. |
| `countly.long_tasks` | Stores task metadata, status, request payload, and optional inline result metadata. |
| `countly_fs.task_results` | Stores large/binary task results when GridFS-backed task storage is used. |

## Behavior Notes

- Task execution can be synchronous to caller (status response) but usually results are asynchronous.
- Some endpoints return wrapped `result` payloads, while others return raw objects.
- Visibility rules combine task ownership (`creator`) and global-task visibility.

## Related Endpoints

- [Data Export - Export Request Query](../export/o-export-requestquery.md)
- [Data Export - Download Export](../export/o-export-download.md)

## Last Updated

2026-02-17
