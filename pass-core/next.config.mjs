/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "kmmlwuwsahtzgzztcdaj.supabase.co", pathname: "/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "plus.unsplash.com", pathname: "/**" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
};

export default nextConfig;
