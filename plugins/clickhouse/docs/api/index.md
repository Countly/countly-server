---
sidebar_position: 1
sidebar_label: "Overview"
---

# ClickHouse - API Documentation

## Overview

The ClickHouse feature provides Countly's high-volume analytics storage/query layer. It manages schema bootstrap/validation, query services, identity mapping support, and ingestion/merge integrations.

## Quick Links

This feature does not expose user-facing API endpoints in `core/docs/api`. It is used internally by Countly services and feature modules.

## Data Stores

| Store | Purpose |
|---|---|
| `countly_drill.drill_events` (ClickHouse) | Primary event analytics table used for high-volume event queries. |
| `countly_drill.drill_snapshots` (ClickHouse) | Snapshot aggregates used by drill/query workflows. |
| `identity.uid_map` (ClickHouse) | Identity mapping table used for canonical user resolution and merges. |
| `identity.uid_map_dict` (ClickHouse dictionary) | Dictionary-backed fast lookup for identity resolution in query paths. |

## Configuration & Settings

Primary runtime settings are read from `clickhouse` config namespace (for example `countlyConfig.clickhouse`):

- Connection settings (`url`, `username`, `password`, `database`)
- Client behavior and performance settings (`max_open_connections`, `request_timeout`)
- ClickHouse server settings pass-through (`clickhouse_settings.*`)
- Identity dictionary window (`clickhouse.identity.daysOld`)

## Operational Notes

- In cloud/external-schema mode, startup validates required schema objects and fails fast if missing.
- In non-cloud mode, startup can bootstrap required SQL schema objects automatically.
- Internal app lifecycle hooks clean ClickHouse records on app delete/reset/clear operations.

## Last Updated

2026-02-17
