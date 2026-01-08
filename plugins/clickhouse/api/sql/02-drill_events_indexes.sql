-- @database: countly_drill
-- @table: drill_events

ALTER TABLE {{DATABASE}}.{{TABLE}} {{ON_CLUSTER}}
    ADD INDEX uid_bloom (uid) TYPE bloom_filter(0.01) GRANULARITY 4;
