import type { BookingStatus } from "@/lib/api-types";

/** The pill text for each booking status. */
export function statusLabel(status: BookingStatus): string {
  switch (status) {
    case "pending_payment":
      return "AWAITING PAYMENT";
    case "confirmed":
      return "CONFIRMED";
    case "in_progress":
      return "IN PROGRESS";
    case "completed":
      return "COMPLETED";
    case "cancelled":
      return "CANCELLED";
    case "expired":
      return "EXPIRED";
  }
}
