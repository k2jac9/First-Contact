import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMissionSeriesByWorld,
  MISSION_LEARNING_SERIES,
  summarizeLearningProgress,
} from './learningMetrics';

test('mission learning series captures the Episode 0142 dip and Policy v02+ recovery', () => {
  const all = getMissionSeriesByWorld('All');
  assert.equal(all.length, MISSION_LEARNING_SERIES.length);

  const stall = all.find((p) => p.atlasAnchorCode === 'EPISODE 0142');
  const retry = all.find((p) => p.policyVersion === 'Policy v02');
  assert.ok(stall && retry);
  assert.ok(retry.successRatePct > stall.successRatePct);
});

test('world filtering narrows mission points and computes positive net delta', () => {
  const mars = getMissionSeriesByWorld('Mars');
  assert.ok(mars.every((p) => p.world === 'Mars'));
  const summary = summarizeLearningProgress(mars);
  assert.ok(summary.successDeltaPts > 0);
  assert.equal(summary.latestPolicy, 'Policy v02.4');

  const emptySummary = summarizeLearningProgress([]);
  assert.equal(emptySummary.latestSuccessPct, 0);
});
