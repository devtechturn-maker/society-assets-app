/** Shared mock Axios instance for API contract tests. */
export const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  interceptors: {
    request: { use: jest.fn((fulfilled?: unknown) => fulfilled) },
    response: { use: jest.fn((fulfilled?: unknown) => fulfilled) },
  },
};
