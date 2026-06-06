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
      bodySizeLimit: "100mb",
    },
  },
  // Allow large file uploads on API routes
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
    responseLimit: "100mb",
  },
};

module.exports = nextConfig;
