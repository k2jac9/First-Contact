import test from 'node:test';
import assert from 'node:assert/strict';
import { ATLAS_EPISODES, FILM_SCENES, FILM_TOTAL_FRAMES } from '../data/storyboard';
import {
  auditAvoidRules,
  evaluateNarrationPacing,
  filterAtlasEpisodes,
  formatSmpte,
  formatTimecode,
  getSceneAtTime,
  timeToFrame,
  validateImageConfig,
} from './filmTimeline';

test('film timeline maps 60s at 24fps to 1440 frames and formats SMPTE cleanly', () => {
  assert.equal(FILM_TOTAL_FRAMES, 1440);
  assert.equal(timeToFrame(0), 0);
  assert.equal(timeToFrame(30), 720);
  assert.equal(timeToFrame(60), 1440);
  assert.equal(timeToFrame(-5), 0);
  assert.equal(timeToFrame(99), 1440);
  assert.equal(formatTimecode(24), '00:24');
  assert.equal(formatSmpte(24.5), '00:24:12');
});

test('getSceneAtTime resolves every 8-second scene and the 4-second title card', () => {
  assert.equal(FILM_SCENES.length, 8);
  assert.equal(getSceneAtTime(0).scene.id, 'scene-1-earth');
  assert.equal(getSceneAtTime(10).scene.id, 'scene-2-moon');
  assert.equal(getSceneAtTime(18).scene.id, 'scene-3-mars-failure');
  assert.equal(getSceneAtTime(26).scene.id, 'scene-4-atlas');
  assert.equal(getSceneAtTime(35).scene.id, 'scene-5-generative');
  assert.equal(getSceneAtTime(42).scene.id, 'scene-6-training');
  assert.equal(getSceneAtTime(51).scene.id, 'scene-7-mars-retry');
  assert.equal(getSceneAtTime(58).scene.id, 'scene-8-title');
  assert.equal(getSceneAtTime(60).scene.id, 'scene-8-title');
  assert.equal(getSceneAtTime(60).progress, 1);
});

test('evaluateNarrationPacing verifies voiceover breathing room for 8s windows', () => {
  const s1 = evaluateNarrationPacing(FILM_SCENES[0].narration, 8);
  assert.equal(s1.status, 'fits');
  assert.ok(s1.pauseHeadroomSec >= 1.2);

  const overcrowded = evaluateNarrationPacing(
    'This narration is intentionally far too long and rushed to fit inside an eight second cinematic scene with deliberate pauses for breath.',
    8
  );
  assert.equal(overcrowded.status, 'over');
});

test('filterAtlasEpisodes supports semantic token match and approval gating', () => {
  const allSlip = filterAtlasEpisodes(ATLAS_EPISODES, 'Find Mars rover recoveries after wheel slip', false);
  assert.ok(allSlip.length >= 3);
  assert.equal(allSlip[0].reviewApproved, true);

  const approvedOnly = filterAtlasEpisodes(ATLAS_EPISODES, 'wheel slip', true);
  assert.ok(approvedOnly.every((ep) => ep.reviewApproved));
  assert.equal(approvedOnly.some((ep) => ep.id === 'ep-0104'), false);
});

test('auditAvoidRules flags prohibited film visual tropes and respects clean storyboard prompts', () => {
  const clean = auditAvoidRules('Four-wheel Scout rover on rocky Mars ridge with crisp shadows.');
  assert.equal(clean.length, 0);

  for (const scene of FILM_SCENES) {
    const sceneFindings = auditAvoidRules(scene.generationPrompt);
    assert.equal(sceneFindings.length, 0, `Expected clean prompt for ${scene.id}`);
  }

  const negated = auditAvoidRules('Clean dark telemetry console without decorative hologram clutter.');
  assert.equal(negated.length, 0);

  const flagged = auditAvoidRules('Lunar haze blowing wind dust under a giant planet with floating code.');
  assert.equal(flagged.length, 3);
});

test('validateImageConfig enforces supported aspect ratios and resolutions', () => {
  assert.deepEqual(validateImageConfig('16:9', '4K'), { valid: true });
  assert.deepEqual(validateImageConfig('21:9', '2K'), { valid: true });
  assert.equal(validateImageConfig('5:7', '2K').valid, false);
  assert.equal(validateImageConfig('16:9', '8K').valid, false);
});
