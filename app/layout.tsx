import "./globals.css";
import { poppins, inter, anton } from "../lib/fonts";
import { Figtree } from "next/font/google";
import { cn } from "@/lib/utils";

const figtree = Figtree({subsets:['latin'],variable:'--font-sans', preload: false,});
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(poppins.variable, inter.variable, anton.variable, "font-sans", figtree.variable)}
    >
      
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
