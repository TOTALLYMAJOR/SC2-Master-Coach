# SC2 Master Coach Architecture Index

## Current product architecture

- [Strategic OS Architecture](strategic-os-architecture.md)
- [Strategy Compiler Architecture](strategy-compiler-architecture.md)

## Python Strategy Science design pack

- [Python Strategy Science Architecture](python-strategy-science-architecture.md)
- [Python Strategy Science Backlog](python-strategy-science-backlog.md)
- [ADR-002 — Python Strategy Science Runtime Boundary](adr/ADR-002-python-strategy-science-runtime-boundary.md)

## Machine-readable contracts

- `python_strategy_science/contracts.py`
- `python_strategy_science/capability_registry.py`
- `python_strategy_science/invariants.py`
- `python_strategy_science/schemas/strategy-science.schema.json`
- `python_strategy_science/acceptance_manifest.json`
- `python_strategy_science/storage/schema.sql`

## Acceptance coverage

`tests/test_python_strategy_science_architecture.py` validates:

- fifteen unique capabilities;
- acyclic dependencies;
- Strategic OS state authority;
- advisory-only output;
- patch context;
- proof and evidence boundaries;
- live cognitive-load limits;
- JSON Schema integrity;
- happy-path, uncertainty, and safety coverage;
- SQLite schema creation;
- architecture and backlog completeness.
