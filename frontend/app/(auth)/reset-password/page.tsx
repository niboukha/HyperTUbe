"use client"

import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const uid = searchParams.get("uid")
  const token = searchParams.get("token")
  const router = useRouter()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!uid || !token) {
      setError("Invalid or expired reset link.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("http://localhost:8000/api/auth/password-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || data?.detail || "Password reset failed")
      }

      router.push("/login")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <header className="absolute top-0 left-0 w-full p-6! z-20">
        <Logo />
      </header>
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url('/auth/auth-background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className='relative z-10 min-h-screen flex flex-col'>
        <div className="flex-1 flex items-center justify-center px-4!">

          <Card className="flex flex-col w-[450px] h-[430px] rounded-sm bg-[#151515] border-0 inset-0 opacity-89">

            <CardHeader className="flex justify-center items-center mt-12!">
              <h4 className="text-white text-3xl font-title">Enter New Password</h4>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className='flex flex-col justify-center items-center gap-2'>
                  <PasswordInput
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e: any) => setNewPassword(e.target.value)}
                    className="text-[#333333] w-[314px] h-[50px] rounded-sm text-white placeholder:text-gray-400 py-6! px-4! text-base"
                  />
                  <PasswordInput
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e: any) => setConfirmPassword(e.target.value)}
                    className="text-[#333333] w-[314px] h-[50px] rounded-sm text-white placeholder:text-gray-400 py-6! px-4! text-base"
                  />
                  {error && (
                    <p className="text-red-500 text-sm text-center">{error}</p>
                  )}
                </div>

                <div className='flex justify-center items-center mt-3!'>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-[314px] bg-[#BD0404] hover:bg-[#BD0404] text-white font-semibold h-[48px] rounded-sm py-3! text-base !mt-8"
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              </form>
            </CardContent>

            <CardFooter className="flex flex-1 flex-col justify-center items-center">
              <div className="text-center h-full flex justify-end items-center sm:mb-2! gap-1">
                <a href="/login"><ArrowLeft className='w-4 h-4 text-white' /></a>
                <span className='text-gray-400'>Back to Login</span>
              </div>
            </CardFooter>

          </Card>
        </div>
      </div>
    </div>
  )
}
