/** 25000 -> "₹25,000" with Indian digit grouping (₹1,50,000, not ₹150,000). */
export function inr(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** The API counts money in paise (₹1 = 100 paise): 2500000 -> "₹25,000". */
export const rupees = (paise: number) => inr(paise / 100);

/** 90 -> "90 min", 120 -> "2 hr", 150 -> "2 hr 30 min". */
export function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** Time-aware greeting for the home screen. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "GOOD MORNING";
  if (h < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

// Appointments happen in India, so they are always shown in Indian time, even
// on a phone set to another time zone. India is UTC+5:30 all year (it has no
// daylight saving), so plain arithmetic is exact and needs no time-zone data.
const IST_OFFSET_MS = 330 * 60_000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** The wall-clock reading in India at a moment the API sent (an ISO string). */
function inIndia(moment: string | Date) {
  const shifted = new Date(new Date(moment).getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

/** "12 October 2026" */
export function longDate(moment: string | Date): string {
  const t = inIndia(moment);
  return `${t.day} ${MONTHS[t.month]} ${t.year}`;
}

/** "12 Oct" */
export function shortDate(moment: string | Date): string {
  const t = inIndia(moment);
  return `${t.day} ${MONTHS[t.month]?.slice(0, 3)}`;
}

/** "09:30 AM" */
export function clockTime(moment: string | Date): string {
  const t = inIndia(moment);
  const hour = t.hours % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${String(t.minutes).padStart(2, "0")} ${t.hours < 12 ? "AM" : "PM"}`;
}

/** A moment as its date in India, "YYYY-MM-DD" (the form the API's date filters take). */
function isoDateInIndia(moment: string | Date): string {
  const t = inIndia(moment);
  return `${t.year}-${String(t.month + 1).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
}

/** Today's date in India, "YYYY-MM-DD". */
export const todayInIndia = () => isoDateInIndia(new Date());

/** "2026-10-12" moved by `days`: shiftDate("2026-10-12", 14) -> "2026-10-26". */
export function shiftDate(date: string, days: number): string {
  return isoDateInIndia(new Date(new Date(`${date}T12:00:00+05:30`).getTime() + days * 86_400_000));
}

/** How the date picker labels a "YYYY-MM-DD" day: { dow: "MON", day: "12", full: "12 October 2026", month: "OCTOBER 2026" }. */
export function dayLabel(date: string) {
  // Noon in India falls on the same date everywhere, so there is no edge case.
  const t = inIndia(`${date}T12:00:00+05:30`);
  return {
    dow: WEEKDAYS[t.weekday] ?? "",
    day: String(t.day),
    full: `${t.day} ${MONTHS[t.month]} ${t.year}`,
    month: `${MONTHS[t.month]?.toUpperCase()} ${t.year}`,
  };
}
