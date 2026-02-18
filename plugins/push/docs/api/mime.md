---
sidebar_label: "MIME Type Validation"
---

# /o/push/message/mime

## Overview

Validate media URL for push notifications by checking MIME type and content length. Ensures media URLs (images, videos, audio) are accessible, have correct MIME types, and meet size requirements. Used during campaign creation/update to validate rich media attachments.

**Related Endpoints**:
- [Message Create](./message-create.md) - Create campaign with media URLs
- [Message Update](./message-update.md) - Update campaign with media URLs

---

## Endpoint


```plaintext
/o/push/message/mime
```

## Authentication

- **Required Permission**: Read access to `push` feature (`validateRead`)
- **HTTP Methods**: GET recommended (all methods supported)
- **Content-Type**: application/x-www-form-urlencoded or JSON

**HTTP Method Flexibility:**  
All Countly endpoints accept any HTTP method (GET, POST, PUT, DELETE) interchangeably.

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API authentication key |
| `app_id` | String | Yes | Application ID |
| `url` | String | Yes | Media URL to validate (http or https) |

**URL Requirements**:
- Must be valid HTTP or HTTPS URL
- Must be publicly accessible (no authentication)
- Should respond to HEAD or GET requests
- Must return Content-Type header

## Response

#### Success Response - Valid Media URL
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "type": "image/png",
  "size": 2458624
}
```

**Response Fields**:
- **`type`** (String): MIME type from Content-Type header
- **`size`** (Number): Content length in bytes (may be -1 if unknown)

**Size Values**:
- Positive integer: Actual content size in bytes
- `-1`: Size unknown (Content-Length header missing)

#### Success Response - Size Unknown
**Status Code**: `200 OK`

**Body**:
```json
{
  "type": "video/mp4",
  "size": -1
}
```

#### Error Response - Invalid URL
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "errors": ["url is required"]
}
```

#### Error Response - URL Not Accessible
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "errors": ["Couldn't load url"]
}
```

#### Error Response - Network Error
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "errors": ["Network error: <error details>"]
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

- Required Permission: Read access to push feature (validateRead)

## Behavior/Processing

### Operation Flow

1. **Validation**
   - Validates required parameters: `url`
   - Checks URL format (must start with http:// or https://)
   - Returns 400 if validation fails

2. **HTTP HEAD Request**
   - Sends HEAD request to URL
   - Follows redirects (up to 5 redirects)
   - Timeout: 30 seconds
   - Reads Content-Type and Content-Length headers

3. **Fallback to GET Request** (if HEAD fails)
   - If HEAD request fails or returns error status
   - Sends GET request to URL
   - Reads response headers
   - Does NOT download response body

4. **Header Extraction**
   - **Content-Type**: Extracts MIME type from header
   - **Content-Length**: Extracts size from header (if present)
   - If Content-Length missing, returns size = -1

5. **Response**
   - Returns MIME type and size
   - No validation of MIME type (returns whatever server provides)
   - No download of actual content (header-only check)

### HTTP Request Configuration

**HEAD Request**:
```javascript
{
  method: 'HEAD',
  url: url,
  timeout: 30000,
  followRedirect: true,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Countly'
  }
}
```

**GET Request** (fallback):
```javascript
{
  method: 'GET',
  url: url,
  timeout: 30000,
  followRedirect: true,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Countly'
  }
}
```

### Redirect Handling

- **Max redirects**: 5
- **Redirect types**: 301, 302, 303, 307, 308
- **Final URL**: Not returned (only checks final destination)
- **Cross-domain**: Follows redirects across domains

**Example Redirect Chain**:
1. Original URL: `http://example.com/image.png`
2. Redirect 1 (301): `https://example.com/image.png`
3. Redirect 2 (302): `https://cdn.example.com/images/abc123.png`
4. Final response: Checks headers at `https://cdn.example.com/images/abc123.png`

### MIME Type Extraction

**Content-Type Header Examples**:
- `image/png` → type: `"image/png"`
- `image/jpeg; charset=utf-8` → type: `"image/jpeg"` (parameters stripped)
- `video/mp4` → type: `"video/mp4"`
- `audio/mpeg` → type: `"audio/mpeg"`

**Common MIME Types**:
- **Images**: image/png, image/jpeg, image/gif, image/webp
- **Videos**: video/mp4, video/quicktime, video/x-m4v
- **Audio**: audio/mpeg, audio/wav, audio/aac

### Content-Length Handling

**Header Present**:
```
Content-Length: 2458624
```
Returns: `{"size": 2458624}`

**Header Missing**:
```
(no Content-Length header)
```
Returns: `{"size": -1}`

**Chunked Transfer Encoding**:
```
Transfer-Encoding: chunked
```
Returns: `{"size": -1}` (Content-Length not used with chunked encoding)

### Error Scenarios

**Network Errors**:
- DNS resolution failure
- Connection timeout
- Connection refused
- SSL certificate errors

**HTTP Errors**:
- 404 Not Found
- 403 Forbidden
- 500 Internal Server Error
- 503 Service Unavailable

**Timeout**:
- 30-second timeout for HEAD/GET request
- Returns "Couldn't load url" error

**Invalid Response**:
- No Content-Type header: Returns empty string for type
- Invalid headers: Returns error

---

## Examples

### Example 1: Validate PNG image

**Description**: Check PNG image URL for push notification

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/mime" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "url=https://cdn.example.com/images/notification-icon.png"
```

**Response** (200):
```json
{
  "type": "image/png",
  "size": 15234
}
```

### Example 2: Validate JPEG with redirect

**Description**: URL redirects to CDN, final MIME type checked

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/mime" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "url=http://example.com/promo-image.jpg"
```

**Response** (200):
```json
{
  "type": "image/jpeg",
  "size": 423567
}
```

### Example 3: Validate video (MP4)

**Description**: Check video URL for rich notification

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/mime" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "url=https://videos.example.com/promo.mp4"
```

**Response** (200):
```json
{
  "type": "video/mp4",
  "size": 8456234
}
```

### Example 4: Size unknown (chunked encoding)

**Description**: Server uses chunked transfer encoding, size not determinable

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/mime" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "url=https://dynamic.example.com/image.png"
```

**Response** (200):
```json
{
  "type": "image/png",
  "size": -1
}
```

### Example 5: URL not accessible

**Description**: 404 error or network timeout

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/mime" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "url=https://example.com/nonexistent.png"
```

**Response** (400):
```json
{
  "errors": ["Couldn't load url"]
}
```

### Example 6: Invalid URL format

**Description**: Missing URL parameter

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/mime" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012"
```

**Response** (400):
```json
{
  "errors": ["url is required"]
}
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `iOS` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Android` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Web` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Timeout` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Max redirects` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `User-Agent` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Authentication` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Private networks` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Large files` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `MIME spoofing` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No caching` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Typical response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Network latency` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Redirect overhead` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Create](./message-create.md) - Create campaign with media URLs
- [Message Update](./message-update.md) - Update campaign with media URLs

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - media URL valid | `{"type": "image/png", "size": 15234}` |
| `200` | Success - size unknown | `{"type": "video/mp4", "size": -1}` |
| `400` | Missing url parameter | `{"errors": ["url is required"]}` |
| `400` | Invalid URL format | `{"errors": ["url is required"]}` |
| `400` | URL not accessible (404, timeout) | `{"errors": ["Couldn't load url"]}` |
| `400` | Network error | `{"errors": ["Network error: <details>"]}` |
| `500` | Server error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **HEAD request first**: Always tries HEAD before GET (more efficient)
2. **GET fallback**: Used if HEAD fails or returns error status code
3. **No body download**: GET request reads headers only, doesn't download content
4. **Redirect following**: Automatically follows up to 5 redirects
5. **Timeout**: 30-second timeout prevents hanging on slow servers
6. **MIME extraction**: Strips parameters from Content-Type (e.g., charset)
7. **Size default**: Returns -1 when Content-Length header missing
8. **No validation**: Doesn't validate MIME type against allowed types
9. **No caching**: Each request makes fresh HTTP call (no cache)
10. **Synchronous**: Blocks until HTTP request completes or times out
11. **Error messages**: Generic "Couldn't load url" for most HTTP errors
12. **User-Agent**: Sends "Countly" as User-Agent header

## Last Updated

February 2026
