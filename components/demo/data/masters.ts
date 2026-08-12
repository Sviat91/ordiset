import type { MasterId } from "../demoState";

export type Master = {
  id: MasterId;
  name: string;
  role: string;
  bio: string;
  achievements: string[];
};

export type Service = {
  id: string;
  name: string;
  durationMin: number;
  originalPrice: string;
  price: string;
};

export const MASTERS: Record<MasterId, Master> = {
  marek: {
    id: "marek",
    name: "Marek Zawadzki",
    role: "Top Barber / Art Director",
    bio: "Marek has spent over a decade shaping Warsaw's sharpest fades and beards, blending classic barbering discipline with an editorial eye. He now leads the grooming floor at Loom & Blade.",
    achievements: [
      "🏆 Best Men's Grooming Team — Warsaw Style Awards, 2023",
      "🏢 Trained at the Schwarzkopf Professional Academy, London",
      "✂️ 12+ years shaping Warsaw's most photographed fades",
    ],
  },
  anna: {
    id: "anna",
    name: "Anna Nowak",
    role: "Senior Stylist / Color Expert",
    bio: "Anna is Loom & Blade's colour specialist, known for natural-looking balayage and precise cuts built around how a client actually wears their hair day to day.",
    achievements: [
      "🏆 Regional Finalist, L'Oréal Colour Trophy, 2022",
      "🏢 Certified AirTouch Colourist, Studio Fryzur Academy",
      "✂️ 9 years crafting bespoke colour for Warsaw clients",
    ],
  },
};

export const MASTER_LIST: Master[] = [MASTERS.marek, MASTERS.anna];

export const MASTER_SERVICES: Record<MasterId, Service[]> = {
  marek: [
    { id: "marek-combo-haircut-beard", name: "Combo: Haircut & Beard", durationMin: 75, originalPrice: "170 zł", price: "153 zł" },
    { id: "marek-classic-haircut", name: "Classic Men's Haircut", durationMin: 45, originalPrice: "110 zł", price: "99 zł" },
    { id: "marek-royal-shave", name: "Royal Shave with Hot Towel", durationMin: 45, originalPrice: "100 zł", price: "90 zł" },
    { id: "marek-wash-blowdry", name: "Hair Wash & Blow Dry Styling", durationMin: 45, originalPrice: "90 zł", price: "81 zł" },
    { id: "marek-hair-spa", name: "Deep Nourishing Hair SPA Treatment", durationMin: 60, originalPrice: "160 zł", price: "136 zł" },
    { id: "marek-premium-haircut", name: "Premium Haircut & Style Consultation", durationMin: 60, originalPrice: "180 zł", price: "162 zł" },
    { id: "marek-beard-trim", name: "Beard Trim & Shape", durationMin: 30, originalPrice: "80 zł", price: "72 zł" },
  ],
  anna: [
    { id: "anna-balayage", name: "Balayage / AirTouch Coloring", durationMin: 210, originalPrice: "550 zł", price: "495 zł" },
    { id: "anna-single-process-color", name: "Single-Process Color & Care", durationMin: 120, originalPrice: "320 zł", price: "288 zł" },
    { id: "anna-wash-blowdry", name: "Hair Wash & Blow Dry Styling", durationMin: 45, originalPrice: "90 zł", price: "81 zł" },
    { id: "anna-hair-spa", name: "Deep Nourishing Hair SPA Treatment", durationMin: 60, originalPrice: "160 zł", price: "136 zł" },
    { id: "anna-premium-haircut", name: "Premium Haircut & Style Consultation", durationMin: 60, originalPrice: "160 zł", price: "144 zł" },
    { id: "anna-womens-haircut", name: "Women's Haircut & Styling", durationMin: 60, originalPrice: "180 zł", price: "162 zł" },
  ],
};
