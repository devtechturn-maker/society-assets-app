/** Shared Jest setup for society-assets-expo module tests. */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('../src/config/env', () => ({
  API_BASE_URL: 'http://localhost:8080',
}));
