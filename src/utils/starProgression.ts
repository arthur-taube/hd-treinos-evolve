// STAR (intermediate) progression logic.
// Goal: always suggest the SMALLEST possible positive increase in estimated 1RM (Epley),
// matrixing the rep range but discarding the first 3 reps (4-6), i.e. 7-25 or 7-14.
// Candidate weights: current weight +/- up to 3 minimum increments.
// On a tie between two candidates with the same estimated 1RM, prefer the heavier weight.

export interface StarProgressionResult {
  weight: number;
  reps: number;
  estimated1RM: number;
  baseEstimated1RM: number;
}

export interface StarProgressionOption {
  weight: number;
  reps: number;
  estimated1RM: number;
  percentIncrease: number;
}

export interface StarProgressionFull {
  base: { weight: number; reps: number; estimated1RM: number };
  // All candidates tied at the smallest positive 1RMe increase, sorted by weight ascending.
  options: StarProgressionOption[];
  // The option applied to the inputs (heaviest among ties).
  suggested: StarProgressionOption;
}

export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Parse a rep range string like "4-25" or "7-14". Returns effective matrix bounds
 * where the first 3 reps of the range are discarded (min + 3).
 */
export function getStarMatrixBounds(repeticoes: string | null): { minReps: number; maxReps: number } | null {
  if (!repeticoes) return null;
  let rawMin: number;
  let rawMax: number;
  if (repeticoes.includes("-")) {
    const [a, b] = repeticoes.split("-").map((r) => parseInt(r.trim(), 10));
    rawMin = a;
    rawMax = b;
  } else {
    rawMin = parseInt(repeticoes, 10);
    rawMax = rawMin;
  }
  if (isNaN(rawMin) || isNaN(rawMax)) return null;
  // Discard the first 3 reps of the range (e.g. 4-6 → matrix starts at 7)
  const minReps = Math.min(rawMax, rawMin + 3);
  return { minReps, maxReps: rawMax };
}

/**
 * Compute the STAR progression suggestion from the previous week's first set.
 * Returns null when no positive-increase candidate exists.
 */
export function computeStarProgression(
  prevWeight: number,
  prevReps: number,
  increment: number,
  repeticoes: string | null
): StarProgressionResult | null {
  const bounds = getStarMatrixBounds(repeticoes);
  if (!bounds) return null;
  const { minReps, maxReps } = bounds;

  const inc = increment && increment > 0 ? increment : 2.5;
  const base1RM = epley1RM(prevWeight, prevReps);
  if (base1RM <= 0) return null;

  // 3 increments up + 3 down + current weight
  const weights: number[] = [];
  for (let k = -3; k <= 3; k++) {
    const w = prevWeight + k * inc;
    if (w > 0) weights.push(Math.round(w * 100) / 100);
  }

  const EPS = 1e-6;
  let best: StarProgressionResult | null = null;

  for (const w of weights) {
    for (let r = minReps; r <= maxReps; r++) {
      const est = epley1RM(w, r);
      const increase = est - base1RM;
      if (increase <= EPS) continue; // must be a positive increase
      if (!best) {
        best = { weight: w, reps: r, estimated1RM: est, baseEstimated1RM: base1RM };
        continue;
      }
      const diff = est - best.estimated1RM;
      if (diff < -EPS) {
        // smaller estimated 1RM → smaller increase, preferred
        best = { weight: w, reps: r, estimated1RM: est, baseEstimated1RM: base1RM };
      } else if (Math.abs(diff) <= EPS && w > best.weight) {
        // tie → prefer heavier weight
        best = { weight: w, reps: r, estimated1RM: est, baseEstimated1RM: base1RM };
      }
    }
  }

  return best;
}

/**
 * Full STAR progression: returns the base reference and ALL candidates tied at the
 * smallest positive 1RMe increase (so the UI can show every tie), plus the suggested
 * option to apply to the inputs (heaviest among ties).
 */
export function computeStarProgressionFull(
  prevWeight: number,
  prevReps: number,
  increment: number,
  repeticoes: string | null
): StarProgressionFull | null {
  const bounds = getStarMatrixBounds(repeticoes);
  if (!bounds) return null;
  const { minReps, maxReps } = bounds;

  const inc = increment && increment > 0 ? increment : 2.5;
  const base1RM = epley1RM(prevWeight, prevReps);
  if (base1RM <= 0) return null;

  const weights: number[] = [];
  for (let k = -3; k <= 3; k++) {
    const w = prevWeight + k * inc;
    if (w > 0) weights.push(Math.round(w * 100) / 100);
  }

  const EPS = 1e-6;
  const candidates: { weight: number; reps: number; estimated1RM: number }[] = [];

  for (const w of weights) {
    for (let r = minReps; r <= maxReps; r++) {
      const est = epley1RM(w, r);
      if (est - base1RM <= EPS) continue; // must be a positive increase
      candidates.push({ weight: w, reps: r, estimated1RM: est });
    }
  }

  if (candidates.length === 0) return null;

  // Smallest positive 1RMe increase
  const minEst = candidates.reduce((m, c) => Math.min(m, c.estimated1RM), Infinity);

  const tied = candidates
    .filter((c) => Math.abs(c.estimated1RM - minEst) <= EPS)
    .map((c) => ({
      weight: c.weight,
      reps: c.reps,
      estimated1RM: c.estimated1RM,
      percentIncrease: (c.estimated1RM / base1RM - 1) * 100,
    }))
    .sort((a, b) => a.weight - b.weight);

  // Suggested = heaviest among ties
  const suggested = tied.reduce((best, c) => (c.weight > best.weight ? c : best), tied[0]);

  return {
    base: { weight: prevWeight, reps: prevReps, estimated1RM: base1RM },
    options: tied,
    suggested,
  };
}
