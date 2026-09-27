// Mock catalogue for the UI phase. Steps 8 and 15 of the build guide replace
// this with the Supabase `services` and `staff` tables.

export const images = {
  rhea: require("../assets/images/bridal-rhea.jpg"),
  ananya: require("../assets/images/bridal-ananya.jpg"),
  meher: require("../assets/images/bridal-meher.jpg"),
} as const;

export type ImageKey = keyof typeof images;

export type Artist = {
  id: number;
  name: string;
  studio: string;
  category: string;
  location: string;
  rating: number;
  reviews: number;
  experience: string;
  image: number;
  tagline: string;
  bio: string;
};

export type Service = {
  id: number;
  name: string;
  price: number;
  duration: string;
  description: string;
  inclusions: string[];
  image: number;
};

export const artists: Artist[] = [
  { id: 1, name: "Rhea Kapoor", studio: "Rhea Kapoor Beauty", category: "Bridal Makeup", location: "Kolkata", rating: 4.9, reviews: 320, experience: "7 years", image: images.rhea, tagline: "Bridal looks that feel like you.", bio: "Rhea’s signature is luminous skin, expressive eyes and a finish that still feels beautifully like you." },
  { id: 2, name: "Ananya Sen", studio: "House of Ananya", category: "Soft Glam", location: "Mumbai", rating: 4.9, reviews: 284, experience: "6 years", image: images.ananya, tagline: "Modern romance, quietly refined.", bio: "Ananya pairs editorial restraint with enduring technique for effortless, camera-ready beauty." },
  { id: 3, name: "Meher Basu", studio: "Meher Atelier", category: "Bengali Bridal", location: "Kolkata", rating: 4.8, reviews: 198, experience: "8 years", image: images.meher, tagline: "Tradition, seen through a modern lens.", bio: "Known for artful draping and rich, balanced colour, Meher brings heritage details into the present." },
  { id: 4, name: "Kavya Rao", studio: "The Veil Studio", category: "Engagement", location: "Delhi", rating: 4.8, reviews: 176, experience: "5 years", image: images.ananya, tagline: "Soft light. Strong presence.", bio: "Kavya creates polished, graceful looks designed around the bride’s features and celebration." },
  { id: 5, name: "Ira Malhotra", studio: "Ira M Beauty", category: "Editorial", location: "Jaipur", rating: 4.7, reviews: 143, experience: "6 years", image: images.rhea, tagline: "A little drama, impeccably placed.", bio: "Ira’s fashion background gives every look clean structure, dimension and a memorable point of view." },
  { id: 6, name: "Zoya Mirza", studio: "Zoya Artistry", category: "Reception", location: "Lucknow", rating: 4.9, reviews: 251, experience: "9 years", image: images.meher, tagline: "Regal beauty without the weight.", bio: "Zoya is loved for intricate evening looks that stay fresh and comfortable through every celebration." },
  { id: 7, name: "Diya Shah", studio: "Diya Bridal Room", category: "Minimal Bridal", location: "Ahmedabad", rating: 4.7, reviews: 121, experience: "4 years", image: images.ananya, tagline: "Your skin, at its most radiant.", bio: "Diya specialises in modern minimal beauty and considered styling for intimate celebrations." },
  { id: 8, name: "Naina Arora", studio: "Naina & Co.", category: "Hair & Makeup", location: "Chandigarh", rating: 4.8, reviews: 209, experience: "7 years", image: images.rhea, tagline: "Considered from every angle.", bio: "Naina’s team creates cohesive hair and makeup stories with calm, detail-led service." },
];

export const services: Service[] = [
  { id: 1, name: "Bridal Makeup", price: 25000, duration: "90 min", description: "A complete, long-wear bridal look thoughtfully tailored to your features, outfit and ceremony.", inclusions: ["Skin preparation", "HD base makeup", "Eye makeup", "Hairstyling", "Lashes & touch-up"], image: images.rhea },
  { id: 2, name: "Engagement Glow", price: 15000, duration: "75 min", description: "Soft, luminous makeup for your engagement celebration.", inclusions: ["Skin preparation", "Soft glam makeup", "Hairstyling", "Lashes"], image: images.ananya },
  { id: 3, name: "Reception Edit", price: 18000, duration: "90 min", description: "An elevated evening look with polished definition and camera-ready finish.", inclusions: ["Full-face makeup", "Hairstyling", "Lashes", "Draping"], image: images.meher },
  { id: 4, name: "Hair Styling", price: 8000, duration: "60 min", description: "A bespoke bridal hairstyle designed around your jewellery and veil.", inclusions: ["Hair preparation", "Styling", "Accessory placement"], image: images.meher },
  { id: 5, name: "Saree Draping", price: 2500, duration: "30 min", description: "Precise, comfortable draping for classic and contemporary silhouettes.", inclusions: ["Pleat setting", "Pallu styling", "Pinning"], image: images.meher },
  { id: 6, name: "Pre-Bridal Ritual", price: 5000, duration: "60 min", description: "A gentle skin preparation ritual for a rested, naturally radiant finish.", inclusions: ["Consultation", "Cleanse", "Hydration ritual"], image: images.ananya },
  { id: 7, name: "Mehendi Styling", price: 6500, duration: "60 min", description: "Fresh, expressive beauty for your mehendi afternoon.", inclusions: ["Makeup", "Braided styling", "Floral accents"], image: images.ananya },
  { id: 8, name: "Haldi Glow", price: 7000, duration: "60 min", description: "Lightweight beauty designed for a joyful daytime celebration.", inclusions: ["Water-resistant base", "Eye makeup", "Hair styling"], image: images.rhea },
  { id: 9, name: "Jewellery Styling", price: 4000, duration: "45 min", description: "Thoughtful jewellery, veil and accessory placement.", inclusions: ["Look planning", "Jewellery setting", "Veil placement"], image: images.rhea },
  { id: 10, name: "Bridal Preview", price: 9000, duration: "120 min", description: "A full trial to refine your wedding-day beauty direction.", inclusions: ["Consultation", "Makeup trial", "Hair trial", "Look notes"], image: images.ananya },
];

export const categories = ["All", "Bridal Makeup", "Hair Styling", "Mehendi", "Saree Draping", "Pre-Bridal"];

export const dates = [
  { day: "12", dow: "MON", full: "12 October 2026" },
  { day: "13", dow: "TUE", full: "13 October 2026" },
  { day: "14", dow: "WED", full: "14 October 2026" },
  { day: "15", dow: "THU", full: "15 October 2026" },
  { day: "16", dow: "FRI", full: "16 October 2026" },
] as const;

export const slots = [
  { time: "09:00 AM", available: true },
  { time: "11:00 AM", available: true },
  { time: "01:00 PM", available: false },
  { time: "03:00 PM", available: true },
  { time: "05:00 PM", available: true },
] as const;

export const serviceTypes = ["All", "Bridal", "Celebrations", "Hair & Styling", "Skin"] as const;
export type ServiceType = (typeof serviceTypes)[number];

const serviceMeta: Record<number, { type: ServiceType; popularity: number; rating: number }> = {
  1: { type: "Bridal", popularity: 98, rating: 4.9 },
  2: { type: "Celebrations", popularity: 86, rating: 4.8 },
  3: { type: "Celebrations", popularity: 80, rating: 4.8 },
  4: { type: "Hair & Styling", popularity: 90, rating: 4.9 },
  5: { type: "Hair & Styling", popularity: 75, rating: 4.7 },
  6: { type: "Skin", popularity: 70, rating: 4.8 },
  7: { type: "Celebrations", popularity: 78, rating: 4.7 },
  8: { type: "Celebrations", popularity: 72, rating: 4.7 },
  9: { type: "Hair & Styling", popularity: 64, rating: 4.6 },
  10: { type: "Bridal", popularity: 84, rating: 4.9 },
};

export const metaOf = (id: number) => serviceMeta[id] ?? { type: "Bridal" as const, popularity: 50, rating: 4.7 };

export const findArtist = (id: number | string | undefined) => artists.find((a) => a.id === Number(id)) ?? artists[0];
export const findService = (id: number | string | undefined) => services.find((s) => s.id === Number(id)) ?? services[0];

export type BookingSelection = { label: string; items: string[]; total: number };
