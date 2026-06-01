interface IdempotencyRecord {
  status: "pending" | "completed" | "rejected";
  response?: unknown;
  expiresAt: number;
}

const records = new Map<string, IdempotencyRecord>();
const DEFAULT_TTL_MS = Number(process.env.SIGNALFLOW_IDEMPOTENCY_TTL_MS ?? 10 * 60_000);

function cleanup(now: number) {
  for (const [key, record] of records) {
    if (record.expiresAt <= now) records.delete(key);
  }
}

export function readIdempotency(clientOrderId: string): IdempotencyRecord | null {
  const now = Date.now();
  cleanup(now);
  const record = records.get(clientOrderId);
  return record && record.expiresAt > now ? record : null;
}

export function markIdempotency(
  clientOrderId: string,
  status: IdempotencyRecord["status"],
  response?: unknown,
) {
  records.set(clientOrderId, {
    status,
    response,
    expiresAt: Date.now() + DEFAULT_TTL_MS,
  });
}
