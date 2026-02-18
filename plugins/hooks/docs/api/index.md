---
sidebar_position: 1
sidebar_label: "Overview"
---

# Hooks - API Documentation

## Overview

The Hooks feature lets you automate actions when Countly events or schedules match configured trigger rules.

## Quick Links

- [Hooks - Read List](./o-hook-list.md)
- [Hooks - Save](./i-hook-save.md)
- [Hooks - Update Status](./i-hook-status.md)
- [Hooks - Delete](./i-hook-delete.md)
- [Hooks - Test](./i-hook-test.md)

## Key Capabilities

- Trigger-based automation using internal events, API endpoint triggers, incoming data, or scheduled execution.
- Effect execution for actions such as HTTP requests, email sending, or custom code.
- Rule-level enable/disable control and test execution before production use.

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.hooks` | Stores hook rules, trigger/effect configurations, enabled state, metadata, and recent error logs. |
| `countly.members` | Stores dashboard user profiles used for access checks and creator display names. |
| `countly.apps` | Stores app definitions used during permission and app-context validation. |

## Configuration & Settings

Hooks behavior is affected by `hooks` configuration values:

- `refreshRulesPeriod`: Refresh interval for loading enabled hook rules into runtime cache.
- `pipelineInterval`: Delay between effect-processing loop iterations.
- `batchActionSize`: Maximum queued actions processed per pipeline iteration (`0` falls back to internal default batch size).
- `requestLimit`: Per-hook execution cap per time window (`0` disables throttling).
- `timeWindowForRequestLimit`: Time window (milliseconds) used with `requestLimit`.

## Last Updated

2026-02-17
