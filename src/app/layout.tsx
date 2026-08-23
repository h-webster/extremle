import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Poppins } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const SITE_URL = "https://www.extremle.io";
const TITLE = "Extremle | Geometry Dash Extreme Demon Wordle";
const DESCRIPTION =
  "Extremle is a daily Wordle-style guessing game for the Geometry Dash extreme demon community. Six guesses to name the mystery level from the Pointercrate top 150 demonlist.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/extremlelogo-removebg.png",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Extremle",
    images: ["/extremlelogo.png"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/extremlelogo.png"],
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Extremle",
  alternateName: [
    "Extreme Demon Wordle",
    "Geometry Dash Extreme Demon Wordle",
    "Geometry Dash Wordle",
  ],
  description: DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "GameApplication",
  genre: "Puzzle",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-text-primary">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <div className="decor-squares decor-squares-left" aria-hidden="true" />
        <div className="decor-squares decor-squares-right" aria-hidden="true" />
        <Navbar />
        <main className="flex-1 flex flex-col pt-14">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
