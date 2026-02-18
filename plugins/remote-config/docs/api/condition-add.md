---
sidebar_label: "Condition Create"
---

# /i/remote-config/add-condition

## Overview

Creates a targeting condition for remote config parameters using MongoDB-style query syntax. Conditions enable segment-based distribution where different values are returned to different user groups.

---

## Endpoint


```plaintext
/i/remote-config/add-condition
```

## Authentication

Countly API supports three authentication methods:

1. **API Key** (parameter): `api_key=YOUR_API_KEY`
2. **Auth Token** (parameter): `auth_token=YOUR_AUTH_TOKEN`
3. **Auth Token** (header): `countly-token: YOUR_AUTH_TOKEN`

Use any one of these methods in your request. Most endpoints also require `app_id` parameter to specify which application the request is for.

**Permission Requirements**: Varies by endpoint (see specific endpoint documentation).

---


## Permissions

- *Permission Requirements: Varies by endpoint (see specific endpoint documentation).


## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `Authorization: Bearer <token>` header. |
| `app_id` | String | Yes | Target app ID. |
| `condition` | String (JSON) | Yes | JSON string containing `condition_name`, `condition_color`, and `condition`. |


## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `remote-config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

### Success Response

```json
{
  "result": "Success"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Varies | Endpoint success payload. |

### Error Responses

```json
{
  "result": "Error"
}
```

## Examples

### Example 1: Create iOS users condition

**Description**: Target all users on iOS devices

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/add-condition" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "condition_name": "iOS Users",
    "condition_definition": "{\"up._os\":{\"$eq\":\"iOS\"}}",
    "condition_color": 1
  }
```

**Response** (201):
```json
{
  "result": 201,
  "condition_name": "iOS Users",
  "message": "Condition successfully added",
  "condition_id": "60d5ec20e6f1c72b4c8b4560"
}
```

### Example 2: Create premium users in specific regions

**Description**: Target premium tier users in US and Canada

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/add-condition" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "condition_name": "Premium US/CA Users",
    "condition_definition": "{\"up.premium\":{\"$eq\":true},\"up._country\":{\"$in\":[\"US\",\"CA\"]}}",
    "condition_color": 2,
    "seed_value": "feature_flag"
  }
```

**Response** (201):
```json
{
  "result": 201,
  "condition_name": "Premium US/CA Users",
  "message": "Condition successfully added",
  "condition_id": "60d5ec25e6f1c72b4c8b4561"
}
```

### Example 3: Create early adopters segment condition

**Description**: Target users in early_adopters cohort

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/add-condition" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "condition_name": "Early Adopters",
    "condition_definition": "{\"sg.cohort_name\":{\"$eq\":\"early_adopters\"}}",
    "condition_color": 4
  }
```

**Response** (201):
```json
{
  "result": 201,
  "condition_name": "Early Adopters",
  "message": "Condition successfully added",
  "condition_id": "60d5ec2ae6f1c72b4c8b4562"
}
```

---

## Behavior/Processing

### Condition Creation Process

1. **Validate** condition_name against regex: `/^[a-zA-Z0-9_\-\s]+$/`
2. **Parse** condition_definition JSON string
3. **Validate** using Drill feature query preprocessor
4. **Check** for duplicate condition_name (prevents duplicates)
5. **Create** new document in `remoteconfig_conditions{app_id}`
6. **Return** 201 with condition_id

### Query Validation

Drill feature validates:
- Valid JSON syntax
- Known field prefixes (up., sg., chr., tkip/tkap)
- Supported MongoDB operators
- Proper nesting and value types

### MongoDB Operators Supported

| Operator | Usage | Example |
|----------|-------|---------|
| `$eq` | Equals | `{"up._os": {"$eq": "iOS"}}` |
| `$ne` | Not equals | `{"up._os": {"$ne": "Android"}}` |
| `$in` | In array | `{"up._country": {"$in": ["US", "CA"]}}` |
| `$nin` | Not in array | `{"up._country": {"$nin": ["CN"]}}` |
| `$exists` | Field exists | `{"up.premium": {"$exists": true}}` |
| `$gt`, `$gte`, `$lt`, `$lte` | Comparisons | `{"up.age": {"$gte": 18}}` |
| `$and`, `$or` | Logic | Multiple field conditions |
| `$not`, `$regex` | Pattern matching | String matching |

### Seed Values

For consistent random distribution (A/B testing):
- `seed_value`: Parameter key for consistent hashing
- Same user always gets same value with same seed
- Without seed: Random selection each session
- Example: Roll out 50/50 A/B variant to same users

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `remoteconfig_conditions{app_id}` | Remote config domain | Stores remote-config parameters, conditions, and related metadata. |
| `0` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `1` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `2` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `3` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `4` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `5` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `6` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `7` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `8` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `condition` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `condition_definition` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `used_in_parameters` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `c` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `seed_value` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Update Condition](./condition-update.md) - Modify condition
- [Remove Condition](./condition-remove.md) - Delete condition
- [Create Parameter](./parameter-add.md) - Create parameter
- [Dashboard Get All](./o-remote-config.md) - View all conditions

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `201` | Success | Condition created, returns condition_id |
| `400` | condition_name invalid format | Regex validation error |
| `400` | condition_name already exists | Duplicate condition error |
| `400` | condition_definition invalid JSON | JSON parse error |
| `400` | Invalid query operators | Drill feature validation error |
| `400` | Missing required fields | Field validation error |
| `401` | Invalid API key | Authentication failure |
| `402` | Missing COUNTLY_EE license | Enterprise feature error |
| `403` | API key lacks admin permission | Authorization error |

---

## Implementation Notes

1. **Requires admin access**: Only API keys with admin role can create
2. **Requires EE license**: Feature only available with COUNTLY_EE
3. **Drill feature required**: Query validation uses Drill feature
4. **JSON string format**: condition_definition must be JSON string
5. **Field prefixes required**: Use up., sg., chr., or tkip/tkap
6. **Operators validated**: Only supported MongoDB operators allowed
7. **Conditions independent**: Created separately from parameters
8. **Reusable conditions**: Single condition can be used by multiple parameters
9. **Color optional**: Defaults to 0 if not provided
10. **Usage counter**: c starts at 0, incremented by SDK evaluations
11. **Empty parameters list**: used_in_parameters populated when assigned
12. **Multiple operators**: Combine with $and for AND logic

## Last Updated

February 2026
