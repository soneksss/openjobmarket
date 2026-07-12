/**
 * "Available now" resets at a fixed daily clock time (9:00 UTC, matching the
 * expire-availability / daily-availability-prompt crons — see vercel.json),
 * not a rolling window from when the toggle was flipped. This is deliberate:
 * a rolling window can be gamed by toggling off/on to keep pushing the
 * expiry further out; a fixed daily reset can't be extended that way.
 */
export function nextNineAM(from: Date = new Date()): Date {
  const next = new Date(from)
  next.setUTCHours(9, 0, 0, 0)
  if (next <= from) next.setUTCDate(next.getUTCDate() + 1)
  return next
}
