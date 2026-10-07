import localFont from "next/font/local";
import { ThemeProvider } from "@/components/app/theme-provider";
import "./globals.css";

// IBM Plex (SIL Open Font License), self-hosted so builds don't depend on a font CDN
const plexSans = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-latin-400.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-sans-latin-500.woff2", weight: "500" },
    { path: "./fonts/ibm-plex-sans-latin-600.woff2", weight: "600" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-mono-latin-500.woff2", weight: "500" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata = {
  title: { default: "DevTrace — Understand how you build", template: "%s · DevTrace" },
  description:
    "DevTrace turns your GitHub activity into a clear picture of what you're building, how you work, and where your time goes.",
  icons: { icon: "/icon.svg" },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh bg-bg text-fg">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
