/**
 * Proxy: TechTrade GET /api/v2/trades
 * Query params: zone, branch, start_date, end_date, limit (forwarded upstream)
 */
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const host = req.headers.host || "localhost";
    const urlObj = new URL(req.url || "/", "http://" + host);
    const params = urlObj.searchParams;
    const target = new URL("https://report-trade.vercel.app/api/v2/trades");
    ["zone", "branch", "start_date", "end_date", "limit"].forEach(function (k) {
      if (params.has(k)) target.searchParams.set(k, params.get(k));
    });
    var apiKey =
      process.env.REPORT_TRADE_API_KEY ||
      process.env.TECHTRADE_API_KEY ||
      "techtrade_pro_secret_2026";
    var upstream = await fetch(target.toString(), {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
    });
    var text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.send(text);
  } catch (err) {
    console.error("trade-rows proxy:", err.message || err);
    return res.status(500).json({ error: err.message || "proxy error" });
  }
};
