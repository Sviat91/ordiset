import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const description =
  "Ordiset gives salons, barbershops, studios, clinics and independent pros their own branded booking site — scheduling, reminders and client history included.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ordiset.com"),
  title: "Ordiset — Universal Booking System",
  description,
  openGraph: {
    title: "Ordiset — Universal Booking System",
    description,
    url: "https://ordiset.com",
    siteName: "Ordiset",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ordiset — Universal Booking System",
    description,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
