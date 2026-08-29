/** Rounds to ~2 significant figures with a K/M/B suffix, e.g. 626189 -> "630K". Pure presentation helper, safe to use client-side. */
export function roughCount(n: number): string {
  if (n < 1000) return String(n);
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  const rounded = Math.round(n / magnitude) * magnitude;
  const units: [number, string][] = [
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "K"],
  ];
  for (const [value, suffix] of units) {
    if (rounded >= value) {
      const display = Number((rounded / value).toFixed(1));
      return `${display}${suffix}`;
    }
  }
  return String(rounded);
}

function formatBoundary(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${Number((n / 1000).toFixed(1))}K`;
  return `${Number((n / 1_000_000).toFixed(1))}M`;
}

/** Buckets n into a [lower, lower+width) range and formats both ends, e.g. bucketRange(28000, 25_000) -> "25K–50K". Boundaries are always exact multiples of width, so this formats them directly rather than through roughCount's approximate rounding (which would distort clean boundaries like 17500 into "18K"). */
export function bucketRange(n: number, width: number): string {
  const lower = Math.floor(n / width) * width;
  const upper = lower + width;
  return `${formatBoundary(lower)}–${formatBoundary(upper)}`;
}
