---
sidebar_position: 1
sidebar_label: "Overview"
---

# Events Management

## Overview

Events management endpoints control event metadata and lifecycle: visibility, mapping, segment whitelisting, and permanent event deletion.

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.members` | Provides member identity and app-level permissions used by events write/read validators. |
| `countly.events` | Stores app-level event metadata (`list`, `order`, `map`, `overview`, `segments`, `omitted_segments`, `whitelisted_segments`). |
| `countly.events_data` | Stores aggregated event and segment metric documents touched by event configuration cleanup. |
| `countly.events{sha1(eventKey+appId)}` | Per-event aggregate collection dropped during event deletion. |
| `countly_drill.drill_meta` | Stores drill event and segment metadata used/updated by edit-map operations. |

## Configuration & Settings

| Setting | Impact |
|---|---|
| `api.event_limit` | Controls maximum event keys loaded from drill metadata while sanitizing/validating overview input in edit-map flow. |

## Endpoint Index

### Update
- [Events - Event Visibility Update](i-events-change-visibility.md) - `/i/events/change_visibility`
- [Events - Event Mapping Update](i-events-edit-map.md) - `/i/events/edit_map`
- [Events - Event Segment Whitelist](i-events-whitelist-segments.md) - `/i/events/whitelist_segments`

### Delete
- [Events - Event Delete](i-events-delete.md) - `/i/events/delete_events`

## Operational Notes

- Visibility and mapping changes update metadata only; they do not automatically delete all historical event data.
- Event deletion is destructive and can remove event datasets and related integrations.

## Last Updated

2026-02-17