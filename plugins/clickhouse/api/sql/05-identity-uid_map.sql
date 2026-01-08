-- @database: identity
-- @table: uid_map
-- @engine: ReplacingMergeTree(change_ts)
-- @sharding: sipHash64(a, uid)

CREATE TABLE {{DATABASE}}.{{TABLE}} {{ON_CLUSTER}}
(
    a               String,
    uid             String,
    canon           String,
    change_ts       DateTime64(3),
    updated_at      DateTime64(3) DEFAULT now64(3),
    ver_ms          UInt64 ALIAS toUInt64(toUnixTimestamp64Milli(change_ts))
)
ENGINE = {{ENGINE}}
ORDER BY (a, uid);
