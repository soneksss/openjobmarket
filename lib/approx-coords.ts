/**
 * Generates a stable approximate coordinate pair from exact coordinates.
 *
 * The offset is derived from the userId so it is deterministic — the same
 * homeowner always gets the same approx location (no drift on re-save).
 * Offset range: 0.004–0.008 degrees (≈ 450–890 m at UK latitude).
 */
export function computeApproxCoords(
  lat: number,
  lon: number,
  userId: string,
): { latApprox: number; lonApprox: number } {
  // Simple deterministic hash from userId characters
  let h1 = 0, h2 = 0
  for (let i = 0; i < userId.length; i++) {
    const c = userId.charCodeAt(i)
    h1 = ((h1 << 5) - h1 + c) | 0
    h2 = ((h2 << 3) + c ^ (i * 31)) | 0
  }

  // Map hash to signed offset in range [-0.008, -0.004] ∪ [0.004, 0.008]
  const sign1 = h1 >= 0 ? 1 : -1
  const sign2 = h2 >= 0 ? 1 : -1
  const offset1 = sign1 * (0.004 + (Math.abs(h1) % 4001) / 1000000)
  const offset2 = sign2 * (0.004 + (Math.abs(h2) % 4001) / 1000000)

  return {
    latApprox: Math.round((lat + offset1) * 1e6) / 1e6,
    lonApprox: Math.round((lon + offset2) * 1e6) / 1e6,
  }
}
