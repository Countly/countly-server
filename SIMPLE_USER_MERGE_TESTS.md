# Simple User Merge Test Cases

Quick reference for testing user merge implementation. Based on code in `newarchitecture` branch:
- `api/ingestor/requestProcessor.js:55-92`
- `api/parts/mgmt/app_users.js:728-820`
- `api/jobs/userMerge.js`

---

## Quick Test Setup

```javascript
const crypto = require('crypto');
const testUtils = require("../testUtils");

// Helper to hash device_id into user _id
function getUserId(app_key, device_id) {
  return crypto.createHash('sha1').update(app_key + device_id).digest('hex');
}

// Helper to trigger merge job
async function waitForMergeJob(done) {
  await testUtils.triggerMergeProcessing(done);
}
```

---

## CATEGORY 1: Basic Correct Cases (MUST PASS)

### Test 1: Anonymous → Login (Same Device Type)
```javascript
// Create anonymous user
GET /i?device_id=anon1&app_key=APP_KEY&begin_session=1

// Verify user created
db.app_users{APP_ID}.findOne({did: "anon1"})  // uid=1

// User logs in
GET /i?device_id=user1&old_device_id=anon1&app_key=APP_KEY

// Wait for merge
waitForMergeJob()

// Verify
db.app_users{APP_ID}.findOne({did: "anon1"})  // null (deleted)
db.app_users{APP_ID}.findOne({did: "user1"})  // uid=1 (same uid, new did)
```

**Expected**: Old user deleted, new user has same UID

---

### Test 2: Two Accounts → One Account
```javascript
// Create two separate accounts
GET /i?device_id=account_a&app_key=APP_KEY&begin_session=1  // uid=1, sc=1
GET /i?device_id=account_b&app_key=APP_KEY&begin_session=1  // uid=2, sc=1

// Merge B into A
GET /i?device_id=account_a&old_device_id=account_b&app_key=APP_KEY

waitForMergeJob()

// Verify
db.app_users{APP_ID}.findOne({did: "account_b"})  // null
const userA = db.app_users{APP_ID}.findOne({did: "account_a"})
userA.uid  // 1 (kept original)
userA.sc   // 2 (sessions summed)
```

**Expected**: One user remains, session count = 2

---

### Test 3: Old User Has More Sessions (Identity Should Switch)
```javascript
// Create new user (recent)
GET /i?device_id=new_user&app_key=APP_KEY&begin_session=1&timestamp=1000

// Create old user (ancient but active recently)
GET /i?device_id=old_user&app_key=APP_KEY&begin_session=1&timestamp=100
GET /i?device_id=old_user&app_key=APP_KEY&session_duration=60&timestamp=2000

// Merge
GET /i?device_id=new_user&old_device_id=old_user&app_key=APP_KEY

waitForMergeJob()

// Verify: old_user had more recent 'ls' (last seen), so keeps UID
const merged = db.app_users{APP_ID}.findOne({did: "new_user"})
merged.uid  // Should be old_user's uid (had later ls)
merged.fs   // Should be old_user's fs (100 - earliest)
merged.ls   // Should be old_user's ls (2000 - latest)
```

**Expected**: User with latest activity keeps identity

---

## CATEGORY 2: Data Merge Verification

### Test 4: Session Counts Sum
```javascript
// User1: 5 sessions, 300 seconds
// User2: 3 sessions, 180 seconds
// Merge → 8 sessions, 480 seconds

GET /i?device_id=user1&app_key=APP_KEY&begin_session=1&session_duration=60
// ... repeat 5 times

GET /i?device_id=user2&app_key=APP_KEY&begin_session=1&session_duration=60
// ... repeat 3 times

GET /i?device_id=user1&old_device_id=user2&app_key=APP_KEY

waitForMergeJob()

const merged = db.app_users{APP_ID}.findOne({did: "user1"})
merged.sc   // 8
merged.tsd  // 480
```

**Expected**: sc and tsd summed correctly

---

### Test 5: Custom Properties Merge
```javascript
// User1 with custom properties
GET /i?device_id=user1&app_key=APP_KEY&user_details={"age":25,"city":"NYC"}

// User2 with different properties
GET /i?device_id=user2&app_key=APP_KEY&user_details={"age":30,"country":"USA"}

// Merge
GET /i?device_id=user2&old_device_id=user1&app_key=APP_KEY

waitForMergeJob()

const merged = db.app_users{APP_ID}.findOne({did: "user2"})
merged.custom.age     // 30 (user2's value - new user wins)
merged.custom.city    // "NYC" (from user1 - filled gap)
merged.custom.country // "USA" (user2's original)
```

**Expected**: New user's values take precedence, old user fills gaps

---

### Test 6: Events Merge (drill_events)
```javascript
// User1 sends 5 events
for (let i=0; i<5; i++) {
  GET /i?device_id=user1&app_key=APP_KEY&events=[{"key":"test_event","count":1}]
}

// User2 sends 3 events
for (let i=0; i<3; i++) {
  GET /i?device_id=user2&app_key=APP_KEY&events=[{"key":"test_event","count":1}]
}

// Get UIDs
const u1 = db.app_users{APP_ID}.findOne({did:"user1"})
const u2 = db.app_users{APP_ID}.findOne({did:"user2"})

// Verify event counts
db.drill_events.count({a:APP_ID, uid:u1.uid})  // 5
db.drill_events.count({a:APP_ID, uid:u2.uid})  // 3

// Merge
GET /i?device_id=user2&old_device_id=user1&app_key=APP_KEY

waitForMergeJob()

// Verify all events now under user2's uid
db.drill_events.count({a:APP_ID, uid:u1.uid})  // 0
db.drill_events.count({a:APP_ID, uid:u2.uid})  // 8
```

**Expected**: All drill_events updated with new UID

---

## CATEGORY 3: Edge Cases

### Test 7: Merge When Old User Doesn't Exist
```javascript
// Only create new user
GET /i?device_id=new_user&app_key=APP_KEY&begin_session=1

// Try to merge with non-existent old user
GET /i?device_id=new_user&old_device_id=ghost_user&app_key=APP_KEY

// Verify no error
// Verify new_user unchanged
const user = db.app_users{APP_ID}.findOne({did:"new_user"})
user.uid  // Still original UID
```

**Expected**: No error, merge skipped gracefully

---

### Test 8: Same Device ID (No-op)
```javascript
// Create user
GET /i?device_id=same&app_key=APP_KEY&begin_session=1

// Try merge with self
GET /i?device_id=same&old_device_id=same&app_key=APP_KEY

// Verify no merge processing
db.app_user_merges.findOne({})  // null (no merge doc created)
```

**Expected**: Merge skipped when device_ids are equal

---

### Test 9: Merge When New User Doesn't Exist Yet
```javascript
// Create only old user
GET /i?device_id=old_user&app_key=APP_KEY&begin_session=1&metrics={"_os":"iOS"}

const oldUser = db.app_users{APP_ID}.findOne({did:"old_user"})
oldUser.uid  // e.g., 1

// Merge to new device (doesn't exist yet)
GET /i?device_id=new_user&old_device_id=old_user&app_key=APP_KEY

waitForMergeJob()

// Verify old user "moved" to new device
db.app_users{APP_ID}.findOne({did:"old_user"})  // null
const newUser = db.app_users{APP_ID}.findOne({did:"new_user"})
newUser.uid  // 1 (same uid)
newUser.p    // "iOS" (data preserved)
```

**Expected**: Old user moved to new device_id, data intact

---

### Test 10: Chained Merge (A→B, then B→C)
```javascript
// Create 3 users
GET /i?device_id=userA&app_key=APP_KEY&begin_session=1  // uid=1
GET /i?device_id=userB&app_key=APP_KEY&begin_session=1  // uid=2
GET /i?device_id=userC&app_key=APP_KEY&begin_session=1  // uid=3

// Merge A→B
GET /i?device_id=userB&old_device_id=userA&app_key=APP_KEY
waitForMergeJob()

// Merge B→C
GET /i?device_id=userC&old_device_id=userB&app_key=APP_KEY
waitForMergeJob()

// Verify all merged into C
db.app_users{APP_ID}.findOne({did:"userA"})  // null
db.app_users{APP_ID}.findOne({did:"userB"})  // null
const userC = db.app_users{APP_ID}.findOne({did:"userC"})
userC.sc  // 3 (all sessions combined)
userC.merges  // 2 (merged twice)
```

**Expected**: Chained merges work, all data in final user

---

### Test 11: Parallel Merges to Same Target
```javascript
// Create 3 users
GET /i?device_id=userA&app_key=APP_KEY&begin_session=1
GET /i?device_id=userB&app_key=APP_KEY&begin_session=1
GET /i?device_id=userC&app_key=APP_KEY&begin_session=1

// Trigger both merges simultaneously (don't wait between them)
GET /i?device_id=userC&old_device_id=userA&app_key=APP_KEY
GET /i?device_id=userC&old_device_id=userB&app_key=APP_KEY

waitForMergeJob()

// Verify both merged successfully
db.app_users{APP_ID}.findOne({did:"userA"})  // null
db.app_users{APP_ID}.findOne({did:"userB"})  // null
const userC = db.app_users{APP_ID}.findOne({did:"userC"})
userC.sc  // 3 (all combined)
```

**Expected**: Both merges succeed, no data loss

---

## CATEGORY 4: Error Cases

### Test 12: Missing device_id
```javascript
GET /i?old_device_id=old_user&app_key=APP_KEY

// Expected response
{result: "Error", message: 'Missing parameter "device_id"'}
```

---

### Test 13: Missing old_device_id (Normal Processing)
```javascript
GET /i?device_id=user1&app_key=APP_KEY&begin_session=1

// Should process normally without merge
const user = db.app_users{APP_ID}.findOne({did:"user1"})
user.uid  // Normal UID assigned
```

---

### Test 14: Invalid app_key
```javascript
GET /i?device_id=user1&old_device_id=user2&app_key=INVALID

// Expected response
{result: "Error", message: "App does not exist"}
```

---

### Test 15: Merge with Pending Merge (Prevention)
```javascript
// Create users A, B, C
GET /i?device_id=userA&app_key=APP_KEY&begin_session=1
GET /i?device_id=userB&app_key=APP_KEY&begin_session=1
GET /i?device_id=userC&app_key=APP_KEY&begin_session=1

// Start merge A→B (don't wait for job)
GET /i?device_id=userB&old_device_id=userA&app_key=APP_KEY

// Immediately try B→C (B is target of ongoing merge)
GET /i?device_id=userC&old_device_id=userB&app_key=APP_KEY

// First merge job run
waitForMergeJob()

// Verify B→C was skipped/delayed
db.app_user_merges.findOne({_id: APP_ID+"_"+userC.uid+"_"+userB.uid})
// Should exist but not processed, or processed only after first merge done
```

**Expected**: Prevents merging user that's being merged elsewhere

---

## CATEGORY 5: Background Job Tests

### Test 16: Merge Job Processes Pending Merges
```javascript
// Create merge document manually (simulates stuck merge)
const userA = db.app_users{APP_ID}.findOne({did:"userA"})
const userB = db.app_users{APP_ID}.findOne({did:"userB"})

db.app_user_merges.insertOne({
  _id: APP_ID + "_" + userB.uid + "_" + userA.uid,
  merged_to: userB.uid,
  ts: Math.round(Date.now()/1000),
  lu: Math.round(Date.now()/1000) - 100,  // Old enough to process
  t: 0  // No retries yet
})

// Trigger job
waitForMergeJob()

// Verify merge processed and document removed
db.app_user_merges.findOne({_id: APP_ID+"_"+userB.uid+"_"+userA.uid})  // null
```

**Expected**: Job picks up and processes pending merges

---

### Test 17: Retry Limit Exceeded (100 retries)
```javascript
// Create merge doc with high retry count
db.app_user_merges.insertOne({
  _id: APP_ID + "_newuid_olduid",
  merged_to: "newuid",
  ts: Math.round(Date.now()/1000),
  lu: Math.round(Date.now()/1000) - 100,
  t: 101  // Exceeds limit
})

// Trigger job
waitForMergeJob()

// Verify merge doc deleted (too many retries)
db.app_user_merges.findOne({_id: APP_ID+"_newuid_olduid"})  // null
```

**Expected**: Merge abandoned and document cleaned up

---

## Quick Verification Checklist

For each merge test, verify:

- [ ] Old user document deleted from `app_users{APP_ID}`
- [ ] New user exists with correct `uid`
- [ ] Session count (`sc`) correct
- [ ] Total session duration (`tsd`) correct
- [ ] First seen (`fs`) is earliest timestamp
- [ ] Last seen (`ls`) is latest timestamp
- [ ] Custom properties merged correctly
- [ ] Merge document created in `app_user_merges`
- [ ] Merge document removed after job runs
- [ ] All `drill_events` updated with new `uid`
- [ ] `metric_changes` updated (if exists)
- [ ] Merge counter (`merges` field) incremented

---

## Test Utilities to Add to testUtils.js

```javascript
// Add to testUtils.js

/**
 * Trigger user merge job and wait for completion
 */
testUtils.triggerMergeProcessing = function(callback) {
  const date = Math.round(Date.now() / 1000) - 100;
  this.db.collection("app_user_merges").updateMany(
    {},
    {$set: {lu: date}},
    (err) => {
      if (err) return callback(err);
      this.triggerJobToRun("api:userMerge", callback);
    }
  );
};

/**
 * Get user by device_id
 */
testUtils.getUserByDevice = async function(app_id, app_key, device_id) {
  const id = crypto.createHash('sha1')
    .update(app_key + device_id)
    .digest('hex');
  return await this.db.collection('app_users' + app_id).findOne({_id: id});
};

/**
 * Wait for merge to complete (merge doc removed)
 */
testUtils.waitForMergeComplete = async function(app_id, new_uid, old_uid, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const mergeDoc = await this.db.collection('app_user_merges')
      .findOne({_id: app_id + "_" + new_uid + "_" + old_uid});
    if (!mergeDoc) return true;
    await this.sleep(1000);
  }
  throw new Error("Merge did not complete within timeout");
};

/**
 * Count drill events for user
 */
testUtils.countDrillEvents = async function(app_id, uid) {
  return await this.db.collection('drill_events')
    .countDocuments({a: app_id, uid: uid});
};
```

---

## Running Tests

```bash
# Run specific user merge tests
npm test test/3.api.write/7.user.merge.js

# Run all API write tests (includes merge)
npm test test/3.api.write/

# Run with debugging
DEBUG=* npm test test/3.api.write/7.user.merge.js
```

---

## Debugging Tips

1. **Check merge document status**:
```javascript
db.app_user_merges.find({}).toArray()
// Look for: t (retries), lu (last update), cc (calculating), u (user merged)
```

2. **Check drill events**:
```javascript
db.drill_events.aggregate([
  {$match: {a: APP_ID}},
  {$group: {_id: "$uid", count: {$sum: 1}}}
])
```

3. **Check user document**:
```javascript
db.app_users{APP_ID}.findOne({uid: USER_UID})
// Look for: sc, tsd, fs, ls, merges, merged_uid, merged_did
```

4. **Monitor logs**:
```bash
tail -f log/countly-api.log | grep -i merge
```

---

## Expected Timing

- **Immediate**: User document merge completes
- **5-10 seconds**: Merge document created
- **After job run** (manual trigger or 5 min): Plugin data merged
- **After job run**: drill_events updated
- **After job run**: Merge document removed

---

## Common Failure Patterns

1. **Old user not deleted** → Check merge logic in app_users.js:745
2. **Events not updated** → Check drill_events update in app_users.js:551
3. **Merge doc not removed** → Check job completion in userMerge.js
4. **Data lost** → Check mergeUserProperties in app_users.js:587
5. **Wrong UID kept** → Check ls comparison in app_users.js:786

---

## Success Criteria Summary

✅ **17 test cases total**
- 6 basic correct cases
- 5 edge cases
- 3 error cases
- 2 background job cases
- 1 data merge test

All tests should pass with:
- No data loss
- No orphaned documents
- Correct UID preservation
- Proper error handling
- Background job completion within 30 seconds of trigger
