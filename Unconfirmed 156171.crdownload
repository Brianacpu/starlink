// Vercel serverless function: POST /api/stk-push
// Env vars (Vercel > Settings > Environment Variables, then redeploy):
//   PAYLOR_API_KEY      (required)
//   PAYLOR_CHANNEL_ID   (optional, e.g. PAYL-XXXXXX; omit to use your default channel)

const PRICES = { midnight: 50, "24h": 100, "7d": 250, "15d": 350, "30d": 500 };
const NAMES = { midnight: "Tii Midnight 2GB", "24h": "24 Hours 3.5GB", "7d": "7 Days 5GB", "15d": "15 Days 7GB", "30d": "30 Days 15GB" };

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed." });
  if (!process.env.PAYLOR_API_KEY) {
    console.error("PAYLOR_API_KEY is not set");
    return res.status(500).json({ message: "Server is not configured." });
  }

  const { phone, packageId, idempotencyKey } = req.body || {};
  const amount = PRICES[packageId];                 // price is decided here, never by the browser
  if (!amount || !/^254[71]\d{8}$/.test(phone || "") || !/^[\w-]{8,64}$/.test(idempotencyKey || "")) {
    return res.status(400).json({ message: "Invalid request." });
  }

  const payload = {
    phone,
    amount,
    reference: "SDI-" + idempotencyKey.replace(/-/g, "").slice(0, 16),
    description: NAMES[packageId],
  };
  if (process.env.PAYLOR_CHANNEL_ID) payload.channelId = process.env.PAYLOR_CHANNEL_ID;

  try {
    const r = await fetch("https://api.paylorke.com/api/v1/merchants/payments/stk-push", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.PAYLOR_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,          // Paylor de-duplicates repeated requests
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    console.log("Paylor STK response", r.status, JSON.stringify(data));   // visible in Vercel Logs

    if (r.status === 402) return res.status(502).json({ message: "Merchant service credits are too low. Please contact support." });
    if (!r.ok || !data.transactionId) return res.status(502).json({ message: "Could not send the M-PESA prompt. Please try again." });

    return res.status(200).json({ reference: data.transactionId });
  } catch (e) {
    console.error("Paylor request failed", e);
    return res.status(502).json({ message: "Payment service unavailable." });
  }
};
