---
sidebar_position: 1
sidebar_label: "Overview"
---

# SDK Fetch - API Documentation

## Overview

`/o/sdk` is the core SDK fetch entrypoint. Core validates app/device context, then installed feature handlers return method-specific payloads.

## Endpoint Index

- [SDK Fetch Read](o-sdk.md) - `/o/sdk`

## Data Sources

| Collection | Purpose |
|---|---|
| `countly.apps` | Resolves app by `app_key`, app settings, and checksum salt fields. |
| `countly.app_users{appId}` | Loads app-user context for current `device_id` hash. |

## Behavior Notes

- Uses SDK auth context (`app_key`, `device_id`), not dashboard-user auth.
- Successful response schema depends on installed feature handlers for `/o/sdk`.
- If no handler responds for requested method, response is `400` with `Invalid method`.

## Last Updated

2026-02-17
