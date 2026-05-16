/**
 * Proxy: TechTrade GET /api/v2/stats
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
    var apiKey =
      process.env.REPORT_TRADE_API_KEY ||
      process.env.TECHTRADE_API_KEY ||
      "techtrade_pro_secret_2026";
    var upstream = await fetch("https://report-trade.vercel.app/api/v2/stats", {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
    });
    var text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.send(text);
  } catch (err) {
    console.error("trade-stats proxy:", err.message || err);
    return res.status(500).json({ error: err.message || "proxy error" });
  }
};
