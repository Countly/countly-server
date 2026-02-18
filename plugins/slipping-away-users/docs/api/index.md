---
sidebar_position: 1
sidebar_label: "Overview"
---

# Slipping Away Users

Identify and track users who are becoming inactive or at risk of churning. The Slipping Away Users feature analyzes user activity patterns to detect users who haven't engaged with your app recently, providing metrics across multiple time periods.

---

## Overview

The Slipping Away Users feature provides:
- **Inactivity Detection**: Identify users who haven't been active recently
- **Multi-Period Analysis**: Track slipping users across 5 time periods (7, 14, 30, 60, 90 days)
- **Cohort Integration**: Filter slipping users by cohort membership
- **Percentage Metrics**: Calculate slipping user percentages relative to total users

---


## Database Collections

| Collection | Purpose |
|---|---|
| `countly.app_users{appId}` | User profiles analyzed for churn risk based on last activity timestamp (`lac`). |


## Configuration & Settings

Slipping Away detection settings:
- **Activity Threshold**: Days of inactivity before considered "slipping away" (default: 7)

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| [/o/slipping](./o-slipping.md) | Get slipping away users metrics by period |

---

## Time Periods

Default periods for tracking slipping away users:

| Period | Days | Description |
|--------|------|-------------|
| `p1` | 7 | Users inactive for 7+ days |
| `p2` | 14 | Users inactive for 14+ days |
| `p3` | 30 | Users inactive for 30+ days |
| `p4` | 60 | Users inactive for 60+ days |
| `p5` | 90 | Users inactive for 90+ days |

---

## Use Cases

**Churn Prevention**:
- Identify users at risk before they churn
- Target re-engagement campaigns
- Monitor retention trends

**Segmented Analysis**:
- Filter by user properties
- Analyze cohort-specific slipping rates
- Compare premium vs free user retention

**Trend Monitoring**:
- Track slipping rates over time
- Measure campaign effectiveness
- Identify seasonal patterns

---

## Last Updated

2026-02-17
