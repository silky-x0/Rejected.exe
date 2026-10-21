import { api } from "./api";
import { findRejection, isRejection } from "./detection";

type Settings = {
  enabled: boolean;
  volume: number;
};

const DEFAULT_SETTINGS: Settings = { enabled: true, volume: 1 };

/** How long to wait after a DOM change before re-reading the email. */
const DEBOUNCE_MS = 300;
/** Fallback polling: 20 attempts x 500ms = 10s after every navigation. */
const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 20;

let settings: Settings = { ...DEFAULT_SETTINGS };
/** Identifies the thread currently on screen (changes when you open a mail). */
let currentViewKey: string | null = null;
/** The sound already played for the current view. */
let playedForView = false;
/** Last text that was evaluated, to avoid re-scanning identical content. */
let lastSeenText: string | null = null;
let pollAttempts = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let evaluateScheduled = false;

async function loadSettings(): Promise<void> {
  const stored = await api.storage.local.get(DEFAULT_SETTINGS);
  settings = {
    enabled: stored.enabled !== false,
    volume: typeof stored.volume === "number" ? clampVolume(stored.volume) : DEFAULT_SETTINGS.volume,
  };
}

function watchSettings(): void {
  api.storage.onChanged.addListener((changes, areaName): void => {
    if (areaName !== "local") return;

    if (typeof changes.enabled?.newValue === "boolean") {
      settings.enabled = changes.enabled.newValue;
      if (settings.enabled) evaluateView();
    }
    if (typeof changes.volume?.newValue === "number") {
      settings.volume = clampVolume(changes.volume.newValue);
    }
  });
}

function clampVolume(volume: number): number {
  return Math.min(Math.max(volume, 0), 1);
}

/**
 * Gmail routes with the hash (#inbox/<thread-id>), so that id is the cheapest
 * reliable way to tell "the same mail is still open" from "a new mail opened".
 */
function getViewKey(): string {
  const hashMatch = location.hash.match(/#[^/]+\/([A-Za-z0-9_-]+)/);
  if (hashMatch) return hashMatch[1];

  const threadId = document
    .querySelector<HTMLElement>("[data-legacy-thread-id]")
    ?.getAttribute("data-legacy-thread-id");
  if (threadId) return threadId;

  return location.href;
}

function getEmailSubject(): string | null {
  const selectors = ["h2.hP", ".ha h2", "h2[data-thread-perm-id]"];
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el.innerText.trim().length > 0) {
      return el.innerText.trim();
    }
  }
  return null;
}

/** All message bodies of the open thread, in the order Gmail renders them. */
function getMessageBodies(): HTMLElement[] {
  const selectors = [".a3s.aiL", ".a3s", ".ii.gt"];
  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (nodes.length > 0) return nodes;
  }
  return [];
}

const BLOCK_ELEMENTS = "div, p, br, li, tr, table, blockquote, h1, h2, h3, h4, h5, h6";

/**
 * Renders a message body to plain text on a detached copy: quoted history is
 * dropped (so your own replies don't replay an old rejection) and block
 * boundaries become spaces (so phrases split across lines still match).
 */
function getMessageText(body: HTMLElement): string {
  const clone = body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".gmail_quote, blockquote.gmail_quote").forEach((quoted) => quoted.remove());
  clone.querySelectorAll(BLOCK_ELEMENTS).forEach((el) => el.insertAdjacentText("afterend", " "));
  return clone.textContent ?? "";
}

function getEmailText(): string | null {
  const bodies = getMessageBodies()
    .map(getMessageText)
    .map((text) => text.trim())
    .filter((text) => text.length > 0);

  if (bodies.length === 0) return null;

  const subject = getEmailSubject() ?? "";
  return `${subject} ${bodies.join(" ")}`;
}

/**
 * Reads the open mail and fires the sound if it reads like a rejection.
 *
 * The sound plays once per opened mail: closing the mail and opening it again
 * plays it again, but Gmail re-rendering the same mail does not.
 */
function evaluateView(): void {
  if (!settings.enabled) return;

  const viewKey = getViewKey();
  if (viewKey !== currentViewKey) {
    currentViewKey = viewKey;
    playedForView = false;
    lastSeenText = null;
  }

  const text = getEmailText();
  if (!text || text === lastSeenText) return;
  lastSeenText = text;

  if (!isRejection(text)) return;
  if (playedForView) return;

  playedForView = true;
  const match = findRejection(text);
  const phrases = [...match.strong, ...match.weak].join(", ");
  console.log(`[Rejected.exe] 💀 Rejection detected (${phrases})`);

  triggerAlert();
}

function triggerAlert(): void {
  void api.runtime
    .sendMessage({ type: "rejection-detected", volume: settings.volume })
    .catch((): void => {
      // No receiver (extension reloading, worker asleep) -> play it ourselves.
      void playSoundLocally();
    });
}

async function playSoundLocally(): Promise<void> {
  try {
    const url = api.runtime.getURL("fahhh.mp3");
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const audio = new Audio(blobUrl);
    audio.volume = settings.volume;
    await audio.play();
    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(blobUrl);
    });
    console.log("[Rejected.exe] 🔊 Sound playing!");
  } catch (err) {
    console.error("[Rejected.exe] Couldn't play sound:", err);
    // Tell the background so it can fall back to a desktop notification.
    api.runtime.sendMessage({ type: "playback-failed" }).catch((): void => undefined);
  }
}

/**
 * Firefox has no offscreen documents, so the background asks the page to play
 * the sound instead. Chrome never sends this message.
 */
function watchPlaybackRequests(): void {
  api.runtime.onMessage.addListener((message: unknown): void => {
    const msg = message as { type?: string; volume?: number } | undefined;
    if (!msg || msg.type !== "play-sound-locally") return;

    if (typeof msg.volume === "number") settings.volume = clampVolume(msg.volume);
    void playSoundLocally();
  });
}

function scheduleEvaluate(): void {
  if (evaluateScheduled) return;
  evaluateScheduled = true;
  window.setTimeout((): void => {
    evaluateScheduled = false;
    evaluateView();
  }, DEBOUNCE_MS);
}

function stopPolling(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Fallback for pages that render without a DOM mutation we can observe. */
function startPolling(): void {
  stopPolling();
  pollAttempts = 0;

  pollTimer = setInterval((): void => {
    pollAttempts++;
    evaluateView();

    if (pollAttempts >= MAX_POLL_ATTEMPTS) stopPolling();
  }, POLL_INTERVAL_MS);
}

function handleNavigation(): void {
  evaluateView();
  startPolling();
}

/** Gmail is a single-page app that swaps routes without a page load. */
function watchNavigation(): void {
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method];
    history[method] = function (this: History, ...args: Parameters<History[typeof method]>): void {
      original.apply(this, args);
      handleNavigation();
    };
  }

  window.addEventListener("popstate", handleNavigation);
  window.addEventListener("hashchange", handleNavigation);
}

function watchDom(): void {
  const observer = new MutationObserver((): void => {
    scheduleEvaluate();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

async function main(): Promise<void> {
  await loadSettings();
  watchSettings();
  watchPlaybackRequests();
  watchNavigation();
  watchDom();

  console.log("[Rejected.exe] Content script loaded on Gmail.");
  evaluateView();
  startPolling();
}

void main();
