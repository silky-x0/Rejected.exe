import { api, supportsOffscreen } from "./api";

const BADGE_COLOR = "#cc0000";
const OFFSCREEN_URL = "offscreen.html";
const OFFSCREEN_JUSTIFICATION = "Plays the rejection sound when a rejection email is detected.";

type Stats = {
  rejections: number;
  lastRejectionAt: number | null;
};

const DEFAULT_STATS = {
  rejections: 0,
  lastRejectionAt: null as number | null,
};

let offscreenSetup: Promise<void> | null = null;

async function readStats(): Promise<Stats> {
  const stored = await api.storage.local.get(DEFAULT_STATS);
  return {
    rejections: typeof stored.rejections === "number" ? stored.rejections : 0,
    lastRejectionAt: typeof stored.lastRejectionAt === "number" ? stored.lastRejectionAt : null,
  };
}

async function writeStats(stats: Stats): Promise<void> {
  await api.storage.local.set(stats);
}

async function refreshBadge(): Promise<void> {
  const stats = await readStats();
  await api.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  await api.action.setBadgeText({
    text: stats.rejections > 0 ? String(Math.min(stats.rejections, 999)) : "",
  });
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await api.offscreen.hasDocument()) return;

  offscreenSetup ??= api.offscreen
    .createDocument({
      url: OFFSCREEN_URL,
      reasons: [api.offscreen.Reason.AUDIO_PLAYBACK],
      justification: OFFSCREEN_JUSTIFICATION,
    })
    .finally((): void => {
      offscreenSetup = null;
    });

  await offscreenSetup;
}

/** Chrome only: plays the sound from a hidden extension page. */
async function playInOffscreenDocument(volume: number | undefined): Promise<boolean> {
  try {
    await ensureOffscreenDocument();
    await api.runtime.sendMessage({
      type: "play-sound",
      volume: typeof volume === "number" ? volume : 1,
    });
    return true;
  } catch (err) {
    console.warn("[Rejected.exe] Offscreen playback unavailable:", err);
    return false;
  }
}

/** Firefox and other browsers without offscreen documents: the page plays it. */
async function playInPage(tabId: number, volume: number | undefined): Promise<boolean> {
  try {
    await api.tabs.sendMessage(tabId, {
      type: "play-sound-locally",
      volume: typeof volume === "number" ? volume : 1,
    });
    return true;
  } catch (err) {
    console.warn("[Rejected.exe] Could not ask the page to play the sound:", err);
    return false;
  }
}

function notifyRejection(): void {
  void api.notifications.create(`rejection-${Date.now()}`, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "Rejection detected 💀",
    message: "Could not play the sound of failure. Better luck next time.",
  });
}

async function handleRejection(
  volume: number | undefined,
  sender: chrome.runtime.MessageSender,
): Promise<void> {
  const stats = await readStats();
  await writeStats({
    rejections: stats.rejections + 1,
    lastRejectionAt: Date.now(),
  });
  await refreshBadge();

  if (supportsOffscreen()) {
    const played = await playInOffscreenDocument(volume);
    if (played) return;
  }

  const tabId = sender.tab?.id;
  if (typeof tabId === "number") {
    const played = await playInPage(tabId, volume);
    if (played) return;
  }

  notifyRejection();
}

api.runtime.onInstalled.addListener((): void => {
  console.log("Rejection Alert installed. May God have mercy on your inbox.");
  void refreshBadge();
});

api.runtime.onStartup.addListener((): void => {
  void refreshBadge();
});

api.runtime.onMessage.addListener((message: unknown, sender): void => {
  const msg = message as { type?: string; volume?: number } | undefined;
  if (!msg || typeof msg.type !== "string") return;

  if (msg.type === "rejection-detected") {
    void handleRejection(msg.volume, sender);
  } else if (msg.type === "playback-failed") {
    notifyRejection();
  } else if (msg.type === "stats-reset") {
    void writeStats(DEFAULT_STATS).then(refreshBadge);
  }
});

export {};
