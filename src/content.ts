const REJECTION_KEYWORDS: string[] = [
  "we regret to inform",
  "not moving forward",
  "we have decided to move forward with other candidates",
  "unfortunately, we",
  "not selected",
  "after careful consideration",
  "position has been filled",
  "we will not be proceeding",
  "not a match",
  "we won't be moving forward",
  "thank you for your interest, however",
  "we've decided to pursue other candidates",
];

let lastCheckedIdentifier: string | null = null;

function getEmailBody(): string | null {
  const selectors = [".a3s.aiL", ".a3s", ".ii.gt"];
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el.innerText.trim().length > 0) {
      return el.innerText.toLowerCase();
    }
  }
  return null;
}

function getEmailSubject(): string | null {
  const selectors = ["h2.hP", ".ha h2", "h2[data-thread-perm-id]"];
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el.innerText.trim().length > 0) {
      return el.innerText.toLowerCase();
    }
  }
  return null;
}

function isRejection(text: string): boolean {
  return REJECTION_KEYWORDS.some((keyword) => text.includes(keyword));
}

// Fetch MP3 as blob and play via blob URL to bypass Gmail CSP
async function playSound(): Promise<void> {
  try {
    const url = chrome.runtime.getURL("fahhh.mp3");
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const audio = new Audio(blobUrl);
    audio.volume = 1.0;
    await audio.play();
    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(blobUrl);
    });
    console.log("[Rejected.exe] 🔊 Sound playing!");
  } catch (err) {
    console.error("[Rejected.exe] Couldn't play sound:", err);
  }
}

function checkEmail(): void {
  const body = getEmailBody();
  const subject = getEmailSubject();

  console.log("[Rejected.exe] Checking...", {
    hasBody: !!body,
    hasSubject: !!subject,
    bodyPreview: body?.slice(0, 80),
  });

  if (!body) return;

  const identifier = `${subject ?? ""}::${body.slice(0, 120)}`;
  if (identifier === lastCheckedIdentifier) return;
  lastCheckedIdentifier = identifier;

  const fullText = `${subject ?? ""} ${body}`;

  if (isRejection(fullText)) {
    console.log("[Rejected.exe] Rejection detected!");
    playSound();
  } else {
    console.log("[Rejected.exe] No rejection keywords found.");
  }
}

function scheduleChecks(): void {
  checkEmail();
  setTimeout(checkEmail, 500);
  setTimeout(checkEmail, 1500);
  setTimeout(checkEmail, 3000);
}

let lastUrl: string = location.href;

const observer = new MutationObserver((): void => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    lastCheckedIdentifier = null;
    console.log("[Rejected.exe] URL changed, scanning...");
    scheduleChecks();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

console.log("[Rejected.exe] Content script loaded on Gmail.");
scheduleChecks();
