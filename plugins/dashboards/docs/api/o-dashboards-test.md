---
sidebar_label: "Widget Test"
---

# Dashboards - Test Widgets

## Endpoint

```text
/o/dashboards/test
```

## Overview

Executes widget data loading for a provided widget array payload and returns the resulting widgets with calculated data.

## Authentication

No explicit authentication check is performed in this handler.

## Permissions

No explicit permission check is performed in this handler.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `widgets` | JSON String (Array) | No | JSON-stringified widget array. If invalid or missing, the handler proceeds with an empty array and returns `[]`. |

### `widgets` Array Structure

Each element should be a widget object similar to dashboard widget payloads.

Example decoded array:

```json
[
  {
    "widget_type": "analytics",
    "feature": "core",
    "apps": ["6991c75b024cb89cdc04efd2"],
    "data_type": "session",
    "metrics": ["t"]
  }
]
```

## Response

### Success Response

```json
[
  {
    "widget_type": "analytics",
    "apps": ["6991c75b024cb89cdc04efd2"],
    "dashData": {
      "isValid": true,
      "data": {
        "6991c75b024cb89cdc04efd2": {
          "t": 2145
        }
      }
    }
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Root array of widget objects after processing. |
| `[].widget_type` | String | Widget type for the processed item. |
| `[].apps` | Array | App IDs for the widget. |
| `[].dashData` | Object | Computed data container for widget output. |

### Error Responses

This handler does not define explicit structured error responses in normal flow; invalid `widgets` input typically yields an empty array.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Process widgets | Valid JSON `widgets` array provided | Parses widgets and runs widget data loading per entry. | Raw array of processed widgets |
| Empty fallback | Missing or invalid `widgets` JSON | Continues with empty widget array. | Raw empty array |

### Impact on Other Data

- Read-only endpoint in this handler.

## Database Collections

This endpoint has no fixed collection list at handler level. Data reads depend on widget types passed in `widgets` and the data processors they trigger.

---

## Examples

### Test one analytics widget payload

```text
/o/dashboards/test?
  widgets=[
    {
      "widget_type":"analytics",
      "feature":"core",
      "apps":["6991c75b024cb89cdc04efd2"],
      "data_type":"session",
      "metrics":["t"]
    }
  ]
```

## Limitations

- This endpoint does not enforce dashboard ownership or sharing checks.
- Output structure depends on widget type and may vary across features.

## Related Endpoints

- [Dashboards - Read Widget Data](o-dashboard-data.md)
- [Dashboards - Read Widget](o-dashboards-widget.md)

## Last Updated

2026-02-17
