// The celebration spans 27–28 November. Count down to the first day at midnight IST.
export const WEDDING_START = Date.parse('2026-11-27T00:00:00+05:30');
export const REVEAL_THRESHOLD = 0.7;
export function shouldReveal(fraction) { return fraction >= REVEAL_THRESHOLD; }
export function erasedFraction(pixels) {
  if (!pixels.length) return 0;
  let erased = 0;
  for (let offset = 3; offset < pixels.length; offset += 4) erased += (255 - pixels[offset]) / 255;
  return erased / (pixels.length / 4);
}
export function countdownTo(now = Date.now()) {
  const remaining = Math.max(0, Math.floor((WEDDING_START - now) / 1000));
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor(remaining / 3600) % 24,
    minutes: Math.floor(remaining / 60) % 60,
    seconds: remaining % 60,
    started: now >= WEDDING_START
  };
}
