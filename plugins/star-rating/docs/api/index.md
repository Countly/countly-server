---
sidebar_position: 1
sidebar_label: "Overview"
---

# Star Rating

## Overview

The Star Rating feature enables in-app feedback collection using customizable star rating widgets. Users can rate your application and provide comments through non-intrusive feedback forms. The feature supports multiple widgets per application with advanced targeting, scheduling, and analytics features.

---

## Key Features

- **Multiple Widgets**: Create and manage multiple feedback widgets per application
- **Customizable Appearance**: Control colors, text, positioning, and styling
- **Advanced Targeting**: Show widgets based on page/URL patterns, user segments, and cohorts
- **Scheduling**: Set display timing and frequency rules
- **Data Collection**: Gather ratings, comments, and email contacts
- **Analytics**: View aggregated feedback metrics and sentiment analysis
- **Image Support**: Custom logos and widget imagery
- **Import/Export**: Bulk manage widget configurations

---

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| [Get Ratings Widgets](./o-sdk.md) | Retrieve feedback widgets for SDK runtime rendering |
| [Upload Logo](./i-feedback-upload.md) | Upload global feedback logo |
| [Set Widget Logo](./i-feedback-logo.md) | Set logo for specific widget |
| [Record Feedback](./i-feedback-input.md) | Receive and store user feedback submission |
| [Toggle Widget Status](./i-feedback-widgets-status.md) | Enable/disable specific widget |
| [Edit Widget](./i-feedback-widgets-edit.md) | Update widget configuration |
| [Get Feedback Data](./o-feedback-data.md) | Retrieve feedback submissions and ratings |
| [Get Multiple Widgets](./o-feedback-multiple-widgets-by-id.md) | Fetch multiple widgets by ID |
| [List All Widgets](./o-feedback-widgets.md) | Get all widgets for application |
| [Get Widget Details](./o-feedback-widget.md) | Retrieve single widget configuration |

---

## Data Structure

### Feedback Widget Document

```javascript
{
  "_id": "ObjectId",
  "app_id": "string",
  "internalName": "string",
  "popup_header_text": "string",
  "popup_comment_callout": "string",
  "popup_email_callout": "string",
  "popup_button_callout": "string",
  "popup_thanks_message": "string",
  "status": boolean,
  "type": "rating",
  "trigger_position": "mleft|mright|bleft|bright",
  "trigger_size": "s|m|l",
  "trigger_bg_color": "hex_color",
  "trigger_font_color": "hex_color",
  "trigger_button_text": "string",
  "hide_sticker": boolean,
  "target_pages": ["string"],
  "contact_enable": boolean,
  "comment_enable": boolean,
  "rating_symbol": "star|emoji|heart",
  "ratings_texts": ["string"],
  "appearance": {
    "position": "string",
    "bg_color": "hex_color",
    "text_color": "hex_color",
    "text": "string",
    "size": "string"
  },
  "logo": "string",
  "logoType": "default|custom",
  "globalLogo": boolean,
  "showPolicy": "afterPageLoad|onExit|onDelay",
  "targeting": {
    "segments": ["string"],
    "cohorts": ["string"],
    "custom_rules": {}
  },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Feedback Submission Document

```javascript
{
  "_id": "ObjectId",
  "app_id": "string",
  "widget_id": "ObjectId",
  "device_id": "string",
  "user_id": "string",
  "rating": 1-5,
  "comment": "string",
  "email": "string",
  "metadata": {
    "url": "string",
    "user_agent": "string",
    "ip_address": "string"
  },
  "timestamp": "ISO8601"
}
```

---

## Database Collections

| Collection | Purpose |
|-----------|---------|
| `countly.feedback_widgets` | Stores star-rating widget configurations, targeting setup, status, and display counters. |
| `countly_drill.drill_events` | Stores per-submission star rating events (`[CLY]_star_rating`) with segmentation fields (rating, comment, contact data). |

---

## Rating Scale

Default 5-star rating system:

| Rating | Level |
|--------|-------|
| 1 | Very Dissatisfied |
| 2 | Somewhat Dissatisfied |
| 3 | Neutral |
| 4 | Somewhat Satisfied |
| 5 | Very Satisfied |

---

## Widget Targeting

### Position Options

- `mleft` - Middle left
- `mright` - Middle right
- `bleft` - Bottom left
- `bright` - Bottom right

### Size Options

- `s` - Small
- `m` - Medium (default)
- `l` - Large

### Display Triggers

- `afterPageLoad` - Show after page loads
- `onExit` - Show on exit intent
- `onDelay` - Show after delay period

### Rating Symbols

- `star` - Traditional star rating
- `emoji` - Emoji scale (😠 → 😊)
- `heart` - Heart rating

---

## Common Use Cases

### 1. Mobile App Feedback
Display star rating widget to mobile users to collect app satisfaction

**Related Endpoint**: [Get Ratings Widgets](./o-sdk.md)

### 2. In-Page Feedback
Collect feedback on specific pages or features

**Related Endpoints**: 
- [Edit Widget](./i-feedback-widgets-edit.md)
- [Target Pages](./o-feedback-widgets.md)

### 3. Segment-Based Feedback
Show different widgets to different user segments

**Related Endpoint**: [Edit Widget](./i-feedback-widgets-edit.md) - Targeting options

### 4. Feedback Analytics
Analyze rating trends and sentiment

**Related Endpoint**: [Get Feedback Data](./o-feedback-data.md)

### 5. Quality Assurance
Monitor app satisfaction metrics over time

**Related Endpoint**: [Get Widget Details](./o-feedback-widget.md)

---

## Related Documentation

- [Cohorts feature](../../../../plugins/cohorts/docs/api/index.md) - User segmentation


## Last Updated

2026-02-17
