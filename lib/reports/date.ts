/** Formats a Date as the "YYYY-MM-DD" value a `<input type="date">` expects. */
export function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Parses a "YYYY-MM-DD" input value into a local Date, or null if invalid. */
export function parseDate(value: string, endOfDay = false) {
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}
