import { API_URL } from "@/lib/api";

// Artists, services and bookings now come from the Saaj API (src/lib/queries.ts).
// What stays here is how the app draws their photos.

/** The three bridal photos bundled with the app. */
export const images = {
  rhea: require("../../assets/images/bridal-rhea.jpg"),
  ananya: require("../../assets/images/bridal-ananya.jpg"),
  meher: require("../../assets/images/bridal-meher.jpg"),
} as const;

/** Anything expo-image can draw: a bundled photo (a number) or a web address. */
export type Picture = number | { uri: string };

const standIns: number[] = [images.rhea, images.ananya, images.meher];

/**
 * A bundled photo for someone who has not uploaded one yet. The same id always
 * gets the same photo, so a card does not change face between visits.
 */
export function standInPicture(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return standIns[Math.abs(hash) % standIns.length] ?? images.rhea;
}

/**
 * The picture for a photo address from the API. Addresses starting with "/"
 * (the demo photos) live on the API server itself; no address at all means
 * no photo yet, so a bundled stand-in is used.
 */
export function pictureOf(url: string | null | undefined, id: string): Picture {
  if (!url) return standInPicture(id);
  return { uri: url.startsWith("/") ? `${API_URL}${url}` : url };
}
