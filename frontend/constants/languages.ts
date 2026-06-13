export const languages = ["English", "French", "Spanish"] as const

export type Language = (typeof languages)[number]

export const LANG_CODE: Record<Language, string> = {
  "English": "en",
  "French":  "fr",
  "Spanish": "es",
}

export const CODE_LANG: Record<string, Language> = {
  "en": "English",
  "fr": "French",
  "es": "Spanish",
}