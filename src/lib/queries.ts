import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { api } from "./api";
import type {
  ArtistCard,
  ArtistDetail,
  BookingCard,
  BookingDetail,
  CalendarResponse,
  Category,
  Look,
  Paged,
  SearchResult,
  ServiceDetail,
  ServiceSummary,
  SlotsResponse,
} from "./api-types";

// Every read the app makes from the Saaj API, as React Query hooks. React Query
// caches each answer under its key, so going back to a screen shows it at once
// while a fresh copy loads quietly in the background.

/** { q: "rhea", page: 1 } -> "?q=rhea&page=1", leaving out empty values. */
function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export type ServiceSort = "popular" | "price_low" | "price_high";
export type ArtistSort = "recommended" | "rating" | "price_low" | "price_high" | "experience";
export type BookingTab = "upcoming" | "completed" | "cancelled";

/** The cache keys. Signed-in data sits under "me", so signing out can drop it all at once. */
export const keys = {
  categories: ["categories"] as const,
  services: (category: string | null, sort: ServiceSort) => ["services", category, sort] as const,
  service: (slug: string) => ["service", slug] as const,
  artists: (filters: ArtistFilters) => ["artists", filters] as const,
  artist: (idOrSlug: string) => ["artist", idOrSlug] as const,
  looks: ["looks"] as const,
  search: (q: string) => ["search", q] as const,
  calendar: (artistId: string, services: string, from: string) => ["calendar", artistId, services, from] as const,
  slots: (artistId: string, services: string, date: string) => ["slots", artistId, services, date] as const,
  myBookings: (tab: BookingTab) => ["me", "bookings", tab] as const,
  booking: (id: string) => ["me", "booking", id] as const,
  saved: ["me", "saved-artists"] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: () => api<{ items: Category[] }>("/v1/categories").then((r) => r.items),
    staleTime: 5 * 60_000,
  });
}

export function useServices(category: string | null, sort: ServiceSort = "popular") {
  return useQuery({
    queryKey: keys.services(category, sort),
    queryFn: () => api<{ items: ServiceSummary[] }>(`/v1/services${qs({ category, sort })}`).then((r) => r.items),
    // Keep the old cards on screen while a new filter loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  });
}

export function useService(slug: string | undefined) {
  return useQuery({
    queryKey: keys.service(slug ?? ""),
    queryFn: () => api<ServiceDetail>(`/v1/services/${encodeURIComponent(slug ?? "")}`),
    enabled: !!slug,
  });
}

export type ArtistFilters = { q?: string; service?: string; sort?: ArtistSort; pageSize?: number };

export function useArtists(filters: ArtistFilters, enabled = true) {
  return useQuery({
    queryKey: keys.artists(filters),
    queryFn: () => api<Paged<ArtistCard>>(`/v1/artists${qs(filters)}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useArtist(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: keys.artist(idOrSlug ?? ""),
    queryFn: () => api<ArtistDetail>(`/v1/artists/${encodeURIComponent(idOrSlug ?? "")}`),
    enabled: !!idOrSlug,
  });
}

/** One photo per artist, for the Explore reels. */
export function useLooks() {
  return useQuery({
    queryKey: keys.looks,
    queryFn: () => api<{ items: Look[] }>(`/v1/looks${qs({ onePerArtist: true, limit: 30 })}`).then((r) => r.items),
  });
}

/** Artists and services matching what the bride typed. The API needs two letters or more. */
export function useSearch(q: string) {
  return useQuery({
    queryKey: keys.search(q),
    queryFn: () => api<SearchResult>(`/v1/search${qs({ q })}`),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  });
}

/** Which of the next `days` days have a free slot for these services. */
export function useCalendar(artistId: string | undefined, artistServiceIds: string[], from: string, days = 14) {
  const services = artistServiceIds.join(",");
  return useQuery({
    queryKey: keys.calendar(artistId ?? "", services, from),
    queryFn: () => api<CalendarResponse>(`/v1/artists/${artistId}/calendar${qs({ from, days, services })}`),
    enabled: !!artistId && artistServiceIds.length > 0,
    // Availability changes as others book, so it is always fetched fresh.
    staleTime: 0,
  });
}

export function useSlots(artistId: string | undefined, artistServiceIds: string[], date: string | null) {
  const services = artistServiceIds.join(",");
  return useQuery({
    queryKey: keys.slots(artistId ?? "", services, date ?? ""),
    queryFn: () => api<SlotsResponse>(`/v1/artists/${artistId}/slots${qs({ date, services })}`),
    enabled: !!artistId && artistServiceIds.length > 0 && !!date,
    staleTime: 0,
  });
}

export function useMyBookings(tab: BookingTab, enabled: boolean) {
  return useQuery({
    queryKey: keys.myBookings(tab),
    queryFn: () => api<{ items: BookingCard[] }>(`/v1/me/bookings${qs({ tab })}`).then((r) => r.items),
    enabled,
  });
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: keys.booking(id ?? ""),
    queryFn: () => api<BookingDetail>(`/v1/bookings/${id}`),
    enabled: !!id,
  });
}

/**
 * Refetches when the screen comes back into view (for example after the bride
 * returns from paying). The first focus is skipped: the query just loaded.
 * `refetch` must keep its identity between renders (React Query's does).
 */
export function useRefreshOnFocus(refetch: () => unknown, enabled = true) {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (enabled) refetch();
    }, [refetch, enabled]),
  );
}

/**
 * A random id (UUID v4) for one booking attempt. The API remembers it, so if the
 * network drops and the app sends the same booking again, it is not booked twice.
 */
export function newAttemptId(): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = "4"; // version 4: random
  hex[16] = ((parseInt(hex[16] ?? "0", 16) & 0x3) | 0x8).toString(16); // the RFC 4122 variant
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
