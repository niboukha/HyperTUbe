"use client";
import { useParams } from "next/navigation";
import { ProfileCard } from "@/components/profile/ProfileCard";

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.id as string;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: `url('/settings/settings-bg.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="relative z-10 w-full max-w-2xl mx-4">
        <ProfileCard userId={userId} />
      </div>
    </div>
  );
}
