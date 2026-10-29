import test from 'node:test';
import assert from 'node:assert/strict';
import { erasedFraction, shouldReveal, countdownTo, WEDDING_START } from '../dist/invitation-core.mjs';

test('scratch coating must be at least 70% erased before automatic reveal', () => {
  assert.equal(shouldReveal(0.699), false);
  assert.equal(shouldReveal(0.7), true);
  assert.equal(shouldReveal(1), true);
});
test('scratch progress measures erased pixels, rather than repeated gestures', () => {
  const pixels = new Uint8ClampedArray(100 * 4).fill(255);
  for (let index = 0; index < 69; index++) pixels[index * 4 + 3] = 0;
  assert.equal(erasedFraction(pixels), 0.69);
  assert.equal(shouldReveal(erasedFraction(pixels)), false);
  pixels[69 * 4 + 3] = 0;
  assert.equal(erasedFraction(pixels), 0.7);
  assert.equal(shouldReveal(erasedFraction(pixels)), true);
});
test('partially transparent brush edges count proportionally', () => {
  assert.equal(erasedFraction(new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255])), 0.5);
  assert.equal(erasedFraction(new Uint8ClampedArray()), 0);
});
test('countdown starts on 27 November in India and breaks down correctly', () => {
  assert.equal(new Date(WEDDING_START).toISOString(), '2026-11-26T18:30:00.000Z');
  const before = WEDDING_START - ((2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000);
  assert.deepEqual(countdownTo(before), { days: 2, hours: 3, minutes: 4, seconds: 5, started: false });
});
test('countdown never goes negative after wedding begins', () => {
  assert.deepEqual(countdownTo(WEDDING_START + 86400000), { days: 0, hours: 0, minutes: 0, seconds: 0, started: true });
});
