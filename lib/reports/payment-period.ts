export type PaymentPeriod = {
  start: Date;
  nextPaymentDate: Date;
};

function paymentDatesAround(date: Date, paymentDays: number[]) {
  const days = [...new Set(paymentDays)].sort((a, b) => a - b);
  const months = [-1, 0, 1].map((offset) => new Date(date.getFullYear(), date.getMonth() + offset, 1));
  return months.flatMap((month) =>
    days.map((day) => new Date(month.getFullYear(), month.getMonth(), day, 12))
  );
}

export function getCurrentPaymentPeriod(paymentDays: number[], now = new Date()): PaymentPeriod {
  const validDays = paymentDays.filter((day) => Number.isInteger(day) && day >= 1 && day <= 28);
  const dates = paymentDatesAround(now, validDays.length ? validDays : [1, 15]);
  const previousPayment = dates.filter((date) => date <= now).sort((a, b) => b.getTime() - a.getTime())[0];
  const nextPaymentDate = dates.filter((date) => date > now).sort((a, b) => a.getTime() - b.getTime())[0];
  const start = new Date(previousPayment);
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  return { start, nextPaymentDate };
}
