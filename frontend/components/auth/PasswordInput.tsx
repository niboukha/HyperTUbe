'use client'

import { Input } from '@/components/ui/input'
import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  showToggle?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, showToggle = true, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <Input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className={`bg-[#333333] border-0 text-white placeholder:text-gray-400 py-5! px-4! text-base focus:ring-red-500 focus:border-red-500 ${showToggle ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {showToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 px-2!"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'