// Vercel serverless function: GET /api/status?ref=<PayHero reference>

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const ref = String(req.query.ref || "");
  if (!/^[\w.-]{6,100}$/.test(ref)) return res.status(400).json({ status: "FAILED" });

  const rawAuth = (process.env.PAYHERO_AUTH || "").trim();
  const auth = /^basic\s/i.test(rawAuth) ? rawAuth : "Basic " + rawAuth;

  try {
    const r = await fetch(
      "https://backend.payhero.co.ke/api/v2/transaction-status?reference=" + encodeURIComponent(ref),
      { headers: { Authorization: auth } }
    );
    if (!r.ok) return res.status(200).json({ status: "PENDING" });
    const t = await r.json().catch(() => ({}));
    const s = String(t.status || "").toUpperCase();
    console.log("PayHero status", ref, s);

    let status = "PENDING";
    if (s === "SUCCESS") status = "SUCCESS";
    else if (s === "FAILED" || s === "CANCELLED" || s === "CANCELED") {
      status = /cancel/i.test(JSON.stringify(t)) ? "CANCELLED" : "FAILED";
    }
    return res.status(200).json({ status });
  } catch (e) {
    return res.status(200).json({ status: "PENDING" });
  }
};
