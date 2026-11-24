import type { Metadata } from "next";
import { AUTO_3D_SCRIPT } from "@/components/landing/city3d";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ThemeSync } from "@/components/ThemeToggle";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  // Live deployment (README); makes the generated share image an absolute URL
  metadataBase: new URL("https://499-ab-frontend.vercel.app"),
  title: "CityPulse",
  description: "Intelligent Parking & Traffic Control Platform",
  twitter: { card: "summary_large_image" },
};

// Apply the saved theme before first paint to avoid a flash of the wrong theme.
// "system" follows the OS dark-mode setting (lib/theme.ts keeps it in step).
const themeInit = `try{var t=localStorage.getItem("cp-theme");if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must be a raw inline script so it runs before first paint —
            next/script drops inline beforeInteractive scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {/* On "/" only: open the 3D city on capable laptops/desktops before the
            classic page paints (rules in components/landing/city3d.ts) */}
        <script dangerouslySetInnerHTML={{ __html: AUTO_3D_SCRIPT }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ThemeSync />
        <ConnectionStatus />
      </body>
    </html>
  );
}
