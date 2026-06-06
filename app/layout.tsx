import type { Metadata } from "next";
import { Rajdhani, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import GsapWrapper from "@/components/GsapWrapper";
import { AuthProvider } from "@/context/WorkTrackerContext";
import { ThemeProvider } from "@/components/theme-provider";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PGEPL Daily Work Tracker",
  description: "Operations & Maintenance Daily Work Tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${rajdhani.variable} ${ibmPlexSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <GsapWrapper>
              <main className="flex-1 flex flex-col min-h-screen">
                {children}
              </main>
            </GsapWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
