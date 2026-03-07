import { VT_API_KEY } from "../config";

export async function checkDomainForPhishing(url: string) {
  const response = await fetch("https://www.virustotal.com/api/v3/urls", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-apikey": VT_API_KEY
    },
    body: `url=${encodeURIComponent(url)}`,
  });

  const data = await response.json();
  console.log("VT URL SUBMISSION RESPONSE:", data);

  if (!data.data?.id) {
    console.error("VirusTotal did not return analysis ID:", data);
    throw new Error("Missing analysis ID");
  }

  const analysisId = data.data.id;

  const resultResponse = await fetch(
    `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
    {
      headers: { "x-apikey": VT_API_KEY }
    }
  );

  const resultData = await resultResponse.json();
  console.log("VT ANALYSIS RESULT:", resultData);

  return resultData;
}
