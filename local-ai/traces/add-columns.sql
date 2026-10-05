-- ============================================================
-- Secret Detection Columns for events_full table
-- ============================================================

-- Column 1: has_secrets (Boolean)
-- Quick filter to identify rows that MAY contain any credential
ALTER TABLE default.events_full ADD COLUMN IF NOT EXISTS has_secrets Boolean MATERIALIZED
  multiMatchAny(input || '\n' || output, ['AKIA[A-Z0-9]{16}', 'ASIA[A-Z0-9]{16}', 'gh[pts]_[A-Za-z0-9_]{36}', 'github[_-]?token', 'sk-[a-zA-Z0-9]{20,}', 'org-[a-zA-Z0-9\\-_]+', 'sk-ant-[a-zA-Z0-9\\-_]+', 'sk_live_[a-zA-Z0-9]{24}', 'sk_test_[a-zA-Z0-9]{24}', 'AIza[A-Za-z0-9_\\-]+', 'xox[baprs]-[a-zA-Z0-9\\-]+', '[a-z]+_?[a-z0-9]{20,}', '-----BEGIN.*PRIVATE KEY-----', '[A-Za-z0-9+/]{20,}={0,2}']);

-- Column 2: secret_type (LowCardinality String)
-- Categories secrets for fast grouping and filtering
ALTER TABLE default.events_full ADD COLUMN IF NOT EXISTS secret_type LowCardinality(String) MATERIALIZED
  if(multiMatchAny(input || '\n' || output, ['artifacts[_-]?aws[_-]?access[_-]?key[_-]?id(=| =|:| :)']), 'aws', if(multiMatchAny(input || '\n' || output, ['bundlesize[_-]?github[_-]?token(=| =|:| :)']), 'github', if(multiMatchAny(input || '\n' || output, ['[rs]k_live_[a-zA-Z0-9]{20,30}']), 'stripe', if(multiMatchAny(input || '\n' || output, ['(xox[pborsa]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32})']), 'slack', if(multiMatchAny(input || '\n' || output, ['(?:chatbot).{0,40}\\b([a-zA-Z0-9_]{32})\\b']), 'discord', if(multiMatchAny(input || '\n' || output, ['"type": "service_account"']), 'google', if(multiMatchAny(input || '\n' || output, ['redis[_-]?stunnel[_-]?urls(=| =|:| :)']), 'redis', if(multiMatchAny(input || '\n' || output, ['(?:paymongo).{0,40}\\b([a-zA-Z0-9_]{32})\\b']), 'mongo', if(multiMatchAny(input || '\n' || output, ['docker[_-]?postgres[_-]?url(=| =|:| :)']), 'postgres', if(multiMatchAny(input || '\n' || output, ['mysql[_-]?database(=| =|:| :)']), 'mysql', if(multiMatchAny(input || '\n' || output, ['(?:abbysale).{0,40}\\b([a-z0-9A-Z]{40})\\b']), 'general', 'unknown')))))))))));

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

