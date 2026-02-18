---
sidebar_label: "Get Remote Config"
---

# /o/sdk?method=rc

## Overview

Fetch remote configuration values for a mobile or web app. Returns key-value pairs based on user properties, conditions, and A/B test enrollment. Called by Countly SDKs to dynamically configure app behavior without requiring app updates.

**Related Endpoints**:
- [Enroll in AB Tests](./o-sdk-ab.md) - Enroll user in A/B test variants
- [Get All Configs (Dashboard)](./o-remote-config.md) - Dashboard view of all parameters

---

## Endpoint


```plaintext
/o/sdk?method=rc
```

## Authentication

- **Required Parameter**: `app_key` (public app key, not API key)
- **HTTP Methods**: GET recommended (all methods supported)
- **Content-Type**: application/x-www-form-urlencoded or JSON

**HTTP Method Flexibility:**  
All Countly endpoints accept any HTTP method (GET, POST, PUT, DELETE) interchangeably.

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `app_key` | String | Yes | Application key (public, used by SDK) |
| `device_id` | String | Yes | Unique device identifier |
| `timestamp` | Number | No | 10-digit UTC timestamp for recording past data |
| `city` | String | No | User's city name |
| `country_code` | String | No | ISO country code (e.g., "US", "UK") |
| `location` | String | No | User's location as "lat,lng" |
| `tz` | Number | No | User's timezone offset in minutes |
| `ip_address` | String | No | User's IP address (auto-detected if omitted) |
| `keys` | String (JSON Array) | No | Only fetch values for specified keys (e.g., `["button_color","max_items"]`) |
| `omit_keys` | String (JSON Array) | No | Exclude specified keys from response |
| `metrics` | String (JSON Object) | No | User metrics/properties (e.g., `{"_os":"iOS","_app_version":"2.1"}`) |
| `oi` | Number | No | Set to `1` to enroll user in returned AB test keys if eligible |

**Key Filtering**:
- If `keys` provided: Only returns specified parameter keys
- If `omit_keys` provided: Returns all except specified keys
- If both omitted: Returns all active parameters

**Metrics Parameter**:
Standard Countly metrics can be included:
- `_os`: Operating system
- `_os_version`: OS version
- `_app_version`: App version
- `_device`: Device model
- Custom user properties

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `crashes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `remote-config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `security.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._a.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._d.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._dayOfYear.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._f.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._i.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._isPm.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._isValid.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._l.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._locale.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._meridiem.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._nextDay.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._strict.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._tzm.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._useUTC.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._w.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.abbr.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.acks.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.api.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.arrayValue.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.async.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.boolValue.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.c.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.cdn.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.clickhouse.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.code.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.condition.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.condition_title.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.conditions.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.conditions_per_paramaeters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.confirm.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.cookie.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.data.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.database.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.def.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.default.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.defaultConfig.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.delete.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.description.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.devtools.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.enableTransactions.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.enabled.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.errorHandler.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.eventSink.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.export_limit.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.fileStorage.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.fn.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.getTagNamespace.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.groupId.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.hook.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.html.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.ignoreProxies.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.ignoredElements.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.inheritedProp.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.initialApps.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.initialRetryTime.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.invalidJson.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.invalidJsonBehavior.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.invalidJsonMetrics.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.invalidateQuery.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.isReservedAttr.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.isReservedTag.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.isUnknownElement.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.jobServer.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.js.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.json.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.kafka.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.keyCodes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.lang.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.layout.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.lifetime.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maxRetryTime.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maxWaitTimeInMs.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maximum_allowed_parameters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maximum_conditions_added.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.message.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.minBytes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.minutes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.mustUseProp.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.my_config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.name.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.nested.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.nullValue.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.numberValue.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.objectValue.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.offline_mode.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.optionMergeStrategies.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.ownProp.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parameter.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parameters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parentLocale.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parsePlatformTagName.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.partitions.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.partitionsConsumedConcurrently.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.passwordSecret.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_autocomplete.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_char.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_min.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_number.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_symbol.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.path.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.percent.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.percentage.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.performance.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.populate.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.primaryKey.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.productionTip.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.proxy_hostname.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.proxy_password.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.proxy_port.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.proxy_username.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.query.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.range.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.refresh.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.replace.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.retries.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.sample.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.schedule.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.screenshotsFolder.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.selectedApps.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.should.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.silent.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.source.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.statusCode.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.stringValue.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.structure.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.t.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.targetTable.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.toLowerCase.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.topicName.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.topics.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.transactionTimeout.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.type.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.use_google.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.users.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.v.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.value.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.value1.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.value2.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.videosFolder.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.warnHandler.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.web.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.yes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `slipping-away-users.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `tracking.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `two-factor-auth.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `views.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `white-labeling.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `CONTAINER_ID` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONFIG_HOSTNAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONFIG_PROTOCOL` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONTAINER` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_PATH` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__TEST__ARRAYVALUE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__TEST__BOOLVALUE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__TEST__INVALIDJSON` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__TEST__NUMBERVALUE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__TEST__OBJECTVALUE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__TEST__STRINGVALUE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__TEST__VALUE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__TEST__VALUE1` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_SETTINGS__TEST__VALUE2` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_TEST_API_KEY_ADMIN` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_TEST_APP_ID` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_TEST_APP_KEY` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_TEST_SAVE_LOGS` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `DEPLOYMENT_ENV` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `FORCE_NPM_INSTALL` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `HOSTNAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `KUBERNETES_NAMESPACE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `KUBERNETES_POD_NAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `NODE_ENV` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `NODE_PATH` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_BATCH_TIMEOUT` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_DEBUG` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_ENABLED` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_EXPORTER_OTLP_HEADERS` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_MAX_EXPORT_BATCH_SIZE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_MAX_QUEUE_SIZE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_METRIC_EXPORT_INTERVAL_MILLIS` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `OTEL_SERVICE_NAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `POD_NAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `PROFILE_COLLECTOR_URL` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `PYROSCOPE_ENABLED` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `TEST_SUITE` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |

## Response

#### Success Response - Config Values Returned
**Status Code**: `200 OK`

**Body**: JSON object with parameter key-value pairs

### Success Response

```json
{
  "button_color": "#FF5722",
  "max_items": 50,
  "feature_enabled": true,
  "welcome_message": "Welcome to our app!",
  "api_endpoint": "https://api.example.com/v2"
}
```

**Response Structure**:
- Key-value pairs where keys are parameter names
- Values can be any JSON type (string, number, boolean, object, array)
- Only includes active parameters (status="Running", not expired)

#### Success Response - No Matching Parameters
**Status Code**: `200 OK`

**Body**:
```json
{}
```

#### Error Response - Invalid Request
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "result": "error",
  "message": "Error while fetching remote config data."
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

- No dashboard permission check is applied. Access is validated by SDK app credentials (`app_key` and `device_id`).

## Behavior/Processing

### Operation Flow

1. **App Identification**
   - Resolves `app_key` to `app_id`
   - Creates or updates user session
   - Returns error if app_key invalid

2. **User Context Building**
   - Merges `metrics` parameter with user properties
   - Adds location data (city, country_code, location, tz)
   - Stores context in `params.app_user` and `params.processed_metrics`

3. **Parameter Filtering**
   - Queries `remoteconfig_parameters{app_id}` collection
   - Filters by `keys` or `omit_keys` if provided
   - Excludes parameters with:
     - `status` != "Running" (or status field missing)
     - `expiry_dttm` < current timestamp

4. **A/B Testing Priority** (Highest Priority)
   - Dispatches to AB Testing feature
   - If user enrolled in AB test for parameter key:
     - Uses AB test variant value
     - Removes parameter from remote config processing

5. **Condition Evaluation** (Second Priority)
   - For each remaining parameter:
     - Loads associated conditions from `remoteconfig_conditions{app_id}`
     - Evaluates conditions top-to-bottom
     - First matching condition provides value
     - Uses drill query engine for condition matching

6. **Default Value Fallback** (Lowest Priority)
   - If no conditions match, uses `parameter.default_value`

7. **Random Percentile Calculation**
   - For each condition with `seed_value`:
     - Calculates `random_percentile` from seed + device_id
     - Enables percentage-based rollouts

8. **Response Assembly**
   - Builds output object with selected parameter values
   - Updates parameter usage counters in background
   - Returns JSON response

### Value Resolution Priority

Values are determined in this order:

**Priority 1: A/B Testing Feature**
```javascript
// If AB Testing feature has enrolled user in variant for "button_color":
output["button_color"] = abTestVariantValue; // e.g., "#FF5722"
// Skip remote config processing for this key
```

**Priority 2: Conditions (First Match)**
```javascript
// Evaluate conditions array from index 0
for (condition of parameter.conditions) {
  if (matchesCondition(user, condition)) {
    output["button_color"] = condition.value; // e.g., "#2196F3"
    break; // Stop at first match
  }
}
```

**Priority 3: Default Value**
```javascript
// No conditions matched
output["button_color"] = parameter.default_value; // e.g., "#000000"
```

### Condition Matching Logic

Conditions use MongoDB-style queries:

**Example Condition**:
```json
{
  "condition": "{\"up.premium\":{\"$eq\":true},\"sg.os\":{\"$eq\":\"iOS\"}}",
  "value": "#FF5722"
}
```

**Parsed & Evaluated**:
```javascript
const condition = JSON.parse(condition.condition);
// Result: {up.premium: {$eq: true}, sg.os: {$eq: "iOS"}}

const matches = processFilter(user, condition);
// Checks if user.premium === true AND user.os === "iOS"
```

**Supported Operators**:
- `$eq`, `$ne`: Equality/inequality
- `$gt`, `$gte`, `$lt`, `$lte`: Comparisons
- `$in`, `$nin`: Array membership
- `$exists`: Field existence
- `$or`, `$and`: Logical operators

### Random Percentile for Gradual Rollouts

When condition has `seed_value`, enables percentage-based targeting:

**Condition with Percentage**:
```json
{
  "condition": "{\"random_percentile\":{\"$lte\":25}}",
  "seed_value": "feature_rollout_2024",
  "value": true
}
```

**Processing**:
```javascript
// Calculate deterministic random value (0-100)
user.random_percentile = hash(seed_value + device_id) % 100;
// Example: hash("feature_rollout_2024device123") % 100 = 42

// Evaluate condition
if (user.random_percentile <= 25) {
  // 25% of users see this value
  return true;
}
```

### Parameter Status Filtering

Only returns active parameters:

**Excluded Parameters**:
- `status === "Stopped"`: Manually disabled
- `expiry_dttm` < current time: Expired
- `status` field missing: Treated as "Running"

### Background Counter Updates

After serving config, asynchronously updates:
- **Parameter level**: `parameter.c` (count of times served)
- **Condition level**: `condition.c` (count of times condition matched)

Updates are **fire-and-forget** (don't block response).

---

## Examples

### Example 1: Basic fetch (all parameters)

**Description**: Fetch all active remote config values for device

**Request** (GET):
```bash
curl "https://your-server.com/o/sdk?method=rc&app_key=YOUR_APP_KEY&device_id=user12345"
```

**Response** (200):
```json
{
  "button_color": "#FF5722",
  "max_items": 50,
  "feature_enabled": true,
  "welcome_message": "Welcome!",
  "api_endpoint": "https://api.example.com/v2"
}
```

### Example 2: Fetch specific keys only

**Description**: Only fetch button_color and max_items

**Request** (GET):
```bash
curl "https://your-server.com/o/sdk" \
  -d "method=rc" \
  -d "app_key=YOUR_APP_KEY" \
  -d "device_id=user12345" \
  -d 'keys=["button_color","max_items"]'
```

**Response** (200):
```json
{
  "button_color": "#FF5722",
  "max_items": 50
}
```

### Example 3: Fetch with user metrics

**Description**: Include user properties for condition matching

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o/sdk" \
  -d "method=rc" \
  -d "app_key=YOUR_APP_KEY" \
  -d "device_id=user12345" \
  -d 'metrics={"_os":"iOS","_os_version":"15.0","_app_version":"2.1","premium":true}'
```

**Response** (200):
```json
{
  "button_color": "#2196F3",
  "max_items": 100,
  "feature_enabled": true
}
```

**Note**: User matches premium condition, gets different values

### Example 4: Fetch with location data

**Description**: Include geographic data for location-based conditions

**Request** (GET):
```bash
curl "https://your-server.com/o/sdk" \
  -d "method=rc" \
  -d "app_key=YOUR_APP_KEY" \
  -d "device_id=user12345" \
  -d "country_code=US" \
  -d "city=New York" \
  -d "location=40.7128,-74.0060"
```

**Response** (200):
```json
{
  "currency": "USD",
  "language": "en-US",
  "support_phone": "+1-800-555-0100"
}
```

### Example 5: Exclude specific keys

**Description**: Get all parameters except sensitive ones

**Request** (GET):
```bash
curl "https://your-server.com/o/sdk" \
  -d "method=rc" \
  -d "app_key=YOUR_APP_KEY" \
  -d "device_id=user12345" \
  -d 'omit_keys=["internal_flag","debug_mode"]'
```

**Response** (200):
```json
{
  "button_color": "#FF5722",
  "max_items": 50,
  "feature_enabled": true
}
```

### Example 6: Enroll in AB tests while fetching

**Description**: Set oi=1 to enroll user in AB test variants

**Request** (GET):
```bash
curl "https://your-server.com/o/sdk" \
  -d "method=rc" \
  -d "app_key=YOUR_APP_KEY" \
  -d "device_id=user12345" \
  -d "oi=1"
```

**Response** (200):
```json
{
  "button_color": "#4CAF50",
  "max_items": 75
}
```

**Note**: If AB test active for these keys, user enrolled and gets variant value

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `remoteconfig_parameters{app_id}` | Remote config domain | Stores remote-config parameters, conditions, and related metadata. |
| `remoteconfig_conditions{app_id}` | Remote config domain | Stores remote-config parameters, conditions, and related metadata. |
| `app_users{app_id}` | Per-app user profiles | Stores user-level profile fields read or modified by this endpoint. |
| `User session tracking` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Maximum parameters` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Maximum conditions per parameter` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Cache TTL` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No pagination` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No versioning` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No rollback` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Sync only` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Typical response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Query optimization` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Condition evaluation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Caching` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Enroll in AB Tests](./o-sdk-ab.md) - Explicitly enroll user in AB test variants
- [Get All Configs](./o-remote-config.md) - Dashboard view of all parameters and conditions
- [Add Parameter](./parameter-add.md) - Create new remote config parameter

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - config returned | Parameter key-value pairs |
| `200` | Success - no matching parameters | `{}` (empty object) |
| `400` | Invalid app_key | `{"result": "error", "message": "..."}` |
| `400` | Could not parse keys parameter | `{"result": "error", "message": "..."}` |
| `400` | Could not parse omit_keys parameter | `{"result": "error", "message": "..."}` |
| `400` | Error fetching remote config data | `{"result": "error", "message": "..."}` |

---

## Implementation Notes

1. **AB testing priority**: AB test values always override remote config values
2. **Condition order matters**: First matching condition wins (evaluate top-to-bottom)
3. **Default value fallback**: Always used when no conditions match
4. **Status filtering**: Only status="Running" (or undefined) and non-expired parameters returned
5. **Key filtering**: `keys` parameter takes precedence over `omit_keys`
6. **Random percentile**: Calculated per-condition if seed_value present
7. **User context**: Merged from metrics, location parameters, and existing user data
8. **Counter updates**: Fire-and-forget background updates (don't block response)
9. **Parse errors**: Silently ignored for keys/omit_keys (returns all parameters)
10. **Condition parse errors**: Condition skipped if JSON.parse fails
11. **Empty response**: Valid response when no active parameters exist
12. **Value types**: Values can be any JSON type (primitives, objects, arrays)

## Last Updated

February 2026
