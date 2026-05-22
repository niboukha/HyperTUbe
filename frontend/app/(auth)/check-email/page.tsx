import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'
import { ArrowLeft, Mail } from 'lucide-react'
// import { useEffect } from 'react'
// import { useRouter } from 'next/dist/client/components/navigation'
import { EnvelopeIcon } from "@heroicons/react/24/solid"

export const metadata = {
  title: 'HyperTube - Check Email',
  description: 'Stream your favorite movies and TV shows',
}

export default function CheckEmailPage() {
    // const router = useRouter()

  // useEffect(() => {
  //   const state = window.history.state?.usr

  //   if (!state?.fromReset) {
  //     router.replace("/login")
  //   }
  // }, [])

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Movie Poster Background */}
        <header className="absolute top-0 left-0 w-full p-6! z-20">
          <Logo />
        </header>
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url('../auth/auth-background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content */}
    <div className='relative z-10 min-h-screen flex flex-col'>
    <div className="flex-1 flex items-center justify-center px-4!">

      <Card className="flex flex-col  w-[450px] h-[409px] rounded-sm bg-[#151515] border-0  inset-0 opacity-89 ">

        <CardHeader className="sm:mt-12! flex flex-col justify-center items-center gap-6">
          <div className='w-14 h-14 bg-gray-600 flex justify-center items-center rounded-full'>
                <EnvelopeIcon className="h-8 text-white" />
          </div>
          <h1 className="text-[#FFFBFB] font-title text-3xl ">Check Your Email</h1>

          <div className="flex flex-col gap-1 text-center">
            <span className="text-gray-400 text-sm">
              We've sent a password reset link to your email
            </span>

            <span className="text-gray-400 text-sm">
              to reset your password.
            </span>
          </div>

        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-center items-center">
          <form >
            {/* Confirm Button */}
              <Button
                type="submit"
                className="w-[314px] bg-[#BD0404] hover:bg-[#BD0404] text-white font-semibold h-[48px] rounded-sm py-3! text-base !mt-2"
              >
                Confirm
              </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-1 flex-col justify-center items-center">


          {/* Sign Up Link */}
          <div className="text-center h-full flex  justify-end items-center sm:mb-2! gap-1">
              <a href="/login"><ArrowLeft  className='w-4 h-4 text-white'/></a>
               <span className='text-gray-400'>Back to Login In</span>
          </div>

        </CardFooter>

      </Card>
    </div>
  </div>
  </div>

  )
}
