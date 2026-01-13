# MongoDB Sharding Guide

Sharding is splitting the database/collection into chunks and storing those chunks on different servers. It enables horizontal scaling when vertical scaling is no longer feasible.

## When to Shard a Collection

A collection should be sharded if:
- It will have lots of documents
- It will have lots of inserts (high write volume)

## Data Modeling Considerations

### Shard Key Selection

Sharded collections need a shard key (an index by which data is split between servers). 

**Key considerations:**
- How do we query the data most often?
- How do we ensure queries target precisely the needed shard rather than all shards?

See [MongoDB Shard Key Documentation](https://www.mongodb.com/docs/manual/core/sharding-shard-key/) for detailed guidance.

### Unique Index Limitations

Sharded collections **cannot have unique indexes** unless they are the shard key index. 

For example, you cannot shard by `_id` and apply a unique index on `device_id` or `uid`.

### Single Operations Must Target the Shard Key

MongoDB single operations require the shard key in the query:
- `findOne`
- `deleteOne`
- `updateOne`

**Example of what doesn't work:**

```javascript
// ❌ ERROR: Cannot use single operation without shard key
db.collection("test").findOne({uid: 1})
```

This fails because MongoDB doesn't know which shard to query.

**Solutions:**
1. Use multi-operations (`find`, `updateMany`, `deleteMany`) - but this queries all shards (not optimal)
2. Include the shard key in your query
3. Design your data model to use queries that match the shard key

## Sharding Script

Countly provides a sharding script that determines which collections should be sharded and how:

```
bin/scripts/sharding/sharding.js
```

Run this script after setting up your sharded cluster.

### Usage

```bash
node sharding.js
```

### Customization

If your plugin requires different sharding behavior for its collections, modify the script accordingly.

## Files in This Directory

| File | Description |
|------|-------------|
| `sharding.js` | Current sharding script for Countly collections |
| `sharding_old.js` | Legacy sharding script (deprecated) |
| `sharding_with_auth_old.js` | Legacy sharding script with authentication (deprecated) |

## Additional Resources

- [MongoDB Sharding Documentation](https://www.mongodb.com/docs/manual/sharding/)
- [Choosing a Shard Key](https://www.mongodb.com/docs/manual/core/sharding-shard-key/)
- [Sharded Cluster Requirements](https://www.mongodb.com/docs/manual/core/sharded-cluster-requirements/)
