---
sidebar_label: "Get Ratings Widgets"
---

# /o/sdk

## Overview

Retrieve feedback widgets for mobile SDK integration. Returns array of active star rating widgets configured for the application, with full styling, targeting, and behavior configuration. Only functions when surveys feature is disabled.

---

## Endpoint


```plaintext
/o/sdk
```

## Authentication

- **Required**: App key (mobile SDK authentication)
- **HTTP Method**: GET or POST
- **Permission**: No permission check (public SDK endpoint)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `method` | String | Yes | Must be "feedback" |
| `app_key` | String | Yes | Application key (from dashboard) |
| `device_id` | String | Yes | Unique device identifier |
| `user_id` | String | No | User ID if available |
| `timestamp` | Number | No | Unix timestamp |

## Response

#### Success Response
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "result": [
    {
      "_id": "62543b95a3a03e229a389a54",
      "type": "rating",
      "popup_header_text": "Rate our app",
      "popup_comment_callout": "Tell us more",
      "popup_email_callout": "Your email",
      "popup_button_callout": "Submit",
      "popup_thanks_message": "Thank you!",
      "trigger_position": "mleft",
      "trigger_size": "m",
      "trigger_bg_color": "#123456",
      "trigger_font_color": "#FFFFFF",
      "trigger_button_text": "Feedback",
      "hide_sticker": false,
      "appearance": {
        "position": "mleft",
        "bg_color": "#123456",
        "text_color": "#FFFFFF",
        "text": "Feedback",
        "size": "m"
      },
      "target_pages": ["/", "/home"],
      "showPolicy": "afterPageLoad",
      "comment_enable": true,
      "contact_enable": true,
      "rating_symbol": "star"
    }
  ]
}
```

#### Error Response
**Status Code**: `200 OK`

**Body**:
```json
{"result": "Missing parameter \"app_key\" or \"device_id\""}
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

- Permission: No permission check (public SDK endpoint)


## Database Collections

This endpoint does not read or write database collections.
## Examples

### Example 1: Get widgets for mobile device

**Description**: Retrieve rating widgets for mobile SDK

**Request** (GET):
```bash
curl "https://your-server.com/o/sdk?method=feedback&app_key=YOUR_APP_KEY&device_id=device_12345"
```

**Response** (200):
```json
{
  "result": [
    {
      "_id": "62543b95a3a03e229a389a54",
      "type": "rating",
      "popup_header_text": "How do you like our app?",
      "trigger_position": "mleft",
      "trigger_size": "m",
      "trigger_bg_color": "#0166D6",
      "trigger_font_color": "#FFFFFF",
      "appearance": {
        "position": "mleft",
        "bg_color": "#0166D6",
        "text_color": "#FFFFFF",
        "text": "Rate us",
        "size": "m"
      },
      "target_pages": ["/"],
      "showPolicy": "afterPageLoad"
    }
  ]
}
```

### Example 2: Get widgets with user context

**Description**: Retrieve widgets including user targeting info

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o/sdk" \
  -d "method=feedback" \
  -d "app_key=YOUR_APP_KEY" \
  -d "device_id=device_98765" \
  -d "user_id=user_456" \
  -d "timestamp=$(date +%s)"
```

**Response** (200):
```json
{
  "result": [
    {
      "_id": "62549c12b5c4d231ab201c21",
      "type": "rating",
      "popup_header_text": "Share your feedback",
      "popup_comment_callout": "Additional comments",
      "popup_email_callout": "Your email (optional)",
      "popup_button_callout": "Send Feedback",
      "popup_thanks_message": "We appreciate your input!",
      "trigger_position": "bright",
      "trigger_size": "l",
      "trigger_bg_color": "#FF6B35",
      "trigger_font_color": "#FFFFFF",
      "trigger_button_text": "Give Feedback",
      "hide_sticker": false,
      "appearance": {
        "position": "bright",
        "bg_color": "#FF6B35",
        "text_color": "#FFFFFF",
        "text": "Feedback",
        "size": "l"
      },
      "target_pages": ["/"],
      "showPolicy": "onDelay",
      "comment_enable": true,
      "contact_enable": true,
      "rating_symbol": "emoji"
    }
  ]
}
```

### Example 3: Get multiple widgets

**Description**: Application with multiple active feedback widgets

**Request** (GET):
```bash
curl "https://your-server.com/o/sdk?method=feedback&app_key=YOUR_APP_KEY&device_id=device_11111"
```

**Response** (200):
```json
{
  "result": [
    {
      "_id": "62543b95a3a03e229a389a54",
      "type": "rating",
      "popup_header_text": "General app feedback",
      "trigger_position": "mleft",
      "target_pages": ["/"]
    },
    {
      "_id": "62549c12b5c4d231ab201c21",
      "type": "rating",
      "popup_header_text": "Feature feedback",
      "trigger_position": "mright",
      "target_pages": ["/features"]
    }
  ]
}
```

---

## Behavior/Processing

### Widget Retrieval Flow

1. **Parse** method parameter (must be "feedback")
2. **Validate** app_key and device_id
3. **Bypass** if surveys feature is enabled
4. **Query** feedback_widgets collection
5. **Filter** by app_id and status (active only)
6. **Apply** user/device targeting rules
7. **Return** array of matching widgets

### Targeting Evaluation

**Evaluated for each widget**:
- Widget status (must be enabled)
- Target pages (URL matching)
- Device/user segments
- Cohort membership (if enabled)
- Time-based rules

### Response Transformation

**Fields returned to SDK**:
- `_id` - Widget identifier
- `type` - Always "rating"
- `popup_header_text` - Widget title
- `popup_comment_callout` - Comment prompt
- `popup_email_callout` - Email prompt
- `popup_button_callout` - Submit button text
- `popup_thanks_message` - Confirmation message
- `appearance` - Styling configuration
- `target_pages` - Page patterns where to show
- `trigger_position` - Location on screen
- `trigger_size` - Widget dimension
- `rating_symbol` - 5-star or emoji style

---

## Technical Notes

### Database Operations

**Collection**: `feedback_widgets`

**Query fields**:
```javascript
{
  app_id: app_id,
  status: true,
  type: "rating"
}
```

**Return projection**:
```javascript
{
  _id: 1,
  popup_header_text: 1,
  type: 1,
  appearance: 1,
  showPolicy: 1,
  trigger_position: 1,
  hide_sticker: 1,
  trigger_bg_color: 1,
  trigger_font_color: 1,
  trigger_button_text: 1,
  trigger_size: 1,
  target_pages: 1
}
```

### SDK Integration

**Typical SDK usage**:
```javascript
// Mobile SDK fetches widgets
sdk.requestFeedbackWidgets({
  method: "feedback",
  app_key: appKey,
  device_id: deviceId
}, function(widgets) {
  // Display widgets based on targeting rules
  widgets.forEach(widget => {
    showFeedbackWidget(widget);
  });
});
```

### Surveys Feature Integration

**Behavior when surveys enabled**:
- Endpoint returns false (no response)
- Surveys feature handles widget delivery
- Star-rating widgets not delivered to SDK

---

## Related Endpoints

- [Edit Widget](./i-feedback-widgets-edit.md) - Edit feedback widget
- [Get Feedback Data](./o-feedback-data.md) - Analytics for collected feedback
- [List Widgets](./o-feedback-widgets.md) - Admin list of all widgets

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | Array of widgets |
| `200` | No active widgets | Empty array `[]` |
| `200` | Surveys feature enabled | Empty array (no response) |
| `200` | Invalid method | No response (bypass) |
| `200` | Missing app_key | Error message |
| `200` | Missing device_id | Error message |

---

## Implementation Notes

1. **SDK-specific endpoint**: Used by mobile SDKs exclusively
2. **No auth required**: App key is public identifier
3. **Surveys exclusivity**: Doesn't execute when surveys enabled
4. **Device targeting**: Filters based on device context
5. **Page matching**: Server evaluates target page patterns
6. **Status critical**: Only active widgets returned
7. **Widget array**: Multiple widgets per app supported
8. **Appearance nested**: Styling reformatted for SDK
9. **Transformation layer**: Fields mapped to SDK expectations
10. **Caching eligible**: Responses can be cached on device
11. **Real-time updates**: Reflects latest widget changes
12. **User context aware**: Can use user ID for cohort evaluation

## Last Updated

February 2026
