'use client'

import {  Mail } from 'lucide-react'
import Link from "next/link";
import Logo from './ui/Logo';
import { FaGithub, FaLinkedin, FaEnvelope } from "react-icons/fa";

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    {
      name: 'GitHub',
      icon: FaGithub  ,
      href: 'https://github.com',
      label: 'Visit our GitHub'
    },
    {
      name: 'LinkedIn',
      icon: FaLinkedin,
      href: 'https://linkedin.com',
      label: 'Visit our LinkedIn'
    },
    {
      name: 'Email',
      icon: FaEnvelope,
      href: 'mailto:contact@moviesite.com',
      label: 'Send us an email'
    }
  ]

  return (
    <footer className="  flex justify-center items-center relative bg-[#0E0E10] text-white pt-16 pb-8 mt-20 overflow-hidden h-70">
   
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Social Media Links Section */}
        <div className="flex flex-col items-center gap-12 !pb-12  border-b border-slate-800">
          <div className="text-center  !space-y-2 md:!space-y-4 ">
            <h2 className="!font-[poppins] text-sm font-semibold text-slate-400 uppercase mb-2">
              Connect  Us
            </h2>
            
            <div className="flex justify-center gap-6">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <Link
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="group relative"
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-full opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-300 -z-10"></div>
                    
                    {/* Icon container */}
                    <div className="flex items-center justify-center h-14 w-14 rounded-full bg-slate-800/50 backdrop-blur border border-slate-700 group-hover:border-red-500/50 group-hover:bg-slate-800 transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-red-900/50">
                      <Icon
                        size={24}
                        // className="text-slate-300 group-hover:text-white transition-all duration-300"
                      />
                    </div>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                      {social.label}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="!pt-8 text-center space-y-3 ">
          <div className="text-slate-300 text-sm font-light  flex flex-row gap-4 justify-center items-center">
            &copy; {currentYear} <span className="font-semibold text-white"><Logo/></span> All rights reserved.
          </div>
          <p className="text-slate-500 text-xs">Crafted with passion for cinema enthusiasts worldwide. </p>
          
        </div>
      </div>
    </footer>
  )
}
