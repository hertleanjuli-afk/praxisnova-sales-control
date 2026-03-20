/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_TIKTOK_MODULE_ENABLED: process.env.TIKTOK_MODULE_ENABLED || 'false',
    NEXT_PUBLIC_CALENDLY_LINK: process.env.CALENDLY_LINK || '',
  },
};

export default nextConfig;
