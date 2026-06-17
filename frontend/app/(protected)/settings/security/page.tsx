"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const FALLBACK_AVATAR = "/avatars/Name=angryman.svg";

export default function SecurityPage() {
  const t = useTranslations("Settings");

  const [avatar, setAvatar] = useState<string>(FALLBACK_AVATAR);
  const [formData, setFormData] = useState({
    oldPassword:     "",
    newPassword:     "",
    confirmPassword: "",
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.avatar) setAvatar(data.avatar) })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleCancel = () => {
    setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setError(null);
    setSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`${API}/auth/settings/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_password:     formData.oldPassword,
          new_password:     formData.newPassword,
          confirm_password: formData.confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || data.old_password || "Password update failed.");
      }

      setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = formData.oldPassword || formData.newPassword || formData.confirmPassword;

  return (
    <Card className="flex-1 bg-[#151515] rounded-md border-0 bg-[#151515]/70">
      <CardContent className="p-8! sm:p-12!">

        {/* Avatar */}
        <div className="flex justify-center mb-10">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#2a2a2a]">
            <img src={avatar} alt="Profile avatar" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Form */}
        <form className="space-y-4! mt-4! px-50!" onSubmit={handleSave}>
          <div className="flex justify-center">
            <div className="w-full">
              <PasswordInput
                label={t("oldPassword")}
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleChange}
                placeholder={t("oldPassword")}
                className="border-0 rounded-md w-full"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full">
              <PasswordInput
                label={t("newPassword")}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder={t("newPassword")}
                className="border-0 rounded-md w-full"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full">
              <PasswordInput
                label={t("confirmNewPassword")}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={t("confirmNewPassword")}
                className="border-0 rounded-md w-full"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          {success && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              <span>Password updated successfully.</span>
            </div>
          )}

          <div className="flex justify-center gap-8 mt-6!">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={!isDirty || saving}
              className="border-[#444444] bg-transparent text-white hover:bg-[#1f1f1f] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[130px] rounded-sm transition-colors"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!isDirty || saving}
              className="bg-[#BD0404] hover:bg-[#9c0303] text-white border-0 rounded-sm min-w-[130px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("saveChanges")}
            </Button>
          </div>
        </form>

      </CardContent>
    </Card>
  );
}
