-- 070_ingestion.sql: Data import adapter schema

-- Add source & source_case_id to cases for idempotency
ALTER TABLE cases ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS source_case_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cases_source_case_id
    ON cases(source, source_case_id)
    WHERE source IS NOT NULL AND source_case_id IS NOT NULL;

-- Import mapping configuration per source system
CREATE TABLE IF NOT EXISTS import_mappings (
    id SERIAL PRIMARY KEY,
    source VARCHAR(64) NOT NULL UNIQUE,
    mapping JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Import execution logs
CREATE TABLE IF NOT EXISTS import_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(64) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    held_rows INTEGER NOT NULL DEFAULT 0,
    error_rows INTEGER NOT NULL DEFAULT 0,
    duplicate_rows INTEGER NOT NULL DEFAULT 0,
    new_overlaps INTEGER NOT NULL DEFAULT 0,
    is_dry_run BOOLEAN NOT NULL DEFAULT FALSE,
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Held rows for unresolved/ambiguous institution reviews
CREATE TABLE IF NOT EXISTS import_held_rows (
    id SERIAL PRIMARY KEY,
    import_log_id INTEGER REFERENCES import_logs(id) ON DELETE CASCADE,
    source VARCHAR(64) NOT NULL,
    source_case_id TEXT,
    raw_data JSONB NOT NULL,
    reason TEXT NOT NULL,
    institution_query TEXT,
    city_query TEXT,
    candidates JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'held',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_held_source ON import_held_rows(source);
CREATE INDEX IF NOT EXISTS idx_import_held_status ON import_held_rows(status);
