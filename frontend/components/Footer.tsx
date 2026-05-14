'use client'

// import {  Mail } from 'lucide-react'
// import Link from "next/link";
import Logo from './ui/logo';

// export default function Footer() {
//   const currentYear = new Date().getFullYear()

  // const socialLinks = [
  //   {
  //     name: 'GitHub',
  //     icon: FaGithub,
  //     href: 'https://github.com',
  //     label: 'Visit our GitHub'
  //   },
  //   {
  //     name: 'LinkedIn',
  //     icon: FaLinkedin,
  //     href: 'https://linkedin.com',
  //     label: 'Visit our LinkedIn'
  //   },
  //   {
  //     name: 'Email',
  //     icon: FaEnvelope,
  //     href: 'mailto:contact@moviesite.com',
  //     label: 'Send us an email'
  //   }
  // ]


  export default function Footer() {
  return (
    <footer className=" z-60 flex  justify-center items-center !mb-4 md:!px-16 bg-[#0E0E10] border-t border-white/[0.07] font-[poppins] ">
     
        <div className="  h-20 flex flex-col items-center justify-between  gap-5 !py-4">
          <div > 
          <p className="text-sm text-white/20 font-light flex justify-center items-center  flex-row  gap-2">
            © 2026 CINE<span className="text-[#BD0404]"><Logo/> </span> All rights reserved.
          </p>

          </div>
          <div className=''>
            <p className="text-xs md:text-sm text-white/50 italic tracking-wide">
              Made with ❤️ for cinema lovers
            </p>

          </div>
      </div>
    </footer>
  );
}
