/**
 * Money is always a whole number of paise (₹1 = 100 paise). Never a float:
 * 0.1 + 0.2 is not 0.3 in floating point, and those errors become refund disputes.
 */
export const percentOf = (paise: number, percent: number) => Math.round((paise * percent) / 100);

/** 2500000 -> "₹25,000" with Indian digit grouping, for notifications. */
export const formatRupees = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
