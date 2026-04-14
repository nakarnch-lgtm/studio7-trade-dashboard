const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 10;
const ipHits = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

function sanitizeBranch(b) {
  if (!b || typeof b !== "object") return null;
  return {
    name: String(b.name || "").slice(0, 100),
    att: Math.max(0, Math.min(999, Number(b.att) || 0)),
    agreed: Math.max(0, Math.min(99999, Number(b.agreed) || 0)),
    sold: Math.max(0, Math.min(99999, Number(b.sold) || 0)),
  };
}

function validateData(data) {
  if (!data || typeof data !== "object") return null;
  var top3Raw = Array.isArray(data.top3) ? data.top3.slice(0, 3) : [];
  var lowRaw = Array.isArray(data.lowBranches) ? data.lowBranches.slice(0, 50) : [];
  return {
    filterContext: String(data.filterContext || "").slice(0, 200),
    overallATT: Math.max(0, Math.min(999, Number(data.overallATT) || 0)),
    totalSold: Math.max(0, Math.min(999999, Number(data.totalSold) || 0)),
    totalAgreed: Math.max(0, Math.min(999999, Number(data.totalAgreed) || 0)),
    totalEvaluated: Math.max(0, Math.min(999999, Number(data.totalEvaluated) || 0)),
    branchCount: Math.max(0, Math.min(9999, Number(data.branchCount) || 0)),
    top3: top3Raw.map(sanitizeBranch).filter(Boolean),
    lowBranches: lowRaw.map(sanitizeBranch).filter(Boolean),
    period: String(data.period || "").slice(0, 100),
  };
}

var SYSTEM_PROMPT = "\u0E04\u0E38\u0E13\u0E40\u0E1B\u0E47\u0E19 ASM (Area Sales Manager) \u0E02\u0E2D\u0E07 Studio7 \u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E44\u0E17\u0E22 \u0E1C\u0E39\u0E49\u0E40\u0E0A\u0E35\u0E48\u0E22\u0E27\u0E0A\u0E32\u0E0D\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E22\u0E2D\u0E14\u0E02\u0E32\u0E22\u0E41\u0E25\u0E30 Trade-In \u0E02\u0E2D\u0E07 Apple Products\n\n\u0E04\u0E38\u0E13\u0E15\u0E49\u0E2D\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E23\u0E38\u0E1B\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22\u0E17\u0E35\u0E48 copy \u0E44\u0E1B\u0E27\u0E32\u0E07 LINE \u0E44\u0E14\u0E49\u0E2A\u0E27\u0E22\u0E17\u0E31\u0E19\u0E17\u0E35\n\n\u0E01\u0E0E\u0E2A\u0E33\u0E04\u0E31\u0E0D:\n- \u0E43\u0E0A\u0E49 ** \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E40\u0E19\u0E49\u0E19 (LINE \u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A bold \u0E14\u0E49\u0E27\u0E22 **)\n- \u0E43\u0E0A\u0E49 emoji \u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D: \uD83D\uDCCA \u0E2A\u0E23\u0E38\u0E1B, \uD83C\uDFC6 Top 3, \u26A0\uFE0F \u0E2A\u0E32\u0E02\u0E32\u0E15\u0E48\u0E33, \uD83D\uDE80 Action\n- \u0E43\u0E0A\u0E49 \uD83D\uDC49 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A insight \u0E2B\u0E23\u0E37\u0E2D\u0E08\u0E38\u0E14\u0E40\u0E14\u0E48\u0E19\n- \u0E43\u0E0A\u0E49 * \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A bullet points\n- \u0E43\u0E0A\u0E49\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E25\u0E33\u0E14\u0E31\u0E1A (1. 2. 3.)\n- \u0E01\u0E23\u0E30\u0E0A\u0E31\u0E1A \u0E15\u0E23\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E14\u0E47\u0E19 \u0E2D\u0E48\u0E32\u0E19\u0E07\u0E48\u0E32\u0E22\n- \u0E2B\u0E49\u0E32\u0E21\u0E43\u0E0A\u0E49 markdown \u0E2D\u0E37\u0E48\u0E19\u0E40\u0E0A\u0E48\u0E19 # \u0E2B\u0E23\u0E37\u0E2D --- \u0E2B\u0E23\u0E37\u0E2D ```\n- \u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 Section \"Action \u0E44\u0E25\u0E48\u0E22\u0E2D\u0E14\" \u0E17\u0E35\u0E48\u0E21\u0E35\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33\u0E40\u0E0A\u0E34\u0E07\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E08\u0E23\u0E34\u0E07\u0E46 \u0E23\u0E27\u0E21\u0E16\u0E36\u0E07 Script \u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E32\u0E22\n\n\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23 (\u0E2B\u0E49\u0E32\u0E21\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07):\n\n\uD83D\uDCCA **\u0E2A\u0E23\u0E38\u0E1B\u0E2A\u0E16\u0E32\u0E19\u0E01\u0E32\u0E23\u0E13\u0E4C Trade-in \u0E42\u0E0B\u0E19 [\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E0B\u0E19/AM] ([\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32])**\n\n\u0E20\u0E32\u0E1E\u0E23\u0E27\u0E21\u0E42\u0E0B\u0E19\u0E15\u0E2D\u0E19\u0E19\u0E35\u0E49\n\n* ATT \u0E2D\u0E22\u0E39\u0E48\u0E17\u0E35\u0E48 **X%**\n* \u0E15\u0E01\u0E25\u0E07\u0E40\u0E17\u0E23\u0E14 **X / X \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 (~X%)**\n  \uD83D\uDC49 [insight \u0E2A\u0E31\u0E49\u0E19\u0E46 \u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E01\u0E31\u0E1A conversion rate]\n\n\uD83C\uDFC6 **Top 3 \u0E2A\u0E32\u0E02\u0E32**\n\n1. [\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E02\u0E32] \u2013 X%\n2. [\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E02\u0E32] \u2013 X%\n3. [\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E02\u0E32] \u2013 X%\n  \uD83D\uDC49 \u0E08\u0E38\u0E14\u0E40\u0E14\u0E48\u0E19: [\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E2A\u0E31\u0E49\u0E19\u0E46 \u0E27\u0E48\u0E32\u0E17\u0E33\u0E44\u0E21\u0E40\u0E01\u0E48\u0E07]\n\n\u26A0\uFE0F **\u0E2A\u0E32\u0E02\u0E32\u0E17\u0E35\u0E48\u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32 15% (\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E48\u0E07\u0E14\u0E48\u0E27\u0E19)**\n\n* [\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E02\u0E32] \u2013 X%\n* [\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E02\u0E32] \u2013 X%\n[... \u0E17\u0E38\u0E01\u0E2A\u0E32\u0E02\u0E32\u0E17\u0E35\u0E48\u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32 15%]\n\n\uD83D\uDC49 Insight: [\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E2A\u0E32\u0E40\u0E2B\u0E15\u0E38\u0E2A\u0E31\u0E49\u0E19\u0E46]\n\n\uD83D\uDE80 **Action \u0E44\u0E25\u0E48\u0E22\u0E2D\u0E14 (\u0E42\u0E1F\u0E01\u0E31\u0E2A\u0E17\u0E31\u0E19\u0E17\u0E35)**\n\n1. [\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33\u0E40\u0E0A\u0E34\u0E07\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E02\u0E49\u0E2D 1]\n2. \u0E43\u0E0A\u0E49 Script \u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19\u0E17\u0E31\u0E49\u0E07\u0E42\u0E0B\u0E19\n   \"[\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07 script \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E40\u0E2A\u0E19\u0E2D trade-in \u0E43\u0E2B\u0E49\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32]\"\n3. [\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33\u0E02\u0E49\u0E2D 3]\n4. [\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33\u0E02\u0E49\u0E2D 4]";

function buildPrompt(data) {
  var filterContext = data.filterContext;
  var overallATT = data.overallATT;
  var totalSold = data.totalSold;
  var totalAgreed = data.totalAgreed;
  var totalEvaluated = data.totalEvaluated;
  var branchCount = data.branchCount;
  var top3 = data.top3;
  var lowBranches = data.lowBranches;
  var period = data.period;
  var conversionRate = totalEvaluated > 0 ? Math.round((totalAgreed / totalEvaluated) * 100) : 0;

  var prompt = "สร้างข้อความสรุป Trade-In ตาม template ที่กำหนดไว้ใน system prompt\n\n";
  prompt += "ข้อมูล:\n";
  if (period) prompt += "- ช่วงเวลา: " + period + "\n";
  if (filterContext) prompt += "- ขอบเขต: " + filterContext + "\n";
  prompt += "- จำนวนสาขา: " + branchCount + "\n";
  prompt += "- ยอดขาย Device รวม: " + totalSold + " ชิ้น\n";
  prompt += "- ยอดประเมินเทรด: " + totalEvaluated + " รายการ\n";
  prompt += "- ตกลงเทรด: " + totalAgreed + " รายการ\n";
  prompt += "- Conversion rate (ตกลง/ประเมิน): ~" + conversionRate + "%\n";
  prompt += "- ATT% รวม (ตกลง/ยอดขาย): " + overallATT + "%\n\n";

  if (top3.length > 0) {
    prompt += "Top 3 สาขา ATT% สูงสุด:\n";
    top3.forEach(function(b, i) {
      prompt += (i + 1) + ". " + b.name + " – " + b.att + "% (ตกลง " + b.agreed + ", ขาย " + b.sold + ")\n";
    });
    prompt += "\n";
  }

  if (lowBranches.length > 0) {
    prompt += "สาขาที่ ATT% ต่ำกว่า 15%:\n";
    lowBranches.forEach(function(b) {
      prompt += "* " + b.name + " – " + b.att + "% (ตกลง " + b.agreed + ", ขาย " + b.sold + ")\n";
    });
    prompt += "\n";
  }

  prompt += "สร้างข้อความตาม template เป๊ะๆ รวมถึง section Action ไล่ยอด พร้อม Script ตัวอย่างที่พนักงานใช้เสนอ Trade-in กับลูกค้าได้จริง";
  return prompt;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  var apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY ไม่ได้ตั้งค่าใน Vercel Environment Variables" });
  }

  var ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "กรุณารอสักครู่ก่อนลองใหม่ (จำกัด 10 ครั้ง/นาที)" });
  }

  var validated = validateData(req.body && req.body.data);
  if (!validated) {
    return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง" });
  }

  try {
    var prompt = buildPrompt(validated);

    var response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 2048,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      var errBody = await response.text();
      console.error("OpenAI API error:", response.status, errBody);
      return res.status(500).json({ error: "OpenAI API error (status " + response.status + ")" });
    }

    var data = await response.json();
    var text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "ไม่สามารถวิเคราะห์ได้";
    return res.status(200).json({ analysis: text });
  } catch (err) {
    console.error("Trade analysis error:", err.message || err);
    return res.status(500).json({ error: "Server error: " + (err.message || "unknown") });
  }
};
