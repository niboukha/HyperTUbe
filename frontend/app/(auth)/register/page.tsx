"use client"

import { InputField } from '@/components/auth/InputField'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from "next-intl"

export default function SignUpPage() {
  const t = useTranslations("Auth")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, username, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.detail || Object.values(data)?.[0]?.toString() || "Registration failed")
      }

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
        className="absolute inset-0 opacity-40"
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
              <h1 className="text-white text-3xl sm:text-4xl font-title">{t("signUp")}</h1>
            </CardHeader>

            <CardContent className="px-6! sm:px-12!">
              <form className='space-y-2!' onSubmit={handleSubmit}>
                <div className="flex flex-col sm:flex-row gap-3!">
                  <InputField
                    placeholder={t("firstNamePlaceholder")}
                    value={firstName}
                    onChange={(e: any) => setFirstName(e.target.value)}
                    type='text'
                    className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                  />
                  <InputField
                    placeholder={t("lastNamePlaceholder")}
                    value={lastName}
                    onChange={(e: any) => setLastName(e.target.value)}
                    type='text'
                    className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                  />
                </div>

                <InputField
                  placeholder={t("usernamePlaceholder")}
                  value={username}
                  onChange={(e: any) => setUsername(e.target.value)}
                  type='text'
                  className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                />
                <InputField
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e: any) => setEmail(e.target.value)}
                  type='email'
                  className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                />

                <PasswordInput
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                />

                {error && (
                  <p className="text-red-500 text-sm text-center mt-2!">{error}</p>
                )}

                <div className='flex justify-center items-center mt-8!'>
                  <Button
                    type="submit"
                    className="w-full h-12 mt-6! bg-[#BD0404] hover:bg-[#a30303] text-white font-semibold rounded-lg transition-colors"
                  >
                    {t("signUp")}
                  </Button>
                </div>

              </form>
            </CardContent>

            <CardFooter className="flex flex-col px-10! sm:px-12! py-6! gap-4!">

              <div className="w-full border-t border-gray-800">
                <div className="text-center -mt-3!">
                  <span className="bg-[#151515] text-gray-400 text-sm px-3!">
                    {t("or")}
                  </span>
                </div>
              </div>

              <div className="flex flex-row justify-center gap-4! sm:gap-6!">
                <a href="http://localhost:8000/accounts/google/login/">
                  <Button
                    variant="outline"
                    className="bg-white hover:bg-gray-100 border-0 h-12 w-12 p-0 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <img src="./auth/google_logo.png" alt="Google" className="w-5 h-5" />
                  </Button>
                </a>

                <a href="http://localhost:8000/accounts/github/login/">
                  <Button
                    variant="outline"
                    className="bg-white hover:bg-gray-100 border-0 h-12 w-12 p-0 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <img src="./auth/github_logo.png" alt="GitHub" className="w-5 h-5" />
                  </Button>
                </a>

                <a href="http://localhost:8000/accounts/intra42/login/">
                  <Button
                    variant="outline"
                    className="bg-white hover:bg-gray-100 border-0 h-12 w-12 p-0! rounded-lg flex items-center justify-center transition-colors"
                  >
                    <img src="./auth/42_Logo.png" alt="42" className="w-5 h-5" />
                  </Button>
                </a>
              </div>

              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  {t("haveAccount")}{' '}
                  <a
                    href="login"
                    className="text-white font-semibold hover:underline transition-colors"
                  >
                    {t("signIn")}
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
