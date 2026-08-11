import Hero from "@/components/sections/Hero";
import MobileSection from "@/components/sections/MobileSection";
import CustomizeSection from "@/components/sections/CustomizeSection";
import BookingSiteSection from "@/components/sections/BookingSiteSection";
import NotificationsSection from "@/components/sections/NotificationsSection";
import ContactSection from "@/components/sections/ContactSection";

export default function Home() {
  return (
    <main>
      <Hero />
      <MobileSection />
      <CustomizeSection />
      <BookingSiteSection />
      <NotificationsSection />
      <ContactSection />
    </main>
  );
}
