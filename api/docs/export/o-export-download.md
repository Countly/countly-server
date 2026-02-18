---
sidebar_label: "Download Export"
---

# /o/export/download/{task_id}

## Endpoint

```plaintext
/o/export/download/{task_id}
```

## Overview

Downloads a previously generated export file by task ID.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires core read access validation.
- `app_id` is required for non-global users by read validation rules.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes (for non-global users) | App context used in access validation. |
| `{task_id}` | String | Yes | Long task ID from `/o/export/requestQuery` response. |

## Response

### Success Response

CSV file example (download body):

```csv
country,total_sessions,new_users
United States,121,11
Spain,87,6
```

JSON file example (download body):

```json
[
  {
    "country": "United States",
    "total_sessions": 121,
    "new_users": 11
  },
  {
    "country": "Spain",
    "total_sessions": 87,
    "new_users": 6
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(download body)` | String or Binary | Export file content retrieved from task storage. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing filename"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Export size is 0"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Export stream does not exist"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| GridFS file mode | Task output exists in `task_results` GridFS bucket with non-zero size | Loads task metadata and streams stored file bytes with attachment headers. | HTTP file stream (non-JSON body) |
| Legacy inline-data mode | Task type is `dbviewer`, task has inline `data`, GridFS size is zero | Returns legacy inline JSON payload from task document. | HTTP JSON body/file download |
| Empty-output error mode | GridFS size is zero and task is not eligible for inline fallback | Returns explicit export-size error. | Wrapped string `{ "result": "Export size is 0" }` |

### Impact on Other Data

- Read-only endpoint. Does not modify export/task content.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint itself.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and read-permission validation | Reads caller identity for core-read access validation. |
| `countly.long_tasks` | Task lookup by ID | Reads task metadata (`report_name`, `type`, storage mode). |
| `countly_fs.task_results` | Stored export file content | Reads and streams export file bytes. |

---

## Examples

### Example 1: Download task output

```plaintext
/o/export/download/17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2
```

## Operational Considerations

- Download availability depends on task completion and stored output.
- Large files are streamed from GridFS.

## Limitations

- If task output is empty and not in compatible legacy format, download fails.
- Invalid or missing task IDs do not produce export output.

---

## Related Endpoints

- [Data Export - Export Request Query](./o-export-requestquery.md)
- [Tasks - Task Status](../tasks/o-tasks-task.md)

## Last Updated

2026-02-17
