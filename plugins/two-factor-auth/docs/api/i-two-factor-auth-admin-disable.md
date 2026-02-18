---
sidebar_label: "Admin Disable"
---

# /i/two-factor-auth?method=admin_disable

## Overview

Disables two-factor authentication for another user account. This is an administrative operation that bypasses global enforcement policies and allows admins to force-disable 2FA for user support or recovery scenarios.

---

## Endpoint


```plaintext
/i/two-factor-auth?method=admin_disable
```


---


## Authentication

Endpoint requires global admin authentication. Validation method in code: `validateUserForGlobalAdmin`.


## Permissions

- Required permission: Global Admin.

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `method` | String | Yes | Must be `admin_disable` |
| `uid` | String | Yes | User ID to disable 2FA for (MongoDB ObjectID) |

---

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `server.globally_enabled.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `two-factor-auth.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

**Success** (`200 OK`):
### Success Response

```json
{
  "result": "Disabled 2FA for user"
}
```

**Error Responses**:

`400 Bad Request` - Missing user ID:
```json
{
  "result": "User id required"
}
```

`404 Not Found` - User doesn't exist:
```json
{
  "result": "User does not exist"
}
```

`500 Internal Server Error` - Database error:
```json
{
  "result": "Database error while disabling 2FA"
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

## Examples

### Example 1: Admin Disables User's 2FA

**Description**: Global admin force-disables 2FA for a user who lost access to authenticator.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "admin_session_cookie" \
  -d "method=admin_disable" \
  -d "uid=507f1f77bcf86cd799439011"
```

**Response**:
```json
{
  "result": "Disabled 2FA for user"
}
```

---

### Example 2: Support Ticket Resolution

**Description**: Help desk admin resolves locked-out user by disabling their 2FA.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "admin_session=xyz789..." \
  -d "method=admin_disable" \
  -d "uid=507f1f77bcf86cd799439012"
```

**Response**:
```json
{
  "result": "Disabled 2FA for user"
}
```

User can now login without 2FA and should re-enable it immediately.

---

### Example 3: Bypassing Global Enforcement

**Description**: Admin disables 2FA even when organization has `globally_enabled: true`.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "admin_session_cookie" \
  -d "method=admin_disable" \
  -d "uid=507f1f77bcf86cd799439013"
```

**Response**:
```json
{
  "result": "Disabled 2FA for user"
}
```

This works even though the user's [self-disable endpoint](./i-two-factor-auth-disable.md) would be blocked.

---

### Example 4: Invalid User ID

**Description**: Attempt to disable for non-existent user.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "admin_session_cookie" \
  -d "method=admin_disable" \
  -d "uid=000000000000000000000000"
```

**Response**:
```json
{
  "result": "User does not exist"
}
```

---

## Behavior/Processing

### Processing Flow
1. Validates global admin authentication
2. Validates `uid` parameter presence
3. Updates member record in database
4. Sets `two_factor_auth.enabled: false`
5. Removes `two_factor_auth.secret_token` field
6. Logs action to systemlogs with target user ID
7. Returns success or error

### Key Differences from User Disable
- **Global Policy**: Bypasses `globally_enabled` configuration
- **Target User**: Can disable any user (not just self)
- **Permission**: Requires global admin (not user permission)
- **Use Case**: Support and recovery (not user preference)

### Security Implications
- Removes second authentication factor for target user
- User will only need password for next login
- Secret token permanently deleted
- Action logged with admin and target user details
- User should be instructed to re-enable 2FA immediately

---

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `updateOne()` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `$set: {"two_factor_auth.enabled": false}` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `$unset: {"two_factor_auth.secret_token": ""}` | Token records | Stores API/auth token records managed by this endpoint. |

---

## Systemlogs Integration

Action logged to systemlogs:
```javascript
{
  "action": "two_factor_auth_disabled",
  "user": "admin@example.com",  // admin who performed action
  "timestamp": "2026-02-13T10:30:00.000Z",
  "data": {
    "user_id": "507f1f77bcf86cd799439011"  // target user
  }
}
```

---

## Authorization

**Required Permission**: Global administrator

Verified via `validateUserForGlobalAdmin()` function:
- User must have global admin role
- Standard users and app admins cannot use this endpoint
- Returns 401/403 if not authorized

---

## Technical Notes

- **Admin Override**: Bypasses all policy restrictions
- **Audit Trail**: Logs both admin and target user
- **Permanent Deletion**: Secret token completely removed
- **No Confirmation**: Executes immediately (implement UI confirmation)
- **Re-enable Required**: User must go through full setup to re-enable
- **Session Required**: Admin must be authenticated

---

## Use Cases

### User Support Scenarios
1. **Lost Authenticator Device**: User lost phone with authenticator app
2. **Device Factory Reset**: User reset device before migrating 2FA
3. **App Malfunction**: Authenticator app corrupted or not working
4. **Emergency Access**: Critical situation requires immediate access
5. **Offboarding**: Temporary disable before account handoff

### When to Use Admin Disable
- User has legitimate reason and verified identity
- Emergency situation requires immediate access
- Standard disable method is blocked by policy
- User unable to access their account

### When NOT to Use
- Routine 2FA management (user should self-manage)
- Bypassing security policies without justification
- Without proper verification of user identity
- Without documenting the support ticket

---

## Comparison with User Disable

| Feature | Admin Disable (this endpoint) | User Disable |
|---------|-------------------------------|--------------|
| **Permission** | Global admin only | Self-service |
| **Target** | Any user account | Own account only |
| **Global Policy** | Bypasses enforcement | Blocked when enforced |
| **Use Case** | Support/recovery | User preference |
| **Audit Log** | Includes admin & target | Includes user only |
| **Confirmation** | Should require UI confirmation | User initiated |

---

## Best Practices

1. **Verify Identity**: Confirm user identity before disabling
2. **Document Reason**: Record why 2FA was disabled (ticket system)
3. **Notify User**: Email user about 2FA being disabled
4. **Re-enable Guidance**: Provide clear instructions to re-enable
5. **Time Limit**: Set expectation for re-enabling (e.g., 24 hours)
6. **Monitor Access**: Watch for suspicious activity during 2FA-disabled period
7. **Security Review**: Consider additional verification for sensitive accounts

---

## Related Endpoints

- [Generate QR Code](./i-two-factor-auth-generate-qr.md) - User can re-enable after admin disable
- [Enable 2FA](./i-two-factor-auth-enable.md) - User re-enables with new secret
- [Disable 2FA](./i-two-factor-auth-disable.md) - User self-disable (when allowed)
- [Admin Check 2FA Status](./i-two-factor-auth-admin-check.md) - Verify 2FA was disabled

---

## Security Warnings

⚠️ **Use Sparingly**: This is a powerful operation that reduces account security

⚠️ **Verify First**: Always verify user identity through alternative means before disabling

⚠️ **Time-Sensitive**: Encourage immediate re-enabling of 2FA after issue resolution

⚠️ **Audit Required**: Maintain audit trail of all admin disable operations

---

## Enterprise

Plugin: two-factor-auth
Endpoint: /i/two-factor-auth?method=admin_disable

## Last Updated

February 2026
