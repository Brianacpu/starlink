// Vercel serverless function: GET /api/status?ref=<transactionId>
// Asks Paylor directly (with your secret key) so the browser can never fake a result.

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const ref = String(req.query.ref || "");
  if (!/^[\w-]{6,64}$/.test(ref)) return res.status(400).json({ status: "FAILED" });

  try {
    const r = await fetch(
      "https://api.paylorke.com/api/v1/merchants/payments/transactions/" + encodeURIComponent(ref),
      { headers: { Authorization: "Bearer " + process.env.PAYLOR_API_KEY } }
    );
    if (!r.ok) return res.status(200).json({ status: "PENDING" });   // keep polling on hiccups
    const t = await r.json().catch(() => ({}));
    const s = String(t.status || "").toUpperCase();
    console.log("Paylor status", ref, s);

    let status = "PENDING";
    if (s === "COMPLETED") status = "SUCCESS";                       // only Paylor's COMPLETED counts
    else if (s === "CANCELLED" || s === "CANCELED") status = "CANCELLED";
    else if (["FAILED", "EXPIRED", "TIMEOUT", "REJECTED"].includes(s)) status = "FAILED";
    return res.status(200).json({ status });
  } catch (e) {
    return res.status(200).json({ status: "PENDING" });
  }
};
