"use client"

import { InputField } from '@/components/auth/InputField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'

export default function ForgetPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("http://localhost:8000/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to send reset email")
      }

      setSent(true)
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

          <Card className="flex flex-col w-[450px] h-[409px] rounded-sm bg-[#151515] border-0 inset-0 opacity-89">

            <CardHeader className="sm:mt-12! sm:mb-2! sm:px-17! px-4!">
              <h4 className="text-white text-3xl font-title">Reset Password</h4>
              <span className="text-gray-400 text-sm mt-2">Enter your email to reset your password.</span>
            </CardHeader>

            <CardContent>
              {sent ? (
                <p className="text-green-400 text-sm text-center px-4!">
                  Check your email — a reset link has been sent.
                </p>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className='flex flex-col justify-center items-center gap-2'>
                    <span className="text-white text-sm w-full sm:px-18! px-4!">Email</span>
                    <InputField
                      placeholder="Email Address"
                      type='email'
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      className='w-[314px] h-[50px] py-6! px-4! rounded-sm bg-[#333333]'
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
                      {loading ? "Sending..." : "Reset Password"}
                    </Button>
                  </div>
                </form>
              )}
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
