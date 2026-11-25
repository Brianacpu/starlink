import crypto from 'crypto';

function formatUpstreamError(data, fallback) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.message === 'string' && data.message) return data.message;
  if (typeof data.error === 'string' && data.error) return data.error;
  if (data.error && typeof data.error.message === 'string') return data.error.message;
  try {
    return JSON.stringify(data);
  } catch (_) {
    return fallback;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', message: 'Method not allowed' });
  }

  const authHeader = process.env.PAYLOR_AUTH_HEADER;
  if (!authHeader) {
    return res.status(500).json({
      error: 'Server payment configuration missing',
      message: 'PAYLOR_AUTH_HEADER environment variable is not set on the server',
    });
  }

  const { phone, amount, reference, description, callbackUrl, channelId } = req.body || {};
  if (!phone || !amount || !reference) {
    return res.status(400).json({
      error: 'phone, amount, and reference are required',
      message: 'phone, amount, and reference are required',
    });
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
        Authorization: authHeader.trim(),
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const readableMessage = formatUpstreamError(data, `Payment provider error (${response.status})`);
      return res.status(response.status).json({
        ...data,
        error: readableMessage,
        message: readableMessage,
      });
    }

    return res.status(response.status).json(data);
  } catch (err) {
    const message = err && err.message ? err.message : 'Failed to reach payment provider';
    return res.status(502).json({ error: message, message });
  }
}
