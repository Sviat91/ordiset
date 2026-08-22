const SECTION_IDS = [
  "overview",
  "preview",
  "admin",
  "mobile",
  "booking-site",
  "notifications",
  "contact",
];

export function getSectionTops(): { id: string; top: number }[] {
  let runningTotal = 0;
  const tops: { id: string; top: number }[] = [];
  for (const id of SECTION_IDS) {
    tops.push({ id, top: runningTotal });
    const el = document.getElementById(id);
    if (el) runningTotal += el.offsetHeight;
  }
  return tops;
}

export function getSectionTop(id: string): number {
  return getSectionTops().find((entry) => entry.id === id)?.top ?? 0;
}
