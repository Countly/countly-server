---
sidebar_position: 1
sidebar_label: "Overview"
---

# Push Notifications API

This feature enables sending push notifications to mobile and web platforms. It supports various trigger types (scheduled, event-based, cohort-based, API-triggered), audience targeting, message personalization, and comprehensive analytics.

---

## Overview

The Push feature provides endpoints for:
- Creating and managing push notification campaigns
- Audience estimation and targeting
- Message testing and analytics
- User-level push token management
- Dashboard metrics

---


## Database Collections

| Collection | Purpose |
|---|---|
| `messages` | Push notification campaign definitions with targeting and content |
| `app_users{appId}` | User profiles with push tokens and notification preferences |
| `push_{messageID}` | Delivery status tracking for individual push campaigns |


## Configuration & Settings

Push notification settings from `features.setConfigs`:
- **APN Credentials**: Apple Push Notification certificates
- **FCM Key**: Firebase Cloud Messaging API key
- **Rate Limiting**: Max push notifications per second

## API Endpoints

### Message Management

- [Message Create](./message-create.md) - `/i/push/message/create` - Create push notification campaign
- [Message Update](./message-update.md) - `/i/push/message/update` - Update existing campaign
- [Message Delete](./message-remove.md) - `/i/push/message/remove` - Delete campaign
- [Message Toggle](./message-toggle.md) - `/i/push/message/toggle` - Start/stop automated campaign
- [Message Test](./message-test.md) - `/i/push/message/test` - Send test notification to test users
- [Message Push](./message-push.md) - `/i/push/message/push` - Trigger API-based push

### Message Analytics & Retrieval

- [Message List](./message-all.md) - `/o/push/message/all` - List all campaigns with filtering
- [Message Get](./message-get.md) - `/o/push/message/{_id}` - Get single campaign details
- [Message Stats](./message-stats.md) - `/o/push/message/stats` - Get periodic statistics
- [Message Estimate](./message-estimate.md) - `/o/push/message/estimate` - Estimate audience reach

### User & Configuration

- [User Push Data](./user.md) - `/o/push/user` - Get user's push tokens and subscription status
- [MIME Info](./mime.md) - `/o/push/mime` - Get MIME type information for media URLs
- [Dashboard](./dashboard.md) - `/o/push/dashboard` - Get push notification dashboard metrics

---

## Internal Events

The following are internal system events, not user-facing API endpoints:

- `/master` - Push queue initialization (server startup)
- `/session/user` - Token handling on user session
- `/cohort/enter`, `/cohort/exit` - Cohort-triggered push automation
- `/drill/add_push_events`, `/drill/preprocess_query`, `/drill/postprocess_uids` - Drill integration
- `/i/device_id` - User merge handling
- `/i/apps/upda../plugins/push`, `/i/apps/reset`, `/i/apps/delete` - App lifecycle events
- `/i/app_users/delete`, `/i/app_users/export` - User data management
- `/consent/change` - GDPR consent handling

---

## Key Concepts

### Trigger Types

- **Plain**: Scheduled for specific date/time
- **Event**: Triggered when users perform specific events
- **Cohort**: Triggered on cohort entry/exit
- **API**: Triggered via API call (`/i/push/message/push`)
- **Recurring**: Scheduled to repeat at intervals

### Platforms

Supported platforms: `i` (iOS), `a` (Android), `w` (Web), `h` (Huawei)

### Message Status

- `draft` - Not ready to send (editable)
- `created` - Created but not scheduled yet
- `inactive` - Waiting for approval (Push Approver feature)
- `scheduled` - Scheduled for sending
- `sending` - Currently sending
- `sent` - Completed successfully
- `stopped` - Automated message stopped
- `failed` - Send failed

---

## Common Parameters

All endpoints use standard Countly authentication:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API authentication key |
| `app_id` | String | Yes | Application ID |

---

## Error Handling

The Push API uses two custom error types:

**ValidationError** (400): Invalid request parameters
```json
{
  "kind": "ValidationError",
  "errors": ["app_id is required", "Invalid platform"]
}
```

**PushError** (400): Push feature-specific errors
```json
{
  "kind": "PushError",
  "errors": ["No push credentials configured"]
}
```

**ServerError** (500): Internal server error
```json
{
  "kind": "ServerError",
  "errors": ["Server error"]
}
```

---

## Related Documentation

- Message Object Schema
- Trigger Types Reference
- Content Personalization


## Last Updated

2026-02-17
