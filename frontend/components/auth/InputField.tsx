'use client'

import { Input } from '@/components/ui/input'
import { InputHTMLAttributes, forwardRef } from 'react'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const InputField = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-1! md:mb-2!">
            {label}
          </label>
        )}
        <Input
          ref={ref}
          className={`bg-[#333333] border-0 text-white text-sm!  placeholder:text-gray-400 py-5! px-4!  focus:ring-red-500 focus:border-red-500 ${className}`}
          {...props}
        />
        {error && (
          <p className="text-red-500 text-sm mt-2!">{error}</p>
        )}
      </div>
    )
  }
)

InputField.displayName = 'InputField'