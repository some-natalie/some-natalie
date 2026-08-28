CREATE DATABASE IF NOT EXISTS acp;

CREATE TABLE IF NOT EXISTS acp.messages (
  ts DateTime64(3),
  agent LowCardinality(String),
  pid UInt32,
  dir Enum8('client' = 1, 'agent' = 2),
  raw String,
  method LowCardinality(String) MATERIALIZED JSONExtractString(raw, 'method'),
  msg_id String MATERIALIZED JSONExtractRaw(raw, 'id'),
  session_id String MATERIALIZED if(
    JSONHas(raw, 'params', 'sessionId'),
    JSONExtractString(raw, 'params', 'sessionId'),
    JSONExtractString(raw, 'result', 'sessionId')
  ),
  is_error UInt8 MATERIALIZED JSONHas(raw, 'error')
) ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (agent, ts);

-- Zed's own thread titles, synced by acp-tap. They never cross the ACP wire: Zed
-- renames threads locally, so session_info_update goes stale as soon as it does.
CREATE TABLE IF NOT EXISTS acp.zed_titles (
  session_id String,
  title String,
  ts DateTime64(3)
) ENGINE = ReplacingMergeTree(ts)
ORDER BY session_id;
