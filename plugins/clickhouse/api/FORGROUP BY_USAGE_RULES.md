# forGroupBy Parameter Usage Rules

## Overview

The `forGroupBy` parameter in Identity and QueryHelpers methods controls whether the generated expression uses `any(uid_canon)` or plain `uid_canon`. This is critical for ClickHouse query correctness.

## The Two Forms

### forGroupBy=false (with any() wrapper)
```sql
coalesce(
    nullIf(any(uid_canon), ''),
    nullIf(dictGetOrDefault('identity.uid_map_dict', 'canon', (a, uid), ''), ''),
    uid
)
```

### forGroupBy=true (without any() wrapper)
```sql
coalesce(
    nullIf(uid_canon, ''),
    nullIf(dictGetOrDefault('identity.uid_map_dict', 'canon', (a, uid), ''), ''),
    uid
)
```

## When to Use Each Form

### ❌ NEVER Use forGroupBy=false (any() wrapper) In:

1. **WHERE Clauses**
   ```sql
   -- WRONG: Aggregates not allowed in WHERE (evaluated before GROUP BY)
   SELECT *
   FROM table
   WHERE coalesce(nullIf(any(uid_canon), ''), uid) = 'user1'
   GROUP BY bucket_id

   -- CORRECT: Use forGroupBy=true
   WHERE coalesce(nullIf(uid_canon, ''), uid) = 'user1'
   ```

   **Rule**: WHERE is evaluated BEFORE GROUP BY, so aggregate functions are not available yet.
   This applies even if your query has a GROUP BY clause - WHERE still comes first in execution order.

2. **Aggregate Function Arguments**
   ```sql
   -- WRONG: Nested aggregates not allowed
   SELECT uniqCombined64(20)(coalesce(nullIf(any(uid_canon), ''), uid))
   FROM table
   GROUP BY bucket_id

   -- CORRECT: Use forGroupBy=true
   SELECT uniqCombined64(20)(coalesce(nullIf(uid_canon, ''), uid))
   FROM table
   GROUP BY bucket_id
   ```

   **Rule**: Methods like `uniqPidFinal()` and `uniqStatePidFinal()` ALWAYS use forGroupBy=true internally.

3. **GROUP BY Clauses**
   ```sql
   -- WRONG: Aggregates not allowed in GROUP BY
   SELECT bucket_id, expression AS uid
   FROM table
   GROUP BY bucket_id, coalesce(nullIf(any(uid_canon), ''), uid)

   -- CORRECT: Use forGroupBy=true
   GROUP BY bucket_id, coalesce(nullIf(uid_canon, ''), uid)
   ```

4. **PARTITION BY Clauses**
   ```sql
   -- WRONG: Aggregates not allowed in PARTITION BY
   SELECT sum(x) OVER (PARTITION BY coalesce(nullIf(any(uid_canon), ''), uid))

   -- CORRECT: Use forGroupBy=true
   SELECT sum(x) OVER (PARTITION BY coalesce(nullIf(uid_canon, ''), uid))
   ```

5. **Queries Without GROUP BY**
   ```sql
   -- WRONG: any() without GROUP BY is invalid
   SELECT coalesce(nullIf(any(uid_canon), ''), uid) AS pid
   FROM table
   WHERE a = 'app1'

   -- CORRECT: Use forGroupBy=true
   SELECT coalesce(nullIf(uid_canon, ''), uid) AS pid
   FROM table
   WHERE a = 'app1'
   ```

### ✅ Use forGroupBy=false (any() wrapper) In:

1. **SELECT Columns Not in GROUP BY**
   ```sql
   -- CORRECT: uid_canon not in GROUP BY, needs any() wrapper
   SELECT
       bucket_id,
       coalesce(nullIf(any(uid_canon), ''), uid) AS uid
   FROM table
   GROUP BY bucket_id
   ```

   **Note**: This is the ONLY valid use case for forGroupBy=false!

## Method-Specific Rules

### uniqPidFinal() and uniqStatePidFinal()
**These methods ALWAYS use forGroupBy=true internally** because they wrap the expression in aggregate functions.

```javascript
// Signature (no forGroupBy parameter)
QueryHelpers.uniqPidFinal(useApproximate, uidColumn)

// Always generates (notice no any() inside uniq):
uniqCombined64(20)(coalesce(nullIf(uid_canon, ''), uid))
```

### pidFinalExpr() and pidFinalSelect()
**These methods accept forGroupBy parameter** for flexible usage:

```javascript
// In SELECT when pid is also in GROUP BY
QueryHelpers.pidFinalExpr('uid', true)

// In SELECT when pid is NOT in GROUP BY
QueryHelpers.pidFinalExpr('uid', false)

// In GROUP BY clause
QueryHelpers.pidFinalExpr('uid', true)

// In WHERE clause
QueryHelpers.pidFinalExpr('uid', true)
```

### pidClusterPredicate()
**This method ALWAYS uses forGroupBy=true internally** because it's designed for WHERE clauses:

```javascript
// Signature (no forGroupBy parameter)
QueryHelpers.pidClusterPredicate(appIdParamToken, uidParamToken, uidColumn, isArray)

// Used in WHERE clauses to filter by identity cluster:
const uidPredicate = QueryHelpers.pidClusterPredicate('{app_id:String}', '{uid:String}');
whereSQL = `${whereSQL} AND ${uidPredicate}`;

// Internally uses forGroupBy=true because WHERE is evaluated before GROUP BY
```

## Common Patterns

### Pattern 1: Retention/Cohort Queries
```javascript
// SELECT uses forGroupBy=false (not in GROUP BY)
// GROUP BY uses forGroupBy=true (is in GROUP BY)
const query = `
    SELECT
        ${bucketIdExpression} as bucket_id,
        ${QueryHelpers.pidFinalExpr('uid', false)} as uid,
        'total' as key
    FROM drill_events
    WHERE a = {app_id:String}
    GROUP BY ${bucketIdExpression}, ${QueryHelpers.pidFinalExpr('uid', true)}
`;
```

### Pattern 2: Simple CTE (no GROUP BY)
```javascript
// Source CTE has no GROUP BY, use forGroupBy=true
const query = `
    WITH Source AS (
        SELECT
            uid,
            ${QueryHelpers.pidFinalSelect('uid', 'pid_final', true)},
            c AS cnt
        FROM drill_events
        WHERE a = {app_id:String}
    )
    SELECT
        ${QueryHelpers.getUniqFunction(true)}(pid_final) AS u,
        sum(cnt) AS t
    FROM Source
`;
```

### Pattern 3: Window Functions
```javascript
// Window functions with PARTITION BY - use forGroupBy=true
const query = `
    SELECT
        ${QueryHelpers.pidFinalExpr('uid', true)} as pid_final,
        sum(x) OVER (PARTITION BY ${QueryHelpers.pidFinalExpr('uid', true)}) as total
    FROM drill_events
    WHERE a = {app_id:String}
`;
```

### Pattern 4: Aggregation Queries
```javascript
// Use uniqPidFinal which handles forGroupBy internally
const query = `
    SELECT
        segment,
        ${QueryHelpers.uniqPidFinal(useApproximate, 'uid')} AS u
    FROM drill_events
    WHERE a = {app_id:String}
    GROUP BY segment
`;
```

### Pattern 5: WHERE Clause Filtering by User Identity
```javascript
// Use pidClusterPredicate to filter by user and their merged identities
const uidPredicate = QueryHelpers.pidClusterPredicate('{app_id:String}', '{uid:String}');
const query = `
    SELECT
        ts,
        e,
        c,
        s
    FROM drill_events
    WHERE ${uidPredicate}
    ORDER BY ts DESC
`;
// Query params: { app_id: 'app123', uid: 'user456' }
// This will match all events for user456 AND any merged identities
```

## Decision Tree

```
┌─ Is expression in WHERE clause?
│  YES → Use forGroupBy=true
│  NO  → Continue
│
├─ Is expression inside aggregate function (uniq*, sum, count, etc.)?
│  YES → Use forGroupBy=true
│  NO  → Continue
│
├─ Is expression in GROUP BY clause?
│  YES → Use forGroupBy=true
│  NO  → Continue
│
├─ Is expression in PARTITION BY clause?
│  YES → Use forGroupBy=true
│  NO  → Continue
│
├─ Does query have GROUP BY?
│  NO  → Use forGroupBy=true
│  YES → Continue
│
└─ Is expression in SELECT and NOT in GROUP BY keys?
   YES → Use forGroupBy=false
   NO  → Use forGroupBy=true
```

## Why This Matters

### ClickHouse Constraints

1. **No Aggregates in WHERE**: WHERE is evaluated before GROUP BY, so aggregate functions are not available
   - `WHERE any(uid_canon) = 'user1'` ❌
   - `WHERE uid_canon = 'user1'` ✅
   - **SQL Execution Order**: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY
   - This applies even if your query has GROUP BY - WHERE still comes first!

2. **No Nested Aggregates**: Aggregate functions cannot contain other aggregate functions
   - `uniqCombined64(any(uid_canon))` ❌
   - `uniqCombined64(uid_canon)` ✅

3. **No Aggregates in GROUP BY**: GROUP BY expressions must be non-aggregate
   - `GROUP BY any(uid_canon)` ❌
   - `GROUP BY uid_canon` ✅

4. **No Aggregates in PARTITION BY**: Window partition expressions must be non-aggregate
   - `PARTITION BY any(uid_canon)` ❌
   - `PARTITION BY uid_canon` ✅

5. **Non-GROUP BY Columns Need Aggregates**: When GROUP BY exists, SELECT columns not in GROUP BY must be wrapped
   - `SELECT uid_canon FROM t GROUP BY bucket_id` ❌
   - `SELECT any(uid_canon) FROM t GROUP BY bucket_id` ✅

## Common Errors

### Error 1: "Aggregate function any(uid_canon) is found in GROUP BY"
**Cause**: Used forGroupBy=false in GROUP BY clause
**Fix**: Change to forGroupBy=true

### Error 2: "Column 'uid_canon' is not under aggregate function and not in GROUP BY keys"
**Cause**: Used forGroupBy=true in SELECT when uid_canon is not in GROUP BY
**Fix**: Change to forGroupBy=false (only if uid_canon is truly not in GROUP BY)

### Error 3: "aggregate function inside aggregate function"
**Cause**: Used forGroupBy=false inside uniqPidFinal()
**Fix**: This shouldn't happen - uniqPidFinal() now enforces forGroupBy=true internally

### Error 4: "Syntax error... Expected SELECT"
**Cause**: Used any() without GROUP BY
**Fix**: Change to forGroupBy=true

## Testing Checklist

When adding new queries using Identity methods:

- [ ] If using `uniqPidFinal()` or `uniqStatePidFinal()`, no action needed (handles forGroupBy internally)
- [ ] If using `pidClusterPredicate()`, no action needed (always uses forGroupBy=true for WHERE clauses)
- [ ] If using `pidFinalExpr()` or `pidFinalSelect()`:
  - [ ] In WHERE clause? → forGroupBy=true
  - [ ] In GROUP BY clause? → forGroupBy=true
  - [ ] In PARTITION BY clause? → forGroupBy=true
  - [ ] In aggregate function argument? → forGroupBy=true
  - [ ] In SELECT without GROUP BY? → forGroupBy=true
  - [ ] In SELECT with GROUP BY but not in GROUP BY keys? → forGroupBy=false
- [ ] Test query in ClickHouse before deploying
- [ ] Verify no "aggregate function" errors
- [ ] Verify results are correct

## References

- ClickHouse Documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/
- Identity.js: `/Users/kanwarujjavalsingh/work/countly/core/plugins/clickhouse/api/users/Identity.js`
- QueryHelpers.js: `/Users/kanwarujjavalsingh/work/countly/core/plugins/clickhouse/api/QueryHelpers.js`
