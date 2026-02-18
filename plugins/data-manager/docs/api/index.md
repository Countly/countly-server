---
sidebar_position: 1
sidebar_label: "Overview"
---

# Data Manager

The **Data Manager** feature provides comprehensive event schema management, data validation, transformations, and data masking capabilities.


## Database Collections

| Collection | Purpose |
|---|---|
| `events` | Event definitions with display names, segments, and visibility settings |
| `event_transformations` | Data transformation rules (merge, rename) with execution history |
| `app_users{appId}` | User profiles with custom properties managed by data-manager |


## Configuration & Settings

Data Manager settings:
- **Auto-validation**: Automatically validate new events and properties
- **Retention Period**: How long to keep validationrecords (default: 90 days)
- **Transformation Modes**: Real-time vs historical data transformation options

## API Endpoints

- [I Data Manager Category Create](./i-data-manager-category-create.md)
- [I Data Manager Category Delete](./i-data-manager-category-delete.md)
- [I Data Manager Category Edit](./i-data-manager-category-edit.md)
- [I Data Manager Event Change Category](./i-data-manager-event-change-category.md)
- [O Data Manager Category](./o-data-manager-category.md)
- [O Data Manager Events](./o-data-manager-events.md)

## Last Updated

2026-02-17
