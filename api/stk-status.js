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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', message: 'Method not allowed' });
  }

  const authHeader = process.env.PAYLOR_AUTH_HEADER;
  if (!authHeader) {
    return res.status(500).json({
      error: 'Server payment configuration missing',
      message: 'PAYLOR_AUTH_HEADER environment variable is not set on the server',
    });
  }

  const { transactionId } = req.query || {};
  if (!transactionId) {
    return res.status(400).json({
      error: 'transactionId query parameter is required',
      message: 'transactionId query parameter is required',
    });
  }

  try {
    const response = await fetch(
      `https://api.paylorke.com/api/v1/merchants/payments/transactions/${encodeURIComponent(transactionId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader.trim(),
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const readableMessage = formatUpstreamError(data, `Status check failed (${response.status})`);
      return res.status(response.status).json({
        ...data,
        error: readableMessage,
        message: readableMessage,
      });
    }

    return res.status(response.status).json(data);
  } catch (err) {
    const message = err && err.message ? err.message : 'Failed to query transaction status';
    return res.status(502).json({ error: message, message });
  }
}
