import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Nav from "@/components/Nav";
import LocaleProvider from "@/components/LocaleProvider";
import { getDictionary } from "@/lib/dictionaries";
import { LOCALES, OG_LOCALES, type Locale } from "@/lib/locales";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const dynamicParams = false;
export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary();
  const languages = Object.fromEntries(LOCALES.map((l) => [l, `/${l}`]));
  return {
    metadataBase: new URL("https://ordiset.com"),
    title: dict.metadata.title,
    description: dict.metadata.description,
    alternates: {
      canonical: `/${lang}`,
      languages: { ...languages, "x-default": "/en" },
    },
    openGraph: {
      title: dict.metadata.title,
      description: dict.metadata.description,
      url: `/${lang}`,
      siteName: "Ordiset",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
      locale: OG_LOCALES[lang as Locale],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.metadata.title,
      description: dict.metadata.description,
      images: ["/og-image.png"],
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  return (
    <html lang={lang} className={inter.variable}>
      <body>
        <LocaleProvider initialLocale={lang as Locale}>
          <Nav />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
