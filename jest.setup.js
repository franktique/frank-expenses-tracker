import "@testing-library/jest-dom";

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

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

// Mock fetch globally
global.fetch = jest.fn();

// Mock ResizeObserver for tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollIntoView for tests
Element.prototype.scrollIntoView = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockSessionStorage.clear();
});
