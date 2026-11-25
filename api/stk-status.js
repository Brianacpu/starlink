export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = process.env.PAYLOR_AUTH_HEADER;
  if (!authHeader) {
    return res.status(500).json({ error: 'Server payment configuration missing' });
  }

  const { transactionId } = req.query || {};
  if (!transactionId) {
    return res.status(400).json({ error: 'transactionId query parameter is required' });
  }

  try {
    const response = await fetch(
      `https://api.paylorke.com/api/v1/merchants/payments/transactions/${encodeURIComponent(transactionId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to query transaction status' });
  }
}
