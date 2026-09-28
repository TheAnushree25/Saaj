// The shapes the Saaj API sends back. Money is always in paise (₹1 = 100 paise)
// and every time is an ISO string in UTC; src/lib/format.ts shows them in Indian time.

export type Paged<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };

export type ArtistCard = {
  id: string;
  slug: string;
  studioName: string;
  artistName: string;
  specialty: string;
  city: string;
  experienceYears: number;
  tagline: string | null;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  fromPricePaise: number | null;
  rating: number | null;
  reviewCount: number;
};

export type MenuItem = {
  artistServiceId: string;
  serviceId: string;
  slug: string;
  name: string;
  description: string | null;
  inclusions: string[];
  imageUrl: string | null;
  category: string;
  pricePaise: number;
  durationMinutes: number;
};

export type PortfolioItem = {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  occasion: "bridal" | "engagement" | "reception" | "haldi" | "mehendi" | "sangeet" | null;
  caption: string | null;
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: string;
  occasion: string;
};

export type ArtistDetail = ArtistCard & {
  bio: string | null;
  area: string | null;
  instagram: string | null;
  travelsToVenue: boolean;
  services: MenuItem[];
  portfolio: PortfolioItem[];
  reviews: Review[];
};

export type Category = { slug: string; name: string };

export type ServiceSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  inclusions: string[];
  imageUrl: string | null;
  durationMinutes: number;
  category: Category;
  fromPricePaise: number | null;
  artistCount: number;
  bookingCount: number;
};

export type ServiceDetail = ServiceSummary & {
  artists: (ArtistCard & { artistServiceId: string; pricePaise: number; durationMinutes: number })[];
};

export type Look = {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  occasion: PortfolioItem["occasion"];
  caption: string | null;
  isFeatured: boolean;
  artist: SavedArtist & Pick<ArtistCard, "tagline">;
};

/** What a card needs to show an artist: every artist list the API sends has at least this. */
export type SavedArtist = Pick<ArtistCard, "id" | "slug" | "studioName" | "city" | "profileImageUrl" | "rating" | "reviewCount">;

export type SearchResult = { artists: ArtistCard[]; services: ServiceSummary[] };

export type Slot = { startsAt: string; available: boolean; label: string };
export type SlotsResponse = { date: string; durationMinutes: number; slots: Slot[] };
export type CalendarResponse = { days: { date: string; available: boolean }[] };

export type BookingStatus = "pending_payment" | "confirmed" | "in_progress" | "completed" | "cancelled" | "expired";

export type BookingCard = {
  id: string;
  ref: string;
  title: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  venue: string;
  totalPaise: number;
  paidPaise: number;
  holdExpiresAt: string | null;
  artist: { id: string; slug: string; studioName: string; city: string; profileImageUrl: string | null };
};

export type BookingDetail = {
  id: string;
  ref: string;
  status: BookingStatus;
  title: string;
  startsAt: string;
  endsAt: string;
  eventType: string;
  venue: string;
  contactName: string;
  contactPhone: string;
  notes: string | null;
  totalPaise: number;
  advancePaise: number;
  paidPaise: number;
  refundedPaise: number;
  balancePaise: number;
  holdExpiresAt: string | null;
  cancelReason: string | null;
  artist: { id: string; slug: string; studioName: string; city: string; profileImageUrl: string | null; phone: string | null } | null;
  items: { name: string; pricePaise: number; durationMinutes: number }[];
  payments: { id: string; kind: "advance" | "balance"; amountPaise: number; status: string; paidAt: string | null }[];
  timeline: { key: string; label: string; done: boolean; at: string | null }[];
  review: { rating: number; comment: string | null; createdAt: string } | null;
  canPay: "advance" | "balance" | null;
  canCancel: boolean;
  canReview: boolean;
};

export type CancelResult = { refundPaise: number; booking: BookingDetail };

/** Everything the app hands to Razorpay's checkout. */
export type PaymentOrder = {
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; contact: string };
};
