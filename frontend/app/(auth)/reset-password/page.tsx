"use client"

import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from "next-intl"

export default function ResetPasswordPage() {
  const t = useTranslations("Auth")
  const searchParams = useSearchParams()
  const uid = searchParams.get("uid")
  const token = searchParams.get("token")
  const router = useRouter()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!uid || !token) {
      setError(t("invalidResetLink"))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("http://localhost:8000/api/auth/password-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || data?.detail || "Password reset failed")
      }

      router.push("/login")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url('./auth/auth-background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="absolute top-0 left-0 w-full p-6! z-20">
        <Logo />
      </div>

      <div className='relative z-10 min-h-screen flex flex-col'>
        <div className="flex-1 flex items-center justify-center px-4!">

          <Card className="flex flex-col justify-center w-[495px] sm:h-[500px] h-[450px] rounded-sm bg-[#151515] border-0 inset-0 opacity-89">

            <CardHeader className="pb-6! px-10! sm:px-12! text-center">
              <h1 className="text-white text-3xl sm:text-4xl font-title">{t("resetPassword")}</h1>
            </CardHeader>

            <CardContent className="px-6! sm:px-12!">
              <form className="space-y-4!" onSubmit={handleSubmit}>
                <div className='space-y-2!'>
                  <PasswordInput
                    placeholder={t("newPasswordPlaceholder")}
                    value={newPassword}
                    onChange={(e: any) => setNewPassword(e.target.value)}
                    className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                  />
                  <PasswordInput
                    placeholder={t("confirmPasswordPlaceholder")}
                    value={confirmPassword}
                    onChange={(e: any) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                  />
                  {error && (
                    <p className="text-red-500 text-sm text-center">{error}</p>
                  )}
                </div>

                <div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#BD0404] hover:bg-[#a30303] text-white font-semibold h-12 rounded-lg text-base transition-colors duration-200"
                  >
                    {loading ? t("resetting") : t("resetPassword")}
                  </Button>
                </div>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col px-6! sm:px-12!">
              <a href="/login" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm font-medium transition-colors">
                <ArrowLeft className='w-4 h-4' />
                {t("backToLogin")}
              </a>
            </CardFooter>

          </Card>
        </div>
      </div>
    </div>
  )
}
