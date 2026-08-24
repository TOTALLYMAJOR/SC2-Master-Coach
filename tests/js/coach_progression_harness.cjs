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

const missing = event({ checkpointId: "missing", workers: null, production: null });
assert.equal(missing.derived.workerDeficit, null);
assert.equal(missing.derived.productionDeficit, null);
assert.equal(progression.classify(missing)[0].dimension, "checkpoint_execution");

const changed = event({ checkpointId: "changed", status: "changed" });
assert.deepEqual(progression.classify(changed), []);

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

process.stdout.write("Coach progression harness passed\n");
