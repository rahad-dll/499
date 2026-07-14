import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CityPulse",
  description: "Intelligent Parking & Traffic Control Platform",
};

// Apply the saved theme before first paint to avoid a flash of the wrong theme
const themeInit = `try{var t=localStorage.getItem("cp-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <head>
        {/* Must be a raw inline script so it runs before first paint —
            next/script drops inline beforeInteractive scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
