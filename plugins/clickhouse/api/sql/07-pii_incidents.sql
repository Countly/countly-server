-- @database: countly_pii
-- @table: pii_incidents
-- @engine: MergeTree
-- @sharding: sipHash64(app_id)

CREATE TABLE {{DATABASE}}.{{TABLE}} {{ON_CLUSTER}}
(
    _id           String,
    app_id        LowCardinality(String),
    rule_id       String,
    rule_name     String,
    action        LowCardinality(String),
    target        LowCardinality(String),
    event_key     String DEFAULT '',
    path          String,
    matched_value String,
    matched_key   String DEFAULT '',
    exec_ms       Float64 DEFAULT 0,
    ts            DateTime64(3)
)
ENGINE = {{ENGINE}}
PARTITION BY toYYYYMM(ts)
ORDER BY (app_id, ts, _id)
SETTINGS index_granularity = 8192;
