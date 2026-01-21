-- @database: countly_drill
-- @table: drill_events
-- @engine: MergeTree
-- @sharding: sipHash64(a, uid)

CREATE TABLE {{DATABASE}}.{{TABLE}} {{ON_CLUSTER}}
(
    a       LowCardinality(String),
    e       LowCardinality(String),
    n      String,
    uid    String,
    uid_canon Nullable(String),
    did    String,
    lsid   Nullable(String),
    _id    String,
    ts     DateTime64(3),
    up     JSON(max_dynamic_paths = 32),
    custom JSON(max_dynamic_paths = 0),
    cmp    JSON(max_dynamic_paths = 0),
    sg     JSON(max_dynamic_paths = 0),
    c      UInt32,
    s      Float64,
    dur    Float64,
    lu     Nullable(DateTime64(3)) CODEC (Delta, LZ4),
    cd     DateTime64(3) DEFAULT now64(3) CODEC (Delta, LZ4)
)
ENGINE = {{ENGINE}}
PARTITION BY toYYYYMM(ts, 'UTC')
ORDER BY (a, e, n, ts)
SETTINGS
    index_granularity = 8192,
    allow_experimental_object_type = 1,
    object_serialization_version = 'v3',
    object_shared_data_serialization_version = 'advanced',
    object_shared_data_serialization_version_for_zero_level_parts = 'map_with_buckets',
    object_shared_data_buckets_for_compact_part = 8,
    object_shared_data_buckets_for_wide_part = 32;
