---
sidebar_label: "Language Map Read"
---

# Locale - Language Map Read

## Endpoint

```plaintext
/o/langmap
```

## Overview

Returns the in-memory language map used by Countly locale handling. The map is keyed by normalized language code and each value contains language metadata (for example English/native names).

## Authentication

- This endpoint does not require API authentication parameters.

## Permissions

- No permission check is applied by this handler.

## Request Parameters

This endpoint does not require request parameters.

## Response

### Success Response

```json
{
  "en": {
    "englishName": "English",
    "nativeName": "English"
  },
  "fr": {
    "englishName": "French",
    "nativeName": "français"
  },
  "zh_hans": {
    "englishName": "Chinese (Simplified)",
    "nativeName": "简体中文"
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Raw language map keyed by normalized language code. |
| `{lang_code}` | Object | Language metadata object from `langmap` package projection. |
| `{lang_code}.englishName` | String | English display name. |
| `{lang_code}.nativeName` | String | Native display name. |

### Error Responses

No custom error responses are defined for this endpoint.

## Behavior/Processing

- Uses prebuilt language map from locale utility initialization.
- Returns map directly without database reads.
- Includes normalized Chinese variants (`zh_hans`, `zh_hant`) where available.

## Database Collections

This endpoint does not read or write database collections.

---

## Examples

### Read language map

```plaintext
/o/langmap
```

## Limitations

- Output depends on language data bundled in server dependencies.
- This endpoint returns mapping metadata, not per-app usage metrics.

## Related Endpoints

- [Locale - Languages Read](o-langs.md)

## Last Updated

2026-02-17
