import assert from 'node:assert/strict';
import test from 'node:test';
import { getDestinationById } from '../data/missions.ts';
import { createPresetCommands, simulateMission } from './missionSimulation.ts';

test('simulateMission is 100% deterministic for identical destination and command sequences', () => {
  const mars = getDestinationById('mars');
  const safePlan = createPresetCommands(mars, 'safe-bypass');

  const runA = simulateMission(mars, safePlan, 'Determinism Check A');
  const runB = simulateMission(mars, safePlan, 'Determinism Check B');

  assert.equal(runA.outcome, runB.outcome);
  assert.equal(runA.durationSec, runB.durationSec);
  assert.equal(runA.finalBatteryPct, runB.finalBatteryPct);
  assert.equal(runA.score, runB.score);
  assert.equal(runA.frames.length, runB.frames.length);
  assert.deepEqual(runA.events, runB.events);
});

test('Mars direct FAST path through sandy rut triggers STALLED_SLIP with elevated wheel speed', () => {
  const mars = getDestinationById('mars');
  const riskyPlan = createPresetCommands(mars, 'direct-risky');

  const recording = simulateMission(mars, riskyPlan, 'Direct Fast Run');

  assert.equal(recording.outcome, 'STALLED_SLIP');
  assert.ok(recording.peakSlipRatio >= 0.62, 'Expected peak slip ratio >= 0.62');
  const slipFrame = recording.frames.find((f) => f.slipRatio >= 0.62);
  assert.ok(slipFrame, 'Expected a frame with high wheel slip');
  assert.ok(
    slipFrame.wheelVelocity > 4.0 && slipFrame.forwardProgress < 0.4,
    'Expected wheel velocity to exceed forward progress during slip'
  );
});

test('Mars safe bypass with relay, scan, and samples achieves SUCCESS and full science', () => {
  const mars = getDestinationById('mars');
  const safePlan = createPresetCommands(mars, 'safe-bypass');

  const recording = simulateMission(mars, safePlan, 'Safe Bypass Plan');

  assert.equal(recording.outcome, 'SUCCESS');
  assert.equal(recording.scienceCollected, recording.scienceAvailable);
  assert.ok(recording.finalBatteryPct > 20, 'Expected healthy remaining battery');
  assert.ok(recording.score > 1000, 'Expected mission score above 1000');
});

test('Moon and Earth safe presets reach extraction beacon successfully', () => {
  for (const id of ['moon', 'earth'] as const) {
    const dest = getDestinationById(id);
    const plan = createPresetCommands(dest, 'safe-bypass');
    const rec = simulateMission(dest, plan, `${id} preset`);
    assert.ok(
      rec.outcome === 'SUCCESS' || rec.outcome === 'PARTIAL_SUCCESS',
      `Expected ${id} safe preset to reach beacon, got ${rec.outcome}`
    );
  }
});

test('Empty command queue produces INCOMPLETE_ROUTE without crashing', () => {
  const earth = getDestinationById('earth');
  const rec = simulateMission(earth, [], 'Empty Queue');
  assert.equal(rec.outcome, 'INCOMPLETE_ROUTE');
  assert.equal(rec.frames.length, 1);
});
