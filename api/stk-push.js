import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = process.env.PAYLOR_AUTH_HEADER;
  if (!authHeader) {
    return res.status(500).json({ error: 'Server payment configuration missing' });
  }

  const { phone, amount, reference, description, callbackUrl, channelId } = req.body || {};
  if (!phone || !amount || !reference) {
    return res.status(400).json({ error: 'phone, amount, and reference are required' });
  }

  const payload = {
    phone: String(phone).trim(),
    amount: Number(amount),
    reference: String(reference).trim(),
    description: description || 'STARLINK DIRECT INTERNET data bundle',
  };

  const resolvedChannel = channelId || process.env.PAYLOR_CHANNEL_ID;
  if (resolvedChannel) payload.channelId = resolvedChannel;
  if (callbackUrl) payload.callbackUrl = callbackUrl;

  try {
    const response = await fetch('https://api.paylorke.com/api/v1/merchants/payments/stk-push', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach payment provider' });
  }
}
