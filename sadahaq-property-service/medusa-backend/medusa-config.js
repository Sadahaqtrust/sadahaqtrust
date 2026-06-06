const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  projectConfig: {
    redis_url: process.env.REDIS_URL,
    database_url: process.env.DATABASE_URL,
    database_type: "postgres",
    store_cors: process.env.STORE_CORS,
    admin_cors: process.env.ADMIN_CORS,
    database_extra: { ssl: false },
  },
  plugins: [
    {
      resolve: "@medusajs/admin",
      options: {
        autoRebuild: true,
        develop: {
          open: false,
        },
      },
    },
    {
      resolve: "@medusajs/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
  ],
  modules: {},
};
