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
  const stored = await chrome.storage.local.get(DEFAULT_STATS);
  return {
    rejections: typeof stored.rejections === "number" ? stored.rejections : 0,
    lastRejectionAt: typeof stored.lastRejectionAt === "number" ? stored.lastRejectionAt : null,
  };
}

async function writeStats(stats: Stats): Promise<void> {
  await chrome.storage.local.set(stats);
}

async function refreshBadge(): Promise<void> {
  const stats = await readStats();
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  await chrome.action.setBadgeText({
    text: stats.rejections > 0 ? String(Math.min(stats.rejections, 999)) : "",
  });
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;

  offscreenSetup ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: OFFSCREEN_JUSTIFICATION,
    })
    .finally((): void => {
      offscreenSetup = null;
    });

  await offscreenSetup;
}

/** Plays the sound from a hidden extension page (no autoplay restrictions). */
async function playRejectionSound(volume: number | undefined): Promise<boolean> {
  try {
    await ensureOffscreenDocument();
    await chrome.runtime.sendMessage({
      type: "play-sound",
      volume: typeof volume === "number" ? volume : 1,
    });
    return true;
  } catch (err) {
    console.warn("[Rejected.exe] Offscreen playback unavailable:", err);
    return false;
  }
}

function notifyRejection(): void {
  chrome.notifications.create(`rejection-${Date.now()}`, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "Rejection detected 💀",
    message: "Could not play the sound of failure. Better luck next time.",
  });
}

async function handleRejection(volume: number | undefined): Promise<void> {
  const stats = await readStats();
  await writeStats({
    rejections: stats.rejections + 1,
    lastRejectionAt: Date.now(),
  });
  await refreshBadge();

  const played = await playRejectionSound(volume);
  if (!played) notifyRejection();
}

chrome.runtime.onInstalled.addListener((): void => {
  console.log("Rejection Alert installed. May God have mercy on your inbox.");
  void refreshBadge();
});

chrome.runtime.onStartup.addListener((): void => {
  void refreshBadge();
});

chrome.runtime.onMessage.addListener((message: unknown): void => {
  const msg = message as { type?: string; volume?: number } | undefined;
  if (!msg || typeof msg.type !== "string") return;

  if (msg.type === "rejection-detected") {
    void handleRejection(msg.volume);
  } else if (msg.type === "playback-failed") {
    notifyRejection();
  } else if (msg.type === "stats-reset") {
    void writeStats(DEFAULT_STATS).then(refreshBadge);
  }
});

export {};
