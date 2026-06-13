"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputField } from "@/components/auth/InputField";
import { Check, Upload, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type FormData = {
  avatar:    string;
  firstName: string;
  lastName:  string;
  username:  string;
  email:     string;
};

const EMPTY: FormData = { avatar: "", firstName: "", lastName: "", username: "", email: "" };

type Props = { userId?: string };

export function ProfileCard({ userId }: Props) {
  const t = useTranslations("Settings");
  const isReadOnly = !!userId;

  const [formData,    setFormData]    = useState<FormData>(EMPTY);
  const [original,   setOriginal]    = useState<FormData>(EMPTY);
  const [loading,    setLoading]     = useState(true);
  const [saving,     setSaving]      = useState(false);
  const [error,      setError]       = useState<string | null>(null);
  const [success,    setSuccess]     = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const url = userId
      ? `${API}/api/users/${userId}/`
      : `${API}/api/auth/me`;

    fetch(url, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setFormData({
          avatar:    data.avatar ?? "",
          firstName: data.first_name ?? "",
          lastName:  data.last_name ?? "",
          username:  data.username ?? "",
          email:     data.email ?? "",
        });
        setOriginal({
          avatar:    data.avatar ?? "",
          firstName: data.first_name ?? "",
          lastName:  data.last_name ?? "",
          username:  data.username ?? "",
          email:     data.email ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(original) || pendingFile !== null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setFormData(prev => ({ ...prev, avatar: URL.createObjectURL(file) }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setFormData(original);
    setPendingFile(null);
    setError(null);
    setSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (pendingFile) {
        const form = new FormData();
        form.append("avatar", pendingFile);
        const res = await fetch(`${API}/api/auth/me/avatar`, {
          method: "POST",
          credentials: "include",
          body: form,
        });
        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({ ...prev, avatar: data.avatar }));
          setOriginal(prev => ({ ...prev, avatar: data.avatar }));
        } else {
          const err = await res.json();
          throw new Error(err.error || "Avatar upload failed");
        }
        setPendingFile(null);
      }

      const payload: Record<string, string> = {};
      if (formData.firstName !== original.firstName) payload.first_name = formData.firstName;
      if (formData.lastName  !== original.lastName)  payload.last_name  = formData.lastName;
      if (formData.username  !== original.username)  payload.username   = formData.username;
      if (formData.email     !== original.email)     payload.email      = formData.email;

      if (Object.keys(payload).length > 0) {
        const res = await fetch(`${API}/api/auth/me`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          const msg = Object.values(err).flat().join(" ");
          throw new Error(msg || "Update failed");
        }
        const updated = await res.json();
        const newData: FormData = {
          avatar:    updated.avatar    ?? formData.avatar,
          firstName: updated.first_name ?? formData.firstName,
          lastName:  updated.last_name  ?? formData.lastName,
          username:  updated.username   ?? formData.username,
          email:     updated.email      ?? formData.email,
        };
        setFormData(newData);
        setOriginal(newData);
      } else if (!pendingFile) {
        setOriginal({ ...formData });
      }

      setSuccess(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = formData.avatar || "/avatars/Name=angryman.svg";

  return (
    <Card className="flex-1 bg-[#151515] rounded-md border-0 bg-[#151515]/70">
      <CardContent className="p-8! sm:p-12!">

        {/* Avatar */}
        <div className="flex justify-center mb-10!">
          {!isReadOnly && (
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              id="avatarUpload"
              className="hidden"
              onChange={handleAvatarChange}
            />
          )}
          <label
            htmlFor={isReadOnly ? undefined : "avatarUpload"}
            className={isReadOnly ? "cursor-default" : "cursor-pointer"}
          >
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#2a2a2a] relative group">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center bg-[#2a2a2a]">
                  <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                </div>
              ) : (
                <img src={avatarSrc} alt="Profile avatar" className="w-full h-full object-cover" />
              )}
              {!isReadOnly && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs">
                  <Upload />
                  <span className="ml-1">{t("changeImage")}</span>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Form */}
        <form className="space-y-4! px-35!" onSubmit={handleSave}>
          <div className="flex gap-2 justify-center">
            <div className="flex-1">
              <InputField
                label={t("firstName")}
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full rounded-md"
                disabled={loading || isReadOnly}
              />
            </div>
            <div className="flex-1">
              <InputField
                label={t("lastName")}
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full rounded-md"
                disabled={loading || isReadOnly}
              />
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full">
              <InputField
                label={t("username")}
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="border-0 rounded-md w-full"
                disabled={loading || isReadOnly}
              />
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex justify-center">
              <div className="w-full">
                <InputField
                  label={t("email")}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="border-0 rounded-md w-full"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {!isReadOnly && (
            <>
              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}
              {success && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  <span>Profile updated successfully</span>
                </div>
              )}

              <div className="flex justify-center gap-4 pt-4! px-35!">
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
            </>
          )}
        </form>

      </CardContent>
    </Card>
  );
}
