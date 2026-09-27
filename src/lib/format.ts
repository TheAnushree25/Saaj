/** 25000 -> "₹25,000" with Indian digit grouping (₹1,50,000, not ₹150,000). */
export function inr(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN")}`;
}

/** Time-aware greeting for the home screen. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "GOOD MORNING";
  if (h < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}
