const DAILY_LIMIT = 50;

type UsageRecord = {
  count: number;
  date: string;
  updatedAt: string;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  retryAfterSeconds: number;
};

/** Returns a date key in UTC used for daily usage partitions. */
function getUtcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Computes the remaining seconds until the next UTC day boundary. */
function secondsUntilNextUtcMidnight(now: Date): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const millis = next.getTime() - now.getTime();
  return Math.max(1, Math.ceil(millis / 1000));
}

function buildUsageKey(dayKey: string): string {
  return `usage:${dayKey}`;
}

/**
 * Applies a per-day usage limit and increments usage when still allowed.
 */
export async function checkAndIncrementDailyUsage(usageKv: KVNamespace): Promise<RateLimitResult> {
  const now = new Date();
  const dayKey = getUtcDayKey(now);
  const kvKey = buildUsageKey(dayKey);

  const current = await usageKv.get<UsageRecord>(kvKey, "json");
  const currentCount = current?.count ?? 0;

  if (currentCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      limit: DAILY_LIMIT,
      used: currentCount,
      remaining: 0,
      retryAfterSeconds: secondsUntilNextUtcMidnight(now)
    };
  }

  const updatedCount = currentCount + 1;
  const record: UsageRecord = {
    count: updatedCount,
    date: dayKey,
    updatedAt: now.toISOString()
  };

  await usageKv.put(kvKey, JSON.stringify(record), {
    expirationTtl: secondsUntilNextUtcMidnight(now)
  });

  return {
    allowed: true,
    limit: DAILY_LIMIT,
    used: updatedCount,
    remaining: Math.max(0, DAILY_LIMIT - updatedCount),
    retryAfterSeconds: secondsUntilNextUtcMidnight(now)
  };
}
