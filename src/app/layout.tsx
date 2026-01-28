import type { Metadata } from "next";
import { Inter, Lora, Courier_Prime, Shadows_Into_Light } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const shadowsIntoLight = Shadows_Into_Light({
  variable: "--font-shadows-into-light",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "dreamtree",
  description: "Career development workbook - discover your path",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) { // code_id:139
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manufacturing+Consent&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${lora.variable} ${courierPrime.variable} ${shadowsIntoLight.variable}`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>
          <main id="main-content">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
