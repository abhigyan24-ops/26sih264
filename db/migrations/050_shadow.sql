CREATE TABLE IF NOT EXISTS shadow_scores (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    case_a BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    case_b BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    model_version TEXT NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
    probability REAL NOT NULL CHECK (probability BETWEEN 0 AND 1),
    level TEXT NOT NULL CHECK (level IN ('high','medium','info','none')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (case_a < case_b),
    UNIQUE(case_a,case_b,model_version)
);
CREATE UNIQUE INDEX IF NOT EXISTS model_versions_one_active
    ON model_versions ((status)) WHERE status='active';
