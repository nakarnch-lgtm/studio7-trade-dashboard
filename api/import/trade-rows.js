/**
 * Adapter: proxy TechTrade GET /api/v2/trades
 * แปลง { count, data } → { rows, rowCount, dateRange } ที่ dashboard คาดหวัง
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    var apiKey = process.env.REPORT_TRADE_API_KEY || process.env.TECHTRADE_API_KEY || 'techtrade_pro_secret_2026';
    var target = new URL('https://report-trade.vercel.app/api/v2/trades');

    var host = req.headers.host || 'localhost';
    var urlObj = new URL(req.url || '/', 'http://' + host);
    var params = urlObj.searchParams;
    ['zone', 'branch', 'start_date', 'end_date', 'limit'].forEach(function(k) {
      if (params.has(k)) target.searchParams.set(k, params.get(k));
    });

    var upstream = await fetch(target.toString(), {
      headers: { 'X-API-Key': apiKey, Accept: 'application/json' }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream error: ' + upstream.status });
    }

    var data = await upstream.json();
    var rows = data.data || [];
    var rowCount = typeof data.count === 'number' ? data.count : rows.length;

    var dates = rows.map(function(r) { return r.document_date; }).filter(Boolean).sort();
    var dateRange = dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null;

    return res.json({ rows: rows, rowCount: rowCount, dateRange: dateRange });
  } catch (err) {
    console.error('trade-rows proxy error:', err.message);
    return res.status(500).json({ error: err.message || 'proxy error' });
  }
};
