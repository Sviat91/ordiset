import type { MasterId } from "../demoState";

export type ImageSlot = {
  id: string;
  src: string | null;
  alt: string;
  label: string;
  ratio: string;
};

function sequence(group: string, count: number, alt: string, label: string): ImageSlot[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return { id: `${group}/${n}`, src: null, alt: `${alt} ${n}`, label: `${label} ${i + 1}`, ratio: "3 / 4" };
  });
}

export const MASTER_PHOTOS: Record<MasterId, ImageSlot> = {
  marek: {
    id: "masters/marek",
    src: null,
    alt: "Marek Zawadzki portrait",
    label: "Marek portrait",
    ratio: "1 / 1",
  },
  anna: {
    id: "masters/anna",
    src: null,
    alt: "Anna Nowak portrait",
    label: "Anna portrait",
    ratio: "1 / 1",
  },
};

export const HOME_MARQUEE: ImageSlot[] = sequence(
  "marquee-home",
  8,
  "Salon work shot",
  "Home strip",
);

export const MAREK_MARQUEE: ImageSlot[] = sequence(
  "marquee-marek",
  8,
  "Marek's work shot",
  "Marek strip",
);

export const ABOUT_GALLERY_ROW_1: ImageSlot[] = [
  { id: "about/row1-01", src: null, alt: "Salon lighting", label: "About row 1", ratio: "4 / 3" },
  { id: "about/row1-02", src: null, alt: "Product shelf", label: "About row 1", ratio: "4 / 3" },
  { id: "about/row1-03", src: null, alt: "Lounge area", label: "About row 1", ratio: "4 / 3" },
  { id: "about/row1-04", src: null, alt: "Wash stations", label: "About row 1", ratio: "4 / 3" },
];

export const ABOUT_GALLERY_ROW_2: ImageSlot[] = [
  { id: "about/row2-01", src: null, alt: "Tool tray", label: "About row 2", ratio: "16 / 9" },
  { id: "about/row2-02", src: null, alt: "Salon floor", label: "About row 2", ratio: "16 / 9" },
];

export const REVIEW_MAP: ImageSlot = {
  id: "reviews/map",
  src: null,
  alt: "Salon location map",
  label: "Review map",
  ratio: "16 / 10",
};

export const REVIEW_AVATARS: ImageSlot[] = Array.from({ length: 4 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return { id: `reviews/avatar-${n}`, src: null, alt: `Reviewer avatar ${n}`, label: "Avatar", ratio: "1 / 1" };
});

export const BRAND_LOGO: ImageSlot = {
  id: "brand/logo",
  src: null,
  alt: "Loom & Blade logo",
  label: "Brand logo",
  ratio: "1 / 1",
};
