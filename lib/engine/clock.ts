/**
 * Simulated Clock for Closer Engine
 * Allows fast-forwarding the demo clock without changing system time.
 */

export function getSimulatedNow(offsetDays: number = 0): Date {
  const date = new Date();
  if (offsetDays) {
    date.setDate(date.getDate() + offsetDays);
  }
  return date;
}

export function formatISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Calculates calendar day difference: targetDate - baseDate
 */
export function getDaysDifference(targetDate: string | Date, baseDate: string | Date): number {
  const target = new Date(targetDate);
  const base = new Date(baseDate);

  // Normalize to UTC midnight for accurate calendar day difference
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const baseUtc = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((targetUtc - baseUtc) / msPerDay);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
