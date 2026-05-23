"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { InputField } from "@/components/auth/InputField";
import {  Upload } from "lucide-react";

export default function ProfilePage() {

  const [formData, setFormData] = useState({
    avatar:  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    firstName: "Kaoutar",
    lastName: "Ibm",
    username: "kel-baami",
    email: "kel-baami@gmail.com",
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const imageUrl = URL.createObjectURL(file);
  setFormData((prev) => ({
    ...prev,
    avatar: imageUrl,
  }));
};
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancel = () => {
    setFormData({
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      firstName: "Kaoutar",
      lastName: "Ibm",
      username: "kel-baami",
      email: "kel-baami@gmail.com",
    });
  };

  const handleSave = () => {
    console.log("Saving profile:", formData);
  };

  return (<Card className="flex-1 bg-[#151515] rounded-sm border-0  bg-[#151515]/70">
            <CardContent className="p-10!">
              
              {/* Avatar */}
              <div className="flex justify-center mb-10">
  
                {/* hidden file input */}
                <input
                    type="file"
                    accept="image/*"
                    id="avatarUpload"
                    className="hidden"
                    onChange={handleAvatarChange}
                />

                {/* clickable avatar */}
                <label htmlFor="avatarUpload" className="cursor-pointer">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#2a2a2a] relative group">
                    
                    <img
                        src={formData.avatar}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                    />

                    {/* overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex  flex-col items-center justify-center text-white text-xs">
                        <Upload/>
                        <span className="ml-1">Change image</span>
                    </div>
                    </div>
                </label>

                </div>

              {/* Form */}
              <form className="space-y-3! mt-4!">
                <div className="flex gap-2 justify-center">
                  <InputField
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="rounded-xs w-[132px] h-[28px] text-gray-400"
                  />
                  <InputField
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="rounded-xs w-[132px] h-[28px] text-gray-400 "
                  />
                </div>

                <div className="flex justify-center">
                  <InputField
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="border-0 rounded-xs w-[270px] h-[28px] text-gray-400"
                  />
                </div>

                <div className="flex justify-center">
                  <InputField
                    label="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="rounded-xs w-[270px] h-[28px] text-gray-400"
                  />
                </div>

                <div className="flex justify-center gap-8 mt-6!">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="border-[#444444] bg-transparent text-white hover:bg-[#1f1f1f] w-[120px] h-[28px] rounded-sm"
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={handleSave}
                    className="bg-[#BD0404] hover:bg-[#9c0303] text-white border-0 rounded-sm w-[120px] h-[28px]"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>

            </CardContent>
          </Card>
  );
}