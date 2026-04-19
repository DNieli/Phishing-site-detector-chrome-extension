const VT_API_BASE_URL = "https://www.virustotal.com/api/v3";
const VT_CACHE_PREFIX = "vt_cache:";
const VT_AVAILABLE_TTL_MS = 6 * 60 * 60 * 1000;
const VT_PENDING_TTL_MS = 15 * 60 * 1000;
const VT_ERROR_TTL_MS = 5 * 60 * 1000;

export type VirusTotalStatus =
  | "available"
  | "pending"
  | "missing_key"
  | "quota_limited"
  | "error";

export interface VirusTotalStats {
  harmless: number;
  malicious: number;
  suspicious: number;
  undetected: number;
  timeout: number;
}

export interface VirusTotalCheckResult {
  status: VirusTotalStatus;
  urlId: string;
  checkedAt: number;
  source: "live" | "cache";
  maliciousCount: number;
  stats: VirusTotalStats | null;
  message?: string;
  submitted?: boolean;
}

interface VirusTotalCacheEntry {
  expiresAt: number;
  result: VirusTotalCheckResult;
}

function getVirusTotalApiKey(): string | undefined {
  const vt_key = import.meta.env.VT_API_KEY?.trim();

  if (!vt_key) {
    console.warn(
      "VT_API_KEY is not set. Please add VT_API_KEY to your local .env file."
    );
  }

  return vt_key || undefined;
}

function getCacheKey(urlId: string) {
  return `${VT_CACHE_PREFIX}${urlId}`;
}

function getTtlForStatus(status: VirusTotalStatus) {
  if (status === "available") return VT_AVAILABLE_TTL_MS;
  if (status === "pending") return VT_PENDING_TTL_MS;
  if (status === "quota_limited" || status === "error") return VT_ERROR_TTL_MS;

  return 0;
}

function getNumericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeStats(stats: unknown): VirusTotalStats | null {
  if (!stats || typeof stats !== "object") return null;

  const source = stats as Record<string, unknown>;
  const hasKnownStat = [
    source.harmless,
    source.malicious,
    source.suspicious,
    source.undetected,
    source.timeout,
  ].some((value) => typeof value === "number");

  if (!hasKnownStat) return null;

  return {
    harmless: getNumericValue(source.harmless),
    malicious: getNumericValue(source.malicious),
    suspicious: getNumericValue(source.suspicious),
    undetected: getNumericValue(source.undetected),
    timeout: getNumericValue(source.timeout),
  };
}

function createResult(
  status: VirusTotalStatus,
  urlId: string,
  overrides: Partial<Omit<VirusTotalCheckResult, "status" | "urlId">> = {}
): VirusTotalCheckResult {
  return {
    status,
    urlId,
    checkedAt: overrides.checkedAt ?? Date.now(),
    source: overrides.source ?? "live",
    maliciousCount: overrides.maliciousCount ?? 0,
    stats: overrides.stats ?? null,
    message: overrides.message,
    submitted: overrides.submitted,
  };
}

async function getCachedResult(urlId: string): Promise<VirusTotalCheckResult | null> {
  const cacheKey = getCacheKey(urlId);
  const cacheState = await chrome.storage.local.get(cacheKey);
  const cachedEntry = cacheState[cacheKey] as VirusTotalCacheEntry | undefined;

  if (!cachedEntry) return null;
  if (cachedEntry.expiresAt <= Date.now()) {
    await chrome.storage.local.remove(cacheKey);
    return null;
  }

  return {
    ...cachedEntry.result,
    source: "cache",
  };
}

async function cacheResult(result: VirusTotalCheckResult) {
  const ttl = getTtlForStatus(result.status);

  if (!ttl) return;

  const cacheKey = getCacheKey(result.urlId);
  const entry: VirusTotalCacheEntry = {
    expiresAt: Date.now() + ttl,
    result: {
      ...result,
      source: "live",
    },
  };

  await chrome.storage.local.set({
    [cacheKey]: entry,
  });
}

function encodeUrlIdentifier(url: string) {
  const bytes = new TextEncoder().encode(url);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getRequestHeaders(apiKey: string) {
  return {
    "x-apikey": apiKey,
  };
}

async function submitUrlForScan(
  url: string,
  urlId: string,
  apiKey: string
): Promise<VirusTotalCheckResult> {
  const response = await fetch(`${VT_API_BASE_URL}/urls`, {
    method: "POST",
    headers: {
      ...getRequestHeaders(apiKey),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      url,
    }),
  });

  if (response.ok) {
    return createResult("pending", urlId, {
      message: "VirusTotal scan submitted. Results are pending.",
      submitted: true,
    });
  }

  if (response.status === 429) {
    return createResult("quota_limited", urlId, {
      message: "VirusTotal rate limit reached. Using OpenPhish only for now.",
    });
  }

  if (response.status === 401 || response.status === 403) {
    return createResult("error", urlId, {
      message: "VirusTotal rejected the configured API key.",
    });
  }

  return createResult("error", urlId, {
    message: `VirusTotal scan submission failed (${response.status}).`,
  });
}

function normalizeAvailableResult(
  urlId: string,
  stats: VirusTotalStats
): VirusTotalCheckResult {
  return createResult("available", urlId, {
    stats,
    maliciousCount: stats.malicious,
  });
}

export async function checkDomainForPhishing(
  url: string
): Promise<VirusTotalCheckResult> {
  const apiKey = getVirusTotalApiKey();
  const urlId = encodeUrlIdentifier(url);

  if (!apiKey) {
    return createResult("missing_key", urlId, {
      message: "VirusTotal is not configured. Add VT_API_KEY to your local .env file.",
    });
  }

  const cached = await getCachedResult(urlId);
  if (cached) return cached;

  try {
    const response = await fetch(`${VT_API_BASE_URL}/urls/${urlId}`, {
      headers: getRequestHeaders(apiKey),
    });

    if (response.ok) {
      const responseData = await response.json();
      const attributes = responseData?.data?.attributes;
      const stats = normalizeStats(attributes?.last_analysis_stats);

      if (stats) {
        const result = normalizeAvailableResult(urlId, stats);
        await cacheResult(result);
        return result;
      }

      const analysisStatus =
        typeof attributes?.last_analysis_status === "string"
          ? attributes.last_analysis_status
          : "";

      const pendingResult = createResult("pending", urlId, {
        message:
          analysisStatus && analysisStatus !== "completed"
            ? "VirusTotal already knows this URL, but analysis is still pending."
            : "VirusTotal does not have a completed report yet.",
      });

      await cacheResult(pendingResult);
      return pendingResult;
    }

    if (response.status === 404) {
      const pendingResult = await submitUrlForScan(url, urlId, apiKey);
      await cacheResult(pendingResult);
      return pendingResult;
    }

    if (response.status === 429) {
      const rateLimitedResult = createResult("quota_limited", urlId, {
        message: "VirusTotal rate limit reached. Using OpenPhish only for now.",
      });

      await cacheResult(rateLimitedResult);
      return rateLimitedResult;
    }

    if (response.status === 401 || response.status === 403) {
      const invalidKeyResult = createResult("error", urlId, {
        message: "VirusTotal rejected the configured API key.",
      });

      await cacheResult(invalidKeyResult);
      return invalidKeyResult;
    }

    const errorResult = createResult("error", urlId, {
      message: `VirusTotal lookup failed (${response.status}).`,
    });

    await cacheResult(errorResult);
    return errorResult;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "VirusTotal could not be reached from the extension.";
    const errorResult = createResult("error", urlId, {
      message,
    });

    await cacheResult(errorResult);
    return errorResult;
  }
}
