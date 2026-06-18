"use client"

import { useLanguage } from "@/hooks/use-language"
import { NextIntlClientProvider } from "next-intl"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import es from "@/messages/es.json"

const messages = { en, fr, es }
const langToLocale: Record<string, string> = {
  English: "en",
  French: "fr",
  Spanish: "es",
}

export default function IntlProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage()
  const locale = langToLocale[lang] ?? "en"
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale as keyof typeof messages]} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  )
}
