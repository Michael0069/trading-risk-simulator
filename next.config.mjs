/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ['10.233.159.17'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
