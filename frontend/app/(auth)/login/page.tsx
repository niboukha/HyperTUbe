import {  InputField } from '@/components/auth/InputField'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'

export const metadata = {
  title: 'HyperTube - Sign In',
  description: 'Stream your favorite movies and TV shows',
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Movie Poster Background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url('./auth/auth-background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content */}
    <div className='relative z-10 min-h-screen flex flex-col'>
    <div className="flex-1 flex items-center justify-center px-4!">

      <Card className="flex flex-col  w-[495px] sm:h-[687px]  h-[620px] rounded-sm bg-[#151515] border-0  inset-0 opacity-89 ">

        <CardHeader className="pb-6! pt-10! px-6! sm:px-8!">
          <div className="flex justify-start mb-10!">
            <Logo />
          </div>
          <h1 className="text-white text-3xl sm:text-4xl font-title text-center">
            Sign In
          </h1>
        </CardHeader>

        <CardContent className="px-6! sm:px-8!">
          <form className="space-y-2!">

            {/* Email Input */}
            <div>
              <InputField
                placeholder="Email Address"
                type="email"
                className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5! px-4!"
              />
            </div>

            {/* Password Input */}
            <div>
              <PasswordInput
                placeholder="Password"
                className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5! px-4!"
              />
            </div>

            {/* Sign In Button */}
            <div className="pt-4!">
                <Button
                  type="submit"
                  className="w-full bg-[#BD0404] hover:bg-[#a30303] text-white font-semibold h-12 rounded-lg text-base transition-colors duration-200"
                >
                  Sign In
                </Button>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end text-center">
              <a
                href="/auth/forgot-password"
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                Forgot Password?
              </a>
            </div>

          </form>
        </CardContent>

        <CardFooter className="flex flex-col px-6! sm:px-8! pb-8!">

          {/* Divider */}
          <div className="w-full border-t border-gray-800 my-6!">
            <div className="text-center -mt-3!">
              <span className="bg-[#151515] text-gray-400 text-sm px-3!">
                OR
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="flex flex-row justify-center gap-4! w-full">
            {/* Google */}
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-100 border-0 w-14! h-12! rounded-lg flex items-center justify-center transition-colors"
              aria-label="Sign in with Google"
            >
              <img
                src="./auth/google_logo.png"
                alt=""
                className="w-5 h-5"
              />
            </Button>

            {/* GitHub */}
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-100 border-0 w-14! h-12! rounded-lg flex items-center justify-center transition-colors"
              aria-label="Sign in with GitHub"
            >
              <img
                src="./auth/github_logo.png"
                alt=""
                className="w-5 h-5"
              />
            </Button>

            {/* 42 */}
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-100 border-0 w-14! h-12! rounded-lg flex items-center justify-center transition-colors"
              aria-label="Sign in with 42"
            >
              <img
                src="./auth/42_Logo.png"
                alt=""
                className="w-5 h-5"
              />
            </Button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center mt-6!">
            <p className="text-gray-400 text-sm">
              Don&apos;t have an account?{' '}
              <a
                href="register"
                className="text-white font-semibold hover:underline transition-colors"
              >
                Sign up
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
