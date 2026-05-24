import { InputField } from '@/components/auth/InputField'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'

export const metadata = {
  title: 'HyperTube - Sign Up',
  description: 'Stream your favorite movies and TV shows',
}

export default function SignUpPage() {
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

      <div className="absolute top-0 left-0 w-full p-6! z-20">
        <Logo />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4!">
          <Card className="flex flex-col justify-center  w-[495px] sm:h-[687px]  h-[620px] rounded-sm bg-[#151515] border-0  inset-0 opacity-89 ">
            {/* Logo Inside Card */}
            <CardHeader className="pt-6! px-10! sm:px-12!">
              <h1 className="text-white text-3xl sm:text-4xl font-title">Sign Up</h1>
            </CardHeader>

            <CardContent className="px-10! sm:px-12!">
              <form className="space-y-2!">
                {/* First Name & Last Name */}
                <div className="flex flex-col sm:flex-row gap-3!">
                  <InputField
                    placeholder="First Name"
                    type="text"
                    className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                  />
                  <InputField
                    placeholder="Last Name"
                    type="text"
                    className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                  />
                </div>

                {/* Username */}
                <InputField
                  placeholder="Username"
                  type="text"
                  className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                />

                {/* Email */}
                <InputField
                  placeholder="Email Address"
                  type="email"
                  className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                />

                {/* Password */}
                <PasswordInput
                  placeholder="Password"
                  className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                />

                {/* Sign Up Button */}
                <Button
                  type="submit"
                  className="w-full h-12 mt-6! bg-[#BD0404] hover:bg-[#a30303] text-white font-semibold rounded-lg transition-colors"
                >
                  Sign Up
                </Button>

                {/* Forgot Password Link */}
                {/* <div className="text-right">
                  <a
                    href="forget-password"
                    className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    Forgot Password?
                  </a>
                </div> */}
              </form>
            </CardContent>

            <CardFooter className="flex flex-col px-10! sm:px-12! py-6! gap-4!">
              {/* Divider */}
              <div className="w-full border-t border-gray-800">
                <div className="text-center -mt-3!">
                  <span className="bg-[#151515] text-gray-400 text-sm px-3!">
                    OR
                  </span>
                </div>
              </div>

              {/* OAuth Buttons */}
              <div className="flex flex-row justify-center gap-4! sm:gap-6!">
                <Button
                  variant="outline"
                  className="bg-white hover:bg-gray-100 border-0 h-12 w-12 p-0 rounded-lg flex items-center justify-center transition-colors"
                >
                  <img src="./auth/google_logo.png" alt="Google" className="w-5 h-5" />
                </Button>

                <Button
                  variant="outline"
                  className="bg-white hover:bg-gray-100 border-0 h-12 w-12 p-0 rounded-lg flex items-center justify-center transition-colors"
                >
                  <img src="./auth/github_logo.png" alt="GitHub" className="w-5 h-5" />
                </Button>

                <Button
                  variant="outline"
                  className="bg-white hover:bg-gray-100 border-0 h-12 w-12 p-0! rounded-lg flex items-center justify-center transition-colors"
                >
                  <img src="./auth/42_Logo.png" alt="42" className="w-5 h-5" />
                </Button>
              </div>

              {/* Sign In Link */}
              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  Already have an account?{' '}
                  <a
                    href="login"
                    className="text-white font-semibold hover:underline transition-colors"
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
