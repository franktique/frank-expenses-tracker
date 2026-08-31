import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// jsdom-only mocks (guarded so tests that run in the `node` environment, e.g.
// API route tests that need Request/Response globals, still work)
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  // Mock sessionStorage for tests
  const mockSessionStorage = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => {
        store[key] = value;
      },
      removeItem: (key) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
  });
}

// Mock fetch globally
global.fetch = jest.fn();

if (typeof global.ResizeObserver !== 'undefined') {
  // Mock ResizeObserver for tests
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

if (typeof Element !== 'undefined') {
  // Mock scrollIntoView for tests
  Element.prototype.scrollIntoView = jest.fn();
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  if (typeof window !== 'undefined') {
    window.sessionStorage.clear();
  }
});
