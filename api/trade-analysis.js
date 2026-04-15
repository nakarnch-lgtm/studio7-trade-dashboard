var RATE_LIMIT_WINDOW_MS = 60000;
var RATE_LIMIT_MAX = 10;
var ipHits = new Map();

function checkRateLimit(ip) {
  var now = Date.now();
  var entry = ipHits.get(ip);
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

var SYSTEM_PROMPT = "คุณเป็น ASM (Area Sales Manager) ของ Studio7 ประเทศไทย ผู้เชี่ยวชาญด้านการวิเคราะห์ยอดขายและ Trade-In ของ Apple Products\n\nคุณต้องสร้างข้อความสรุปภาษาไทยที่ copy ไปวาง LINE ได้สวยทันที\n\nกฎสำคัญ:\n- ใช้ ** สำหรับข้อความที่ต้องการเน้น (LINE รองรับ bold ด้วย **)\n- ใช้ emoji หัวข้อ: 📊 สรุป, 🏆 Top 3, ⚠️ สาขาต่ำ, 🚀 Action\n- ใช้ 👉 สำหรับ insight หรือจุดเด่น\n- ใช้ * สำหรับ bullet points\n- ใช้ตัวเลขสำหรับลำดับ (1. 2. 3.)\n- กระชับ ตรงประเด็น อ่านง่าย\n- ห้ามใช้ markdown อื่นเช่น # หรือ --- หรือ ```\n- ต้องมี Section \"Action ไล่ยอด\" ที่มีคำแนะนำเชิงปฏิบัติจริงๆ รวมถึง Script ตัวอย่างสำหรับพนักงานขาย\n\nรูปแบบที่ต้องการ (ห้ามเปลี่ยนโครงสร้าง):\n\n📊 **สรุปสถานการณ์ Trade-in โซน [ชื่อโซน/AM] ([ช่วงเวลา])**\n\nภาพรวมโซนตอนนี้\n\n* ATT อยู่ที่ **X%**\n* ตกลงเทรด **X / X รายการ (~X%)**\n  👉 [insight สั้นๆ เกี่ยวกับ conversion rate]\n\n🏆 **Top 3 สาขา**\n\n1. [ชื่อสาขา] – X%\n2. [ชื่อสาขา] – X%\n3. [ชื่อสาขา] – X%\n  👉 จุดเด่น: [วิเคราะห์สั้นๆ ว่าทำไมเก่ง]\n\n⚠️ **สาขาที่ต่ำกว่า 15% (ต้องเร่งด่วน)**\n\n* [ชื่อสาขา] – X%\n* [ชื่อสาขา] – X%\n[... ทุกสาขาที่ต่ำกว่า 15%]\n\n👉 Insight: [วิเคราะห์สาเหตุสั้นๆ]\n\n🚀 **Action ไล่ยอด (โฟกัสทันที)**\n\n1. [คำแนะนำเชิงปฏิบัติข้อ 1]\n2. ใช้ Script เดียวกันทั้งโซน\n   \"[ตัวอย่าง script สำหรับเสนอ trade-in ให้ลูกค้า]\"\n3. [คำแนะนำข้อ 3]\n4. [คำแนะนำข้อ 4]";

function buildPrompt(data) {
  var conversionRate = data.totalEvaluated > 0 ? Math.round((data.totalAgreed / data.totalEvaluated) * 100) : 0;

  var prompt = "สร้างข้อความสรุป Trade-In ตาม template ที่กำหนดไว้ใน system prompt\n\n";
  prompt += "ข้อมูล:\n";
  if (data.period) prompt += "- ช่วงเวลา: " + data.period + "\n";
  if (data.filterContext) prompt += "- ขอบเขต: " + data.filterContext + "\n";
  prompt += "- จำนวนสาขา: " + data.branchCount + "\n";
  prompt += "- ยอดขาย Device รวม: " + data.totalSold + " ชิ้น\n";
  prompt += "- ยอดประเมินเทรด: " + data.totalEvaluated + " รายการ\n";
  prompt += "- ตกลงเทรด: " + data.totalAgreed + " รายการ\n";
  prompt += "- Conversion rate (ตกลง/ประเมิน): ~" + conversionRate + "%\n";
  prompt += "- ATT% รวม (ตกลง/ยอดขาย): " + data.overallATT + "%\n\n";

  if (data.top3.length > 0) {
    prompt += "Top 3 สาขา ATT% สูงสุด:\n";
    data.top3.forEach(function(b, i) {
      prompt += (i + 1) + ". " + b.name + " – " + b.att + "% (ตกลง " + b.agreed + ", ขาย " + b.sold + ")\n";
    });
    prompt += "\n";
  }

  if (data.lowBranches.length > 0) {
    prompt += "สาขาที่ ATT% ต่ำกว่า 15%:\n";
    data.lowBranches.forEach(function(b) {
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

  var apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY ไม่ได้ตั้งค่าใน Vercel Environment Variables" });
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

    var response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2048,
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      var errBody = await response.text();
      var errorDetail = "";
      try { var parsed = JSON.parse(errBody); errorDetail = (parsed.error && (parsed.error.message || parsed.error)) || ""; } catch(e) {}
      console.error("Groq API error:", response.status, errBody);
      return res.status(500).json({ error: "Groq API error (status " + response.status + ")" + (errorDetail ? ": " + errorDetail : "") });
    }

    var data = await response.json();
    var text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "ไม่สามารถวิเคราะห์ได้";
    return res.status(200).json({ analysis: text });
  } catch (err) {
    console.error("Trade analysis error:", err.message || err);
    return res.status(500).json({ error: "Server error: " + (err.message || "unknown") });
  }
};
