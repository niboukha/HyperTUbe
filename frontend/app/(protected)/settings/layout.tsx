"use client";

import { usePathname, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Settings");

  const activeTab = pathname.includes("security") ? "security" : "profile";

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      

      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: `url('../settings/settings-bg.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="fixed inset-0 flex items-center justify-center">

        <div className="w-full max-w-4xl mx-4 flex overflow-hidden">

          {/* SIDEBAR CARD */}
          <Card className="w-[114px] h-[536px] bg-[#151515] border-r border-[#333333] rounded-none bg-[#151515]/70">
            <CardContent className="p-6!">
              <nav className="space-y-2! ">
                <button
                onClick={() => router.push("/settings/profile")}
                  className={`relative inline-block w-full py-1.5! text-sm font-medium transition ${
                        activeTab === "profile"
                            ? "text-white font-bold after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-6 after:h-[2px] after:bg-[#BD0404]"
                            : "text-gray-400"
                        }`}
                >
                  {t("profile")}
                </button>
                <button
                    onClick={() => router.push("/settings/security")}
                    className={`relative inline-block w-full py-1.5! text-sm font-medium transition ${
                        activeTab === "security"
                            ? "text-white font-bold after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-6 after:h-[2px] after:bg-[#BD0404]"
                            : "text-gray-400"
                        }`}
                >
                  {t("security")}
                </button>
              </nav>
            </CardContent>
          </Card>
            {children}
        </div>
      </div>
    </div>
  );
}