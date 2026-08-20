# Python Strategy Science

This package defines the architecture contracts for the SC2 Master Coach Python Strategy Science Runtime.

It is deliberately dependency-light and does not yet activate simulation models in the packaged application.

## Authority boundary

```text
Strategic OS canonical state
        ↓ immutable snapshot
Python Strategy Science capability
        ↓ proof-carrying advisory
Strategic OS accepts/rejects
        ↓
Attention Governor displays/speaks/defers/suppresses
```

Python never owns or directly mutates Mission, Policy, Intel, Permission, Obligation, or Decision.

## Included in the design slice

- shared dataclass contracts;
- fifteen-capability registry;
- dependency validation;
- evidence-boundary invariants;
- combined JSON Schema;
- SQLite schema;
- acceptance manifest;
- architecture and backlog;
- regression tests.

## Planned runtime services

See:

- `docs/python-strategy-science-architecture.md`
- `docs/python-strategy-science-backlog.md`
- `docs/adr/ADR-002-python-strategy-science-runtime-boundary.md`
