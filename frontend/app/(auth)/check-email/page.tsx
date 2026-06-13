'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'
import { ArrowLeft } from 'lucide-react'
import { EnvelopeIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useTranslations } from "next-intl"

export default function CheckEmailPage() {
  const t = useTranslations("Auth")

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url('../auth/auth-background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <header className="absolute top-0 left-0 w-full p-6! z-20">
        <Logo />
      </header>

      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4!">
          <Card className="w-full sm:w-[495px] rounded-sm bg-[#151515] border-0">
            <CardHeader className="px-6! sm:px-12! pt-10! pb-8!">
              <div className="flex flex-col items-center gap-6! text-center">
                <div className="w-16! h-16! bg-gradient-to-br from-[#BD0404] to-[#8B0303] flex items-center justify-center rounded-full">
                  <EnvelopeIcon className="h-8! w-8! text-white" />
                </div>

                <h1 className="text-[#FFFBFB] font-semibold text-2xl! leading-tight">
                  {t("checkEmail")}
                </h1>

                <p className="text-gray-400 text-sm! leading-relaxed max-w-sm">
                  {t("checkEmailDesc")}
                </p>
              </div>
            </CardHeader>

            <CardContent className="px-6! sm:px-12! pb-8!">
              <form onSubmit={handleConfirm} className="space-y-4!">
                <Button
                  type="submit"
                  className="w-full bg-[#BD0404] hover:bg-[#9A0303] text-white font-semibold h-12! rounded-sm transition-colors duration-200"
                >
                  {t("confirmedEmail")}
                </Button>
              </form>

              <p className="text-center text-gray-500 text-xs! mt-6! leading-relaxed">
                {t("didntReceive")}
              </p>
            </CardContent>

            <CardFooter className="px-6! sm:px-12! pb-10! border-t border-gray-800">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2! py-3! text-gray-400 hover:text-white transition-colors duration-200"
              >
                <ArrowLeft className="w-4! h-4!" />
                <span className="text-sm!">{t("backToLogin")}</span>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
