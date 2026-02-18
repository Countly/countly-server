---
sidebar_position: 1
sidebar_label: "Overview"
---

# Crashes

The **Crashes** feature collects, analyzes, and manages application crash reports with stack traces, device information, and occurrence tracking.


## Database Collections

| Collection | Purpose |
|---|---|
| `app_crashes{appId}` | Crash group summaries with occurrence counts, status (resolved/unresolved), and first/last seen timestamps |
| `app_crashdata{appId}` | Individual crash reports with full stack traces, device info, breadcrumbs, and custom logs |
| `app_crashusers{app_id}` | User-crash associations tracking which users experienced which crashes |


## Configuration & Settings

Crash processing settings from `features.setConfigs`:
- **Symbolication**: Enable native crash symbolication (iOS/Android)
- **Max Breadcrumbs**: Maximum breadcrumb events stored per crash (default: 100)
- **Grouping Algorithm**: Crash grouping strategy (stack trace similarity)
- **Retention**: Crash dataretention period (default: 90 days)

## API Endpoints

- [I Crashes Add Comment](./i-crashes-add-comment.md)
- [I Crashes Delete Comment](./i-crashes-delete-comment.md)
- [I Crashes Delete](./i-crashes-delete.md)
- [I Crashes Edit Comment](./i-crashes-edit-comment.md)
- [I Crashes Hide](./i-crashes-hide.md)
- [I Crashes Modify Share](./i-crashes-modify-share.md)
- [I Crashes Resolve](./i-crashes-resolve.md)
- [I Crashes Resolving](./i-crashes-resolving.md)
- [I Crashes Share](./i-crashes-share.md)
- [I Crashes Show](./i-crashes-show.md)
- [I Crashes Unresolve](./i-crashes-unresolve.md)
- [I Crashes Unshare](./i-crashes-unshare.md)
- [I Crashes View](./i-crashes-view.md)
- [O Crashes Download Binary](./o-crashes-download-binary.md)
- [O Crashes Download Stacktrace](./o-crashes-download-stacktrace.md)
- [O Crashes List](./o-crashes-list.md)
- [O Reports](./o-reports.md)
- [O User Crashes](./o-user-crashes.md)

## Last Updated

2026-02-17
