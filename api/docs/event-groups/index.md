---
sidebar_position: 1
sidebar_label: "Overview"
---

# Event Groups - API Documentation

## Overview

Event Groups APIs manage grouped synthetic events with IDs like ``[CLY]_group_hash``.  
These groups are created from source events and can be reordered, enabled/disabled, and removed.

## Quick Links

- [Event Groups - Group Create](i-event-groups-create.md) - `/i/event_groups/create`
- [Event Groups - Group Update](i-event-groups-update.md) - `/i/event_groups/update`
- [Event Groups - Group Delete](i-event-groups-delete.md) - `/i/event_groups/delete`

## Data Sources

| Collection | Used for | Data touched by this feature |
|---|---|---|
| `countly.event_groups` | Group definition storage | `_id`, `app_id`, `name`, `source_events`, `display_map`, `description`, `status`, `order` |
| `countly.events` | Event overview maintenance | Updates `overview` when groups are disabled or deleted. |
| `countly.members` | Auth and permission validation | Resolves member identity and app-level CRUD permissions. |

## Behavior Summary

- Group IDs are generated during create as `[CLY]_group_` + MD5 hash.
- Update supports three modes:
1. Full update (`args`)
2. Reorder (`event_order`)
3. Bulk status update (`update_status` + `status`)
- Disabling or deleting groups removes matching entries from `events.overview`.

## Limitations

- Update and delete parse JSON payload parameters directly (`args`, `event_order`, `update_status`, `status`) without explicit parse-error handling in endpoint code.
- There are no dedicated `/o/event_groups/...` routes; reads use method-based `/o?method=get_event_groups` and `/o?method=get_event_group`.

## Last Updated

2026-02-17
