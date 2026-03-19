---
sidebar_position: 1
sidebar_label: "Overview"
---

# SDK

## Overview

SDK feature manages runtime SDK configuration, enforcement overrides, and SDK metrics.

## Database Collections

| Collection | Purpose |
|---|---|
| `countly_out.sdk_configs` | Stores per-app SDK configuration object. |
| `countly_out.sdk_enforcement` | Stores per-app enforcement overrides. |
| `countly.sdks` | Stores SDK analytics metrics. |

## Endpoints

- [SDK - SDK Config Read](o-sdk-config.md) - `/o/sdk?method=sc`
- [SDK - Config Read](o-sdk-config-read.md) - `/o?method=sdk-config`
- [SDK - Config Upload](o-config-upload.md) - `/o?method=config-upload`
- [SDK - Enforcement Read](o-sdk-enforcement.md) - `/o?method=sdk-enforcement`
- [SDK - Config Parameter Update](i-sdk-config-parameter.md) - `/i/sdk-config/update-parameter`
- [SDK - Enforcement Update](i-sdk-config-enforcement.md) - `/i/sdk-config/update-enforcement`
- [SDK - SDK Metrics Read](o-sdk-metrics.md) - `/o?method=sdks`

## Last Updated

2026-03-05
