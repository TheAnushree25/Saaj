// Demo data for local development, taken from the app's own mock catalogue
// (src/data/catalogue.ts), so the app looks the same once it reads from the API.

export const categories = [
  { slug: "bridal", name: "Bridal", sortOrder: 1 },
  { slug: "celebrations", name: "Celebrations", sortOrder: 2 },
  { slug: "hair-styling", name: "Hair & Styling", sortOrder: 3 },
  { slug: "skin", name: "Skin", sortOrder: 4 },
];

export const services = [
  { slug: "bridal-makeup", name: "Bridal Makeup", category: "bridal", rupees: 25000, minutes: 90, photo: "bridal-rhea", description: "A complete, long-wear bridal look thoughtfully tailored to your features, outfit and ceremony.", inclusions: ["Skin preparation", "HD base makeup", "Eye makeup", "Hairstyling", "Lashes & touch-up"] },
  { slug: "engagement-glow", name: "Engagement Glow", category: "celebrations", rupees: 15000, minutes: 75, photo: "bridal-ananya", description: "Soft, luminous makeup for your engagement celebration.", inclusions: ["Skin preparation", "Soft glam makeup", "Hairstyling", "Lashes"] },
  { slug: "reception-edit", name: "Reception Edit", category: "celebrations", rupees: 18000, minutes: 90, photo: "bridal-meher", description: "An elevated evening look with polished definition and camera-ready finish.", inclusions: ["Full-face makeup", "Hairstyling", "Lashes", "Draping"] },
  { slug: "hair-styling", name: "Hair Styling", category: "hair-styling", rupees: 8000, minutes: 60, photo: "bridal-meher", description: "A bespoke bridal hairstyle designed around your jewellery and veil.", inclusions: ["Hair preparation", "Styling", "Accessory placement"] },
  { slug: "saree-draping", name: "Saree Draping", category: "hair-styling", rupees: 2500, minutes: 30, photo: "bridal-meher", description: "Precise, comfortable draping for classic and contemporary silhouettes.", inclusions: ["Pleat setting", "Pallu styling", "Pinning"] },
  { slug: "pre-bridal-ritual", name: "Pre-Bridal Ritual", category: "skin", rupees: 5000, minutes: 60, photo: "bridal-ananya", description: "A gentle skin preparation ritual for a rested, naturally radiant finish.", inclusions: ["Consultation", "Cleanse", "Hydration ritual"] },
  { slug: "mehendi-styling", name: "Mehendi Styling", category: "celebrations", rupees: 6500, minutes: 60, photo: "bridal-ananya", description: "Fresh, expressive beauty for your mehendi afternoon.", inclusions: ["Makeup", "Braided styling", "Floral accents"] },
  { slug: "haldi-glow", name: "Haldi Glow", category: "celebrations", rupees: 7000, minutes: 60, photo: "bridal-rhea", description: "Lightweight beauty designed for a joyful daytime celebration.", inclusions: ["Water-resistant base", "Eye makeup", "Hair styling"] },
  { slug: "jewellery-styling", name: "Jewellery Styling", category: "hair-styling", rupees: 4000, minutes: 45, photo: "bridal-rhea", description: "Thoughtful jewellery, veil and accessory placement.", inclusions: ["Look planning", "Jewellery setting", "Veil placement"] },
  { slug: "bridal-preview", name: "Bridal Preview", category: "bridal", rupees: 9000, minutes: 120, photo: "bridal-ananya", description: "A full trial to refine your wedding-day beauty direction.", inclusions: ["Consultation", "Makeup trial", "Hair trial", "Look notes"] },
];

/** Photos in backend/public/demo, which the API serves at /demo/<name>.jpg. */
export const photoUrl = (name: string) => `/demo/${name}.jpg`;
export const photos = ["bridal-rhea", "bridal-ananya", "bridal-meher"];

export const artists = [
  { name: "Rhea Kapoor", studio: "Rhea Kapoor Beauty", specialty: "Bridal Makeup", city: "Kolkata", years: 7, priceFactor: 1.0, photo: "bridal-rhea", tagline: "Bridal looks that feel like you.", bio: "Rhea's signature is luminous skin, expressive eyes and a finish that still feels beautifully like you." },
  { name: "Ananya Sen", studio: "House of Ananya", specialty: "Soft Glam", city: "Mumbai", years: 6, priceFactor: 1.2, photo: "bridal-ananya", tagline: "Modern romance, quietly refined.", bio: "Ananya pairs editorial restraint with enduring technique for effortless, camera-ready beauty." },
  { name: "Meher Basu", studio: "Meher Atelier", specialty: "Bengali Bridal", city: "Kolkata", years: 8, priceFactor: 1.1, photo: "bridal-meher", tagline: "Tradition, seen through a modern lens.", bio: "Known for artful draping and rich, balanced colour, Meher brings heritage details into the present." },
  { name: "Kavya Rao", studio: "The Veil Studio", specialty: "Engagement", city: "Delhi", years: 5, priceFactor: 0.9, photo: "bridal-ananya", tagline: "Soft light. Strong presence.", bio: "Kavya creates polished, graceful looks designed around the bride's features and celebration." },
  { name: "Ira Malhotra", studio: "Ira M Beauty", specialty: "Editorial", city: "Jaipur", years: 6, priceFactor: 1.0, photo: "bridal-rhea", tagline: "A little drama, impeccably placed.", bio: "Ira's fashion background gives every look clean structure, dimension and a memorable point of view." },
  { name: "Zoya Mirza", studio: "Zoya Artistry", specialty: "Reception", city: "Lucknow", years: 9, priceFactor: 1.15, photo: "bridal-meher", tagline: "Regal beauty without the weight.", bio: "Zoya is loved for intricate evening looks that stay fresh and comfortable through every celebration." },
  { name: "Diya Shah", studio: "Diya Bridal Room", specialty: "Minimal Bridal", city: "Ahmedabad", years: 4, priceFactor: 0.85, photo: "bridal-ananya", tagline: "Your skin, at its most radiant.", bio: "Diya specialises in modern minimal beauty and considered styling for intimate celebrations." },
  { name: "Naina Arora", studio: "Naina & Co.", specialty: "Hair & Makeup", city: "Chandigarh", years: 7, priceFactor: 1.05, photo: "bridal-rhea", tagline: "Considered from every angle.", bio: "Naina's team creates cohesive hair and makeup stories with calm, detail-led service." },
];

export const reviewers = [
  { name: "Mira Sharma", comment: "From the trial to the final touch, I felt completely understood." },
  { name: "Kavya Iyer", comment: "Stayed flawless through a twelve-hour day. Worth every rupee." },
  { name: "Aditi Rao", comment: "Calm, on time and so kind to my whole family." },
];

export const occasions = ["bridal", "engagement", "reception", "haldi", "mehendi", "sangeet"] as const;
