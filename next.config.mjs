/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Set default time zone for the application to Colombia's time zone
  env: {
    TZ: 'America/Bogota',
  },
}

export default nextConfig
