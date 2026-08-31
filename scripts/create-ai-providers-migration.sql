-- AI Providers Migration Script
-- Persists LLM provider configuration (Anthropic, DeepSeek, Kimi K3, Ollama,
-- LM Studio) in the database instead of reading .env. Matches the SQL run by
-- app/api/migrate-ai-providers/route.ts (idempotent).

CREATE TABLE IF NOT EXISTS ai_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('anthropic', 'openai')),
  base_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL,
  vision_model TEXT NOT NULL DEFAULT '',
  enable_thinking BOOLEAN NOT NULL DEFAULT false,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  max_tool_calls INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_providers_active
  ON ai_providers(is_active);

-- Idempotent: add vision_model to tables created before this column existed.
ALTER TABLE ai_providers
  ADD COLUMN IF NOT EXISTS vision_model TEXT NOT NULL DEFAULT '';

-- Verify the migration
SELECT
  'ai_providers table created' as status,
  COUNT(*) as record_count
FROM ai_providers;
