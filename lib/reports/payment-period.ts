export type PaymentPeriod = {
  start: Date;
  nextPaymentDate: Date;
};

export type ClosedPaymentPeriod = {
  start: Date;
  end: Date;
};

function normalizedPaymentDays(paymentDays: number[]) {
  const days = [...new Set(paymentDays.filter((day) => Number.isInteger(day) && day >= 1 && day <= 28))].sort(
    (a, b) => a - b
  );
  return days.length ? days : [1, 15];
}

function paymentDatesAround(date: Date, paymentDays: number[]) {
  const days = normalizedPaymentDays(paymentDays);
  const months = [-1, 0, 1].map((offset) => new Date(date.getFullYear(), date.getMonth() + offset, 1));
  return months.flatMap((month) =>
    days.map((day) => new Date(month.getFullYear(), month.getMonth(), day, 12))
  );
}

export function getCurrentPaymentPeriod(paymentDays: number[], now = new Date()): PaymentPeriod {
  const dates = paymentDatesAround(now, paymentDays);
  const previousPayment = dates.filter((date) => date <= now).sort((a, b) => b.getTime() - a.getTime())[0];
  const nextPaymentDate = dates.filter((date) => date > now).sort((a, b) => a.getTime() - b.getTime())[0];
  const start = new Date(previousPayment);
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  return { start, nextPaymentDate };
}

/**
 * Returns the `count` most recently completed payment periods (most recent
 * first), one per pair of consecutive configured payment days. For
 * paymentDays [1, 15] the most recent completed period as of July 17 is
 * "July 1 – July 15" (both inclusive), the one before it "June 15 – July 1",
 * and so on backward — used to power a quick period picker instead of
 * typing dates by hand.
 */
export function getPastPaymentPeriods(paymentDays: number[], count: number, now = new Date()): ClosedPaymentPeriod[] {
  const days = normalizedPaymentDays(paymentDays);
  const monthsNeeded = Math.ceil((count + 1) / days.length) + 2;
  const dates: Date[] = [];
  for (let offset = -monthsNeeded; offset <= 0; offset++) {
    const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    for (const day of days) dates.push(new Date(month.getFullYear(), month.getMonth(), day, 12));
  }
  const pastDates = dates.filter((date) => date <= now).sort((a, b) => a.getTime() - b.getTime());

  const periods: ClosedPaymentPeriod[] = [];
  for (let i = pastDates.length - 1; i >= 1 && periods.length < count; i--) {
    periods.push({ start: pastDates[i - 1], end: pastDates[i] });
  }
  return periods;
}
