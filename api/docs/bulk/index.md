---
sidebar_position: 1
sidebar_label: "Overview"
---

# Data Ingestion - API Documentation

## Overview

Ingestion endpoints collect SDK traffic for sessions, events, user properties, and related analytics signals.

## Quick Links

- [Data Ingestion - Main Data Ingestion](./ingestion.md) - `/i`
- [Data Ingestion - Bulk Ingestion](./i-bulk.md) - `/i/bulk`

## Data Flow Summary

- `/i` processes a single ingestion payload.
- `/i/bulk` processes an array of ingestion payloads using the same processing pipeline as `/i`.
- Both endpoints use SDK app authentication (`app_key`).

## Configuration & Settings

| Setting | Affects | Impact |
|---|---|---|
| `api.trim_trailing_ending_spaces` | `/i` | Trims leading/trailing spaces in request values before processing. |
| `api.prevent_duplicate_requests` | `/i`, `/i/bulk` | Enables duplicate-request suppression in ingestion handling. |

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.apps` | App-key validation and app-state checks for ingestion requests. |
| `countly.app_users{appId}` | Per-user ingestion state and profile updates. |
| `countly.users{appId}` | Aggregated session/user counters used by analytics queries. |
| `countly.device_details{appId}` | Aggregated device/platform metrics. |
| `countly.events_data` | Aggregated event counters and segments. |
| `countly_drill.drill_events` | Drill/raw event records used for detailed analytics. |

## Limitations

- Bulk requests return one aggregate success response and do not include per-item status payloads.
- Actual data impact depends on incoming payload content and validation outcomes.

## Last Updated

2026-02-17
