---
sidebar_label: "Admin Check Status"
---

# /i/two-factor-auth?method=admin_check

## Overview

Checks if a specific user has two-factor authentication enabled. This is an administrative operation that allows global admins to verify the 2FA status of any user account.

---

## Endpoint


```plaintext
/i/two-factor-auth?method=admin_check
```


---


## Authentication

Endpoint requires global admin authentication. Validation method in code: `validateUserForGlobalAdmin`.


## Permissions

- Required permission: Global Admin.

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `method` | String | Yes | Must be `admin_check` |
| `uid` | String | Yes | User ID to check (MongoDB ObjectID) |

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
  "result": "true"
}
```

or

```json
{
  "result": "false"
}
```

**Note**: Result is returned as a string, not boolean.

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
  "result": "Database error while checking 2FA"
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

### Example 1: Check if User Has 2FA Enabled

**Description**: Admin checks 2FA status for a specific user.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "admin_session_cookie" \
  -d "method=admin_check" \
  -d "uid=507f1f77bcf86cd799439011"
```

**Response** (User has 2FA):
```json
{
  "result": "true"
}
```

**Response** (User doesn't have 2FA):
```json
{
  "result": "false"
}
```

---

### Example 2: Verify 2FA Before Admin Operation

**Description**: Check user's 2FA status before performing a sensitive operation.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "admin_session=xyz789..." \
  -d "method=admin_check" \
  -d "uid=507f1f77bcf86cd799439011"
```

**Response**:
```json
{
  "result": "true"
}
```

Admin can then proceed knowing the user has 2FA protection.

---

### Example 3: Audit User Security Status

**Description**: Check multiple users' 2FA status for security audit.

**Batch Script**:
```bash
for uid in "507f1f77bcf86cd799439011" "507f1f77bcf86cd799439012" "507f1f77bcf86cd799439013"; do
  curl -X POST "https://your-server.com/i/two-factor-auth" \
    --cookie "admin_session_cookie" \
    -d "method=admin_check" \
    -d "uid=$uid"
done
```

---

### Example 4: Invalid User ID

**Description**: Check status for non-existent user.

**Request**:
```bash
curl -X POST "https://your-server.com/i/two-factor-auth" \
  --cookie "admin_session_cookie" \
  -d "method=admin_check" \
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
3. Queries `members` collection for user
4. Checks if user exists
5. Evaluates `two_factor_auth.enabled` field
6. Returns `"true"` or `"false"` as string

### 2FA Status Determination
```javascript
if (member.two_factor_auth && member.two_factor_auth.enabled) {
  return "true";
} else {
  return "false";
}
```

Returns `"false"` if:
- `two_factor_auth` field doesn't exist
- `two_factor_auth.enabled` is `false`
- `two_factor_auth.enabled` is not set

---

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Member/account metadata | Stores member identity/profile fields used for enrichment and ownership checks. |

---

## Authorization

**Required Permission**: Global administrator

Verified via `validateUserForGlobalAdmin()` function:
- User must have global admin role
- Standard users and app admins cannot use this endpoint
- Returns 401/403 if not authorized

---

## Technical Notes

- **Read-Only**: No database modifications performed
- **String Result**: Returns `"true"`/`"false"` as strings, not booleans
- **Global Admin Only**: Requires highest permission level
- **Audit Use**: Useful for security audits and compliance reporting
- **No Rate Limiting**: Consider implementing for protection
- **ObjectID Format**: `uid` must be valid MongoDB ObjectID string

---

## Use Cases

### Security Auditing
- Generate reports of users with/without 2FA
- Identify users needing 2FA setup
- Compliance verification

### User Support
- Verify user's 2FA status before troubleshooting
- Confirm 2FA was successfully enabled
- Check before admin disable operation

### Automated Monitoring
- Monitor organization-wide 2FA adoption
- Alert on users without 2FA
- Track compliance metrics

---

## Related Endpoints

- [Generate QR Code](./i-two-factor-auth-generate-qr.md) - Setup 2FA for user
- [Enable 2FA](./i-two-factor-auth-enable.md) - Activate 2FA
- [Disable 2FA](./i-two-factor-auth-disable.md) - User self-disable
- [Admin Disable 2FA](./i-two-factor-auth-admin-disable.md) - Force disable user's 2FA

---

## Example Integration

### Security Dashboard
```javascript
async function checkUserSecurity(userId) {
  const response = await fetch('/i/two-factor-auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      method: 'admin_check',
      uid: userId
    }),
    credentials: 'include'
  });
  
  const data = await response.json();
  return data.result === "true";
}

// Usage
const has2FA = await checkUserSecurity('507f1f77bcf86cd799439011');
console.log(`User has 2FA: ${has2FA}`);
```

---

## Enterprise

Plugin: two-factor-auth
Endpoint: /i/two-factor-auth?method=admin_check

## Last Updated

February 2026
