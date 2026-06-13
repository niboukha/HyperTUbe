"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputField } from "@/components/auth/InputField";
import { Upload, Check } from "lucide-react";

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    firstName: "Kaoutar",
    lastName: "Ibm",
    username: "kel-baami",
    email: "kel-baami@gmail.com",
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      avatar: imageUrl,
    }));
    setIsDirty(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsDirty(true);
  };

  const handleCancel = () => {
    setFormData({
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      firstName: "Kaoutar",
      lastName: "Ibm",
      username: "kel-baami",
      email: "kel-baami@gmail.com",
    });
    setIsDirty(false);
    setSaveSuccess(false);
  };

  const handleSave = () => {
    console.log("Saving profile:", formData);
    setSaveSuccess(true);
    setIsDirty(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a] p-4">
      <Card className="w-full max-w-[600px] bg-[#151515] border-0 rounded-sm">
        <CardContent className="p-8 sm:p-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-1">
              Profile Settings
            </h1>
            <p className="text-sm text-gray-400">
              Manage your account information and preferences
            </p>
          </div>

          {/* Avatar Section */}
          <div className="mb-10 flex justify-center">
            <input
              type="file"
              accept="image/*"
              id="avatarUpload"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <label htmlFor="avatarUpload" className="cursor-pointer">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#2a2a2a] bg-[#1f1f1f] flex items-center justify-center">
                  <img
                    src={formData.avatar}
                    alt="Profile avatar"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white text-xs gap-1">
                  <Upload className="w-5 h-5" />
                  <span>Change photo</span>
                </div>
              </div>
            </label>
          </div>

          {/* Form */}
          <form className="space-y-6">
            {/* Name Fields */}
            <div className="flex gap-4 justify-center">
              <div className="flex-1">
                <InputField
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <InputField
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>
            </div>

            {/* Username Field */}
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                <InputField
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                <InputField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>
            </div>

            {/* Success Message */}
            {saveSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-sm text-green-400 text-sm">
                <Check className="w-4 h-4" />
                <span>Profile updated successfully</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-center gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={!isDirty && !saveSuccess}
                className="border-[#444444] bg-transparent text-white hover:bg-[#1f1f1f] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[130px] h-11 rounded-sm transition-colors"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={!isDirty}
                className="bg-[#BD0404] hover:bg-[#9c0303] text-white border-0 rounded-sm min-w-[130px] h-11 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}