"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {  Upload } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordInput";

export default function SecurityPage() {

  const [formData, setFormData] = useState({
    "oldPassword": "",
    "newPassword": "",
    "confirmPassword": "",
  });



  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancel = () => {
    setFormData({
      "oldPassword": "",
      "newPassword": "",
      "confirmPassword": "",
    });
  };

  const handleSave = () => {
    console.log("Saving profile:", formData);
  };

  return ( <Card className="flex-1 bg-[#151515] rounded-sm border-0  bg-[#151515]/70">
            <CardContent className="p-10!">
              
              {/* Avatar */}
              <div className="flex justify-center mb-10">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#2a2a2a] relative group">
                    
                    <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                    />
                    </div>

                </div>

              {/* Form */}
              <form className="space-y-3! mt-4!">
                <div className="flex gap-2 justify-center">
                 
                  <PasswordInput
                    label="Old Password"
                    name="oldPassword"
                    value={formData.oldPassword}
                    onChange={handleChange}
                    placeholder="Old password"
                    className="rounded-sm w-[270px] h-[32px] text-gray-400 border-0"
                  />
                 
                </div>

                <div className="flex justify-center">
                  <PasswordInput
                    label="New Password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="New password"
                    className="border-0 rounded-sm w-[270px] h-[32px] text-gray-400 "
                  />
                </div>

                <div className="flex justify-center">
                  <PasswordInput
                    label="Confirm New Password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    placeholder="Confirm password"
                    onChange={handleChange}
                    className="border-0 rounded-sm w-[270px] h-[32px] text-gray-400"
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