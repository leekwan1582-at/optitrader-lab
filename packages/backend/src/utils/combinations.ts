import type { ParameterRange } from '../types/domain.js';

interface CombinationConfig {
  fast_ma?: Partial<ParameterRange>;
  slow_ma?: Partial<ParameterRange>;
}

export interface Combination {
  fast: number;
  slow: number;
}

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
