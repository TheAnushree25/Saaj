/** Every booking happens in India, so business rules use Indian time. */
export const IST = "Asia/Kolkata";

const MINUTE = 60_000;

export const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * MINUTE);
export const addHours = (date: Date, hours: number) => addMinutes(date, hours * 60);
export const addDays = (date: Date, days: number) => addMinutes(date, days * 24 * 60);

/** The calendar date in India for an instant, as "2026-10-12". */
export function istDate(date: Date): string {
  // The en-CA locale happens to format dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(date);
}

/** "Mon 12 Oct, 10:00 am", for notifications. */
export function istLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
