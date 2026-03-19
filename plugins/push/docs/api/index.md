---
sidebar_position: 1
sidebar_label: "Overview"
---

# Push Notifications API

Ⓔ Enterprise Only

## Overview

Push Notifications supports campaign creation, targeting, scheduling, API-triggered sends, user-level delivery history, and aggregate reporting.

## Quick Links

- [Message Create](./message-create.md)
- [Message Update](./message-update.md)
- [Message Remove](./message-remove.md)
- [Message Toggle](./message-toggle.md)
- [Message Test](./message-test.md)
- [Message Push](./message-push.md)
- [Message List](./message-all.md)
- [Message Get](./message-get.md)
- [Message Estimate](./message-estimate.md)
- [User History](./user.md)
- [MIME Info](./mime.md)
- [Read Dashboard](./dashboard.md)

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.messages` | Push message definitions, content, trigger config, and result counters |
| `countly.message_schedules` | Message schedule state used by scheduling/status workflows |
| `countly.app_users{appId}` | User token fields and audience base for push delivery |
| `countly.push_{appId}` | Per-user push delivery history (`msgs`) |
| `countly.events_data` | Aggregated push sent/action event data for dashboard calculations |
| `countly.creds` | Push provider credentials and legacy FCM detection |

## Configuration & Settings

Push runtime settings affect delivery behavior:
- Proxy settings (`proxyhost`, `proxyport`, `proxyuser`, `proxypass`, `proxyunauthorized`) affect media URL metadata checks.
- Test audience settings (`test.uids`, `test.cohorts`) control `/i/push/message/test` execution scope.
- Sending pool and retry settings (`connection_*`, `pool_*`) affect push processing throughput.
- `message_timeout` affects when unsent notifications are treated as too late to send.

## Trigger Types

- Plain (scheduled)
- Cohort/Event (automated)
- API-triggered

## Last Updated

2026-03-07
