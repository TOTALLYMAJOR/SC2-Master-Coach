const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global;
require(path.resolve(__dirname, "../../static/coach-progression.js"));
const progression = global.SC2CoachProgression;
const NOW = 1_800_000_000_000;

function event({ sessionId = "s1", checkpointId = "cp1", status = "on_track", workers = 24, production = 3, workerMin = 21, productionTarget = 3, recordedAt = NOW } = {}) {
  return progression.toEvent({
    session: { id: sessionId, patch: "5.0.16b", planId: "pvt-standard-blink", race: "Protoss", opponent: "Terran", skill: "Diamond" },
    checkpoint: { id: checkpointId, at: 240, profile: "Diamond", worker: { label: "Probes", min: workerMin, max: workerMin + 6, center: workerMin + 3 }, primaryProduction: { key: "gateway", label: "Gateways", count: productionTarget } },
    result: { recorded: { status, workers, production, reportedSecond: 245 } },
    matchup: "PvT",
    recordedAt,
  });
}

const exact = event({ workers: 17, production: 1 });
assert.equal(exact.id, "s1:cp1");
assert.equal(exact.derived.workerDeficit, 4);
assert.equal(exact.derived.productionDeficit, 2);
assert.equal(exact.derived.confidence, "high");

const focusEvent = progression.toEvent({
  session: { id: "focus", skill: "Gold" },
  checkpoint: { id: "focus-cp", worker: { min: 20, max: 26 } },
  result: { recorded: { status: "on_track", workers: 22, focusCode: "SUPPLY_BLOCK_EXPOSURE", focusReport: "missed" } },
});
assert.deepEqual(focusEvent.report.focus, {
  code: "SUPPLY_BLOCK_EXPOSURE",
  value: "missed",
  authority: "player_report",
  outcomeStatus: "reported_only",
});
assert.equal(progression.classify(focusEvent).some((row) => row.dimension === "supply"), false);
const focusOnly = progression.analyze([focusEvent], { now: NOW });
assert.equal(focusOnly.accuracy, 100, "plan status remains a separate player-reported measure");
assert.equal(focusOnly.focusSummary.missed, 1);
assert.equal(focusOnly.focusSummary.met, 0);
assert.equal(focusOnly.focusSummary.outcomeStatus, "reported_only");
assert.match(focusOnly.focusSummary.recommendation.title, /repeat/i);

const notObservedFocus = progression.toEvent({
  session: { id: "focus-not-observed", skill: "Gold" },
  checkpoint: { id: "focus-not-observed-cp", worker: { min: 20, max: 26 } },
  result: { recorded: { status: "on_track", workers: 22, focusCode: "SUPPLY_BLOCK_EXPOSURE", focusReport: "not_observed" } },
});
assert.equal(notObservedFocus.report.focus.outcomeStatus, "not_evaluated");
const notObservedSummary = progression.analyze([notObservedFocus], { now: NOW }).focusSummary;
assert.equal(notObservedSummary.not_observed, 1);
assert.equal(notObservedSummary.reported, 0, "a missing trigger does not become a success, miss, or uncertainty");
assert.equal(notObservedSummary.evaluated, 0);
assert.match(notObservedSummary.recommendation.instruction, /cannot evaluate/i);

const otherFocusEvent = progression.toEvent({
  session: { id: "other-focus", skill: "Gold" },
  checkpoint: { id: "other-focus-cp", worker: { min: 20, max: 26 } },
  result: { recorded: { status: "on_track", workers: 22, focusCode: "MINERAL_FLOAT_EXPOSURE", focusReport: "met" } },
});
const scopedFocus = progression.analyze([focusEvent, otherFocusEvent], { now: NOW, focusCode: "SUPPLY_BLOCK_EXPOSURE" }).focusSummary;
assert.equal(scopedFocus.code, "SUPPLY_BLOCK_EXPOSURE");
assert.equal(scopedFocus.total, 1, "reports for other focus codes do not inflate the active focus summary");
assert.equal(scopedFocus.missed, 1);
assert.equal(scopedFocus.met, 0);
assert.equal(scopedFocus.otherFocusReports, 1);

const missing = event({ checkpointId: "missing", workers: null, production: null });
assert.equal(missing.derived.workerDeficit, null);
assert.equal(missing.derived.productionDeficit, null);
assert.equal(progression.classify(missing)[0].dimension, "checkpoint_execution");

const malformedStatus = progression.toEvent({
  session: { id: "malformed", skill: "Gold" },
  checkpoint: { id: "malformed-cp", worker: { min: 20 }, primaryProduction: { key: "gateway", label: "Gateways", count: 3 } },
  result: { recorded: { status: "definitely-not-valid", workers: 30, production: 4 } },
  recordedAt: NOW,
});
assert.equal(malformedStatus.report.status, "unknown");
assert.deepEqual(progression.classify(malformedStatus), [], "malformed status cannot become on-track evidence");
const malformedSummary = progression.analyze([malformedStatus], { now: NOW });
assert.equal(malformedSummary.eligible, 0);
assert.equal(malformedSummary.accuracy, 0);
assert.equal(malformedSummary.streaks.checkpointOnTrack, 0);

const malformedLegacy = progression.migrateLegacy([{ sessionId: "old-malformed", checkpointId: "old-cp", status: "great" }]);
assert.equal(malformedLegacy[0].report.status, "unknown");
assert.deepEqual(progression.classify(malformedLegacy[0]), []);

const changed = event({ checkpointId: "changed", status: "changed" });
assert.deepEqual(progression.classify(changed), []);

const explicitlyBehind = event({ checkpointId: "explicit-behind", status: "behind", workers: 30, production: 4 });
const behindObservation = progression.classify(explicitlyBehind).find((row) => row.dimension === "checkpoint_execution");
assert.equal(behindObservation.miss, true, "an explicit Behind report remains a miss even when numeric targets were entered as satisfied");

const legacy = progression.migrateLegacy([{ sessionId: "old", checkpointId: "old-cp", status: "behind", workers: 10 }]);
assert.equal(legacy[0].derived.confidence, "low");
assert.equal(legacy[0].derived.workerDeficit, null);
assert.equal(progression.classify(legacy[0])[0].dimension, "checkpoint_execution");

const productionMisses = [
  event({ sessionId: "a", checkpointId: "a1", production: 1, recordedAt: NOW - 3000 }),
  event({ sessionId: "a", checkpointId: "a2", production: 1, recordedAt: NOW - 2000 }),
  event({ sessionId: "b", checkpointId: "b1", production: 2, recordedAt: NOW - 1000 }),
];
const recurring = progression.analyze(productionMisses, { now: NOW });
const productionWeakness = recurring.dimensions.find((row) => row.id === "production_capacity");
assert.equal(productionWeakness.recurring, true);
assert.equal(recurring.recommendation.dimension, "production_capacity");

const trendEvents = [];
for (let index = 0; index < 3; index += 1) trendEvents.push(event({ sessionId: `old-${index}`, checkpointId: `old-${index}`, production: 0, recordedAt: NOW - (10 - index) * 1000 }));
for (let index = 0; index < 3; index += 1) trendEvents.push(event({ sessionId: `new-${index}`, checkpointId: `new-${index}`, production: 3, recordedAt: NOW - (3 - index) * 1000 }));
const improving = progression.analyze(trendEvents, { now: NOW }).dimensions.find((row) => row.id === "production_capacity");
assert.equal(improving.trend.direction, "improving");

const streakRows = [event({ sessionId: "one", checkpointId: "1" }), changed, event({ sessionId: "two", checkpointId: "2" }), event({ sessionId: "two", checkpointId: "3" })];
assert.equal(progression.calculateStreaks(streakRows).checkpointOnTrack, 3);
streakRows.push(event({ sessionId: "three", checkpointId: "4", status: "behind", workers: 10 }));
assert.equal(progression.calculateStreaks(streakRows).checkpointOnTrack, 0);

const bronze = progression.programForSkill("Bronze");
const grandmaster = progression.programForSkill("Grandmaster");
assert.notEqual(bronze.planPool, grandmaster.planPool);
assert.ok(bronze.cadence > grandmaster.cadence);
assert.ok(bronze.maxTargets < grandmaster.maxTargets);
assert.notEqual(bronze.teaching, grandmaster.teaching);
assert.notEqual(bronze.drill, grandmaster.drill);

const deduped = progression.upsert([exact], { ...exact, recordedAt: NOW + 1 });
assert.equal(deduped.length, 1);
assert.equal(deduped[0].recordedAt, NOW + 1);

const firstDrill = { ...event({ sessionId: "drill-a", checkpointId: "drill-a" }), drillKey: "target:a" };
const secondDrill = { ...event({ sessionId: "drill-b", checkpointId: "drill-b", status: "behind", workers: 10 }), drillKey: "target:b" };
const scopedDrill = progression.analyze([firstDrill, secondDrill], { now: NOW, drillKey: "target:a" });
assert.equal(scopedDrill.total, 1, "progression does not blend separate instances of a similarly named drill");
assert.equal(scopedDrill.accuracy, 100);

process.stdout.write("Coach progression harness passed\n");
