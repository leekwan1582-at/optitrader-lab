import * as mockApi from './mockApi.js';
import * as realApi from './realApi.js';

const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false';

export const apiMode = useMockApi ? 'mock' : 'backend';
export const api = useMockApi ? mockApi : realApi;
export { countCombinations } from './mockApi.js';

export function getApiModeLabel() {
  return useMockApi ? 'Mock data' : 'Live API';
}
