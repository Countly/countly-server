---
sidebar_label: "Upload Logo"
---

# /i/feedback/upload

## Endpoint

```plaintext
/i/feedback/upload
```


## Overview

Upload global feedback logo image for use across all feedback widgets. Handles image file upload and storage. Requires global feature permissions. Supports PNG, JPEG, and GIF formats

---

## /i/feedback/upload

## Authentication

- **Required Permission**: Feature access
- **HTTP Methods**: All methods supported (GET, POST, PUT, DELETE)
- **Content-Type**: application/x-www-form-urlencoded or JSON

**HTTP Method Flexibility:**  
All Countly endpoints accept any HTTP method (GET, POST, PUT, DELETE) interchangeably. You can use GET for simpler queries or POST for large payloads. All examples show the conventional method, but any method works identically.

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | Your API authentication key |
| `app_id` | String | Yes | Target application ID |

## Response

#### Success Response
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{"result": "success", "data": {}}
```

#### Error Response
**Status Code**: `400 Bad Request` or `500 Internal Server Error`

**Body**:
```json
{"result": "error", "message": "Error description"}
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

- Required Permission: Feature access

## Behavior/Processing

- Validates request parameters
- Processes the operation
- Returns appropriate response

---

## Examples

### Example 1: Basic Request

**Description**: Standard request using POST method

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/feedback/upload" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID"
```

**Response**:
```json
{"result": "success"}
```

### Example 2: Alternative GET Method

**Description**: Same request using GET (both methods work identically)

**Request** (GET):
```bash
curl "https://your-server.com/i/feedback/upload?api_key=YOUR_API_KEY&app_id=YOUR_APP_ID"
```

**Response**:
```json
{"result": "success"}
```

---

## Technical Notes

## Database Collections

This endpoint does not read or write database collections.
## Related Endpoints

- See feature documentation for related operations

---

## Enterprise

Plugin: star-rating
Endpoint: /i/feedback/upload

## Last Updated

February 2026
