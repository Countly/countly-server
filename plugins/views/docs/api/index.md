---
sidebar_position: 1
sidebar_label: "Overview"
---

# Views - API Documentation

## Overview

The Views feature tracks page/screen views, supports segmented view analytics, provides heatmap interaction reads, and includes view-management endpoints (rename, omit segments, delete).

## Quick Links

- [Views - Query](o-views.md)
- [Views - Actions/Heatmap Read](o-actions.md)
- [Views - Rename](i-views-rename.md)
- [Views - Omit Segments](i-views-omit-segments.md)
- [Views - Delete](i-views-delete.md)

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.views` | Stores app-level views configuration (segment map, omitted segments, metadata root). |
| `countly.app_viewsmeta` | Stores per-view metadata (`view`, `display`, `url`) per app. |
| `countly.app_viewdata` and `countly.app_viewdata{sha1(segment+appId)}` | Stores aggregated view metrics (segmented and non-segmented). |
| `countly.app_userviews` and `countly.app_userviews{appId}` | Stores user-to-view mapping fields used in cleanup/update flows. |
| `countly_drill.drill_events` | Stores granular view/action events used by heatmap and unique-count calculations. |
| `countly.members` | Used for authenticated endpoint access validation. |
| `countly.apps` | Used for app context validation and timezone resolution. |

## Configuration & Settings

| Setting | Default | Purpose |
|---|---|---|
| `api.request_threshold` | Server configuration | Influences long-task threshold behavior for heavy `views` query branches (`getTotals`, graph mode). |

## Last Updated

2026-02-17
