/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  env: {
    NEXT_PUBLIC_ZURICHJS_ADMIN_ORG_ID: process.env.ZURICHJS_ADMIN_ORG_ID,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "date-fns", "@headlessui/react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "svkbzhlrjujeteqjrckv.supabase.co",
        port: "",
        pathname: "**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/support",
        destination: "/buy-us-a-coffee",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
