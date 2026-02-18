---
sidebar_position: 1
sidebar_label: "Overview"
---

# CMS - API Documentation

## Overview

CMS endpoints manage cached content entries in `countly.cms_cache`.  
They support saving transformed entries, reading entries by API ID, and clearing cache by prefix or globally.

## Database Collections

| Collection | Used for | Data touched by this feature |
|---|---|---|
| `countly.cms_cache` | CMS cache storage | Entry documents and `_meta` marker documents with `lu` / `error`. |
| `countly.members` | Auth and permission validation | Member identity and access checks for read/write operations. |

## Quick Links

- [CMS - Entries Save](i-cms-save-entries.md) - `/i/cms/save_entries`
- [CMS - Cache Clear](i-cms-clear.md) - `/i/cms/clear`
- [CMS - Entries Read](o-cms-entries.md) - `/o/cms/entries`

## Key Behavior Notes

- Read endpoint only accepts predefined API IDs:
  - `server-guides`
  - `server-consents`
  - `server-intro-video`
  - `server-quick-start`
  - `server-guide-config`
- Save endpoint expects `entries` as a JSON string and writes transformed data directly into cache documents.
- Clear endpoint can remove all cache entries or only entries for an ID prefix (`_id`).

---

## Last Updated

2026-02-17