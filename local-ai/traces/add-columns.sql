-- ============================================================
-- Secret Detection Columns for events_full table
-- ============================================================
--
-- Patterns are anchored to real credential shapes (fixed payload lengths),
-- not keyword mentions. Counts below are measured over 124k live rows; a
-- pre-filter column is only worth having if it rejects most of the table.
--
-- Deliberately NOT included, measured hit counts in parens:
--   [A-Za-z0-9+/]{20,}={0,2}  (85741 = 69% of rows) any alphanumeric run
--   org-[a-zA-Z0-9\-_]+       (45416 = 36%) matches prose, not just org keys
--   [a-z]+_?[a-z0-9]{20,}     (18377 = 15%) matches identifiers and hashes
--   github[_-]?token          (7132) the variable name, not a token value
--   AIza[A-Za-z0-9_\-]+       (259)  literal appears, never with a 35-char key
--   sk-ant-[a-zA-Z0-9\-_]+    (20)   same, prose mentions only
--
-- Vectorscan rejects unbounded and large bounded repeats ({20,}, {80,120})
-- with HYPERSCAN_CANNOT_SCAN_TEXT. Keep payload lengths fixed and small.

-- Column 1: has_secrets (Boolean)
-- Pre-filter for rows that may contain a credential. Matches ~5% of rows.
ALTER TABLE default.events_full MODIFY COLUMN has_secrets Boolean MATERIALIZED
  multiMatchAny(input || '\n' || output, [
    'AKIA[A-Z0-9]{16}',
    'ASIA[A-Z0-9]{16}',
    'gh[pots]_[A-Za-z0-9_]{36}',
    'sk-[a-zA-Z0-9]{32}',
    '[rs]k_live_[a-zA-Z0-9]{24}',
    'xox[baprs]-[0-9]{10}',
    '-----BEGIN [A-Z ]*PRIVATE KEY-----',
    '(postgres|postgresql|mysql|mongodb\\+srv|redis|amqp)://[^:@/ ]+:[^@/ ]+@'
  ]);

-- Column 2: secret_type (LowCardinality String)
-- Categorizes secrets for fast grouping. First match wins, so the specific
-- providers are tested before the generic connection-string branch.
ALTER TABLE default.events_full MODIFY COLUMN secret_type LowCardinality(String) MATERIALIZED
  multiIf(
    multiMatchAny(input || '\n' || output, ['AKIA[A-Z0-9]{16}', 'ASIA[A-Z0-9]{16}']), 'aws',
    multiMatchAny(input || '\n' || output, ['gh[pots]_[A-Za-z0-9_]{36}']), 'github',
    multiMatchAny(input || '\n' || output, ['[rs]k_live_[a-zA-Z0-9]{24}']), 'stripe',
    multiMatchAny(input || '\n' || output, ['xox[baprs]-[0-9]{10}']), 'slack',
    multiMatchAny(input || '\n' || output, ['sk-[a-zA-Z0-9]{32}']), 'openai',
    multiMatchAny(input || '\n' || output, ['-----BEGIN [A-Z ]*PRIVATE KEY-----']), 'private_key',
    multiMatchAny(input || '\n' || output, ['(postgres|postgresql|mysql|mongodb\\+srv|redis|amqp)://[^:@/ ]+:[^@/ ]+@']), 'db_uri',
    'none'
  );

-- Backfill: rewrites every active part, hours on a multi-GiB table.
-- Without this, 25 of 33 parts recompute the regex on every scan.
ALTER TABLE default.events_full MATERIALIZE COLUMN has_secrets;
ALTER TABLE default.events_full MATERIALIZE COLUMN secret_type;

-- ============================================================
-- Usage Examples:
-- ============================================================

-- Find all AWS secrets:
-- SELECT * FROM events_full WHERE secret_type = 'aws';

-- Count by secret type:
-- SELECT secret_type, count() FROM events_full
-- WHERE has_secrets GROUP BY secret_type ORDER BY count() DESC;

-- Fast scan for secrets (skips rows unlikely to contain them):
-- SELECT * FROM events_full WHERE has_secrets AND is_deleted = 0;

-- Watch backfill progress:
-- SELECT mutation_id, command, parts_to_do, is_done FROM system.mutations
-- WHERE table = 'events_full' AND NOT is_done;
