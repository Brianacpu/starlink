// Vercel serverless function: POST /api/stk-push  (PayHero)
// Env vars: PAYHERO_AUTH, PAYHERO_CHANNEL_ID

const PRICES = { midnight: 50, "24h": 100, "7d": 250, "15d": 350, "30d": 500 };
const recent = new Map();

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed." });

  const rawAuth = (process.env.PAYHERO_AUTH || "").trim();
  const channelId = Number(process.env.PAYHERO_CHANNEL_ID);
  if (!rawAuth || !channelId) {
    console.error("PAYHERO_AUTH or PAYHERO_CHANNEL_ID is missing");
    return res.status(500).json({ message: "Server is not configured." });
  }
  const auth = /^basic\s/i.test(rawAuth) ? rawAuth : "Basic " + rawAuth;

  const { phone, packageId, idempotencyKey } = req.body || {};
  const amount = PRICES[packageId];
  if (!amount || !/^254[71]\d{8}$/.test(phone || "") || !/^[\w-]{8,64}$/.test(idempotencyKey || "")) {
    return res.status(400).json({ message: "Invalid request." });
  }
  if (recent.has(idempotencyKey)) return res.status(200).json({ reference: recent.get(idempotencyKey) });

  try {
    const r = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        amount,
        phone_number: phone,
        channel_id: channelId,
        provider: "m-pesa",
        external_reference: "SDI-" + idempotencyKey.replace(/-/g, "").slice(0, 16),
        customer_name: "Customer",
      }),
    });
    const data = await r.json().catch(() => ({}));
    console.log("PayHero STK response", r.status, JSON.stringify(data));

    if (!r.ok || data.success === false || !data.reference) {
      return res.status(502).json({ message: "Could not send the M-PESA prompt. Please try again." });
    }
    recent.set(idempotencyKey, data.reference);
    return res.status(200).json({ reference: data.reference });
  } catch (e) {
    console.error("PayHero request failed", e);
    return res.status(502).json({ message: "Payment service unavailable." });
  }
};
