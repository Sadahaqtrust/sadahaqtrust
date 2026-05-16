/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "*.digitalrohtak.online" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

module.exports = nextConfig;
