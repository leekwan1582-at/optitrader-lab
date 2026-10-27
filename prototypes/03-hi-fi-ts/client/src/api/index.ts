import * as mockApi from './mockApi';
import * as realApi from './realApi';
import type { ApiClient } from './types';

const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false';

export const apiMode = useMockApi ? 'mock' : 'backend';
export const api: ApiClient = useMockApi ? mockApi : realApi;
export { countCombinations } from './mockApi';

export function getApiModeLabel(): string {
  return useMockApi ? 'Mock data' : 'Live API';
}
