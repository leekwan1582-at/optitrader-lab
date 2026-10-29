import * as realApi from './realApi';
import type { ApiClient } from './types';

// Live backend is the default. Mock mode requires both development mode AND explicit opt-in.
const useMockApi = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true';

export const apiMode = useMockApi ? 'mock' : 'backend';

// In production, mockApi is never imported and tree-shaken away.
let selectedApi: ApiClient = realApi;
if (import.meta.env.DEV && useMockApi) {
  // Dynamically require mockApi only in dev if requested
  const mockModule = await import('./mockApi');
  selectedApi = mockModule as unknown as ApiClient;
}

export const api: ApiClient = selectedApi;
export { countCombinations } from '@optitrader/shared';

export function getApiModeLabel(): string {
  return useMockApi ? 'Mock data' : 'Live API';
}


