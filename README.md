<div align="center">
  <h1>Rejected.exe</h1>
  <p><em>Gets rejected? We make it worse.</em></p>
  <p>A mildly sadistic Chrome extension that watches your Gmail for rejection emails and automatically plays the "fahhhh" sound effect to rub salt in the wound.</p>
</div>

<br />

## Features

- **Automated Masochism**: Instantly detects when you open an email containing typical rejection phrases (e.g., "unfortunately", "not moving forward", "other candidates").
- **Custom Sound**: Automatically blasts the soul-crushing "fahhhh" sound to ensure everyone in the room knows you failed.
- **Test Button**: Includes an extension popup to test the sound whenever you need a quick reminder of failure.
- **Smart Detection**: Waits for the email body to render and uses multiple fallback selectors to ensure Gmail's DOM doesn't hide the pain.

## Installation (Load Unpacked)

Since this is strictly for personal suffering, it's not on the Chrome Web Store.

1. **Clone the repository**:

   ```bash
   git clone https://github.com/silky-x0/Rejected.exe.git
   cd Rejected.exe
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Build the extension**:

   ```bash
   npm run build
   ```

   > This compiles the TypeScript into the `dist/` directory.

4. **Load into Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** in the top right corner.
   - Click **"Load unpacked"** in the top left.
   - Select the `dist/` folder inside the `Rejected.exe` repository.

5. **Pin it**:
   - Click the puzzle piece icon in Chrome and pin **Rejection Sound Alert**.
   - Click the extension icon to test the sound manually!

## How It Works

- **Manifest V3**: Built using modern Chrome extension standards.
- **No Offscreen Shenanigans**: Bypasses Gmail's Content Security Policy (which blocks `new Audio('chrome-extension://')`) by dynamically fetching the MP3 as a Blob and playing it via an internal ObjectURL.
- **Webpack pipeline**: Bundles `src/content.ts`, `src/popup.ts`, and `src/bg.ts` alongside copied static assets from `public/`.

##  Project Structure

```text
Rejected.exe/
├── manifest.json       # Extension configuration (Manifest V3)
├── webpack.config.js   # Build pipeline configuration
├── public/             # Static assets (MP3s, HTML)
│   ├── popup.html      # The UI of the extension popup
│   └── fahhh.mp3       # The sound of failure (re-encoded for Chrome support)
└── src/                # TypeScript source files
    ├── content.ts      # Gmail detection & audio playback script
    ├── popup.ts        # Popup button logic
    └── bg.ts           # Service worker background script
```

## Modifying the Keywords

Want to add more rejection phrases to trigger the sound?
Open `src/content.ts` and modify the `REJECTION_KEYWORDS` array at the very top:

```typescript
const REJECTION_KEYWORDS: string[] = [
  "we regret to inform",
  "not moving forward",
  "we have decided to move forward with other candidates",
  "unfortunately, we",
  "not selected",
  "after careful consideration",
  /* Add your custom pain here */
];
```

_Don't forget to run `npm run build` again and refresh the extension in Chrome!_

## License

ISC License. Enjoy the misery.
