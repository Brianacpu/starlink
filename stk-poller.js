export function startStkPolling(transactionId, {
  intervalMs = 3000,
  maxAttempts = 25,
  onUpdate,
  onComplete,
  onTimeout,
} = {}) {
  let attempts = 0;
  let stopped = false;

  const terminalSuccess = new Set(['COMPLETED', 'SUCCESS', 'PAID']);
  const terminalFailed = new Set(['FAILED', 'CANCELLED', 'REJECTED', 'EXPIRED']);

  async function pollOnce() {
    if (stopped) return;
    attempts += 1;

    try {
      const res = await fetch(`/api/stk-status?transactionId=${encodeURIComponent(transactionId)}`);
      const data = await res.json();
      const status = String(data?.status || '').toUpperCase();

      if (typeof onUpdate === 'function') {
        onUpdate({ status, data, attempt: attempts });
      }

      if (terminalSuccess.has(status) || terminalFailed.has(status)) {
        stopped = true;
        if (typeof onComplete === 'function') {
          onComplete({ status, data });
        }
        return;
      }
    } catch (err) {
      if (typeof onUpdate === 'function') {
        onUpdate({ status: 'POLLING_ERROR', error: err, attempt: attempts });
      }
    }

    if (attempts >= maxAttempts) {
      stopped = true;
      if (typeof onTimeout === 'function') {
        onTimeout({ transactionId, attempts });
      }
      return;
    }

    setTimeout(pollOnce, intervalMs);
  }

  pollOnce();

  return function stopPolling() {
    stopped = true;
  };
}
