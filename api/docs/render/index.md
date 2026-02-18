---
sidebar_position: 1
sidebar_label: "Overview"
---

# Render - API Documentation

## Overview

Render endpoint generates screenshot images for dashboard views and returns a path to the generated image.

## Endpoint Index

- [Screenshot Create](./o-render.md) - `/o/render`

## Data Sources

| Collection | Purpose |
|---|---|
| `countly.auth_tokens` | Stores short-lived render tokens (`purpose: LoginAuthToken`, TTL 300 seconds). |
| `countly.members` | Resolves authenticated dashboard user. |
| `countly.apps` | Validates app read access for non-global-admin users. |

## Behavior Notes

- Endpoint creates a temporary login token before rendering.
- Screenshots are saved under `/images/screenshots/` in server public assets.

## Last Updated

2026-02-17
