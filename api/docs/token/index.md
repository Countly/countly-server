---
sidebar_position: 1
sidebar_label: "Overview"
---

# Token - API Documentation

## Overview

Token endpoints create, revoke, inspect, and list dashboard auth tokens for the authenticated user.

## Endpoint Index

- [Token Create](i-token-create.md) - `/i/token/create`
- [Token Delete](i-token-delete.md) - `/i/token/delete`
- [Token Check](o-token-check.md) - `/o/token/check`
- [Token List](o-token-list.md) - `/o/token/list`

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.auth_tokens` | Stores auth token documents and token restrictions (`ttl`, `owner`, `app`, `endpoint`, `purpose`, `multi`). |
| `countly.members` | Resolves authenticated user and token owner. |

## Configuration & Behavior Notes

- Token create defaults to `ttl=1800` and `multi=true` when parameters are not provided.
- Token delete can only remove tokens owned by the authenticated user.
- Token check returns only validity and remaining time, not full token metadata.

## Last Updated

2026-02-17
