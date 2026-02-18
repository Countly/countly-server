---
sidebar_label: "Store Mapping Read"
---

# Sources - Store Mapping Read

## Endpoint

```text
/o/sources
```

## Overview

Returns the static store/source mapping dictionary used by the Sources feature (for example mobile package identifiers mapped to readable source names).

## Authentication

This endpoint does not require API authentication parameters.

## Permissions

No explicit permission check is applied by this handler.

## Request Parameters

This endpoint does not require request parameters.

## Response

### Success Response

```json
{
  "com.android.vending": "Google Play",
  "com.google.vending": "Google Play",
  "com.amazon.venezia": "Amazon",
  "com.android.chrome": "Browser",
  "com.android.provider": "Android"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Root mapping of source/store identifiers to display labels. |
| `{source_id}` | String | Display label for mapped source/store key. |

Mapping keys typically include:

- Mobile package identifiers (for example `com.android.vending`).
- Alternative package aliases that should resolve to the same source label.

### Error Responses

No custom error responses are defined for this endpoint.

## Behavior/Processing

- Loads store mappings from plugin JSON at startup.
- Returns in-memory mapping as raw root object.
- Does not query database collections.

### Mapping Usage Context

This endpoint provides the label dictionary used to present readable source names in analytics views and related APIs.

## Database Collections

This endpoint does not read or write database collections.

---

## Examples

### Read source/store mapping

```text
/o/sources
```

## Limitations

- Mapping content is static and tied to plugin deployment files.
- Mapping changes require restart/redeploy to appear in responses.
- This endpoint returns dictionary data only; it does not return app-specific source metrics.

## Related Endpoints

- [Sources - Traffic Sources Read](o-sources-fetch.md)
- [Sources - Search Keywords Read](o-sources-keywords.md)

## Last Updated

2026-02-17
