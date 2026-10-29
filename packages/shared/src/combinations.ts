export interface ParameterRangeLike {
  min?: number;
  max?: number;
  step?: number;
}

export interface CombinationConfig {
  fast_ma?: Partial<ParameterRangeLike>;
  slow_ma?: Partial<ParameterRangeLike>;
}

export interface Combination {
  fast: number;
  slow: number;
}

/**
 * Calculates the number of valid parameter combinations where fast_ma < slow_ma.
 */
export function countCombinations({ fast_ma: fast, slow_ma: slow }: CombinationConfig = {}): number {
  const fastMin = Number(fast?.min ?? 5);
  const fastMax = Number(fast?.max ?? 30);
  const fastStep = Math.max(1, Number(fast?.step ?? 5));
  const slowMin = Number(slow?.min ?? 40);
  const slowMax = Number(slow?.max ?? 120);
  const slowStep = Math.max(1, Number(slow?.step ?? 10));

  let count = 0;
  for (let fastValue = fastMin; fastValue <= fastMax; fastValue += fastStep) {
    for (let slowValue = slowMin; slowValue <= slowMax; slowValue += slowStep) {
      if (fastValue < slowValue) count += 1;
    }
  }
  return count;
}

/**
 * Enumerates all valid parameter combinations where fast_ma < slow_ma.
 */
export function enumerateCombinations({ fast_ma: fast, slow_ma: slow }: CombinationConfig = {}): Combination[] {
  const combos: Combination[] = [];
  const fastMin = Number(fast?.min ?? 5);
  const fastMax = Number(fast?.max ?? 30);
  const fastStep = Math.max(1, Number(fast?.step ?? 5));
  const slowMin = Number(slow?.min ?? 40);
  const slowMax = Number(slow?.max ?? 120);
  const slowStep = Math.max(1, Number(slow?.step ?? 10));

  for (let fastValue = fastMin; fastValue <= fastMax; fastValue += fastStep) {
    for (let slowValue = slowMin; slowValue <= slowMax; slowValue += slowStep) {
      if (fastValue < slowValue) combos.push({ fast: fastValue, slow: slowValue });
    }
  }
  return combos;
}

