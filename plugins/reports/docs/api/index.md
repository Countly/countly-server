---
sidebar_position: 1
sidebar_label: "Overview"
---

# Reports

Generate, customize, and distribute automated reports across your Countly instance. The Reports feature enables users to create scheduled reports with selective metrics, dashboards, and event data delivery via email.

---

## Overview

The Reports API provides complete management of scheduled reports including:
- **Read endpoints** (`/o/reports`) - Retrieve and trigger report sending
- **Write endpoints** (`/i/reports`) - Create, update, delete, and manage report configurations
- **Report generation** - HTML preview and PDF export
- **Scheduling** - Daily, weekly, and monthly delivery with timezone support
- **Multi-app support** - Single report across multiple applications
- **Custom distribution** - Email recipients and frequency control

---


## Database Collections

| Collection | Purpose |
|---|---|
| `reports` | Report definitions with frequency, recipients, and content configuration |
| `report_logs` | Report generation and delivery history |


## Configuration & Settings

Report settings:
- **Frequency**: Daily, weekly, or monthly schedules
- **Email SMTP**: Email configuration in `api/config.js`
- **Formats**: PDF, CSV, or Excel report formats

## API Endpoints

### Read Operations (/o/reports)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| [/o/reports/all](./o-reports-all.md) | GET | Get all reports accessible to user |
| [/o/reports/send](./o-reports-send.md) | GET | Trigger immediate report delivery |

### Write Operations (/i/reports)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| [/i/reports/create](./i-reports-create.md) | POST | Create new scheduled report |
| [/i/reports/update](./i-reports-update.md) | POST | Update existing report |
| [/i/reports/delete](./i-reports-delete.md) | POST | Delete report |
| [/i/reports/send](./i-reports-send.md) | POST | Manually trigger report sending |
| [/i/reports/preview](./i-reports-preview.md) | POST | Generate HTML preview |
| [/i/reports/pdf](./i-reports-pdf.md) | POST | Generate PDF download |
| [/i/reports/status](./i-reports-status.md) | POST | Enable/disable reports |

---

## Report Types

### Core Reports
- **Type**: `"core"` (default)
- **Scope**: Built-in analytics metrics from Countly
- **Apps**: Can span multiple applications
- **Customization**: Metric selection, time ranges, dashboards

### Custom Feature Reports
- **Type**: Feature identifier (e.g., `"drill"`, `"funnels"`)
- **Scope**: Feature-specific data
- **Verification**: Run through feature verification hooks
- **Customization**: Feature-specific parameters

---

## Report Properties

**Core Report Configuration**:
```json
{
  "_id": "MongoDB ObjectId",
  "title": "Report name",
  "report_type": "core",
  "apps": ["app_id_1", "app_id_2"],
  "emails": ["recipient@example.com"],
  "metrics": {
    "analytics": true,
    "crash": false
  },
  "frequency": "daily|weekly|monthly",
  "timezone": "Asia/Yerevan",
  "hour": 2,
  "minute": 0,
  "day": 0,
  "dashboards": null,
  "date_range": null,
  "selectedEvents": [],
  "sendPdf": true,
  "user": "user_mongodb_id",
  "enabled": true
}
```

**Scheduling Fields**:
- `frequency`: "daily", "weekly", or "monthly"
- `timezone`: IANA timezone identifier
- `hour`: 0-23 (UTC equivalent after timezone conversion)
- `minute`: 0-59
- `day`: For weekly (0=Sunday, 1-6=Mon-Sat), for monthly (1-31)

---

## Authentication
**Read endpoints** (/o/reports):
- Require API key with read access
- Users see only their own reports or shared reports
- Global admins see all reports

**Write endpoints** (/i/reports):
- Require API key with create/update/delete permissions
- Users can only edit their own reports (except global admins)
- Validates app access for each application in report

**Feature Access Control**:
- Permission key: `"reports"`
- Required for all write operations
- Read operations use standard read permission

---

## Key Concepts

### Report Ownership
- Each report belongs to a specific user
- Creator is auto-set from API key context
- Non-admin users can only manage own reports
- Global admins can manage any report

### Email Recipients
- Flexible email list (not tied to Countly users)
- Can include external emails
- No validation of email deliverability
- Multiple recipients in single `emails` array

### Timezone Handling
- Client timezone converted to UTC for scheduling
- Server stores UTC-equivalent time
- SDK converts back to user timezone for display
- Supports all IANA timezone identifiers

### PDF Generation
- Uses Puppeteer for HTML to PDF conversion
- Temporary files stored in `/tmp` directory
- Automatic cleanup after delivery
- Supports responsive design rendering

### Metric Selection
- Boolean flags for core analytics modules
- Custom event selection via `selectedEvents`
- Dashboard-specific reports via `dashboards`
- Metric array for detailed selection

---

## Related Features

- **Drill feature**: For custom event analytics inclusion
- **Dashboards Feature**: For dashboard-based reports
- **Crashes Feature**: For crash analytics inclusion
- **System Logs Feature**: For audit trail logging


## Last Updated

2026-02-17
