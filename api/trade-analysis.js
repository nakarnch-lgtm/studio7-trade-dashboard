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
  const top3Raw = Array.isArray(data.top3) ? data.top3.slice(0, 3) : [];
  const lowRaw = Array.isArray(data.lowBranches) ? data.lowBranches.slice(0, 50) : [];
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

const SYSTEM_PROMPT = `คุณเป็น ASM (Area Sales Manager) ของ Studio7 ประเทศไทย ผู้เชี่ยวชาญด้านการวิเคราะห์ยอดขายและ Trade-In ของ Apple Products

คุณต้องสร้างข้อความสรุปภาษาไทยที่ copy ไปวาง LINE ได้สวยทันที

กฎสำคัญ:
- ใช้ ** สำหรับข้อความที่ต้องการเน้น (LINE รองรับ bold ด้วย **)
- ใช้ emoji หัวข้อ: 📊 สรุป, 🏆 Top 3, ⚠️ สาขาต่ำ, 🚀 Action
- ใช้ 👉 สำหรับ insight หรือจุดเด่น
- ใช้ * สำหรับ bullet points
- ใช้ตัวเลขสำหรับลำดับ (1. 2. 3.)
- กระชับ ตรงประเด็น อ่านง่าย
- ห้ามใช้ markdown อื่นเช่น # หรือ --- หรือ \`\`\`
- ต้องมี Section "Action ไล่ยอด" ที่มีคำแนะนำเชิงปฏิบัติจริงๆ รวมถึง Script ตัวอย่างสำหรับพนักงานขาย

รูปแบบที่ต้องการ (ห้ามเปลี่ยนโครงสร้าง):

📊 **สรุปสถานการณ์ Trade-in โซน [ชื่อโซน/AM] ([ช่วงเวลา])**

ภาพรวมโซนตอนนี้

* ATT อยู่ที่ **X%**
* ตกลงเทรด **X / X รายการ (~X%)**
  👉 [insight สั้นๆ เกี่ยวกับ conversion rate]

🏆 **Top 3 สาขา**

1. [ชื่อสาขา] – X%
2. [ชื่อสาขา] – X%
3. [ชื่อสาขา] – X%
  👉 จุดเด่น: [วิเคราะห์สั้นๆ ว่าทำไมเก่ง]

⚠️ **สาขาที่ต่ำกว่า 15% (ต้องเร่งด่วน)**

* [ชื่อสาขา] – X%
* [ชื่อสาขา] – X%
[... ทุกสาขาที่ต่ำกว่า 15%]

👉 Insight: [วิเคราะห์สาเหตุสั้นๆ]

🚀 **Action ไล่ยอด (โฟกัสทันที)**

1. [คำแนะนำเชิงปฏิบัติข้อ 1]
2. ใช้ Script เดียวกันทั้งโซน
   "[ตัวอย่าง script สำหรับเสนอ trade-in ให้ลูกค้า]"
3. [คำแนะนำข้อ 3]
4. [คำแนะนำข้อ 4]`;

function buildPrompt(data) {
  const { filterContext, overallATT, totalSold, totalAgreed, totalEvaluated, branchCount, top3, lowBranches, period } = data;
  const conversionRate = totalEvaluated > 0 ? Math.round((totalAgreed / totalEvaluated) * 100) : 0;

  let prompt = `สร้างข้อความสรุป Trade-In ตาม template ที่กำหนดไว้ใน system prompt\n\n`;
  prompt += `ข้อมูล:\n`;
  if (period) prompt += `- ช่วงเวลา: ${period}\n`;
  if (filterContext) prompt += `- ขอบเขต: ${filterContext}\n`;
  prompt += `- จำนวนสาขา: ${branchCount}\n`;
  prompt += `- ยอดขาย Device รวม: ${totalSold} ชิ้น\n`;
  prompt += `- ยอดประเมินเทรด: ${totalEvaluated} รายการ\n`;
  prompt += `- ตกลงเทรด: ${totalAgreed} รายการ\n`;
  prompt += `- Conversion rate (ตกลง/ประเมิน): ~${conversionRate}%\n`;
  prompt += `- ATT% รวม (ตกลง/ยอดขาย): ${overallATT}%\n\n`;

  if (top3.length > 0) {
    prompt += `Top 3 สาขา ATT% สูงสุด:\n`;
    top3.forEach((b, i) => {
      prompt += `${i + 1}. ${b.name} – ${b.att}% (ตกลง ${b.agreed}, ขาย ${b.sold})\n`;
    });
    prompt += `\n`;
  }

  if (lowBranches.length > 0) {
    prompt += `สาขาที่ ATT% ต่ำกว่า 15%:\n`;
    lowBranches.forEach((b) => {
      prompt += `* ${b.name} – ${b.att}% (ตกลง ${b.agreed}, ขาย ${b.sold})\n`;
    });
    prompt += `\n`;
  }

  prompt += `สร้างข้อความตาม template เป๊ะๆ รวมถึง section Action ไล่ยอด พร้อม Script ตัวอย่างที่พนักงานใช้เสนอ Trade-in กับลูกค้าได้จริง`;
  return prompt;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY ไม่ได้ตั้งค่าใน Vercel Environment Variables" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "กรุณารอสักครู่ก่อนลองใหม่ (จำกัด 10 ครั้ง/นาที)" });
  }

  const validated = validateData(req.body?.data);
  if (!validated) {
    return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง" });
  }

  try {
    const prompt = buildPrompt(validated);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
      const errBody = await response.text();
      console.error("OpenAI API error:", response.status, errBody);
      return res.status(500).json({ error: "ไม่สามารถวิเคราะห์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "ไม่สามารถวิเคราะห์ได้";
    return res.status(200).json({ analysis: text });
  } catch (err) {
    console.error("Trade analysis error:", err.message);
    return res.status(500).json({ error: "ไม่สามารถวิเคราะห์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" });
  }
}
