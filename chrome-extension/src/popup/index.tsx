import { useEffect, useState } from "react";
import "../global.css";
import { ScoreCircle } from "./components/ScoreCircle";

export const Popup = () => {
  const [score, setScore] = useState(0);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    // load last scan
    chrome.storage.local.get(
      ["lastScore", "lastVT", "lastOpenPhish", "lastUrl"],
      (result) => {
        if (result.lastScore !== undefined) {
          setScore(result.lastScore);
          setDetails({
            vt: result.lastVT,
            openphish: result.lastOpenPhish,
            url: result.lastUrl
          });
        }   
      }
    )

    // listen for messages while popup is open
    const handleMessage = (message: any) => {
        if (message.type === "PHISHING_REPORT") {
          setScore(message.score);
          setDetails({
            vt: message.vt,
            openphish: message.openphish,
            url: message.url
          });
        }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const getMessage = (score: number) => {
    if (score === 0) return "This URL seems clean.";
    if (score === 1) return "Low risk detected.";
    if (score === 2) return "Some warnings found.";
    return "High risk! This might be a phishing site.";
  };

  return (
    <div className="text-xl p-10 font-extrabold flex flex-col items-center justify-center gap-5 bg-sky-200 border-sky-400 border-2 text-sky-700">
      <div className="mb-4">Phishing site detector</div>
      <ScoreCircle score={score} />
      <div className="text-center">{getMessage(score)}</div>

      {details && (
        <div className="text-sm text-center font-normal mt-2">
          {details.url && 
          (
            <div>URL: {details.url}</div>
          )}
          {details.openphish?.hit && (
            <div>Listed in OpenPhish</div>
          )}
          {details.vt && (
            <div>VirusTotal malicious reports: {details.vt.maliciousCount}</div>
          )}
        </div>
      )}
    </div>
  );
};
