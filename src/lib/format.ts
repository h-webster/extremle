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
