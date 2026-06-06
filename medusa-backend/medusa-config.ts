import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  admin: {
    vite: () => ({
      server: {
        allowedHosts: ["api.digitalrohtak.online", "localhost"],
      },
    }),
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    // Cookie / session options so the admin UI works over plain HTTP on
    // localhost as well as HTTPS in production. Medusa's default forces
    // Secure=true + SameSite=none when NODE_ENV=production, which causes the
    // browser to silently drop the session cookie on http://localhost:9000/app.
    // Driven from env so we flip to secure=true once the admin sits behind
    // HTTPS.  .env keys:
    //   COOKIE_SECURE=false          # "true" when served over HTTPS
    //   COOKIE_SAMESITE=lax          # "none" when cross-site HTTPS
    cookieOptions: {
      secure: (process.env.COOKIE_SECURE ?? "false").toLowerCase() === "true",
      sameSite: (process.env.COOKIE_SAMESITE ?? "lax") as "lax" | "none" | "strict",
      httpOnly: true,
      maxAge: 10 * 60 * 60 * 1000,
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: { redisUrl: process.env.REDIS_URL },
    },
    {
      resolve: "@medusajs/medusa/cache-redis",
      options: { redisUrl: process.env.REDIS_URL, ttl: 30 },
    },
    {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: { redis: { url: process.env.REDIS_URL } },
    },
    {
      resolve: "./src/modules/delivery",
      options: {},
    },
    {
      resolve: "./src/modules/upi",
      options: {},
    },
    {
      resolve: "./src/modules/service-provider",
      options: {},
    },
    {
      resolve: "./src/modules/barter-wallet",
      options: {},
    },
    {
      resolve: "./src/modules/barter-tasks",
      options: {},
    },
    {
      resolve: "./src/modules/barter-rewards",
      options: {},
    },
    {
      resolve: "./src/modules/barter-gamification",
      options: {},
    },
    {
      resolve: "./src/modules/barter-currency",
      options: {},
    },
    {
      resolve: "./src/modules/listings",
      options: {},
    },
    {
      resolve: "./src/modules/job-portal",
      options: {},
    },
  ],
})
