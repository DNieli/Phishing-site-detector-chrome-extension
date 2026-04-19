# Phishing Site Detector Chrome Extension

A Chrome extension that checks visited URLs for phishing risk using:

- OpenPhish for feed-based phishing hits
- VirusTotal for URL reputation and scanner verdicts

The extension now runs locally without a hosted backend. Each user builds their own unpacked extension with their own local VirusTotal API key.

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- Google Chrome
- A VirusTotal API key

### Install

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create a local env file from the example:

```bash
copy .env.example .env
```

4. Add your VirusTotal API key to `.env`:

```env
VT_API_KEY=your_virustotal_api_key
```

5. Build the extension:

```bash
npm run build
```

6. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable `Developer mode`
   - Click `Load unpacked`
   - Select the `dist` folder

## How It Works

- The background service worker scans completed `http` and `https` tab navigations.
- OpenPhish data is cached locally in `chrome.storage.local`.
- VirusTotal lookups are requested directly from the extension using the local API key.
- VirusTotal results are cached locally by URL identifier to reduce repeated API calls and avoid burning through the public quota too quickly.
- If VirusTotal is unavailable, the extension still falls back to OpenPhish and surfaces the partial-status message in the popup.

## Environment Variables

### Supported

```env
VT_API_KEY=
```

## Development Notes

- Main extension logic lives in [chrome-extension/src/background/index.ts](./chrome-extension/src/background/index.ts)
- VirusTotal integration and caching live in [chrome-extension/src/utils/urlChecker.ts](./chrome-extension/src/utils/urlChecker.ts)
- The popup UI lives in [chrome-extension/src/popup/index.tsx](./chrome-extension/src/popup/index.tsx)

## Limitations

- VirusTotal public/community API quotas are limited, so repeated browsing can temporarily rate-limit VT checks.
- This tool is a helpful signal, not a guarantee. Always verify suspicious sites with multiple sources before trusting them.
