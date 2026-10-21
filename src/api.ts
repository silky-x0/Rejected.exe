type BrowserApi = typeof chrome;

interface GlobalWithBrowser {
  browser?: BrowserApi;
  chrome?: BrowserApi;
}

const globalScope = globalThis as unknown as GlobalWithBrowser;

/**
 * Firefox exposes the promise-based `browser` namespace, Chrome only has
 * `chrome` (which is promise-based for every API this extension uses).
 * Prefer `browser` when it exists so the same code runs on both.
 */
export const api: BrowserApi = (globalScope.browser ?? globalScope.chrome)!;

/**
 * `chrome.offscreen` is Chrome-only. Firefox plays the sound from the page
 * instead, so the whole offscreen path is feature-detected.
 */
export function supportsOffscreen(): boolean {
  const offscreen = (api as { offscreen?: { createDocument?: unknown } }).offscreen;
  return typeof offscreen?.createDocument === "function";
}
