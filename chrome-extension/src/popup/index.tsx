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
    const requestRefresh = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeUrl = tabs[0]?.url;
        if (!activeUrl) return;

        chrome.runtime.sendMessage({
          type: "REFRESH_PHISHING_REPORT",
          url: activeUrl,
        });
      });
    };

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

    requestRefresh();

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
    const refreshInterval = window.setInterval(() => {
      if (details?.vt?.status === "pending") {
        requestRefresh();
      }
    }, 10000);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      window.clearInterval(refreshInterval);
    };
  }, [details?.vt?.status]);

  const getMessage = (currentScore: number, currentDetails: PopupDetails | null) => {
    if (!currentDetails) {
      return "Open a page and we will show its latest phishing scan here.";
    }

    if (currentDetails?.openphish?.hit) {
      return "High risk! This site is listed in OpenPhish.";
    }

    if (currentScore >= 3) {
      return "High risk! This might be a phishing site.";
    }

    if (currentScore > 0) {
      return "Some risk signals were detected.";
    }

    return "No risk signals were detected.";
  };

  const getVirusTotalStatusText = (virusTotal: PopupVirusTotalState | undefined) => {
    if (!virusTotal) return null;

    if (virusTotal.status === "available") {
      return `VirusTotal malicious reports: ${virusTotal.maliciousCount}`;
    }

    return null;
  };

  const getRiskTone = (currentScore: number, currentDetails: PopupDetails | null) => {
    if (currentDetails?.openphish?.hit || currentScore >= 3) {
      return {
        label: "High risk",
        scoreTone: "danger" as const,
        accentClass: "from-sky-400 via-blue-500 to-indigo-700",
        labelClass: "text-sky-200",
        chipClass: "border-sky-400/30 bg-sky-400/10 text-sky-100",
      };
    }

    if (currentScore > 0) {
      return {
        label: "Signals found",
        scoreTone: "warning" as const,
        accentClass: "from-cyan-300 via-blue-500 to-blue-700",
        labelClass: "text-cyan-200",
        chipClass: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
      };
    }

    return {
      label: "Looks safe",
      scoreTone: "safe" as const,
      accentClass: "from-cyan-200 via-sky-400 to-blue-700",
      labelClass: "text-cyan-100",
      chipClass: "border-blue-300/30 bg-blue-300/10 text-blue-50",
    };
  };

  const virusTotalStatus = getVirusTotalStatusText(details?.vt);
  const riskTone = getRiskTone(score, details);

  return (
    <div className="relative min-h-[440px] overflow-hidden rounded-[24px] border border-white/10 bg-[#061326] p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.22),_transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(148,163,184,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.45)_1px,transparent_1px)] [background-size:22px_22px]" />

      <div className="relative flex min-h-[408px] flex-col gap-4 rounded-[20px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_22px_60px_rgba(2,6,23,0.52)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-sky-200/70">
              Realtime URL Check
            </div>
            <h1 className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.05em] text-slate-50">
              Phishing Site
              <br />
              Detector
            </h1>
          </div>

          <div
            className={`inline-flex min-w-[108px] items-center justify-center rounded-xl border px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.22em] ${riskTone.chipClass}`}
          >
            {riskTone.label}
          </div>
        </div>

        <div className={`rounded-[20px] bg-gradient-to-br ${riskTone.accentClass} p-[1px]`}>
          <div className="rounded-[19px] bg-[#071424]/95 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-400">
                  Current assessment
                </div>
                <p className="mt-3 text-[26px] font-semibold leading-[1.04] tracking-[-0.05em] text-white">
                  {getMessage(score, details)}
                </p>
              </div>

              <div className="shrink-0 rounded-[18px] border border-white/10 bg-[#0a1e39] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <ScoreCircle score={score} size={104} strokeWidth={9} tone={riskTone.scoreTone} />
              </div>
            </div>

            <div className="mt-4 h-px w-full bg-gradient-to-r from-sky-300/35 via-white/10 to-transparent" />

            <div className="mt-4">
              <div className="rounded-[14px] border border-white/8 bg-white/[0.04] px-3 py-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Source mix
                </div>
                <div className="mt-2 text-sm font-medium text-slate-200">
                  OpenPhish + VirusTotal
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="rounded-[18px] border border-white/10 bg-[#09192f] p-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-400">
            Latest scan
          </div>

          <div className="mt-3 space-y-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                URL
              </div>
              <div className="mt-2 break-all rounded-[13px] border border-sky-400/20 bg-[#061120] px-3 py-2 font-mono text-xs leading-5 text-sky-50">
                {details?.url ?? "No page scanned yet"}
              </div>
            </div>

            {virusTotalStatus && (
              <div className="rounded-[13px] border border-white/8 bg-[#071424] px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  VirusTotal details
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-200">
                  {virusTotalStatus}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
