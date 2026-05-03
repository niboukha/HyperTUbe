"use client"

import { ChevronDown, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Language, languages } from "@/constants/languages"
 
type Props = {
  currentLang: Language
  setCurrentLang: (lang: Language) => void
  onOpen?: () => void
}

export default function LanguageMenu({
  currentLang,
  setCurrentLang,
  onOpen,
}: Props) {
  return (
    <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          className="
            rounded-md backdrop-blur-2xl! backdrop-saturate-150! hover:scale-110
            transition border-white/30 bg-white/10 text-white
            hover:text-text-primary hover:bg-white/10 border h-7 md:h-8! px-1! md:px-2!
          "
          asChild
          onClick={onOpen}
        >
        <Button className="flex justify-between h-8 px-2!">
            <Globe className="w-4 h-4 opacity-70 text-text-primary" />
            <span className="text-sm font-medium">{currentLang}</span>
            <ChevronDown className="w-4 h-4 opacity-60" />
        </Button>

      </DropdownMenuTrigger >

      <DropdownMenuContent
        align="end"
        avoidCollisions
        sideOffset={8}
        className="w-35 min-w-35 backdrop-blur-2xl! backdrop-saturate-150! border p-1! rounded-md flex flex-col gap-1 shadow-xl
        border-white/30 bg-white/10 text-white"
      >
        <DropdownMenuGroup className="flex flex-col gap-2">
          {languages.map((lang) => {
            const isActive = currentLang === lang
            return (
              <DropdownMenuItem
                key={lang}
                onSelect={() => setCurrentLang(lang)}
                className={`flex items-center justify-between px-1! py-1! text-sm cursor-pointer rounded-md bg-transparent hover:bg-text-primary/5! hover:text-text-primary! hover:font-bold transition-all duration-150 shadow-2xl border-white/30  text-white ${
                  isActive
                    ? "font-bold"
                    : " bg-transparent!"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className={`w-3.5 h-3.5 ${isActive ? "opacity-100" : "opacity-50"}`} />
                  <span>{lang}</span>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-text-primary" />
                )}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}