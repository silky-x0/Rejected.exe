import { api } from "./api";

/**
 * Hidden document that owns audio playback. Extensions can play audio from an
 * offscreen document without hitting the page's autoplay policy, which is what
 * makes the sound reliable even when Gmail was opened without a click.
 * (Chrome only - Firefox plays the sound from the page instead.)
 */
function clampVolume(volume: number): number {
  return Math.min(Math.max(volume, 0), 1);
}

async function playRejectionSound(volume: number | undefined): Promise<void> {
  const audio = new Audio(api.runtime.getURL("fahhh.mp3"));
  audio.volume = typeof volume === "number" ? clampVolume(volume) : 1;

  try {
    await audio.play();
    console.log("[Rejected.exe] 🔊 Sound playing!");
  } catch (err) {
    console.error("[Rejected.exe] Offscreen playback failed:", err);
    api.runtime.sendMessage({ type: "playback-failed" }).catch((): void => undefined);
  }
}

api.runtime.onMessage.addListener((message: unknown): void => {
  const msg = message as { type?: string; volume?: number } | undefined;
  if (!msg || msg.type !== "play-sound") return;

  void playRejectionSound(msg.volume);
});

export {};
