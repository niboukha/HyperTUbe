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
        {/* <header className="absolute top-0 left-0 w-full p-6! z-20">
          <Logo />
        </header> */}
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

        <CardHeader className="pb-6 pt-8 px-6 sm:px-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <h1 className="text-white text-3xl sm:text-4xl font-title text-center">
            Sign In
          </h1>
        </CardHeader>

        {/* <CardHeader className="p-8!">
          <h4 className="text-white text-3xl font-title">Sign In</h4>
        </CardHeader> */}

        <CardContent>
          <form>

            {/* Email Input */}
            <div className='flex flex-col justify-center items-center gap-2 border border-red-500'>
              <InputField
                placeholder="Email Address"
                type='email'
                className=' rounded-sm bg-[#333333]'
              />

              {/* Password Input */}
              <PasswordInput
                placeholder="Password"
                className="text-[#333333] rounded-sm text-white placeholder:text-gray-400 text-base"
              />
            </div>

            {/* Sign In Button */}
            <div className='flex justify-center items-center mt-8!'>
              <Button
                type="submit"
                className="w-[314px] bg-[#BD0404] hover:bg-[#BD0404] text-white font-semibold h-[48px] rounded-sm py-3! text-base !mt-8"
              >
                Sign In
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
          <div className="text-center  border-gray-700 w-full sm:mt-14! mt-6!">
            <span className="text-white text-sm">OR</span>
          </div>

          {/* OAuth Buttons */}
          <div className="flex flex-row justify-center gap-8  w-full sm:mt-8! mt-4!">

            {/* Google */}
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-100 border-0 py-6! w-[80px] h-[42px] rounded-sm"
            >
             <img src="./auth/google_logo.png" alt="Google" className="w-6 h-6" />
            </Button>

            {/* GitHub */}
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-100 border-0 py-6! w-[80px] h-[42px] rounded-sm"
            >
             <img src="./auth/github_logo.png" alt="GitHub" className="w-6 h-6" />
            </Button>

            {/* Discord */}
            <Button
              variant="outline"
              className="bg-white hover:bg-gray-100 border-0 py-6! w-[80px] h-[42px] rounded-sm"
            >
              <img src="./auth/42_Logo.png" alt="42" className="w-6 h-6" />
            </Button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center h-full flex flex-col justify-end items-center sm:mb-6! mb-14!">
            <p className="text-gray-400 text-sm">
              Don&apos;t have an account?{' '}
              <a
                href="register"
                className="text-white font-semibold hover:underline"
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



// import { InputField } from '@/components/auth/InputField'
// import { Button } from '@/components/ui/button'
// import { PasswordInput } from '@/components/auth/PasswordInput'
// import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
// import Logo from '@/components/ui/logo'

// export const metadata = {
//   title: 'HyperTube - Sign In',
//   description: 'Stream your favorite movies and TV shows',
// }

// export default function SignInPage() {
//   return (
//     <div className="min-h-screen bg-black relative overflow-hidden">
//       {/* Movie Poster Background */}
//       <div
//         className="absolute inset-0 opacity-30"
//         style={{
//           backgroundImage: `url('./auth/auth-background.png')`,
//           backgroundSize: 'cover',
//           backgroundPosition: 'center',
//         }}
//       />

//       {/* Content */}
//       <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
//         <Card className="w-full max-w-md sm:max-w-lg rounded-lg bg-[#151515] border-0 shadow-2xl">
//           {/* Logo Inside Card */}
//           <CardHeader className="pb-6 pt-8 px-6 sm:px-8">
//             <div className="flex justify-center mb-6">
//               <Logo />
//             </div>
//             <h1 className="text-white text-3xl sm:text-4xl font-bold text-center">
//               Sign In
//             </h1>
//           </CardHeader>

//           <CardContent className="px-6 sm:px-8">
//             <form className="space-y-6">
//               {/* Email Input */}
//               <div>
//                 <InputField
//                   placeholder="Email Address"
//                   type="email"
//                   className="w-full rounded-lg bg-[#333333] text-white placeholder:text-gray-500 border-0 py-3 px-4"
//                 />
//               </div>

//               {/* Password Input */}
//               <div>
//                 <PasswordInput
//                   placeholder="Password"
//                   className="w-full rounded-lg bg-[#333333] text-white placeholder:text-gray-500 border-0 py-3 px-4"
//                 />
//               </div>

//               {/* Sign In Button */}
//               <div className="pt-4">
//                 <Button
//                   type="submit"
//                   className="w-full bg-[#BD0404] hover:bg-[#a30303] text-white font-semibold h-12 rounded-lg text-base transition-colors duration-200"
//                 >
//                   Sign In
//                 </Button>
//               </div>

//               {/* Forgot Password Link */}
//               <div className="text-center">
//                 <a
//                   href="/auth/forgot-password"
//                   className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
//                 >
//                   Forgot Password?
//                 </a>
//               </div>
//             </form>
//           </CardContent>

//           <CardFooter className="flex flex-col px-6 sm:px-8 pb-8">
//             {/* Divider */}
//             <div className="w-full border-t border-gray-700 my-6">
//               <div className="text-center -mt-3">
//                 <span className="bg-[#151515] text-gray-400 text-sm px-3">
//                   OR
//                 </span>
//               </div>
//             </div>

//             {/* OAuth Buttons */}
//             <div className="flex flex-row justify-center gap-4 w-full">
//               {/* Google */}
//               <Button
//                 variant="outline"
//                 className="bg-white hover:bg-gray-100 border-0 w-14 h-12 rounded-lg flex items-center justify-center transition-colors"
//                 aria-label="Sign in with Google"
//               >
//                 <img
//                   src="./auth/google_logo.png"
//                   alt=""
//                   className="w-5 h-5"
//                 />
//               </Button>

//               {/* GitHub */}
//               <Button
//                 variant="outline"
//                 className="bg-white hover:bg-gray-100 border-0 w-14 h-12 rounded-lg flex items-center justify-center transition-colors"
//                 aria-label="Sign in with GitHub"
//               >
//                 <img
//                   src="./auth/github_logo.png"
//                   alt=""
//                   className="w-5 h-5"
//                 />
//               </Button>

//               {/* 42 */}
//               <Button
//                 variant="outline"
//                 className="bg-white hover:bg-gray-100 border-0 w-14 h-12 rounded-lg flex items-center justify-center transition-colors"
//                 aria-label="Sign in with 42"
//               >
//                 <img
//                   src="./auth/42_Logo.png"
//                   alt=""
//                   className="w-5 h-5"
//                 />
//               </Button>
//             </div>

//             {/* Sign Up Link */}
//             <div className="text-center mt-8">
//               <p className="text-gray-400 text-sm">
//                 Don&apos;t have an account?{' '}
//                 <a
//                   href="/auth/register"
//                   className="text-white font-semibold hover:underline transition-colors"
//                 >
//                   Sign up
//                 </a>
//               </p>
//             </div>
//           </CardFooter>
//         </Card>
//       </div>
//     </div>
//   )
// }

