export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    console.log(target);

    if (!target) {
      return new Response("Missing url parameter", { status: 400 });
    }

    // Submit URL to VirusTotal
    const submit = await fetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-apikey": env.VT_API_KEY
      },
      body: `url=${encodeURIComponent(target)}`
    });

    const submitData = await submit.json();
    const analysisId = submitData.data.id;

    // Get analysis result
    const result = await fetch(
      `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
      {
        headers: {
          "x-apikey": env.VT_API_KEY
        }
      }
    );

    const resultData = await result.json();

    return Response.json(resultData);
  }
};