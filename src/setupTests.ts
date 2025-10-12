// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for Web Streams API (needed by AI SDK)
import { ReadableStream, TransformStream } from 'web-streams-polyfill';

// Polyfill for fetch API (needed by AI SDK)
import fetch from 'cross-fetch';

// Add streams to global scope
global.ReadableStream = ReadableStream as any;
global.TransformStream = TransformStream as any;

// Add fetch to global scope
global.fetch = fetch as any;

// Polyfill for structuredClone (needed by AI SDK in Node < 17)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// Mock browser-image-compression for tests since it uses browser APIs
jest.mock('browser-image-compression');
