var { Pool } = require('pg');

var pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
        ? false
        : { rejectUnauthorized: false }
    });
  }
  return pool;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: 'DATABASE_URL not configured' });
  }

  try {
    var client = await getPool().connect();
    try {
      var result = await client.query(
        'SELECT raw_row, doc_date FROM trade_rows ORDER BY doc_date'
      );
      var rows = result.rows;
      return res.json({
        rows: rows.map(function(r) { return r.raw_row; }),
        rowCount: rows.length,
        dateRange: rows.length
          ? { from: rows[0].doc_date, to: rows[rows.length - 1].doc_date }
          : null
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('trade-rows error:', err.message);
    return res.status(500).json({ error: err.message || 'DB error' });
  }
};
