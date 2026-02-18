---
sidebar_position: 1
sidebar_label: "Overview"
---

# Countly Diagnostics - API Documentation

## Overview

Diagnostics endpoint for Countly version and migration marker visibility.

## Endpoint Index

- [Version Diagnostics](o-countly-version.md) - `/o/countly_version`

## Data Sources

| Collection | Purpose |
|---|---|
| `countly.plugins` | Stores version marker history in `_id: "version"` document. |
| `countly.members` | Resolves authenticated dashboard user. |

## Last Updated

2026-02-17
