# ADR-002 — Python Strategy Science Runtime Boundary

**Status:** Accepted  
**Date:** 2026-08-19  
**Decision owner:** MBMapps  
**Related:** `docs/strategic-os-architecture.md`, `docs/python-strategy-science-architecture.md`

## Context

SC2 Master Coach has an event-sourced JavaScript Strategy Compiler and Strategic OS. Python already supports the local Flask service, replay processing, desktop packaging, and SC2 frame rendering.

New capabilities—simulation, constraint solving, strategy discovery, counterfactual analysis, patch migration, scenario generation, knowledge governance, and cognitive optimization—fit Python well. Adding them without an explicit authority boundary could create two competing sources of strategic truth.

## Decision

The Strategic OS event log and canonical JavaScript state remain authoritative.

Python never owns or directly mutates Strategic OS state.

The Python Strategy Science Runtime:

- receives immutable snapshots;
- performs advisory calculations;
- returns versioned, proof-carrying results;
- may recommend a state transition;
- may recommend silence;
- never directly mutates Mission, Policy, Intel, Permission, Obligation, or Decision;
- never receives permanent Command Surface screen space;
- is patch-versioned;
- fails closed on patch mismatch;
- uses deterministic fallbacks for live requests.

The Strategic OS validates Python output and decides whether to accept, display, speak, defer, or suppress it.

## Evidence classes

Python must label every supporting item as one of:

- game rule;
- player report;
- replay fact;
- source claim;
- inference;
- simulation;
- hypothesis.

Inference, simulation, and hypothesis may not be promoted to reported fact.

## Runtime deployment

### Initial

Python runs in the existing local Flask process behind `/api/science/*`, with a bounded worker pool for expensive tasks.

### Future

Discovery, patch migration, and ingestion may move to a dedicated local worker. The browser continues to communicate only with Flask.

## Consequences

### Positive

- one source of truth;
- reproducible model runs;
- clear audit trail;
- easier testing;
- graceful fallback;
- independent model evolution;
- no live-interface proliferation.

### Negative

- additional adapter code;
- cross-runtime schema maintenance;
- need for parity tests;
- some calculations duplicated until migration is deliberate;
- model results may be rejected due to stale event sequence.

## Rejected alternatives

### Python replaces the Strategic OS immediately

Rejected because it creates a high-risk rewrite and destabilizes the working live interface.

### Python mutates browser state through callbacks

Rejected because it bypasses event sourcing and makes deterministic replay impossible.

### Every model gets its own panel

Rejected because it violates the product’s cognitive-load objective.

### Cloud-first intelligence service

Rejected for the initial phase because offline operation, privacy, latency, and zero-cost use are core product constraints.

## Enforcement

Architecture tests must verify:

- every capability declares `state_authority = strategic_os`;
- every capability declares `output_mode = advisory`;
- every live output obeys the cognitive contract;
- patch-sensitive models require patch context;
- registry dependencies are acyclic;
- acceptance manifest covers uncertainty and safety.
