"use client"

import { InputField } from '@/components/auth/InputField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from "next-intl"

export default function ForgetPasswordPage() {
  const t = useTranslations("Auth")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("http://localhost:8000/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to send reset email")
      }

      setSent(true)
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

            {sent ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8! px-5!">
                <div className="rounded-full bg-green-500/20 p-3!">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-base">{t("emailSent")}</p>
                  <p className="text-gray-400 text-sm mt-2">{t("emailSentDesc")}</p>
                </div>
              </div>
            ) : (
              <>
                <CardHeader className="pb-6! px-10! sm:px-12!">
                  <h1 className="text-white text-3xl sm:text-4xl font-title">{t("forgotPasswordTitle")}</h1>
                  <p className="text-gray-500 text-sm mt-2">{t("forgotPasswordDesc")}</p>
                </CardHeader>

                <CardContent className="px-6! sm:px-12!">
                  <form className="space-y-4!" onSubmit={handleSubmit}>
                    <InputField
                      placeholder={t("emailPlaceholder")}
                      type='email'
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      className='w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!'
                    />
                    {error && (
                      <p className="text-red-500 text-sm text-center">{error}</p>
                    )}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#BD0404] hover:bg-[#a30303] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold h-12 rounded-lg text-base transition-colors duration-200"
                    >
                      {loading ? t("sending") : t("resetPassword")}
                    </Button>
                  </form>
                </CardContent>
              </>
            )}

            <CardFooter className="flex flex-col px-6! sm:px-12!">
              <div className="flex justify-center items-center gap-2 w-full">
                <a href="/login" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm font-medium transition-colors">
                  <ArrowLeft className='w-4 h-4' />
                  {t("backToLogin")}
                </a>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
