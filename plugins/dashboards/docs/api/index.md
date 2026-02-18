---
sidebar_position: 1
sidebar_label: "Overview"
---

# Dashboards - API Documentation

## Overview

The Dashboards feature provides customizable analytics boards composed of reusable widgets. It supports private dashboards, selected-user sharing, and optional public dashboard sharing based on feature configuration.

## Quick Links

- [Dashboards - Create](i-dashboards-create.md)
- [Dashboards - Update](i-dashboards-update.md)
- [Dashboards - Delete](i-dashboards-delete.md)
- [Dashboards - Add Widget](i-dashboards-add-widget.md)
- [Dashboards - Update Widget](i-dashboards-update-widget.md)
- [Dashboards - Remove Widget](i-dashboards-remove-widget.md)
- [Dashboards - Read](o-dashboards.md)
- [Dashboards - Read All](o-dashboards-all.md)
- [Dashboards - Read Widget](o-dashboards-widget.md)
- [Dashboards - Read Widget Data](o-dashboard-data.md)
- [Dashboards - Read Widget Layout](o-dashboards-widget-layout.md)
- [Dashboards - Test Widgets](o-dashboards-test.md)

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.dashboards` | Stores dashboard definitions, ownership, sharing settings, refresh settings, and widget references. |
| `countly.widgets` | Stores widget configuration and layout metadata used by dashboard pages. |
| `countly.apps` | Provides app metadata used when rendering dashboard widget context. |
| `countly.members` | Provides member data for owner and sharing recipient resolution. |
| `countly.systemlogs` | Stores audit entries for dashboard and widget create/update/delete actions. |

## Configuration & Settings

| Setting | Default | Effect |
|---|---|---|
| `dashboards.sharing_status` | `true` | Controls whether sharing configuration changes are allowed for non-admin contexts in create/update flows. |
| `dashboards.allow_public_dashboards` | `true` | Controls whether `share_with=all-users` is allowed and whether public dashboards are included in read filters. |

## Key Capabilities

- Create dashboards from scratch or by duplicating widgets from existing dashboards.
- Share dashboards with selected emails, user groups, or all users (if public sharing is enabled).
- Configure widget-level analytics and refresh behavior.
- Audit dashboard and widget lifecycle events through system logs.

## Last Updated

2026-02-17
