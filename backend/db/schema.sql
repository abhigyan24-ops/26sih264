-- CaseNexus: AICTE Complaint Dashboard Schema
-- SIH 2026, PS 26264
-- Extensions must be created before tables.
-- pgvector/pgvector:pg16 image bundles the vector extension.
-- pg_trgm ships with PostgreSQL contrib.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- ========== Organisation ==========

CREATE TABLE bureaus (
    id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code  TEXT UNIQUE NOT NULL,          -- RB, PGRC, ROC-N, ROC-S, ROC-E, ROC-W
    name  TEXT NOT NULL,
    kind  TEXT NOT NULL CHECK (kind IN ('bureau','cell','regional'))
);

CREATE TABLE officers (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    full_name     TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('officer','regional','management','admin')),
    bureau_id     BIGINT REFERENCES bureaus(id),
    region        TEXT,                  -- used for row-level scoping of regional role
    active        BOOLEAN NOT NULL DEFAULT TRUE
);

-- ========== Institutions ==========

CREATE TABLE institutions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aicte_permanent_id  TEXT UNIQUE,
    name                TEXT NOT NULL,
    normalized_name     TEXT NOT NULL,
    address             TEXT,
    city                TEXT,
    state               TEXT,
    region              TEXT NOT NULL,   -- South | North | East | West | Central
    inst_type           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GIN trigram index for fuzzy institution-name matching
CREATE INDEX idx_inst_trgm   ON institutions USING gin (normalized_name gin_trgm_ops);
CREATE INDEX idx_inst_region ON institutions (region);

CREATE TABLE institution_aliases (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id BIGINT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    alias          TEXT NOT NULL,
    source         TEXT NOT NULL DEFAULT 'confirmed_match',
    approved       BOOLEAN NOT NULL DEFAULT FALSE
);

-- ========== Categories and SLA ==========

CREATE TABLE categories (
    code   TEXT PRIMARY KEY,
    label  TEXT NOT NULL
);

CREATE TABLE sla_rules (
    category          TEXT PRIMARY KEY REFERENCES categories(code),
    deadline_days     INT  NOT NULL,
    escalate_after    INT  NOT NULL,        -- days overdue before escalation alert
    source_reference  TEXT NOT NULL         -- policy citation or 'ILLUSTRATIVE'
);

-- ========== Cases ==========

CREATE TABLE cases (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    case_ref         TEXT UNIQUE,
    institution_id   BIGINT NOT NULL REFERENCES institutions(id),
    inst_match_conf  REAL   NOT NULL DEFAULT 1.0,  -- confidence of institution resolution
    category         TEXT   NOT NULL REFERENCES categories(code),
    description      TEXT   NOT NULL,
    received_date    DATE   NOT NULL,
    status           TEXT   NOT NULL CHECK (status IN (
                         'received','registered','assigned','under_process',
                         'transferred','escalated','action_taken','disposed','reopened')),
    bureau_id        BIGINT NOT NULL REFERENCES bureaus(id),
    officer_id       BIGINT REFERENCES officers(id),
    sla_due_date     DATE   NOT NULL,
    closed_date      DATE,
    priority         TEXT   NOT NULL DEFAULT 'normal'
                     CHECK (priority IN ('low','normal','high')),
    sensitivity_flag BOOLEAN NOT NULL DEFAULT FALSE,
    hold_parallel    BOOLEAN NOT NULL DEFAULT FALSE,
    embedding        vector(384),
    embedding_model  TEXT,
    -- SEED ONLY: ground-truth issue identifier for evaluation/training only.
    -- Never used as a model input. Excluded from API responses.
    issue_key        TEXT,
    next_action      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cases_inst   ON cases (institution_id);
CREATE INDEX idx_cases_status ON cases (status);
CREATE INDEX idx_cases_bureau ON cases (bureau_id);
CREATE INDEX idx_cases_recv   ON cases (received_date);
-- Full-text search on description
CREATE INDEX idx_cases_fts    ON cases USING gin (to_tsvector('simple', description));
-- Vector index: enable once data is loaded (hnsw is build-heavy on insert)
-- CREATE INDEX idx_cases_vec ON cases USING hnsw (embedding vector_cosine_ops);

-- ========== Action history ==========

CREATE TABLE actions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    case_id     BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    bureau_id   BIGINT REFERENCES bureaus(id),
    officer_id  BIGINT REFERENCES officers(id),
    action_type TEXT NOT NULL,
    -- registered | assigned | notice_issued | inspection | transfer |
    -- escalation | remark | closed | link | hold | disposed
    remarks     TEXT,
    meta        JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_actions_case ON actions (case_id, created_at);

CREATE TABLE documents (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    action_id    BIGINT NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    file_name    TEXT NOT NULL,
    storage_key  TEXT NOT NULL,
    storage_kind TEXT NOT NULL,         -- local | s3
    checksum     TEXT NOT NULL,
    uploaded_by  BIGINT REFERENCES officers(id),
    uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== Overlap links ==========

CREATE TABLE overlap_links (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    case_a          BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    case_b          BIGINT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    level           TEXT   NOT NULL CHECK (level IN ('high','medium','info')),
    probability     REAL   NOT NULL,
    breakdown       JSONB  NOT NULL,
    status          TEXT   NOT NULL DEFAULT 'suggested'
                    CHECK (status IN ('suggested','confirmed','dismissed')),
    lead_bureau_id  BIGINT REFERENCES bureaus(id),
    decided_by      BIGINT REFERENCES officers(id),
    decision_reason TEXT,
    model_version   TEXT,
    explanation     TEXT,
    explanation_src TEXT NOT NULL DEFAULT 'template',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Canonical ordering: always case_a < case_b, enforced by insert logic
    CHECK (case_a < case_b),
    UNIQUE (case_a, case_b)
);

-- ========== Alerts ==========

CREATE TABLE alerts (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind       TEXT NOT NULL CHECK (kind IN (
                   'overlap_high','overlap_medium','pending','escalation',
                   'sla_risk','sla_breach','system')),
    case_id    BIGINT REFERENCES cases(id) ON DELETE CASCADE,
    overlap_id BIGINT REFERENCES overlap_links(id) ON DELETE CASCADE,
    bureau_id  BIGINT REFERENCES bureaus(id),
    message    TEXT NOT NULL,
    read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_bureau ON alerts (bureau_id, read);

-- ========== Model governance ==========

CREATE TABLE model_versions (
    id         TEXT PRIMARY KEY,               -- e.g. overlap-20261025-1430
    kind       TEXT NOT NULL,                  -- overlap | category
    trained_on TEXT NOT NULL,                  -- dataset description
    metrics    JSONB NOT NULL,
    status     TEXT NOT NULL CHECK (status IN ('shadow','active','retired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parameter_registry (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parameter     TEXT NOT NULL,
    value         TEXT NOT NULL,
    origin        TEXT NOT NULL CHECK (origin IN (
                      'learned','learned_synthetic','policy','default_pending_data')),
    derived_from  TEXT,
    metrics       JSONB,
    model_version TEXT,
    approved_by   BIGINT REFERENCES officers(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE policy_settings (
    scope      TEXT PRIMARY KEY,               -- 'global' | capability name
    value      TEXT NOT NULL CHECK (value IN ('online','offline')),
    changed_by BIGINT REFERENCES officers(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE egress_ledger (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    capability   TEXT NOT NULL,
    destination  TEXT NOT NULL,
    payload_kind TEXT NOT NULL,
    case_ref     TEXT,
    mode         TEXT NOT NULL,
    redacted     BOOLEAN NOT NULL,
    outcome      TEXT NOT NULL,               -- sent | blocked | stub
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id   BIGINT REFERENCES officers(id),
    action     TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_id  TEXT,
    detail     JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== Bootstrap reference data ==========

-- Default global mode: online (changeable via API by admin)
INSERT INTO policy_settings (scope, value) VALUES ('global', 'online');

-- Bureaus and Cells
-- RB = Regulation Bureau (confirmed from build guide and modules doc)
-- PGRC = Public Grievance Redressal Cell (confirmed from build guide and modules doc)
-- ROC-* = Regional Office/Centre
INSERT INTO bureaus (code, name, kind) VALUES
  ('RB',    'Regulation Bureau',                  'bureau'),
  ('PGRC',  'Public Grievance Redressal Cell',     'cell'),
  ('ROC-N', 'Regional Office North',               'regional'),
  ('ROC-S', 'Regional Office South',               'regional'),
  ('ROC-E', 'Regional Office East',                'regional'),
  ('ROC-W', 'Regional Office West',                'regional');

-- Complaint categories
INSERT INTO categories (code, label) VALUES
  ('FACULTY',     'Faculty shortage / fake faculty'),
  ('FEES',        'Fee irregularity'),
  ('APPROVAL',    'Unapproved course or intake'),
  ('CERTIFICATE', 'Certificate / document withholding'),
  ('INFRA',       'Infrastructure deficiency'),
  ('MISREP',      'Misrepresentation of approval or affiliation');

-- ILLUSTRATIVE SLA deadlines.
-- AICTE's actual prescribed timelines per category are not publicly specified
-- in the PS document. These values are placeholders and must be replaced with
-- official policy when known. The source_reference field marks them ILLUSTRATIVE.
INSERT INTO sla_rules (category, deadline_days, escalate_after, source_reference) VALUES
  ('FACULTY',     45, 7,  'ILLUSTRATIVE'),
  ('FEES',        30, 7,  'ILLUSTRATIVE'),
  ('APPROVAL',    60, 10, 'ILLUSTRATIVE'),
  ('CERTIFICATE', 21, 5,  'ILLUSTRATIVE'),
  ('INFRA',       60, 10, 'ILLUSTRATIVE'),
  ('MISREP',      45, 7,  'ILLUSTRATIVE');
