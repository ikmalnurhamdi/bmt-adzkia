import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/client-layout";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BMT ADZKIA",
  description: "Aplikasi Keuangan Pesantren Al-Hidayah Cisadap",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ClientLayout membungkus Sidebar dan Header */}
        <ClientLayout>
          <div className="flex flex-col min-h-screen">
            {/* Area Konten Utama */}
            <main className="flex-1">
              {children}
            </main>
            
            {/* Footer diletakkan di sini agar selalu di bawah */}
            <Footer />
          </div>
        </ClientLayout>
      </body>
    </html>
  );
}