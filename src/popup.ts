document.getElementById("testBtn")?.addEventListener("click", (): void => {
  const soundUrl: string = chrome.runtime.getURL("fahhh.mp3");
  const audio = new Audio(soundUrl);
  audio.play().catch((err: Error) => {
    alert(`Couldn't play sound: ${err.message}`);
  });
});
