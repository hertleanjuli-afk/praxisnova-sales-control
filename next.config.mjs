/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_TIKTOK_MODULE_ENABLED: process.env.TIKTOK_MODULE_ENABLED || 'false',
  },
};

export default nextConfig;
