---
sidebar_position: 1
sidebar_label: "Overview"
---

# Remote Config

The Remote Config feature allows dynamic configuration of app behavior and appearance without requiring app updates. It supports feature flags, conditional configuration, and A/B testing integration.

## Overview

Remote Config enables:
- **Dynamic Configuration**: Change app behavior remotely without app updates
- **Feature Flags**: Enable/disable features for specific user segments
- **Conditional Values**: Serve different values based on user properties
- **A/B Testing Integration**: Automatically integrate with AB Testing feature
- **Version Control**: Track configuration changes with timestamps

## SDK Endpoints (Mobile/Web Apps)

These endpoints are called by Countly SDKs to fetch configuration values:

- [Get Remote Config](./o-sdk-rc.md) - `/o/sdk?method=rc` - Fetch configuration values for device
- [Enroll in AB Tests](./o-sdk-ab.md) - `/o/sdk?method=ab` - Enroll user in AB test variants
- [Fetch Remote Config (Alias)](./o-sdk-fetch.md) - `/o/sdk?method=fetch_remote_config` - Alternative fetch endpoint

## Dashboard/API Endpoints

These endpoints are used by the Countly dashboard and API integrations:

### Read Operations
- [Get All Configs](./o-remote-config.md) - `/o?method=remote-config` - List all parameters and conditions

### Parameter Management
- [Add Parameter](./parameter-add.md) - `/i/remote-config/add-parameter` - Create new config parameter
- [Update Parameter](./parameter-update.md) - `/i/remote-config/update-parameter` - Update existing parameter
- [Remove Parameter](./parameter-remove.md) - `/i/remote-config/remove-parameter` - Delete parameter

### Condition Management
- [Add Condition](./condition-add.md) - `/i/remote-config/add-condition` - Create new condition
- [Update Condition](./condition-update.md) - `/i/remote-config/update-condition` - Update existing condition
- [Remove Condition](./condition-remove.md) - `/i/remote-config/remove-condition` - Delete condition

### Batch Operations
- [Add Complete Config](./config-add-complete.md) - `/i/remote-config/add-complete-config` - Add parameters with conditions (AB test rollout)

## Key Concepts

### Parameters
**Parameters** are configuration key-value pairs that your app fetches:
- **parameter_key**: Unique identifier (e.g., `button_color`, `max_items`)
- **default_value**: Default value when no conditions match
- **conditions**: Array of conditional overrides
- **valuesList**: All possible values (generated automatically)
- **status**: `"Running"` or `"Stopped"` (controls availability)
- **expiry_dttm**: Optional expiration timestamp

**Example Parameter**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "parameter_key": "button_color",
  "default_value": "#000000",
  "description": "Primary button color",
  "conditions": [
    {
      "condition_id": "507f1f77bcf86cd799439022",
      "value": "#FF5722"
    }
  ],
  "status": "Running",
  "valuesList": ["#000000", "#FF5722"]
}
```

### Conditions
**Conditions** define user segments that receive different parameter values:
- **condition_name**: Human-readable name
- **condition**: JSON query object (drill-style filters)
- **condition_color**: Color code for UI (1-10)
- **condition_definition**: Human-readable description
- **seed_value**: Random distribution seed

**Example Condition**:
```json
{
  "_id": "507f1f77bcf86cd799439022",
  "condition_name": "Premium Android Users",
  "condition": "{\"up.premium\":{\"$eq\":true},\"sg.os\":{\"$eq\":\"Android\"}}",
  "condition_definition": "Premium = true AND OS = Android",
  "condition_color": 3,
  "seed_value": "",
  "used_in_parameters": 2
}
```

### Value Resolution Priority
When fetching config, values are determined in this order:
1. **AB Testing Feature**: If user enrolled in AB test for this key (highest priority)
2. **Conditions**: First matching condition in array (top-to-bottom evaluation)
3. **Default Value**: Used when no conditions match

### Parameter Key Naming
Parameter keys must follow these rules:
- Start with letter or underscore: `[a-zA-Z_]`
- Contain only alphanumerics and underscores: `[a-zA-Z0-9_]*`
- Examples: `button_color`, `max_items`, `feature_enabled`
- Invalid: `123_feature`, `button-color`, `max.items`

### Condition Query Language
Conditions use MongoDB-style query operators from the Drill feature:
- **Equality**: `{"up.premium": {"$eq": true}}`
- **In Array**: `{"sg.country": {"$in": ["US", "UK"]}}`
- **Comparison**: `{"up.age": {"$gte": 18}}`
- **Exists**: `{"tkip": {"$exists": true}}`
- **AND**: Multiple keys in object
- **OR**: Use `{"$or": [...]}`

**Supported Field Prefixes**:
- `up.*`: User properties
- `sg.*`: System properties (country, city, language, os, app_version, etc.)
- `chr.*`: Cohort membership
- `tkip`, `tkap`, etc.: Token existence (platform filters)

## Configuration Limits

Default limits (configurable in feature settings):
- **Maximum Parameters**: 1000 per app
- **Maximum Conditions per Parameter**: 10

## Database Collections

- **`remoteconfig_parameters{app_id}`**: Stores parameters
- **`remoteconfig_conditions{app_id}`**: Stores conditions

Collections are automatically created per app and cleaned up on app deletion/reset.

## Related Features

- **AB Testing Feature**: Automatically overrides remote config values for experiment variants
- **Cohorts feature**: Conditions can target cohorts using `chr.{cohort_id}` fields
- **Drill feature**: Condition query engine uses drill's filter processor


## Last Updated

2026-02-17
