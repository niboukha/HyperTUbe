"use client"

import { InputField } from '@/components/auth/InputField'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'
import { useRouter } from 'next/navigation'
import { useState } from "react"
import { resetLanguageState } from "@/hooks/use-language"
import { useTranslations } from "next-intl"

export default function SignInPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const t = useTranslations("Auth")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.detail || "Login failed")
      }

      resetLanguageState()
      router.push("/home")
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

          <Card className="flex flex-col justify-center w-[495px] sm:h-[687px] h-[620px] rounded-sm bg-[#151515] border-0 inset-0 opacity-89">

            <CardHeader className="pb-6! px-10! sm:px-12! text-center">
              <h1 className="text-white text-3xl sm:text-4xl font-title">{t("signIn")}</h1>
            </CardHeader>

            <CardContent className="px-6! sm:px-12!">
              <form className="space-y-2!" onSubmit={handleLogin}>

                <div>
                  <InputField
                    value={username}
                    onChange={(e: any) => setUsername(e.target.value)}
                    placeholder={t("usernamePlaceholder")}
                    type="text"
                    className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                  />
                </div>

                <div>
                  <PasswordInput
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    placeholder={t("passwordPlaceholder")}
                    className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center mt-2!">{error}</p>
                )}

                <div className="pt-4!">
                  <Button
                    type="submit"
                    className="w-full bg-[#BD0404] hover:bg-[#a30303] text-white font-semibold h-12 rounded-lg text-base transition-colors duration-200"
                  >
                    {t("signIn")}
                  </Button>
                </div>

                <div className="flex justify-end text-center">
                  <a
                    href="forget-password"
                    className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    {t("forgotPassword")}
                  </a>
                </div>

              </form>
            </CardContent>

            <CardFooter className="flex flex-col px-6! sm:px-12! pb-15!">

              <div className="w-full border-t border-gray-800 my-6!">
                <div className="text-center -mt-3!">
                  <span className="bg-[#151515] text-gray-400 text-sm px-3!">
                    {t("or")}
                  </span>
                </div>
              </div>

              <div className="flex flex-row justify-center gap-4! w-full">
                <a href="http://localhost:8000/accounts/google/login/">
                  <Button
                    variant="outline"
                    className="bg-white hover:bg-gray-100 border-0 w-14! h-12! rounded-lg flex items-center justify-center transition-colors"
                    aria-label="Sign in with Google"
                  >
                    <img src="./auth/google_logo.png" alt="" className="w-5 h-5" />
                  </Button>
                </a>

                <a href="http://localhost:8000/accounts/github/login/">
                  <Button
                    variant="outline"
                    className="bg-white hover:bg-gray-100 border-0 w-14! h-12! rounded-lg flex items-center justify-center transition-colors"
                    aria-label="Sign in with GitHub"
                  >
                    <img src="./auth/github_logo.png" alt="" className="w-5 h-5" />
                  </Button>
                </a>

                <a href="http://localhost:8000/accounts/intra42/login/">
                  <Button
                    variant="outline"
                    className="bg-white hover:bg-gray-100 border-0 w-14! h-12! rounded-lg flex items-center justify-center transition-colors"
                    aria-label="Sign in with 42"
                  >
                    <img src="./auth/42_Logo.png" alt="" className="w-5 h-5" />
                  </Button>
                </a>
              </div>

              <div className="text-center mt-6!">
                <p className="text-gray-400 text-sm">
                  {t("noAccount")}{' '}
                  <a
                    href="register"
                    className="text-white font-semibold hover:underline transition-colors"
                  >
                    {t("signUp")}
                  </a>
                </p>
              </div>

            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
