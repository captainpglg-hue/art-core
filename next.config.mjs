/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "plus.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "kmmlwuwsahtzgzztcdaj.supabase.co", pathname: "/**" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.1.0",
  },
};

export default nextConfig;
