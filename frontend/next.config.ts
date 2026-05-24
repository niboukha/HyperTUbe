import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "archive.org",
      },
      {
        protocol: "https",
        hostname: "www.publicdomaintorrents.info",
      },
    ],
    qualities: [75, 90, 100],
  },
}

export default nextConfig


// next.config.js
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   images: {
//     remotePatterns: [
//       {
//         protocol: "https",
//         hostname: "image.tmdb.org",
//       },
//     ],
//     qualities: [75, 90],
//   },
// };

// module.exports = nextConfig;