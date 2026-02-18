---
sidebar_label: "Batch Upsert"
---

# /i/remote-config/add-complete-config

## Overview

Batch upsert endpoint for creating or updating multiple parameters and conditions in a single operation. Primary use case: Rolling out winning variants from A/B tests to production by creating/updating parameters with their conditions.

---

## Endpoint


```plaintext
/i/remote-config/add-complete-config
```

## Authentication

- **Required**: API key with admin access AND `COUNTLY_EE` license
- **HTTP Method**: POST
- **Content-Type**: `application/json`

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with admin permissions |
| `app_id` | String | Yes | Application ID |
| `parameters` | Array | Yes | Array of parameter objects (create/update) |
| `conditions` | Array | No | Array of condition objects (create/update) |
| `dry_run` | Boolean | No | Validate without saving |

### Parameter Object Structure

```json
{
  "_id": "507f1f77bcf86cd799439011",  // Optional: omit for new, include to update
  "parameter_key": "button_color",     // Required
  "default_value": "#FF5733",          // Required
  "description": "Button color",       // Optional
  "conditions": [                      // Optional
    {
      "condition_id": "507f191e810c19729de860ea",
      "condition_value": "#00FF00"
    }
  ]
}
```

### Condition Object Structure

```json
{
  "_id": "507f191e810c19729de860ea",      // Optional: omit for new, include to update
  "condition_name": "iOS Users",          // Required
  "condition_definition": "{...}",        // Required if creating
  "condition_color": 1,                   // Optional
  "seed_value": "parameter_key"           // Optional
}
```

## Response

#### Success Response - Batch Upsert Complete
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "result": 200,
  "message": "Configuration successfully upserted",
  "created_parameters": 1,
  "updated_parameters": 2,
  "created_conditions": 1,
  "updated_conditions": 0,
  "total_affected": 4,
  "parameters": [
    {
      "parameter_key": "button_color",
      "operation": "created",
      "parameter_id": "60d5ec49e6f1c72b4c8b4567"
    },
    {
      "parameter_key": "feature_flag",
      "operation": "updated",
      "parameter_id": "60d5ec50e6f1c72b4c8b4568"
    }
  ],
  "conditions": [
    {
      "condition_name": "iOS Users",
      "operation": "created",
      "condition_id": "60d5ec20e6f1c72b4c8b4560"
    }
  ]
}
```

---


### Response Fields

| Field | Type | Description |
|---|---|---|
| `*` | Varies | Fields returned by this endpoint. See Success Response example. |


### Error Responses

```json
{
  "result": "Error"
}
```

## Permissions

- Required: API key with admin access AND COUNTLY_EE license

## Examples

### Example 1: Roll out A/B test winner to production

**Description**: Create production parameter with conditions from AB test results

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/add-complete-config" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameters": [
      {
        "parameter_key": "checkout_flow",
        "default_value": "version_a",
        "description": "Checkout flow variant",
        "conditions": [
          {
            "condition_id": "60d5ec20e6f1c72b4c8b4560",
            "condition_value": "version_b"
          }
        ]
      }
    ],
    "conditions": [
      {
        "condition_name": "New Users",
        "condition_definition": "{\"up.created_dttm\":{\"$gt\":1700000000000}}",
        "seed_value": "checkout_flow"
      }
    ]
  }
```

**Response** (200):
```json
{
  "result": 200,
  "message": "Configuration successfully upserted",
  "created_parameters": 1,
  "updated_parameters": 0,
  "created_conditions": 1,
  "updated_conditions": 0,
  "total_affected": 2,
  "parameters": [
    {
      "parameter_key": "checkout_flow",
      "operation": "created",
      "parameter_id": "60d5ec49e6f1c72b4c8b4567"
    }
  ],
  "conditions": [
    {
      "condition_name": "New Users",
      "operation": "created",
      "condition_id": "60d5ec20e6f1c72b4c8b4560"
    }
  ]
}
```

### Example 2: Update existing parameters and reuse conditions

**Description**: Update parameters with IDs, reference existing condition

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/add-complete-config" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameters": [
      {
        "_id": "60d5ec50e6f1c72b4c8b4568",
        "parameter_key": "feature_flag",
        "default_value": "enabled",
        "conditions": [
          {
            "condition_id": "60d5ec20e6f1c72b4c8b4560",
            "condition_value": "disabled"
          }
        ]
      }
    ]
  }
```

**Response** (200):
```json
{
  "result": 200,
  "message": "Configuration successfully upserted",
  "created_parameters": 0,
  "updated_parameters": 1,
  "created_conditions": 0,
  "updated_conditions": 0,
  "total_affected": 1,
  "parameters": [
    {
      "parameter_key": "feature_flag",
      "operation": "updated",
      "parameter_id": "60d5ec50e6f1c72b4c8b4568"
    }
  ],
  "conditions": []
}
```

### Example 3: Mixed create and update with dry-run validation

**Description**: Create new parameter and update existing, verify without saving

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/add-complete-config" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameters": [
      {
        "parameter_key": "new_feature",
        "default_value": "false",
        "description": "New feature flag"
      },
      {
        "_id": "60d5ec49e6f1c72b4c8b4567",
        "parameter_key": "button_color",
        "default_value": "#00FF00"
      }
    ],
    "dry_run": true
  }
```

**Response** (200):
```json
{
  "result": 200,
  "message": "Configuration successfully validated (dry-run)",
  "created_parameters": 1,
  "updated_parameters": 1,
  "created_conditions": 0,
  "updated_conditions": 0,
  "total_affected": 2,
  "parameters": [
    {
      "parameter_key": "new_feature",
      "operation": "created"
    },
    {
      "parameter_key": "button_color",
      "operation": "updated"
    }
  ],
  "conditions": []
}
```

---

## Behavior/Processing

### Batch Operation Process

1. **Parse** and validate all parameters and conditions
2. **Check** each parameter_key for duplicates within batch
3. **Check** each condition_name for duplicates within batch
4. **Validate** condition definitions using Drill feature
5. **Separate** into create vs update operations:
   - Parameters with `_id`: Update existing
   - Parameters without `_id`: Create new
   - Conditions with `_id`: Update existing
   - Conditions without `_id`: Create new
6. **Reuse detection**: Reference existing conditions by `_id`
7. **Execute** all operations in transaction for atomicity
8. **Return** detailed summary of what was created/updated

### Condition Reuse Logic

If parameter references condition by `condition_id`:
- **Found in batch conditions**: Use newly created/updated condition
- **Not in batch**: Reference existing condition by ID
- **Not found anywhere**: Return validation error

### Atomic Transactions

- All-or-nothing semantics
- If any validation fails, no changes committed
- Rollback on error ensures consistency
- Prevents partial updates

### Change Detection

For updates:
- Compare new vs existing values
- Only modified fields updated
- System fields (timestamps, counters) preserved
- Returns operation type: "created" or "updated"

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `remoteconfig_parameters{app_id}` | Remote config domain | Stores remote-config parameters, conditions, and related metadata. |
| `remoteconfig_conditions{app_id}` | Remote config domain | Stores remote-config parameters, conditions, and related metadata. |
| `operation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `parameter_key` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `System logs` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Create Parameter](./parameter-add.md) - Create single parameter
- [Update Parameter](./parameter-update.md) - Update single parameter
- [Create Condition](./condition-add.md) - Create single condition
- [Update Condition](./condition-update.md) - Update single condition
- [Dashboard Get All](./o-remote-config.md) - View all parameters/conditions

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - batch upserted | Summary with created/updated counts |
| `400` | Invalid parameter_key format | Parameter format validation error |
| `400` | Duplicate parameter_key in batch | Duplicate in single request error |
| `400` | Invalid condition_definition | Drill feature validation error |
| `400` | Condition not found by ID | Referenced condition doesn't exist |
| `400` | Invalid condition_id format | ObjectId validation error |
| `400` | Empty parameters array | At least one parameter required |
| `401` | Invalid API key | Authentication failure |
| `402` | Missing COUNTLY_EE license | Enterprise feature error |
| `403` | API key lacks admin permission | Authorization error |

---

## Implementation Notes

1. **Requires admin access**: Only API keys with admin role can upsert
2. **Requires EE license**: Feature only available with COUNTLY_EE
3. **Atomic operation**: All-or-nothing transaction semantics
4. **Condition reuse**: Efficient reference of existing conditions
5. **Batch validation**: Validates entire batch before committing
6. **Mixed operations**: Supports create and update in same request
7. **Order independent**: Can reference conditions created in same batch
8. **At least one parameter**: parameters array required (conditions optional)
9. **Dry-run validation**: Test without persisting changes
10. **Change tracking**: Response shows what was created vs updated
11. **Error rollback**: Failed batch leaves database unchanged
12. **Use case: A/B rollout**: Primary workflow for production deployment

## Last Updated

February 2026
