import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import AppLayout from "@/components/layout/AppLayout";
import AuthProvider from "@/components/auth/AuthProvider";

import "./globals.css";

import { InventoryProvider } from "@/context/InventoryContext";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "IT Operations Hub",
  description:
    "Sistema de gestión de inventario IT",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (

    <html lang="es">

      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          antialiased
        `}
      >

        <InventoryProvider>

          <AuthProvider>

            <AppLayout>
              {children}
            </AppLayout>

          </AuthProvider>

        </InventoryProvider>

      </body>

    </html>
  );
}
