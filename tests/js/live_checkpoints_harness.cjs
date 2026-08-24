const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global;
require(path.resolve(__dirname, "../../static/strategy-library.js"));
require(path.resolve(__dirname, "../../static/live-checkpoints.js"));
const checkpoints = global.SC2LiveCheckpoints;
assert.equal(global.SC2PlanLibrary.all().length, 18);
assert.equal(new Set(global.SC2PlanLibrary.all().map((row) => row.id)).size, 18);
for (const row of global.SC2PlanLibrary.all()) {
  const authority = checkpoints.contentStatus(row);
  assert.equal(authority.reviewState, "expert_review_required");
  assert.equal(authority.benchmarkType, "derived_practice_range");
  assert.deepEqual(authority.reviewers, []);
}

const libraryPlan = global.SC2PlanLibrary.get("pvp-fast-third");
const adapted = checkpoints.adaptLibraryPlan(
  libraryPlan,
  {
    id: "generic-fallback",
    branchRules: [{ id: "fallback-rule" }],
    scouting: [],
    threats: [],
    source: { kind: "compiler" },
  },
  "Diamond",
);

assert.equal(adapted.id, "pvp-fast-third");
assert.equal(adapted.source.kind, "matchup_library");
assert.equal(adapted.source.patch, "5.0.16b");
assert.equal(adapted.authority.reviewState, "expert_review_required");
assert.equal(adapted.branchRules[0].id, "fallback-rule");
assert.equal(adapted.buildWindows.length, libraryPlan.steps.length);
assert.equal(adapted.buildWindows[6].action, "Three Gateways total");

const bronze = checkpoints.createSession({
  plan: checkpoints.adaptLibraryPlan(libraryPlan, null, "Bronze"),
  race: "Protoss",
  opponent: "Protoss",
  skill: "Bronze",
});
const grandmaster = checkpoints.createSession({
  plan: checkpoints.adaptLibraryPlan(libraryPlan, null, "Grandmaster"),
  race: "Protoss",
  opponent: "Protoss",
  skill: "Grandmaster",
});

const bronze240 = bronze.checkpoints.find((row) => row.at === 240);
const gm180 = grandmaster.checkpoints.find((row) => row.at === 180);
assert.ok(bronze240.summary.includes("3 Gateways"), bronze240.summary);
assert.equal(bronze240.primaryProduction.label, "Gateways");
assert.equal(bronze240.primaryProduction.count, 3);
assert.ok(
  bronze240.worker.max - bronze240.worker.min > gm180.worker.max - gm180.worker.min,
  "lower leagues should receive a wider worker tolerance band",
);
assert.ok(bronze.profile.interval > grandmaster.profile.interval);
assert.ok(bronze.profile.maxTargets < grandmaster.profile.maxTargets);

let current = checkpoints.current(bronze, 105);
assert.equal(current.kind, "checkpoint");
assert.equal(current.checkpoint.at, 120);

checkpoints.reportEvidence(bronze, "starport", 170);
let tactical = checkpoints.directive(bronze, 175);
assert.equal(tactical.id, "starport");
assert.equal(tactical.status, "modify");
assert.match(tactical.action, /mineral-line and detection coverage/i);
assert.equal(checkpoints.current(bronze, 175).kind, "directive");

checkpoints.reportEvidence(bronze, "move_out", 180);
tactical = checkpoints.directive(bronze, 181);
assert.equal(tactical.id, "move_out");
assert.equal(tactical.permission, "HOLD");
assert.match(tactical.action, /defensive geometry/i);

const result = checkpoints.confirm(bronze, {
  checkpointId: bronze240.id,
  status: "behind",
  workers: bronze240.worker.min - 5,
  production: 1,
  second: 250,
});
assert.equal(result.recorded.status, "behind");
assert.match(result.recovery.action, /Restore Probes production/i);
assert.match(result.recovery.action, /add 2 Gateways/i);
assert.equal(checkpoints.directive(bronze, 251).id, `recovery:${bronze240.id}`);
checkpoints.reportEvidence(bronze, "starport", 252);
assert.equal(
  checkpoints.directive(bronze, 253).id,
  "starport",
  "fresh tactical danger should outrank routine macro recovery",
);

const detailed = checkpoints.createSession({ plan: adapted, race: "Protoss", opponent: "Terran", skill: "Diamond" });
checkpoints.reportEvidence(detailed, "starport", 180, { observedSecond: 170, count: 2, location: "main", confidence: "high" });
const detailedEvidence = detailed.evidence[0];
assert.equal(detailedEvidence.observedSecond, 170);
assert.equal(detailedEvidence.expiresSecond, 235);
assert.equal(detailedEvidence.details.count, 2);
assert.equal(detailedEvidence.details.location, "main");
assert.equal(checkpoints.directive(detailed, 181).attentionScore, 69);

const uncertain = checkpoints.createSession({ plan: adapted, race: "Protoss", opponent: "Terran", skill: "Diamond" });
checkpoints.reportEvidence(uncertain, "move_out", 200, { confidence: "low", location: "map_center" });
const verify = checkpoints.directive(uncertain, 201);
assert.equal(verify.status, "verify");
assert.equal(verify.permission, "CAUTION");
assert.equal(verify.suppressesMacro, false);
assert.equal(verify.requiresConfirmation, true);

const expansion = checkpoints.createSession({ plan: adapted, race: "Protoss", opponent: "Terran", skill: "Diamond" });
checkpoints.reportEvidence(expansion, "normal_natural", 100, { observedSecond: 100 });
checkpoints.reportEvidence(expansion, "no_natural", 110, { observedSecond: 90 });
assert.equal(checkpoints.directive(expansion, 111).id, "normal_natural");
checkpoints.reportEvidence(expansion, "fast_third", 120, { observedSecond: 120 });
assert.equal(checkpoints.directive(expansion, 121).id, "fast_third");

const stale = checkpoints.createSession({ plan: adapted, race: "Protoss", opponent: "Terran", skill: "Diamond" });
checkpoints.reportEvidence(stale, "starport", 500, { observedSecond: 100 });
assert.equal(checkpoints.directive(stale, 500), null);

const changed = checkpoints.confirm(grandmaster, {
  checkpointId: gm180.id,
  status: "changed",
  second: 190,
});
assert.equal(changed.recovery.id, "plan_changed");
assert.match(changed.recovery.action, /redeploy the correct plan/i);

for (const signalId of ["reaper", "factory", "starport", "move_out", "no_natural", "extra_production", "hidden_tech", "fast_third", "turtle", "normal_natural"]) {
  assert.ok(checkpoints.SIGNALS[signalId], `missing checkpoint policy for ${signalId}`);
  assert.ok(checkpoints.SIGNALS[signalId].action, `missing operative action for ${signalId}`);
}

process.stdout.write("Live checkpoint harness passed\n");
