"use client"

import { User, Settings, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

type Props = {
  onOpen?: () => void
}

export default function ProfileMenu({ onOpen }: Props) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild onClick={onOpen}>
        <Button
          variant="ghost"
          className="relative h-7 w-7 md:h-8 md:w-8 rounded-md hover:scale-110 transform-gpu transition-transform duration-200"
        >
          <Avatar className="h-7 w-7 md:h-8 md:w-8 rounded-md border-0! shadow-none! ring-0! hover:ring-0! hover:border-0!">
            <AvatarImage
              src="avatars/Name=chicken.svg"
              className="rounded-md"
            />
            <AvatarFallback className="bg-linear-to-br from-accent-gold to-accent-gold text-xs font-bold">
              JD
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-40 min-w-40 backdrop-blur-md! backdrop-saturate-150! border p-2! rounded-md flex flex-col gap-2 shadow-xl
        border-white/30 bg-white/10 text-white"
      >
        <DropdownMenuLabel className="text-text-primary text-xs font-medium px-1!">
          Account
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-text-primary/30" />

        {/* PROFILE */}
        <DropdownMenuItem className="
          group rounded-md text-text-primary bg-transparent!        
          transition-all duration-150
          hover:bg-text-primary/5! hover:text-text-primary! hover:font-bold
          px-1! py-1!
        ">
          <User className="text-current! mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>

        {/* SETTINGS */}
        <DropdownMenuItem className="group rounded-md text-text-primary hover:text-text-primary! hover:font-bold transition-all duration-150 bg-transparent! hover:bg-text-primary/5! px-1! py-1!">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-text-primary/30" />

        {/* LOGOUT (Netflix accent = red text only, not red bg) */}
        <DropdownMenuItem className="group rounded-md text-text-primary! hover:bg-text-primary/5! hover:text-accent-red! hover:font-bold! transition-all duration-150 px-1! py-1!">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}