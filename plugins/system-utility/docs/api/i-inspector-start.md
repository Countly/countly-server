---
sidebar_label: "Start Inspector"
---

# /i/inspector/start

## Overview

Enable Node.js inspector debugging protocol on the master process. Allows connection via Chrome DevTools for remote debugging. Returns debugging port information. Automatically stops after 2 hours for security.

---

## Endpoint


```plaintext
/i/inspector/start
```

## Authentication

- **Required**: Global admin permission (required)
- **HTTP Method**: GET or POST
- **Permission**: Global Admin only

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | Global admin API key |

## Response

#### Success Response
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{"ports": [9229]}
```

#### Error Response
**Status Code**: `500 Internal Server Error`

**Body**:
```json
{"result": "Already started"}
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

- Required: Global admin permission (required)


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Example 1: Start inspector

**Description**: Enable debugging protocol

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/inspector/start" \
  -d "api_key=YOUR_GLOBAL_ADMIN_KEY"
```

**Response** (200):
```json
{"ports": [9229]}
```

### Example 2: Connect via Chrome DevTools

**Description**: Inspector ready for debugging connection

**Flow**:
1. Call start endpoint
2. Open Chrome: `chrome://inspect`
3. Connect to `localhost:9229`
4. Debug Node.js process

### Example 3: Error when already running

**Description**: Cannot start if already enabled

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/inspector/start" \
  -d "api_key=YOUR_GLOBAL_ADMIN_KEY"
```

**Response** (500):
```json
{"result": "Already started"}
```

---

## Behavior/Processing

### Inspector Start Flow

1. **Validate** global admin permission
2. **Check** if inspector already running
3. **Get** configured inspector port
4. **Initialize** debugging protocol
5. **Start** inspector listener
6. **Set** 2-hour timeout
7. **Return** port information

### Debugging Protocol

**Protocol**: Chrome DevTools Protocol (CDP)

**Standard port**: 9229 (configurable)

**Connection method**: WebSocket

### Timeout Mechanism

**Auto-stop after**: 2 hours (7,200 seconds)

**Reason**: Security (prevent unauthorized access)

**Manual stop**: Use `/i/inspector/stop` endpoint

---

## Technical Notes

### Port Configuration

**Config key**: `api.masterInspectorPort`

**Default**: 9229

**Setup**:
```javascript
config.api.masterInspectorPort = 9229;
```

### Chrome DevTools Connection

**URL format**: `http://localhost:9229/`

**Requirements**:
- Chrome browser
- Network access to inspector port
- Global admin API key to enable

### Security Considerations

**Access control**: Requires global admin API key

**Network exposure**: Only on configured port

**Time-limited**: Auto-stops after 2 hours

**Recommendation**: Use in development only

---

## Related Endpoints

- [Stop Inspector](./i-inspector-stop.md) - Disable debugging
- [Start Profiler](./i-profiler-start.md) - Performance profiling
- [Health Check](./o-system-healthcheck.md) - System status

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | Debugging ports |
| `500` | Already started | "Already started" |
| `500` | Permission denied | "Permission denied" |

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **Limited to one**: Only one inspector active
3. **Auto-stop after 2 hours**: Security timeout
4. **Port configurable**: Via `api.masterInspectorPort`
5. **Chrome DevTools compatible**: Standard CDP protocol
6. **WebSocket-based**: Real-time debugging connection
7. **Master process only**: Debugs main Node.js process
8. **Must stop explicitly**: Use stop endpoint
9. **Production caution**: Recommended for non-production
10. **Remote debugging**: Works over network
11. **Full debugging**: Breakpoints, watches, call stacks
12. **Performance impact**: Minimal when not actively debugging

## Last Updated

February 2026
