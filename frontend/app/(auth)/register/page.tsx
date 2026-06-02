"use client"

import {  InputField } from '@/components/auth/InputField'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// export const metadata = {
//   title: 'HyperTube - Sign Up',
//   description: 'Stream your favorite movies and TV shows',
// }

export default function SignUpPage() {

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, username, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.detail || Object.values(data)?.[0]?.toString() || "Registration failed")
      }

      router.push("/home")
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
      {/* Movie Poster Background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url('/auth/auth-background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content */}
    <div className='relative z-10 min-h-screen flex flex-col'>
    <div className="flex-1 flex items-center justify-center px-4!">

      <Card className="flex flex-col  w-[495px] h-[700px] rounded-sm bg-[#151515] border-0  inset-0 opacity-89 ">

        <CardHeader className="mt-16! px-22!">
          <h4 className="text-white text-3xl font-title">Sign Up</h4>
        </CardHeader>

        <CardContent>
          <form className=''  onSubmit={handleSubmit}>

            <div className='flex flex-col justify-center items-center gap-2'>
              <div className='flex gap-2'>
                 <InputField
                placeholder="First Name"
                value={firstName}
                onChange={(e: any) => setFirstName(e.target.value)}
                type='text'
                className='w-[155px] h-[50px] py-6! px-4! rounded-sm bg-[#333333]'
              />
               <InputField
                placeholder="Last Name"
                value={lastName}
                onChange={(e: any) => setLastName(e.target.value)}
                type='text'
                className='w-[155px] h-[50px] py-6! px-4! rounded-sm bg-[#333333]'
              />
              </div>
              <InputField
                placeholder="Username"
                value={username}
                onChange={(e: any) => setUsername(e.target.value)}
                type='text'
                className='w-[314px] h-[50px] py-6! px-4! rounded-sm bg-[#333333]'
              />
              <InputField
                placeholder="Email Address"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                type='email'
                className='w-[314px] h-[50px] py-6! px-4! rounded-sm bg-[#333333]'
              />

              {/* Password Input */}
              <PasswordInput
                placeholder="Password"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                className="text-[#333333] w-[314px] h-[50px] rounded-sm text-white placeholder:text-gray-400 py-6! px-4! text-base"
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-red-500 text-sm text-center mt-2!">{error}</p>
            )}

            {/* Sign Up Button */}
            <div className='flex justify-center items-center mt-8!'>
              <Button
                type="submit"
                className="w-[314px] bg-[#BD0404] hover:bg-[#BD0404] text-white font-semibold h-[48px] rounded-sm py-3! text-base !mt-8"
              >
                Sign Up
              </Button>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right w-full sm:px-22! px-6!">
              <a
                href="forget-password"
                className="text-gray-400 hover:text-white-400 text-sm font-medium"
              >
                Forgot Password?
              </a>
            </div>

          </form>
        </CardContent>

        <CardFooter className="flex flex-1 flex-col justify-center items-center">

          {/* Divider */}
          <div className="text-center  border-gray-700 w-full mt-4!">
            <span className="text-white text-sm">OR</span>
          </div>

          {/* OAuth Buttons */}
          <div className="flex flex-row justify-center gap-8  w-full mt-5!">

            {/* Google */}
            <a href="http://localhost:8000/accounts/google/login/">
              <Button
                variant="outline"
                className="bg-white hover:bg-gray-100 border-0 py-6! w-[80px] h-[42px] rounded-sm"
              >
                <img src="/auth/google_logo.png" alt="Google" className="w-6 h-6" />
              </Button>
            </a>

            {/* GitHub */}
            <a href="http://localhost:8000/accounts/github/login/">
              <Button
                variant="outline"
                className="bg-white hover:bg-gray-100 border-0 py-6! w-[80px] h-[42px] rounded-sm"
              >
                <img src="/auth/github_logo.png" alt="GitHub" className="w-6 h-6" />
              </Button>
            </a>

            {/* 42 */}
            <a href="http://localhost:8000/accounts/intra42/login/">
              <Button
                variant="outline"
                className="bg-white hover:bg-gray-100 border-0 py-6! w-[80px] h-[42px] rounded-sm"
              >
                <img src="/auth/42_Logo.png" alt="42" className="w-6 h-6" />
              </Button>
            </a>
          </div>

          {/* Sign Up Link */}
          <div className="text-center h-full flex flex-col justify-end items-center mb-6!">
            <p className="text-gray-400 text-sm">
              Don&apos;t Already have an account?{' '}
              <a
                href="login"
                className="text-white font-semibold hover:underline"
              >
                Sign In
              </a>
            </p>
          </div>

        </CardFooter>

      </Card>
    </div>
  </div>
  </div>

  )
}
