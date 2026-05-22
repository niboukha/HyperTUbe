import {  InputField } from '@/components/auth/InputField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import Logo from '@/components/ui/logo'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'HyperTube - Forget Password',
  description: 'Stream your favorite movies and TV shows',
}

export default function ForgetPasswordPage() {
  // const router = useRouter()
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Movie Poster Background */}
        <header className="absolute top-0 left-0 w-full p-6! z-20">
          <Logo />
        </header>
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

      <Card className="flex flex-col  w-[450px] h-[409px] rounded-sm bg-[#151515] border-0  inset-0 opacity-89 ">

        <CardHeader className="sm:mt-12! sm:mb-2! sm:px-17! px-4!">
          <h4 className="text-white text-3xl font-title">Reset Password</h4>
          <span className="text-gray-400 text-sm mt-2">Enter your email to reset your password.</span>
        </CardHeader>

        <CardContent>
          <form >

            {/* Email Input */}
            <div className='flex flex-col justify-center items-center gap-2'>
                <span className="text-white text-sm w-full sm:px-18! px-4!" >Email</span>
                <InputField
                    placeholder="Email Address"
                    type='email'
                    className='w-[314px] h-[50px] py-6! px-4! rounded-sm bg-[#333333]'
                />

            
            </div>

            {/* Sign In Button */}
            <div className='flex justify-center items-center mt-3!'>
              <Button
                type="submit"
                // onSubmit={()=> {
                //   router.push("/reset-password/check-email")
                //   //   {
                //   // state: { fromReset: true }
                // // })
                // }}
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
