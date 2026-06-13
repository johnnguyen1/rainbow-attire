import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { CartProvider } from "@/components/cart-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rainbow Attire",
  description: "Customized business apparel and promotional products",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
