interface Settings {
  enabled: boolean;
  volume: number;
}

interface Stats {
  rejections: number;
  lastRejectionAt: number | null;
}

const DEFAULTS = {
  enabled: true,
  volume: 1,
  rejections: 0,
  lastRejectionAt: null as number | null,
};

function mustFind<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

const enabledToggle = mustFind<HTMLInputElement>("enabled");
const volumeSlider = mustFind<HTMLInputElement>("volume");
const volumeValue = mustFind<HTMLElement>("volumeValue");
const rejectionCount = mustFind<HTMLElement>("rejectionCount");
const lastRejection = mustFind<HTMLElement>("lastRejection");
const testButton = mustFind<HTMLButtonElement>("testBtn");
const resetButton = mustFind<HTMLButtonElement>("resetBtn");

function formatAge(timestamp: number | null): string {
  if (!timestamp) return "";

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return " · just now";
  if (seconds < 3600) return ` · ${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return ` · ${Math.round(seconds / 3600)}h ago`;
  return ` · ${Math.round(seconds / 86400)}d ago`;
}

function renderStats(stats: Stats): void {
  rejectionCount.textContent = String(stats.rejections);
  lastRejection.textContent = formatAge(stats.lastRejectionAt);
}

function renderSettings(settings: Settings): void {
  enabledToggle.checked = settings.enabled;
  volumeSlider.value = String(Math.round(settings.volume * 100));
  volumeValue.textContent = `${volumeSlider.value}%`;
}

async function load(): Promise<void> {
  const stored = await chrome.storage.local.get(DEFAULTS);

  renderSettings({
    enabled: stored.enabled !== false,
    volume: typeof stored.volume === "number" ? stored.volume : DEFAULTS.volume,
  });
  renderStats({
    rejections: typeof stored.rejections === "number" ? stored.rejections : 0,
    lastRejectionAt:
      typeof stored.lastRejectionAt === "number" ? stored.lastRejectionAt : null,
  });
}

enabledToggle.addEventListener("change", (): void => {
  void chrome.storage.local.set({ enabled: enabledToggle.checked });
});

volumeSlider.addEventListener("input", (): void => {
  const volume = Number(volumeSlider.value) / 100;
  volumeValue.textContent = `${volumeSlider.value}%`;
  void chrome.storage.local.set({ volume });
});

testButton.addEventListener("click", (): void => {
  const volume = Number(volumeSlider.value) / 100;
  const audio = new Audio(chrome.runtime.getURL("fahhh.mp3"));
  audio.volume = Math.min(Math.max(volume, 0), 1);
  audio.play().catch((err: Error) => {
    volumeValue.textContent = `⚠ ${err.message}`;
  });
});

resetButton.addEventListener("click", (): void => {
  void chrome.storage.local.set({ rejections: 0, lastRejectionAt: null });
  void chrome.runtime.sendMessage({ type: "stats-reset" });
  renderStats({ rejections: 0, lastRejectionAt: null });
});

chrome.storage.onChanged.addListener((changes, areaName): void => {
  if (areaName !== "local") return;

  if (changes.rejections || changes.lastRejectionAt) {
    renderStats({
      rejections: (changes.rejections?.newValue as number | undefined) ?? 0,
      lastRejectionAt: (changes.lastRejectionAt?.newValue as number | null | undefined) ?? null,
    });
  }
});

void load();

export {};
