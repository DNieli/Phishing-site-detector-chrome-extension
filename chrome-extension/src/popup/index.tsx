import { useEffect, useState } from "react";
import "../global.css";
import { ScoreCircle } from "./components/ScoreCircle";
import type { VirusTotalCheckResult, VirusTotalStats } from "../utils/urlChecker";

type PopupVirusTotalState = Pick<
  VirusTotalCheckResult,
  "status" | "maliciousCount" | "message" | "submitted" | "source"
> & {
  rawStats: VirusTotalStats | null;
  vtScore: number;
};

interface PopupDetails {
  url?: string;
  vt?: PopupVirusTotalState;
  openphish?: {
    hit: boolean;
  };
}

interface PhishingReportMessage {
  type: string;
  score: number;
  url: string;
  vt: PopupVirusTotalState;
  openphish: {
    hit: boolean;
  };
}

export const Popup = () => {
  const [score, setScore] = useState(0);
  const [details, setDetails] = useState<PopupDetails | null>(null);

  useEffect(() => {
    chrome.storage.local.get(
      ["lastScore", "lastVT", "lastOpenPhish", "lastUrl"],
      (result) => {
        if (result.lastScore !== undefined) {
          setScore(result.lastScore);
          setDetails({
            vt: result.lastVT,
            openphish: result.lastOpenPhish,
            url: result.lastUrl,
          });
        }
      }
    );

    const handleMessage = (message: PhishingReportMessage) => {
      if (message.type === "PHISHING_REPORT") {
        setScore(message.score);
        setDetails({
          vt: message.vt,
          openphish: message.openphish,
          url: message.url,
        });
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const getMessage = (currentScore: number, currentDetails: PopupDetails | null) => {
    if (currentDetails?.openphish?.hit) {
      return "High risk! This site is listed in OpenPhish.";
    }

    if (currentScore >= 3) {
      return "High risk! This might be a phishing site.";
    }

    if (currentScore > 0) {
      return "Some risk signals were detected.";
    }

    if (currentDetails?.vt?.status === "pending") {
      return "VirusTotal analysis is pending. OpenPhish checks are still active.";
    }

    if (currentDetails?.vt?.status === "missing_key") {
      return "VirusTotal is not configured. OpenPhish checks are still active.";
    }

    if (currentDetails?.vt?.status === "quota_limited") {
      return "VirusTotal is rate-limited right now. OpenPhish checks are still active.";
    }

    if (currentDetails?.vt?.status === "error") {
      return "VirusTotal is temporarily unavailable. OpenPhish checks are still active.";
    }

    return "This URL seems clean.";
  };

  const getVirusTotalStatusText = (virusTotal: PopupVirusTotalState | undefined) => {
    if (!virusTotal) return null;

    if (virusTotal.status === "available") {
      return `VirusTotal malicious reports: ${virusTotal.maliciousCount}`;
    }

    if (virusTotal.status === "pending") {
      return virusTotal.message ?? "VirusTotal scan is pending.";
    }

    if (virusTotal.status === "missing_key") {
      return "VirusTotal disabled: add VT_API_KEY to your .env file and rebuild.";
    }

    return virusTotal.message ?? "VirusTotal is currently unavailable.";
  };

  const virusTotalStatus = getVirusTotalStatusText(details?.vt);

  return (
    <div className="text-xl p-10 font-extrabold flex flex-col items-center justify-center gap-5 bg-sky-200 border-sky-400 border-2 text-sky-700">
      <div className="mb-4">Phishing site detector</div>
      <ScoreCircle score={score} />
      <div className="text-center">{getMessage(score, details)}</div>

      {details && (
        <div className="text-sm text-center font-normal mt-2">
          {details.url && <div>URL: {details.url}</div>}
          {details.openphish?.hit && <div>Listed in OpenPhish</div>}
          {virusTotalStatus && <div>{virusTotalStatus}</div>}
        </div>
      )}
    </div>
  );
};
