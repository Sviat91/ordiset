import Hero from "@/components/sections/Hero";
import PreviewSection from "@/components/sections/PreviewSection";
import AdminPanelSection from "@/components/sections/AdminPanelSection";
import MobileSection from "@/components/sections/MobileSection";
import BookingSiteSection from "@/components/sections/BookingSiteSection";
import NotificationsSection from "@/components/sections/NotificationsSection";
import ContactSection from "@/components/sections/ContactSection";
import ScrollDock from "@/components/ScrollDock";

// Render order must stay in sync with the `z` props passed to StackSection
// in each section component (Hero=1, Preview=2, Admin=3, Mobile=4,
// BookingSite=5, Notifications=6, Contact=7 set in its own CSS).
export default function Home() {
  return (
    <main>
      {/* Renders null; docks scroll to section boundaries after a user gesture settles */}
      <ScrollDock />
      <Hero />
      <PreviewSection />
      <AdminPanelSection />
      <MobileSection />
      <BookingSiteSection />
      <NotificationsSection />
      <ContactSection />
    </main>
  );
}
