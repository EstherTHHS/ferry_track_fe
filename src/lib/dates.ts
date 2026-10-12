/**
 * Calendar helpers. Dates travel as local `YYYY-MM-DD` and months as local
 * `YYYY-MM`, the shapes the ferry-trips API speaks, so nothing here converts
 * through UTC and shifts near midnight.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** `Date` → `YYYY-MM-DD` in local time. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The month containing `date`, as `YYYY-MM`. */
export function toMonth(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** First day of a `YYYY-MM` month as a local `Date`. */
export function monthStart(month: string): Date {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon - 1, 1);
}

/** `YYYY-MM` moved by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const start = monthStart(month);
  return toMonth(new Date(start.getFullYear(), start.getMonth() + delta, 1));
}

/** Whole months from `from` to `to`; negative when `to` is earlier. */
export function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/**
 * Monday-aligned `[start, end)` dates covering every day from the first of
 * `fromMonth` to the last of `toMonth`, so a day grid over it has whole weeks.
 */
export function weekAlignedRange(fromMonth: string, toMonth: string) {
  const first = monthStart(fromMonth);
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - ((first.getDay() + 6) % 7));
  const afterLast = monthStart(shiftMonth(toMonth, 1));
  const end = new Date(
    afterLast.getFullYear(),
    afterLast.getMonth(),
    afterLast.getDate() + ((8 - afterLast.getDay()) % 7),
  );
  return { start: toISODate(start), end: toISODate(end) };
}

/** Year and full month name for a heading, e.g. `{ year: "2027", name: "June" }`. */
export function monthParts(month: string, locale = "en-US") {
  const start = monthStart(month);
  return {
    year: String(start.getFullYear()),
    name: start.toLocaleString(locale, { month: "long" }),
  };
}

/** Local `YYYY-MM-DD` → `Date` at local midnight. */
export function fromISODate(date: string): Date {
  const [year, mon, day] = date.split("-").map(Number);
  return new Date(year, mon - 1, day);
}

/** `"HH:mm"` → a `Date` today at that time, for time pickers that deal in `Date`s. */
export function timeToDate(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** `Date` → its local `"HH:mm"`. */
export function dateToTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
