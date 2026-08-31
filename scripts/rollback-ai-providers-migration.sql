-- Rollback for the AI Providers migration.
-- Drops the ai_providers table and its index.

DROP INDEX IF EXISTS idx_ai_providers_active;
DROP TABLE IF EXISTS ai_providers;
