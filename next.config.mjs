/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ZURICHJS_ADMIN_ORG_ID: process.env.ZURICHJS_ADMIN_ORG_ID,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'svkbzhlrjujeteqjrckv.supabase.co',
        port: '',
        pathname: '**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/support',
        destination: '/buy-us-a-coffee',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
