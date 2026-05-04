'use client'
import "./globals.css";
import { poppins, inter, anton } from "../lib/fonts";
import { Figtree } from "next/font/google";
import { cn } from "@/lib/utils";
import TopBar from "@/components/header/top-bar";
import { usePathname } from 'next/navigation';

const figtree = Figtree({subsets:['latin'],variable:'--font-sans', preload: false,});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const pathname = usePathname();

  return (
    <html
      lang="en"
      className={cn(poppins.variable, inter.variable, anton.variable, "font-sans", figtree.variable)}
    >
        <body className="min-h-screen bg-background">
        {

          pathname !== '/landing' ? <TopBar /> :null
        }
        {children}
        <div id="hover-root" />
      </body>
    </html>
  );
}
