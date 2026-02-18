---
sidebar_position: 1
sidebar_label: "Overview"
---

# Sources - API Documentation

## Overview

The Sources feature tracks acquisition/referrer sources, provides source-level metrics, and exposes source/store mappings used in reporting.

## Quick Links

- [Sources - Traffic Sources Read](o-sources-fetch.md)
- [Sources - Search Keywords Read](o-sources-keywords.md)
- [Sources - Store Mapping Read](o-sources-stores.md)

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.sources` | Stores source attribution metrics aggregated by app and period. |
| `countly.members` | Used by authenticated Sources endpoints for access validation. |
| `countly.apps` | Used to validate app context for authenticated Sources endpoints. |

## Source Classification Overview

Sources are produced from incoming `_store` values and app context:

- Mobile apps primarily use store/package identifiers.
- If mobile `_store` is missing but OS value exists, OS is used as fallback source.
- Web apps use referrer/source strings that are normalized before aggregation.
- Keyword-focused reporting is derived from parsed query parameters of stored source keys.

## Referrer and Store Normalization

Before source metrics are read:

- Web referrers are normalized (protocol/domain cleanup, selected query preservation, tracking-tag removal).
- Source values are truncated to configured maximum length.
- Values are stored in encoded form for aggregation and later decoded in read endpoints.

## Configuration & Settings

| Setting | Default | Purpose |
|---|---|---|
| `sources.sources_length_limit` | `100` | Maximum stored length of source/referrer value during ingest normalization. |

## Last Updated

2026-02-17
