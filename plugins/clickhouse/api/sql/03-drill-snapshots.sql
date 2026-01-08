-- @database: countly_drill
-- @table: drill_snapshots
-- @engine: MergeTree
-- @sharding: rand()

CREATE TABLE {{DATABASE}}.{{TABLE}} {{ON_CLUSTER}}
(
    _id         String,
    calculating UInt64,
    u           UInt32,
    t           UInt32,
    s           Float64,
    s0          String,
    s1          String,
    s2          String,
    s3          String,
    s4          String,
    dur         Float64,
    cd          DateTime64(3) DEFAULT now64(3) CODEC (Delta, LZ4),
    lu          DateTime64(3) DEFAULT now64(3) CODEC (Delta, LZ4)
)
ENGINE = {{ENGINE}}
ORDER BY (cd, _id)
TTL cd + INTERVAL 1 HOUR;
