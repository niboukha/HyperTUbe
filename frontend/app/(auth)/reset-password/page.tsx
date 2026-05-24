import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/dist/client/components/navigation'

export const metadata = {
  title: 'HyperTube - Reset Password',
  description: 'Stream your favorite movies and TV shows',
}

export default function ResetPasswordPage() {
//   const router = useRouter()
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Movie Poster Background */}
      <div className="absolute top-0 left-0 w-full p-6! z-20">
        <Logo />
      </div>

      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url('./auth/auth-background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content */}
    <div className='relative z-10 min-h-screen flex flex-col'>
    <div className="flex-1 flex items-center justify-center px-4!">

      <Card className="w-[450px] h-[409px] flex flex-col justify-center bg-[#151515] border-0 inset-0 opacity-89 ">

        <CardHeader className="flex justify-center items-center mt-12!">
          <h4 className="text-white text-3xl sm:text-4xl font-title">Enter New Password</h4>
        </CardHeader>

        <CardContent>
          <form >

            {/* Email Input */}
            <div className='flex flex-col justify-center items-center gap-2'>
            
                <PasswordInput
                  placeholder="New Password"
                  className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                />
                 <PasswordInput
                  placeholder="Confirm New Password"
                  className="w-full rounded-md bg-[#333333] text-white placeholder:text-gray-500 border-0 py-5.5! px-4!"
                />
            </div>

            {/* Sign In Button */}
            <div className='flex justify-center items-center mt-3!'>
              <Button
                type="submit"
                // onSubmit={}
                className="w-[314px] bg-[#BD0404] hover:bg-[#BD0404] text-white font-semibold h-[48px] rounded-sm py-3! text-base !mt-8"
              >
                Reset Password
              </Button>
            </div>

            

          </form>
        </CardContent>

        <CardFooter className="flex flex-1 flex-col justify-center items-center">


          {/* Sign Up Link */}
          <div className="text-center h-full flex  justify-end items-center sm:mb-2! gap-1">
           
              <a href="/login"><ArrowLeft  className='w-4 h-4 text-white'/></a>
               
               <span className='text-gray-400'>Back to Login In</span>
            {/* </p> */}
          </div>

        </CardFooter>

      </Card>
    </div>
  </div>
  </div>

  )
}
