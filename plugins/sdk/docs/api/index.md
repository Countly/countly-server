---
sidebar_position: 1
sidebar_label: "Overview"
---

# SDK

Manage SDK configuration, enforcement rules, and version tracking across all Countly SDKs. The SDK feature provides centralized control over SDK behavior including feature toggles, version constraints, and telemetry collection options.

---

## Overview

The SDK feature manages:
- **SDK Configuration**: Feature flags and behavioral settings for SDKs
- **Enforcement Rules**: Server-side enforcement of configuration (client cannot override)
- **Version Tracking**: Monitor which SDK versions are in use
- **Feature Control**: Enable/disable SDK features (crash reporting, networking, etc.)

---


## Database Collections

| Collection | Purpose |
|---|---|
| `sdk_stats` | SDK usage statistics and version distribution |


## Configuration & Settings

SDK endpoints use core tracking. No feature-specific configuration.

## API Endpoints

### Read Operations (/o paths)

| Endpoint | Purpose |
|----------|---------|
| [/o/sdk?method=sc](./o-sdk-config.md) | Get SDK config (SDK request) |
| [/o?method=sdk-config](./o-sdk-config-read.md) | Get SDK config (admin view) |
| [/o?method=sdk-enforcement](./o-sdk-enforcement.md) | Get enforcement rules |
| [/o?method=sdks](./o-sdk-metrics.md) | Get SDK metrics data |

### Write Operations (/i paths)

| Endpoint | Purpose |
|----------|---------|
| [/o?method=config-upload](./o-config-upload.md) | Save/upload SDK config |
| [/i/sdk-config/update-parameter](./i-sdk-config-parameter.md) | Update SDK parameter |
| [/i/sdk-config/update-enforcement](./i-sdk-config-enforcement.md) | Update enforcement rules |

---

## Configuration Options

Valid configuration parameters:

```
tracking (bool)       - Enable/disable general tracking
networking (bool)     - Enable/disable network requests
crt (bool)           - Crash reporting enabled
vt (bool)            - Version tracking
st (bool)            - Session tracking
cet (bool)           - Custom event tracking
ecz (bool)           - Event compression
cr (bool)            - Consent required
sui (bool)           - Session user ID
eqs (bool)           - Event queuing size
rqs (bool)           - Request queue size
czi (bool)           - Compression info
dort (bool)          - Disable old request timeout
scui (bool)          - Session clear user ID
lkl (bool)           - Language key list
lvs (bool)           - List of values size
lsv (bool)           - Load stored values
lbc (bool)           - Location broadcast count
ltlpt (bool)         - Location trace log points
ltl (bool)           - Location trace log
lt (bool)            - Location tracking
rcz (bool)           - Request compression
bom (bool)           - Byte object mode
bom_at (int)         - BOM aggregation threshold
bom_rqp (float)      - BOM request probability (0-100)
bom_ra (int)         - BOM resend count
bom_d (int)          - BOM duration (seconds)
```

### Dart-Specific Options

```
upcl (bool)          - User property cache (Dart)
ew (bool)            - Event whitelist (Dart)
upw (bool)           - User property whitelist (Dart)
sw (bool)            - Segment whitelist (Dart)
esw (bool)           - Event segment whitelist (Dart)
eb (bool)            - Event blacklist (Dart)
upb (bool)           - User property blacklist (Dart)
sb (bool)            - Segment blacklist (Dart)
esb (bool)           - Event segment blacklist (Dart)
```

---

## Enforcement Rules

Enforcement allows server-side override of SDK configuration:
- **Enforcement false**: Feature disabled, cannot be enabled by SDK
- **Enforcement true or missing**: SDK decides based on configuration

Benefits:
- Force-disable features globally
- Security control over SDK capabilities
- Compliance enforcement (user consent, tracking restrictions)

---

## Response Format

### SDK Config Response
```json
{
  "v": 2,
  "t": 1682328445330,
  "c": {
    "tracking": true,
    "crt": true,
    "vt": true,
    "bom": true,
    "bom_at": 10,
    "bom_rqp": 0.5
  }
}
```

**Fields**:
- `v` - Config version
- `t` - Timestamp (milliseconds since epoch)
- `c` - Configuration object

---

## Storage

Configurations stored in:
- **sdk_configs** collection: Configuration parameters per app
- **sdk_enforcement** collection: Enforcement rules per app
- **sdks** collection: SDK usage metrics (version tracking)

---

## Use Cases

1. **Feature Toggle**: Enable/disable entire features (crash reporting, session tracking)
2. **Version Control**: Force upgrade by disabling old SDK versions
3. **Compliance**: Disable tracking features based on user consent
4. **Performance**: Toggle compression, request batching
5. **Monitoring**: Track SDK versions in use via metrics

---

## Last Updated

February 2026
