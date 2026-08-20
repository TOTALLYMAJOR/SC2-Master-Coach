-- SC2 Master Coach — Python Strategy Science local store
-- SQLite schema version 1.  The Strategic OS remains canonical; this database
-- stores advisory runs, research artifacts, sources, and learning observations.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS science_model_versions (
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    capability_id TEXT NOT NULL,
    deterministic INTEGER NOT NULL CHECK (deterministic IN (0, 1)),
    checksum TEXT,
    installed_at TEXT NOT NULL,
    PRIMARY KEY (model_name, model_version)
);

CREATE TABLE IF NOT EXISTS science_runs (
    run_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    capability_id TEXT NOT NULL,
    status TEXT NOT NULL,
    game_patch TEXT NOT NULL,
    ruleset_version TEXT NOT NULL,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    session_id TEXT,
    event_sequence INTEGER NOT NULL CHECK (event_sequence >= 0),
    seed INTEGER,
    input_hash TEXT NOT NULL,
    output_hash TEXT,
    duration_ms INTEGER,
    accepted_by_strategic_os INTEGER CHECK (accepted_by_strategic_os IN (0, 1)),
    disposition TEXT CHECK (disposition IN ('shown', 'spoken', 'deferred', 'suppressed', 'rejected') OR disposition IS NULL),
    warnings_json TEXT NOT NULL DEFAULT '[]',
    error_code TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (model_name, model_version)
      REFERENCES science_model_versions(model_name, model_version)
);

CREATE TABLE IF NOT EXISTS science_run_inputs (
    run_id TEXT PRIMARY KEY,
    request_json TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES science_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS science_run_outputs (
    run_id TEXT PRIMARY KEY,
    advisory_json TEXT,
    FOREIGN KEY (run_id) REFERENCES science_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS science_proof_items (
    proof_item_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    claim TEXT NOT NULL,
    evidence_ids_json TEXT NOT NULL,
    rule_ids_json TEXT NOT NULL,
    limitation TEXT,
    FOREIGN KEY (run_id) REFERENCES science_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS twin_snapshots (
    twin_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    session_id TEXT,
    event_sequence INTEGER NOT NULL,
    game_second INTEGER NOT NULL,
    patch TEXT NOT NULL,
    state_json TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    seed INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES science_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_policies (
    policy_id TEXT PRIMARY KEY,
    discovery_run_id TEXT NOT NULL,
    status TEXT NOT NULL,
    patch TEXT NOT NULL,
    title TEXT NOT NULL,
    mission_json TEXT NOT NULL,
    policy_json TEXT NOT NULL,
    scores_json TEXT NOT NULL,
    human_approved INTEGER NOT NULL DEFAULT 0 CHECK (human_approved IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (discovery_run_id) REFERENCES science_runs(run_id)
);

CREATE TABLE IF NOT EXISTS counterfactual_results (
    result_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    session_id TEXT,
    event_sequence INTEGER NOT NULL,
    baseline_json TEXT NOT NULL,
    alternatives_json TEXT NOT NULL,
    limitations_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES science_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fragility_results (
    result_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    policy_id TEXT,
    perturbation_spec_json TEXT NOT NULL,
    critical_dependencies_json TEXT NOT NULL,
    samples INTEGER NOT NULL,
    seed INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES science_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS generated_scenarios (
    scenario_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    synthetic INTEGER NOT NULL DEFAULT 1 CHECK (synthetic = 1),
    patch TEXT NOT NULL,
    seed INTEGER NOT NULL,
    scenario_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES science_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenario_attempts (
    attempt_id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    session_id TEXT,
    selected_choice_id TEXT,
    explanation TEXT,
    action_score REAL,
    reasoning_score REAL,
    confidence REAL,
    completed_at TEXT NOT NULL,
    FOREIGN KEY (scenario_id) REFERENCES generated_scenarios(scenario_id)
);

CREATE TABLE IF NOT EXISTS player_concept_observations (
    observation_id TEXT PRIMARY KEY,
    concept_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    success INTEGER CHECK (success IN (0, 1)),
    independent INTEGER CHECK (independent IN (0, 1)),
    confidence REAL,
    latency_seconds REAL,
    observed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS misconception_hypotheses (
    hypothesis_id TEXT PRIMARY KEY,
    concept_id TEXT NOT NULL,
    label TEXT NOT NULL,
    confidence REAL NOT NULL,
    supporting_observations_json TEXT NOT NULL,
    contradicting_observations_json TEXT NOT NULL,
    alternative_explanations_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('proposed', 'monitoring', 'supported', 'rejected')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_assignments (
    assignment_id TEXT PRIMARY KEY,
    concept_id TEXT NOT NULL,
    prerequisite_ids_json TEXT NOT NULL,
    prescription_json TEXT NOT NULL,
    pass_condition_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('assigned', 'active', 'passed', 'paused', 'retired')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_sources (
    source_id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    locator TEXT NOT NULL,
    title TEXT,
    publisher TEXT,
    author TEXT,
    published_at TEXT,
    acquired_at TEXT NOT NULL,
    patch TEXT,
    checksum TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('staged', 'approved', 'review', 'stale', 'retired')),
    metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS knowledge_claims (
    claim_id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    claim_type TEXT NOT NULL,
    normalized_subject TEXT NOT NULL,
    normalized_value_json TEXT NOT NULL,
    context_json TEXT NOT NULL,
    confidence REAL,
    approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0, 1)),
    FOREIGN KEY (source_id) REFERENCES knowledge_sources(source_id)
);

CREATE TABLE IF NOT EXISTS knowledge_conflicts (
    conflict_id TEXT PRIMARY KEY,
    claim_ids_json TEXT NOT NULL,
    classification TEXT NOT NULL CHECK (classification IN ('true_contradiction', 'contextual_difference', 'unresolved')),
    explanation TEXT NOT NULL,
    review_questions_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'reviewed', 'resolved')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patch_migrations (
    migration_id TEXT PRIMARY KEY,
    from_patch TEXT NOT NULL,
    to_patch TEXT NOT NULL,
    affected_artifacts_json TEXT NOT NULL,
    report_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('planned', 'running', 'review', 'complete', 'failed')),
    created_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS strategy_packs (
    pack_id TEXT NOT NULL,
    pack_version TEXT NOT NULL,
    patch TEXT NOT NULL,
    author TEXT NOT NULL,
    checksum TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('quarantined', 'invalid', 'review', 'approved', 'retired')),
    validation_report_json TEXT NOT NULL,
    installed_at TEXT,
    PRIMARY KEY (pack_id, pack_version)
);

CREATE TABLE IF NOT EXISTS synthetic_sessions (
    synthetic_session_id TEXT PRIMARY KEY,
    patch TEXT NOT NULL,
    seed INTEGER NOT NULL,
    generation_recipe_json TEXT NOT NULL,
    event_log_json TEXT NOT NULL,
    expected_trace_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cognitive_metrics (
    metric_id TEXT PRIMARY KEY,
    session_id TEXT,
    metric_type TEXT NOT NULL,
    value REAL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    game_second INTEGER,
    recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cognitive_experiments (
    experiment_id TEXT PRIMARY KEY,
    hypothesis TEXT NOT NULL,
    variant_a_json TEXT NOT NULL,
    variant_b_json TEXT NOT NULL,
    minimum_sample INTEGER NOT NULL,
    safety_constraints_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'complete', 'rejected')),
    result_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_science_runs_capability
    ON science_runs(capability_id, created_at);

CREATE INDEX IF NOT EXISTS idx_science_runs_session_sequence
    ON science_runs(session_id, event_sequence);

CREATE INDEX IF NOT EXISTS idx_knowledge_claims_subject
    ON knowledge_claims(normalized_subject);

CREATE INDEX IF NOT EXISTS idx_concept_observations_concept
    ON player_concept_observations(concept_id, observed_at);

PRAGMA user_version = 1;
