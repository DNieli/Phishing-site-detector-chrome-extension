export async function checkDomainForPhishing(url: string) {
  const response = await fetch(`https://phishing-site-detector-backend.diegoantonio-nieli.workers.dev?url=${encodeURIComponent(url)}`);

  const resultData = await response.json();
  console.log("VT ANALYSIS RESULT:", resultData);

  return resultData;
}
