/**
 * Vitest Test Setup
 *
 * This file runs before each test file.
 * It sets up jest-dom matchers for DOM testing.
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver for components that use it
class MockIntersectionObserver {
  observe = () => {}; // code_id:489
  unobserve = () => {};
  disconnect = () => {};
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver for components that use it
class MockResizeObserver {
  observe = () => {}; // code_id:490
  unobserve = () => {};
  disconnect = () => {};
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});
