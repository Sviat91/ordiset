import Hero from "@/components/sections/Hero";
import PreviewSection from "@/components/sections/PreviewSection";
import MobileSection from "@/components/sections/MobileSection";
import BookingSiteSection from "@/components/sections/BookingSiteSection";
import NotificationsSection from "@/components/sections/NotificationsSection";
import ContactSection from "@/components/sections/ContactSection";

// Render order must stay in sync with the `z` props passed to StackSection
// in each section component (Hero=1, Preview=2, Mobile=3, BookingSite=4,
// Notifications=5, Contact=6 set in its own CSS).
export default function Home() {
  return (
    <main>
      <Hero />
      <PreviewSection />
      <MobileSection />
      <BookingSiteSection />
      <NotificationsSection />
      <ContactSection />
    </main>
  );
}
