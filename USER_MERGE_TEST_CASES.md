# Comprehensive User Merge Test Cases

Based on analysis of the user merging code in:
- `api/ingestor/requestProcessor.js:55-92` - Merge trigger point
- `api/parts/mgmt/app_users.js:728-820` - Main merge function
- `api/parts/mgmt/app_users.js:471-585` - Plugin merge handler
- `api/jobs/userMerge.js` - Background merge job

## How User Merging Works

### Flow Overview:
1. **Trigger**: Request comes with both `device_id` (new) and `old_device_id` parameters
2. **Initial Merge**: `app_users` document is merged immediately (requestProcessor.js:61)
3. **Merge Document**: Record created in `app_user_merges` collection to track plugin merges (app_users.js:805)
4. **Background Job**: `userMerge` job processes plugin data merges every 5 minutes (userMerge.js)
5. **Plugin Dispatch**: Plugins handle their own data merging via `/i/device_id` hook
6. **Drill Events**: All drill_events are updated with new uid
7. **Cleanup**: Merge document deleted when complete

### Key Merge Logic:
- **Identity Selection**: User with latest `ls` (last seen) timestamp keeps their identity
- **UID Preservation**: Winning user's UID is kept, losing user's data is merged in
- **Property Merging**:
  - `sc` (session count), `tsd` (total session duration) are summed
  - `fs` (first seen) takes earliest
  - `ls` (last seen) takes latest
  - Custom properties: new user's values take precedence, old user fills gaps

---

## Test Case Categories

### 1. CORRECT SCENARIOS - Basic Merges

#### TC1.1: Anonymous User Logs In (Single Device)
**Description**: User browses anonymously, then logs in with same device
**Steps**:
1. Send session with `device_id=anon123`, create anonymous user
2. Verify user created with uid=1, did=anon123
3. Send request with `device_id=user123`, `old_device_id=anon123`
4. Verify old user (anon123) deleted
5. Verify new user (user123) has uid=1 and merged data

**Expected Results**:
- Old user document removed
- New user has same UID
- Session count preserved
- First seen (fs) timestamp preserved
- Merge document created in `app_user_merges`

**Validation Queries**:
```javascript
// Old user should not exist
db.app_users{APP_ID}.findOne({did: "anon123"}) === null

// New user exists with merged data
const newUser = db.app_users{APP_ID}.findOne({did: "user123"})
newUser.uid === 1
newUser.sc === 1  // session count preserved

// Merge tracking document created then removed after job runs
db.app_user_merges.findOne({_id: "{APP_ID}_1_{old_uid}"})
```

---

#### TC1.2: Anonymous User Logs In (Multi Device)
**Description**: User uses multiple devices anonymously, then logs in
**Steps**:
1. Create user on device1 (anonymous): `device_id=anon_device1`
2. Create user on device2 (anonymous): `device_id=anon_device2`
3. Login on device1: `device_id=logged_device1`, `old_device_id=anon_device1`
4. Login on device2: `device_id=logged_device2`, `old_device_id=anon_device2`
5. Wait for merge job to complete
6. Verify both anonymous users merged into logged user

**Expected Results**:
- Both anonymous users removed
- One logged-in user with merged data from both
- Session counts summed
- Earliest first seen kept
- Latest last seen kept

---

#### TC1.3: Multi-Account Merge
**Description**: User has two separate accounts and merges them
**Steps**:
1. Create account1 with sessions and events: `device_id=account1`
2. Create account2 with different sessions: `device_id=account2`
3. Merge: `device_id=account2`, `old_device_id=account1`
4. Wait for merge job
5. Verify account1 merged into account2

**Expected Results**:
- account1 removed
- account2 has combined session counts
- account2 has earliest first seen
- account2 has latest last seen
- All events from account1 now have account2's UID in drill_events

---

#### TC1.4: Older User Merges to Newer User
**Description**: User with earlier first_seen merges into user with later first_seen
**Steps**:
1. Create old_user with fs=timestamp1 (5 days ago), ls=timestamp2 (4 days ago)
2. Create new_user with fs=timestamp3 (3 days ago), ls=timestamp4 (now)
3. Merge: `device_id=new_user_id`, `old_device_id=old_user_id`
4. Verify new_user keeps identity but gets old_user's earlier fs

**Expected Results**:
- new_user keeps UID (has later ls)
- new_user.fs = old_user.fs (earlier timestamp)
- new_user.ls = new_user.ls (later timestamp)
- Session counts summed

---

#### TC1.5: Newer User Merges to Older User (Identity Switch)
**Description**: User with later first_seen but earlier last_seen merges - identities should swap
**Steps**:
1. Create user1 with fs=100, ls=500
2. Create user2 with fs=200, ls=300
3. Merge: `device_id=user2`, `old_device_id=user1`
4. Verify identities switched (user1 had later ls, so keeps UID)

**Expected Results**:
- user1's UID preserved (had later ls=500)
- Physical device IDs swapped (code lines 786-803)
- user1 now on user2's device
- Merge document tracks original UIDs

---

### 2. CORRECT SCENARIOS - Data Merging

#### TC2.1: Session Data Merging
**Description**: Verify session counts and durations are correctly summed
**Steps**:
1. Create user1 with sc=10, tsd=3600 (10 sessions, 1 hour total)
2. Create user2 with sc=5, tsd=1800 (5 sessions, 30 min total)
3. Merge user1 into user2
4. Verify user2 has sc=15, tsd=5400

**Expected Results**:
```javascript
mergedUser.sc === 15
mergedUser.tsd === 5400
```

---

#### TC2.2: Custom User Properties Merging
**Description**: Verify custom properties merge correctly
**Steps**:
1. Create user1 with custom={age: 25, city: "NYC"}
2. Create user2 with custom={age: 30, country: "USA"}
3. Merge user1 into user2
4. Verify user2 has custom={age: 30, city: "NYC", country: "USA"}

**Expected Results**:
- New user's properties take precedence
- Old user's unique properties are added
- Code: app_users.js:646-672

---

#### TC2.3: Array Custom Properties Merging
**Description**: Verify array properties are merged without duplicates
**Steps**:
1. Create user1 with custom={tags: ["tag1", "tag2"]}
2. Create user2 with custom={tags: ["tag2", "tag3"]}
3. Merge user1 into user2
4. Verify user2 has custom={tags: ["tag2", "tag3", "tag1"]}

**Expected Results**:
- Arrays merged
- No duplicates (code line 654: checks indexOf)

---

#### TC2.4: Events Data Merging
**Description**: Verify drill_events collection updated with new UID
**Steps**:
1. Create user1 with uid=100, send 10 events
2. Create user2 with uid=200, send 5 events
3. Verify drill_events has 10 events with uid=100, 5 with uid=200
4. Merge user1 into user2
5. Wait for merge job
6. Verify drill_events has 15 events all with uid=200

**Expected Results**:
```javascript
// Before merge
db.drill_events.count({uid: 100}) === 10
db.drill_events.count({uid: 200}) === 5

// After merge
db.drill_events.count({uid: 100}) === 0
db.drill_events.count({uid: 200}) === 15
```
Code: app_users.js:551

---

#### TC2.5: Metric Changes Merging
**Description**: Verify metric_changes collection updated
**Steps**:
1. Create users with metric changes tracked
2. Merge users
3. Verify metric_changes updated with new UID

**Expected Results**:
- All metric_changes entries for old UID updated to new UID
- Code: app_users.js:139-143, userMerge.js:168

---

### 3. EDGE CASES

#### TC3.1: Merging When Old User Doesn't Exist
**Description**: Request merge but old_device_id doesn't have user
**Steps**:
1. Send request with `device_id=new123`, `old_device_id=nonexistent`
2. Verify no error, new user created normally
3. Verify no merge document created

**Expected Results**:
- Code: app_users.js:768-769 returns early if oldAppUser not found
- New user created with new UID
- No merge processing

---

#### TC3.2: Merging Same Device ID (No-op)
**Description**: device_id and old_device_id are the same
**Steps**:
1. Send request with `device_id=same123`, `old_device_id=same123`
2. Verify merge skipped

**Expected Results**:
- Code: requestProcessor.js:56 checks `old_device_id !== device_id`
- No merge triggered
- Request processed normally

---

#### TC3.3: Merging When Old User Exists But New User Doesn't
**Description**: Old user exists, new device_id has no user yet
**Steps**:
1. Create old_user with data: `device_id=old123`
2. Send merge request: `device_id=new123`, `old_device_id=old123`
3. Verify old_user moved to new device_id

**Expected Results**:
- Code: app_users.js:771-782 handles this case
- Old user's document re-inserted with new _id and did
- Old document deleted
- UID preserved

---

#### TC3.4: Chained Merges (A→B, then B→C)
**Description**: Multiple sequential merges
**Steps**:
1. Create userA, userB, userC
2. Merge A into B
3. Wait for merge job to complete
4. Merge B into C
5. Verify all data from A and B now in C

**Expected Results**:
- userC has combined data from all three
- Code prevents processing merge B→C until A→B completes (app_users.js:483)
- Merge count tracked: `mergedUser.merges` incremented each time

---

#### TC3.5: Parallel Merges to Same Target (A→C and B→C simultaneously)
**Description**: Two merges targeting same user at once
**Steps**:
1. Create userA, userB, userC
2. Send merge A→C
3. Immediately send merge B→C (before first completes)
4. Wait for both to complete
5. Verify both merged successfully

**Expected Results**:
- Both merges should succeed
- Final user has data from all three
- Possible race condition - test for data consistency
- Code uses update operations which should be atomic

---

#### TC3.6: Merge Document Already Exists (Retry Scenario)
**Description**: Merge document exists from previous failed attempt
**Steps**:
1. Create merge document manually: `{_id: "{APP_ID}_{new_uid}_{old_uid}", merged_to: new_uid}`
2. Trigger merge with same user IDs
3. Verify merge proceeds or is skipped appropriately

**Expected Results**:
- Code: app_users.js:805-812 uses `ignore_errors: [11000]` to handle duplicate key
- Merge continues processing
- Retry counter incremented

---

#### TC3.7: Merge with Maximum Retries Exceeded
**Description**: Merge fails repeatedly, reaches retry limit
**Steps**:
1. Create merge scenario that will fail (e.g., mock plugin failure)
2. Let merge job run multiple times
3. Verify merge document deleted after 100 retries

**Expected Results**:
- Code: userMerge.js:73-81 checks `user.t > 100`
- Merge document deleted
- Warning logged

---

#### TC3.8: Merge with Empty Old User (Only _id exists)
**Description**: Old user document exists but has no data
**Steps**:
1. Create minimal old_user: `{_id: hash, did: "old123"}`
2. Create normal new_user with full data
3. Merge old into new
4. Verify new user unchanged except for merge tracking

**Expected Results**:
- New user data preserved
- No errors from undefined properties
- Code: app_users.js:587-683 safely handles undefined

---

#### TC3.9: Merge with Empty New User
**Description**: New user exists but has minimal data
**Steps**:
1. Create full old_user with sessions, properties
2. Create minimal new_user: `{_id: hash, did: "new123"}`
3. Merge old into new
4. Verify new user gets all old user's data

**Expected Results**:
- New user populated with old user's data
- UID determined by ls timestamp

---

#### TC3.10: Plugin Merge Failure and Retry
**Description**: Plugin fails to merge data, should retry
**Steps**:
1. Mock a plugin that fails on `/i/device_id` dispatch
2. Trigger merge
3. Verify merge document marked for retry (cc unset)
4. Fix plugin, wait for retry
5. Verify merge completes

**Expected Results**:
- Code: app_users.js:538-547 handles plugin failures
- `cc` field unset to allow retry
- `retry_error` field populated
- `lu` updated to allow reprocessing

---

#### TC3.11: Drill Events Merge Failure
**Description**: drill_events update fails during merge
**Steps**:
1. Mock drill_events update to fail
2. Trigger merge
3. Verify merge marked for retry

**Expected Results**:
- Code: app_users.js:551-561 catches error
- Merge document updated with retry flag
- Error message: "Failure while merging drill_events data"

---

#### TC3.12: Concurrent Merge Prevention
**Description**: Prevent merging user that's target of another ongoing merge
**Steps**:
1. Start merge A→B
2. Immediately try to start merge B→C
3. Verify second merge waits or is skipped

**Expected Results**:
- Code: app_users.js:483 checks for existing merges
- Second merge returns: "skipping till previous merge is finished"
- Uses regex to find merges: `{$regex: app_id + "_" + oldAppUser.uid + "_.*"}`

---

### 4. INCORRECT/ERROR SCENARIOS

#### TC4.1: Missing old_device_id Parameter
**Description**: Request has device_id but no old_device_id
**Steps**:
1. Send request with only `device_id=test123`
2. Verify normal processing, no merge attempted

**Expected Results**:
- No merge triggered
- Normal user creation/update flow
- Code: requestProcessor.js:56 condition not met

---

#### TC4.2: Missing device_id Parameter
**Description**: Request has old_device_id but no device_id
**Steps**:
1. Send request with only `old_device_id=test123`
2. Verify request rejected

**Expected Results**:
- Error: 'Missing parameter "device_id"'
- Code: requestProcessor.js:1019-1022

---

#### TC4.3: Invalid app_key
**Description**: Merge request with invalid/missing app_key
**Steps**:
1. Send merge request with `app_key=invalid`
2. Verify request rejected

**Expected Results**:
- Error: 'App does not exist'
- Code: requestProcessor.js:690-695

---

#### TC4.4: Merge with Non-existent App
**Description**: Merge request for app that doesn't exist
**Steps**:
1. Send merge request with valid format but non-existent app
2. Verify rejection

**Expected Results**:
- Error before merge processing
- No merge document created

---

#### TC4.5: Database Connection Failure During Merge
**Description**: Database unavailable during merge
**Steps**:
1. Start merge
2. Simulate database disconnection
3. Verify appropriate error handling

**Expected Results**:
- Error callback invoked
- Merge document remains for retry
- No partial data corruption

---

#### TC4.6: Invalid Device ID Format
**Description**: device_id or old_device_id has invalid characters
**Steps**:
1. Send request with `device_id=test@#$%`, `old_device_id=old123`
2. Verify handling

**Expected Results**:
- Device IDs converted to strings: `params.qstring.device_id += ""`
- SHA1 hash computed from string
- Should process without error

---

#### TC4.7: Extremely Long Device IDs
**Description**: Device IDs with excessive length
**Steps**:
1. Send request with device_id of 10000 characters
2. Verify handling

**Expected Results**:
- SHA1 hash handles any length
- Should process normally
- Database may have length limits

---

#### TC4.8: Special Characters in Device IDs
**Description**: Device IDs with special characters, unicode, etc.
**Steps**:
1. Test various special characters: `device_id=用户123`, `device_id=<script>test</script>`
2. Verify safe handling

**Expected Results**:
- All input converted to string
- SHA1 hash makes it safe
- No injection vulnerabilities

---

#### TC4.9: Null or Undefined Parameters
**Description**: Parameters explicitly set to null/undefined
**Steps**:
1. Send request with `device_id=null`, `old_device_id=undefined`
2. Verify handling

**Expected Results**:
- Type conversion: `device_id + ""` makes it string "null"
- Treated as device_id="null"

---

#### TC4.10: Race Condition - Merge Same Users Twice Simultaneously
**Description**: Two identical merge requests at same instant
**Steps**:
1. Send merge request A→B
2. Simultaneously send duplicate merge request A→B
3. Verify data consistency

**Expected Results**:
- Both requests process
- Second might find old user already deleted
- No data corruption
- Merge document uses upsert with ignore_errors

---

### 5. PERFORMANCE & SCALE TEST CASES

#### TC5.1: Merge User with Large Event History
**Description**: Merge user with 100,000+ events
**Steps**:
1. Create user with 100K events in drill_events
2. Merge with another user
3. Measure time, verify all events updated

**Expected Results**:
- Background job completes within reasonable time
- All events updated
- No timeout errors

---

#### TC5.2: Merge User with Many Custom Properties
**Description**: User with 100+ custom properties
**Steps**:
1. Create user with 100 custom properties
2. Merge with user with 100 different properties
3. Verify all merged correctly

**Expected Results**:
- All properties merged
- No property loss
- No MongoDB document size limit hit (16MB)

---

#### TC5.3: Merge Multiple Users in Parallel
**Description**: Trigger 100 different merges simultaneously
**Steps**:
1. Create 200 users
2. Trigger 100 merges simultaneously
3. Verify all complete successfully

**Expected Results**:
- All merges process
- Background job handles parallel processing
- Config: `user_merge_paralel` setting (userMerge.js:24)

---

#### TC5.4: Merge Job with Large Backlog
**Description**: 1000 pending merges waiting for job
**Steps**:
1. Create 1000 merge documents
2. Trigger merge job
3. Verify job processes all within reasonable time

**Expected Results**:
- Job processes in batches (limit: 100, userMerge.js:34)
- Continues until all processed
- Progress tracking works

---

### 6. TEST UTILITIES NEEDED

Based on `testUtils.js`, here are helpful utilities to implement:

```javascript
// Utility to trigger merge job manually
testUtils.triggerMergeProcessing(callback)

// Utility to verify merge completion
function verifyMergeCompleted(app_id, old_uid, new_uid) {
  // Check old user deleted
  // Check new user has merged data
  // Check merge document cleaned up
  // Check drill_events updated
}

// Utility to create user with specific properties
function createTestUser(device_id, properties) {
  // Creates user with specific sc, tsd, custom properties, etc.
}

// Utility to send events for user
function sendEventsForUser(device_id, eventCount) {
  // Creates events in drill_events collection
}

// Utility to wait for async merge to complete
function waitForMergeJob(timeout) {
  // Polls app_user_merges collection
  // Returns when merge document removed
}
```

---

## Test Execution Order

Recommended order to run tests:

1. **Basic Correct Scenarios** (TC1.1-1.5) - Verify core functionality
2. **Data Merging** (TC2.1-2.5) - Verify data integrity
3. **Edge Cases** (TC3.1-3.12) - Test boundary conditions
4. **Error Scenarios** (TC4.1-4.10) - Verify error handling
5. **Performance** (TC5.1-5.4) - Test at scale

---

## Test Data Setup

### Minimal Setup:
```javascript
const APP_KEY = "test_app_key"
const APP_ID = "test_app_id"
const DEVICE_ID_BASE = "test_device_"
```

### User Creation Helper:
```javascript
function createUser(deviceIdSuffix, metrics, customProps) {
  const device_id = DEVICE_ID_BASE + deviceIdSuffix
  const params = {
    _os: metrics.os || "Android",
    _os_version: metrics.os_version || "10",
    _device: metrics.device || "Test Device"
  }

  // Add custom properties if provided
  if (customProps) {
    params.user_details = JSON.stringify(customProps)
  }

  return request
    .get(`/i?device_id=${device_id}&app_key=${APP_KEY}&begin_session=1&metrics=${JSON.stringify(params)}`)
    .expect(200)
}
```

### Merge Helper:
```javascript
function mergeUsers(newDeviceId, oldDeviceId) {
  return request
    .get(`/i?device_id=${newDeviceId}&old_device_id=${oldDeviceId}&app_key=${APP_KEY}`)
    .expect(200)
}
```

### Verification Helpers:
```javascript
async function verifyUserExists(deviceId, expectedUid) {
  const id = crypto.createHash('sha1').update(APP_KEY + deviceId).digest('hex')
  const user = await db.collection('app_users' + APP_ID).findOne({_id: id})
  should.exist(user)
  if (expectedUid) user.uid.should.equal(expectedUid)
  return user
}

async function verifyUserDeleted(deviceId) {
  const id = crypto.createHash('sha1').update(APP_KEY + deviceId).digest('hex')
  const user = await db.collection('app_users' + APP_ID).findOne({_id: id})
  should.not.exist(user)
}

async function verifyDrillEventsUpdated(oldUid, newUid, expectedCount) {
  const oldCount = await db.collection('drill_events').countDocuments({
    a: APP_ID,
    uid: oldUid
  })
  const newCount = await db.collection('drill_events').countDocuments({
    a: APP_ID,
    uid: newUid
  })

  oldCount.should.equal(0)
  newCount.should.equal(expectedCount)
}
```

---

## Key Assertions for Each Test

Every merge test should verify:

1. ✅ **Old user removed** from app_users collection
2. ✅ **New user exists** with correct UID
3. ✅ **Session data merged** (sc, tsd correct)
4. ✅ **Timestamps correct** (fs earliest, ls latest)
5. ✅ **Custom properties merged** correctly
6. ✅ **Merge document created** in app_user_merges
7. ✅ **Merge document removed** after job runs
8. ✅ **drill_events updated** with new UID
9. ✅ **Plugin data merged** (if applicable)
10. ✅ **No data loss** - all data accounted for

---

## Configuration for Testing

Key configuration values to consider:

```javascript
// From userMerge.js
user_merge_paralel: 1  // Number of merges to process in parallel

// From requestProcessor.js
prevent_duplicate_requests: true  // Prevents duplicate merges

// Timeouts
testScalingFactor: 1.5  // Multiply timeouts by this
testWaitTimeForDrillEvents: 5300  // Wait for drill processing
```

---

## Database Collections to Monitor

During testing, monitor these collections:

1. **app_users{APP_ID}** - User documents
2. **app_user_merges** - Merge tracking
3. **drill_events** - Event data (in drillDb)
4. **metric_changes{APP_ID}** - Metric changes
5. **app_userviews** - View data (if views plugin active)
6. **apps** - App document (seq counter for UIDs)

---

## Common Issues to Test For

1. **UID Leakage** - Ensure old UID not reused
2. **Data Loss** - Events, sessions, properties lost
3. **Partial Merge** - app_users merged but drill_events not
4. **Orphaned Merge Docs** - Merge documents not cleaned up
5. **Race Conditions** - Concurrent merges corruption
6. **Plugin Failures** - Plugin merge fails, whole merge fails
7. **Job Failures** - Background job stops processing
8. **Retry Loops** - Merge keeps failing and retrying forever

---

## Success Criteria

A successful test run should show:
- ✅ All correct scenarios pass
- ✅ All edge cases handled gracefully
- ✅ All error scenarios caught and logged
- ✅ No data loss in any scenario
- ✅ Performance acceptable under load
- ✅ Background job completes within expected time
- ✅ No orphaned documents in database
- ✅ Merge counts increment correctly

---

## Notes for Implementation

1. **Use existing test structure** from `test/3.api.write/7.user.merge.js`
2. **Add testUtils functions** for merge verification
3. **Use setTimeout** with `testScalingFactor` for async waits
4. **Test in order** - some tests depend on clean state
5. **Clean up** between test suites (reset app)
6. **Mock plugins** when needed for failure testing
7. **Monitor logs** for errors during test run
8. **Use transactions** if testing rollback scenarios

---

## Additional Test Scenarios to Consider

- Merge with different timezones
- Merge with campaigns data (cmp property)
- Merge with consent data
- Merge with crash data
- Merge with push data
- Merge with APM data
- Merge with views data
- Merge with cohorts
- Merge with geo data
- Merge with carriers data

Each plugin may have its own merge logic via `/i/device_id` dispatch hook.
