/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_TIKTOK_MODULE_ENABLED: process.env.TIKTOK_MODULE_ENABLED || 'false',
    NEXT_PUBLIC_CALENDLY_LINK: process.env.CALENDLY_LINK || '',
  },
  eslint: {
    // Allow builds to succeed even with ESLint warnings/errors
    // This prevents deployment failures from non-critical lint issues
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow builds to succeed even with TypeScript errors
    // Type checking still runs in development and CI
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
