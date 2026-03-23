import { checkDomainForPhishing } from "../utils/urlChecker";

console.log("BACKGROUND SERVICE WORKER LOADED");

const OPENPHISH_FEED_URL = "https://openphish.com/feed.txt";
const OPENPHISH_CACHE_KEY = "openphish_feed";
const OPENPHISH_TS_KEY = "openphish_ts";
const OPENPHISH_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Fetch and update the OpenPhish feed
async function updateOpenPhishFeed(): Promise<Set<string>> {
  try {
    const resp = await fetch(OPENPHISH_FEED_URL);
    if (!resp.ok) throw new Error(`OpenPhish returned ${resp.status}`);
    const text = await resp.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // Normalize feed entries to canonical URL (lowercase)
    const normalized = lines.map(extractHostname);
    const set = new Set(normalized);

    await chrome.storage.local.set({
      [OPENPHISH_CACHE_KEY]: Array.from(set),
      [OPENPHISH_TS_KEY]: Date.now(),
    });

    return set;
  } catch (err) {
      console.error("Failed to fetch OpenPhish:", err);
      const cached = await chrome.storage.local.get([OPENPHISH_CACHE_KEY]);
      return new Set((cached[OPENPHISH_CACHE_KEY] as string[]) || []);
  }
}

// Ensure feed is fresh 
async function getOpenPhishSet(): Promise<Set<string>> {
  const state = await chrome.storage.local.get([OPENPHISH_CACHE_KEY, OPENPHISH_TS_KEY]);
  const ts = state[OPENPHISH_TS_KEY] as number | undefined;
  const now = Date.now();

  if (!ts || now - ts > OPENPHISH_TTL_MS) {
    return updateOpenPhishFeed();
  }

  const arr = (state[OPENPHISH_CACHE_KEY] as string[]) || [];
  return new Set(arr.map((s) => extractHostname(s.toLowerCase())));
}

// checks the URL against OpenPhish feed
async function isInOpenPhish(rawUrl: string): Promise<boolean> {
  try {
    const feed = await getOpenPhishSet();
    const hostname = extractHostname(rawUrl);

    if (feed.has(hostname)) {
      console.warn("OPENPHISH HIT:", hostname);
      return true;
    }

    console.log("OpenPhish clean:", hostname);

    return false;
  } catch (err) {
    console.error("OpenPhish check failed:", err);
    return false;
  }
}

// map VirusTotal stats -> 0..100
function calculateVTScore(stats: {
  harmless?: number;
  malicious?: number;
  suspicious?: number;
  undetected?: number;
  timeout?: number;
}): number {
  const harmless = stats.harmless ?? 0;
  const malicious = stats.malicious ?? 0;
  const suspicious = stats.suspicious ?? 0;
  const undetected = stats.undetected ?? 0;
  const timeout = stats.timeout ?? 0;

  const total = harmless + malicious + suspicious + undetected + timeout;
  if (total === 0) return 0;

  const bad = malicious + suspicious;
  return Math.round((bad / total) * 100);
}

// Combine signals from VT score + OpenPhish boolean into final score 0..100
function combineScores(vtScore: number, inOpenPhish: boolean): number {
  if (inOpenPhish) {
    // If OpenPhish lists it push score to 85
    return Math.max(vtScore, 85);
  }
  return vtScore;
}

// De-fang URL for display
function deFangUrl(raw: string): string {
  return raw
    .replace(/^https?:\/\//i, (match) =>
      match.toLowerCase().startsWith("https") ? "hxxps://" : "hxxp://"
    )
    .replace(/\./g, "[.]");
}

// Extract hostname from URL
function extractHostname(raw: string): string {
  try {
    const u = new URL(raw.includes("://") ? raw : `http://${raw}`);
    return u.hostname.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function showPhishingNotification(url: string, score: number) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("icons/icon128.png"),
        title: "Malicious Website potentially detected",
        message: `URL: ${deFangUrl(url)}\nRisk Score: ${score}`
    })
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {

    // ignore cloudflare worker
    if (tab.url.includes("dash.cloudflare.com")) return;

    try {
      const result = await checkDomainForPhishing(tab.url);
      const stats = result?.data?.attributes?.stats ?? {};
      const vtMalicious = stats.malicious ?? 0;
      const vtScore = calculateVTScore(stats);

      console.log(`VT malicious count: ${vtMalicious}, VT score: ${vtScore}`);

      const openPhishHit = await isInOpenPhish(tab.url);
      console.log("OpenPhish hit:", openPhishHit);
      const finalScore = combineScores(vtScore, openPhishHit);


      // creates popup for user
      if (finalScore >= 3) {
        showPhishingNotification(tab.url, finalScore)
      }

      const payload = {
        type: "PHISHING_REPORT",
        url: tab.url,
        score: finalScore,
        vt: {
          maliciousCount: vtMalicious,
          rawStats: stats,
          vtScore
        },
        openphish: {
          hit: openPhishHit
        }
      };

      // store the last scan in chrome.storage
      await chrome.storage.local.set({
        lastScore: finalScore,
        lastUrl: deFangUrl(tab.url),
        lastVT: payload.vt,
        lastOpenPhish: payload.openphish
      }) 

      chrome.runtime.sendMessage(payload);

      console.log(`final score is ${finalScore}`);
    } catch (error) {
      console.error("Error checking domain:", error);
    }
  }
});
