export const languages = ["English", "French", "Arabic"] as const

export type Language = (typeof languages)[number]